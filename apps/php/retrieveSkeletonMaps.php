<?php

/*
 * used to be called retrieve_trace_coord_alt_2.php,
 * which redid retrieve_trace_coord_alt.php
 *
 * this time using object table to get coordinates,
 * not from display2
 * (even though we still use display2 to get the skeleton)
 * reason for this change is that
 * I want to display the synapse according to it's coordinates
 * and not according to the cell;
 * the synapse coordinates are not always to be found in
 * the display2 table,
 * one reason being that some synapses have only one section,
 * and display2 is supposed to only show relationships
 * (with their coordinates)
 *
 * I learned that there are many rows of the relationship table
 * and display2 table
 * that involve objects that do not have corresponding entry
 * in the object table
 * not that many, so ignore
 * but make sure to filter those out..
 *
 * Luckily, synapsecombined's 'mid' field always has
 * corresponding entry in object table!
 * finally, something actually goes right...
 * but just in case, we'll test for it anyway
 *
 * here's the SQL query for getting number of such bad rows:
 * select count(*) from synapsecombined where mid not in (select OBJ_Name from object);
 *
 * (the following is copied form retrieve_trace_coord_alt.php)
 * main changes (compared to retrieve_trace_coord.php) are
 * - blazingly fast
 * - most data is relayed via object numbers
 *    and the object coordinates relayed in its own table
 *    (previously e.g. skeleton was given as pairs of points
 *    given by their coordinates directly)
 * - series1 may not equal series2 in display2
 *    this issue seems to have been ignored in the past
 *    we change how we deal with series:
 *    skeleton now records all edges in one array
 *    have an assoc array 'objSeries' to give the series
 *    of an object
 *    this is useful to distinguish for the 2D view,
 *    where we want to (have option to) show regions separately
 * 
 * note: some query fields returned as string, but should be
 * number; make sure to cast
 *
 * sends back the assoc array $data,
 * which has keys:
 *  'db', 'name',
 *  'skeleton', 'objCoord', 'objSeries', 'pre', 'post', 'gap',
 *  'cellbody', 'remarks',
 * $data['gap'/'pre'/'post'] is object whose keys are
 * contin number of synapse, and value is assoc array with keys:
 * 'pre','post','sections','continNum','mid','preObj','postObj',
 * 'zLow','zHigh','coord'={'x'=> , 'y' =>, 'z' => }
 * see loadMap2 in /apps/neuronMaps/include/mapviewer.js
 * for what the expected JS object should be/meanings
 */

include_once('./dbconnect.php');

$db = $_GET["db"];
$cell = $_GET["cell"];

// connection to mysql database; dbconnect.php
$dbcon = new DB();
$dbcon->connect($db);

// cell is recorded in several contins
// array (non assoc)
$continNums = $dbcon->get_contin_numbers($cell);


// TODO
// weird stuff
// contin numbers for ADAL are 113, 4606, 5713
// but 4606 is not to be found in display2...


// object to be json_encode and sent back
$data = array();

//===================================================
// initializing the subarrays in $data,
// also helps organize code/explain

$data['db'] = $db;
$data['name'] = $cell;

// we store other data by the object numbers of objects involved,
// coordinates of objects are given twice,
// once in objCoord, from object + image table,
// another in objCoordDisplay, from display2 table
// key = object number, value = [x,y,z]
// unclear whether it's always the case that the set of keys
// of these arrays are exactly the same
$data['objCoord'] = array();
$data['objCoordDisplay'] = array();

// cell goes through several parts of worm e.g. NR, VC etc
// record skeleton by these parts
// each part is itself an array of pairs(array of two elems):
// $data['skeleton']['NR'] = array([351,89],[89,1841],...)
// we don't do that anymore?
$data['skeleton'] = array();

// synapses
$data['pre'] = array();
$data['post'] = array();
$data['gap'] = array();

$data['cellbody'] = array(); // [[obj1,obj2], ...]
$data['remarks'] = array(); // objNum => remark text
$data['plotParam'] = array();

//===================================================
// get coordinates of objects

$objCoord = array();

foreach ($continNums as $contin) {
	$sql = "select
			object.OBJ_Name as obj,
			object.OBJ_X as x,
			object.OBJ_Y as y,
			image.IMG_SectionNumber as z
		from object
		join image
			on object.IMG_Number = image.IMG_Number
		where object.CON_Number = $contin";
	$query_results = $dbcon->_return_query_rows_assoc($sql);
	foreach ($query_results as $v) {
		$objCoord[$v['obj']] = array(
			'x' => intval($v['x']),
			'y' => intval($v['y']),
			'z' => intval($v['z']));
	}
}

$data['objCoord'] = $objCoord;


//===================================================

// get the skeleton from display2 table
// each row of display2 table represents an edge,
// edge always goes between two different z-slices
// we also use this opportunity to get other things:
// -NOT coordinates of objects
// -cellbody
// -remarks
// (cellbody should in principle be a property of objects,
// not edges, but I suppose they're always bigger than
// one section, so it's OK;
// so we take it that a row in display2 being
// marked as cellbody implies the two objects that
// it connects are part of the cellbody)

$continStr = implode(",",$continNums);
$sql = "select
		objName1 as objNum1,
    objName2 as objNum2,
		x1,y1,z1,x2,y2,z2,
    cellbody1 as cb1,
    remarks1,remarks2,
    continNum,
    series1, series2
  from display2
  where continNum in ($continStr)
  order by z1 asc";
$query_results = $dbcon->_return_query_rows_assoc($sql);
foreach ($query_results as $v) {
  // v is row in query results, corresponds to one edge

	// ignore row if objNum1/2 is not found in object table
	if (!array_key_exists($v['objNum1'], $data['objCoord'])
		|| !array_key_exists($v['objNum2'], $data['objCoord'])) {
		continue;
	}

  // cast to integer
	foreach (['objNum1','objNum2','cb1','continNum',
						'x1','y1','z1','x2','y2','z2'] as $k) {
    $v[$k] = intval($v[$k]);
	}

	$data['objCoordDisplay'][$v['objNum1']] = array(
		'x' => intval($v['x1']),
		'y' => intval($v['y1']),
		'z' => intval($v['z1']));
	$data['objCoordDisplay'][$v['objNum2']] = array(
		'x' => intval($v['x2']),
		'y' => intval($v['y2']),
		'z' => intval($v['z2']));

  // add edge to skeleton
  $data['skeleton'][] = array($v['objNum1'],$v['objNum2']);

  $s1 = $v['series1'];
  $s2 = $v['series2'];

  $data['objSeries'][$v['objNum1']] = $s1;
  $data['objSeries'][$v['objNum2']] = $s2;


  // record cellbody
  // for some reaons cellbody2 is not an indicator of
  // being cellbody, dunno what it's for then...
  // we make an edge in cellbody if cb1 is 1
  // and we return the edges individually as pairs
  if ($v['cb1'] == 1) {
    $data['cellbody'][] = [$v['objNum1'], $v['objNum2']];
  }

  if ($v['remarks1'] != ''){
    $data['remarks'][$v['objNum1']] = $v['remarks1'];
	}
	if ($v['remarks2'] != ''){
    $data['remarks'][$v['objNum2']] = $v['remarks2'];
  }
}

//===================================================
// some auxiliary functions

// cell names can sometimes come with extra stuff..
// (whitespaces, brackets)
// we filter out non-alphanumeric characters
function alphanumeric($s) {
  return preg_replace("/[^a-zA-Z0-9]+/", "", $s);
}
// same but allow comma also
function alphanumericcomma($s) {
  return preg_replace("/[^a-zA-Z0-9,]+/", "", $s);
}


//===================================================

// assoc array
// key = syn contin, value = middle object 
// collecting into one array in order to query for coords
// and of course this would not work because nothing works
// for some reason, some contin numbers are associated to
// multiple synapses, e.g.
// select * from synapsecombined where continNum = 5859;
// gives two rows
// thankfully I just realized this is an unnessary step anyway
// but it's good to have found this strange error

$synObjList = array();

//===================================================
// gap junctions
// essentially returns query results as is,
// except
// sectionNum1,sectionNum2 (from contin)
// are swapped out for zLow,zHigh

$sql = "select
    pre, post, sections, continNum, mid,
    preobj as preObj,
		postobj1 as postObj,
    sectionNum1, sectionNum2
  from synapsecombined 
    join contin
      on synapsecombined.continNum = contin.CON_Number
  where (pre like '%$cell%' 
    or post like '%$cell%') 
    and synapsecombined.type like 'electrical' 
  order by pre asc, sections desc";
$query_results = $dbcon->_return_query_rows_assoc($sql);
foreach ($query_results as $v) {
  // cast to integer
  foreach (['sections','continNum','mid','preObj','postObj','sectionNum1','sectionNum2'] as $k) {
    $v[$k] = intval($v[$k]);
  }

  $v['zLow'] = min($v['sectionNum1'],$v['sectionNum2']);
  $v['zHigh'] = max($v['sectionNum1'],$v['sectionNum2']);
  unset($v['sectionNum1']);
  unset($v['sectionNum2']);

  // clean cell names
  foreach (['pre','post'] as $k) {
    $v[$k] = alphanumeric($v[$k]);
  }

	$data['gap'][$v['continNum']] = $v;

	$synObjList[] = $v['mid'];
}


//===================================================
// pre synapses
// that is, synapses where $cell has the presynaptic density
// essentially returns query results as is,
// except
// sectionNum1,sectionNum2 swapped out for zLow,zHigh
// basically same as for gap junction
//
// warning to future self or poor soul who has to work on this
// if add postobj1 field in query below,
// even after performing intval($v['postobj1'])
// it will still be a string
// OK, but then why does converting to int work for gap?!

$sql = "select
    pre, post, sections, continNum, mid,
		preobj as preObj,
    sectionNum1, sectionNum2
  from synapsecombined 
    join contin
      on synapsecombined.continNum = contin.CON_Number
  where pre like '%$cell%' 
    and synapsecombined.type like 'chemical' 
  order by pre asc, sections desc";
$query_results = $dbcon->_return_query_rows_assoc($sql);
foreach ($query_results as $v) {
  // cast to integer
  foreach (['sections','continNum','mid','preObj','sectionNum1','sectionNum2'] as $k) {
    $v[$k] = intval($v[$k]);
  }

  // 'sectionNum1' and 'sectionNum2' are not reliable!
  // they can refer to section numbers within different regions!
  // please kill me

  $v['zLow'] = min($v['sectionNum1'],$v['sectionNum2']);
  $v['zHigh'] = max($v['sectionNum1'],$v['sectionNum2']);
  unset($v['sectionNum1']);
  unset($v['sectionNum2']);

  // clean cell names
  $v['pre'] = alphanumeric($v['pre']);
  $v['post'] = alphanumericcomma($v['post']);

  $data['pre'][$v['continNum']] = $v;

	$synObjList[] = $v['mid'];
}



//===================================================
// postsynapses
// that is, synapses where $cell is on the post side
//
// as warned in pre above,
// for some unknown reason, applying intval to the
// postObj1/2/3/4 fields doesn't work,
// so you must remember to apply parseInt in the JS

$sql = "select
    pre, post, sections, continNum, mid,
    post1, post2, post3, post4,
    preobj as preObj,
    postobj1 as postObj1, postobj2 as postObj2,
		postobj3 as postObj3, postobj4 as postObj4,
    sectionNum1, sectionNum2
  from synapsecombined 
    join contin
      on synapsecombined.continNum = contin.CON_Number
  where post like '%$cell%'
    and synapsecombined.type like 'chemical' 
  order by pre asc, sections desc";
$query_results = $dbcon->_return_query_rows_assoc($sql);
foreach ($query_results as $v) {
  // cast to integer
  foreach (['sections','continNum','mid','preObj','sectionNum1','sectionNum2'] as $k) {
    $v[$k] = intval($v[$k]);
  }

  $v['zLow'] = min($v['sectionNum1'],$v['sectionNum2']);
  $v['zHigh'] = max($v['sectionNum1'],$v['sectionNum2']);
  unset($v['sectionNum1']);
  unset($v['sectionNum2']);

  // clean cell names
  $v['pre'] = alphanumeric($v['pre']);
  $v['post'] = alphanumericcomma($v['post']);
  $v['post1'] = alphanumeric($v['post1']);
  $v['post2'] = alphanumeric($v['post2']);
  $v['post3'] = alphanumeric($v['post3']);
  $v['post4'] = alphanumeric($v['post4']);

  $data['post'][$v['continNum']] = $v;

	$synObjList[] = $v['mid'];
}

//=========================================
// get synapse coordinates directly from object table

//key = mid obj of syn
$synObjCoord = array();

$synObjListStr = implode(',',$synObjList);

$sql = "select
		object.OBJ_Name as obj,
		object.OBJ_X as x,
		object.OBJ_Y as y,
		image.IMG_SectionNumber as z
	from object
		join image
		on object.IMG_Number = image.IMG_Number
	where object.OBJ_Name in ($synObjListStr)";
$query_results = $dbcon->_return_query_rows_assoc($sql);
foreach ($query_results as $v) {
	$synObjCoord[$v['obj']] = array(
		'x' => intval($v['x']),
		'y' => intval($v['y']),
		'z' => intval($v['z']));
}

// now update the $data['gap','pre','post']
foreach (['gap','pre','post'] as $type) {
	foreach ($data[$type] as $contin => $syn) {
		$mid = $syn['mid'];
		if (array_key_exists($mid, $synObjCoord)) {
			$data[$type][$contin]['coord'] = $synObjCoord[$mid];
		}
		else {
			$data[$type][$contin]['coord'] = 'NOT_FOUND';
		}
	}
}


//=========================================
// get remarks
// $data['remarks'] = array(); // objNum => remark text

$sql = "select
    OBJ_Name as objNum,
    OBJ_Remarks as remarks
  from object
  where
    OBJ_Remarks != ''
    and CON_AlternateName like '%$cell%'
";
$query_results = $dbcon->_return_query_rows_assoc($sql);
foreach ($query_results as $v) {
  // cast to integer
  $v['objNum'] = intval($v['objNum']);
  $data['remarks'][$v['objNum']] = $v['remarks'];
}

//==========================================
// attempt to fix synapse errors
// namely, there are synapses where the object number
// (say postObj1) is not actually the cell (post1)
// for example, for synapse with contin = 6226,
// gap junction between PVQL and ADAL
// but their object numbers are the same = 87352.
// the correct object number for ADAL is 87392
//
// we attempt to correct this by getting
// the z coord of the incorrect object number,
// and use the object in objCoord that is in the same z coord
// and is closest to that incorrect object
// if even this fails, then we add this incorrect object
// to auxObjCoord



echo json_encode($data);
?>
