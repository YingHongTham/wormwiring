<?php

/* redoing retrieve_trace_coord.php
 * main changes are
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
 * - cellbody is now a collection of objects
 *    (previously edges had property cb = 0/1)
 * 
 * note: some query fields returned as string, but should be
 * number; make sure to cast
 *
 * sends back the assoc array $data,
 * which has keys:
 *  'db', 'name',
 *  'skeleton', 'objCoord', 'objSeries', 'pre', 'post', 'gap',
 *  'cellbody', 'remarks'
 * see loadMap2 in /apps/neuronMaps/include/mapviewer.js
 * for what the expected JS object should be/meanings
 */

include_once('./dbconnect.php');

$db = $_GET["db"];
$cell = $_GET["cell"];

// connection to mysql database; dbconnect.php
$dbcon = new DB();
$dbcon->connect($db);

//cell is recorded in several contins
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
// this is the only place the coordinates are given
// (hmm maybe also want to put the series(region) and cb
// as part of coordinate... we'll see if we need it)
// key = object number, value = [x,y,z]
$data['objCoord'] = array();

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

$data['cellbody'] = array(); // "set" of objects in it
$data['remarks'] = array(); // objNum => remark text
$data['plotParam'] = array();

//===================================================

// get the skeleton from display2 table
// each row of display2 table represents an edge in the skeleton
// edge always goes between two different z-slices
// we also use this opportunity to get other things:
// -coordinates of objects (stored into $data['objCoord'])
// -cellbody
// -remarks
// (cellbody should be a property of objects not edges,
// but I suppose they're always bigger than one section;
// so we take it that a row in display2 being
// marked as cellbody implies the two objects that
// it connects are part of the cellbody)

$continStr = implode(",",$continNums);
$sql = "select
    x1,y1,z1,x2,y2,z2,
    objName1 as objNum1,
    objName2 as objNum2,
    cellbody1 as cb1,
    cellbody2 as cb2,
    remarks1,remarks2,
    continNum,
    series1, series2
  from display2
  where continNum in ($continStr)
  order by z1 asc";
$query_results = $dbcon->_return_query_rows_assoc($sql);
foreach ($query_results as $v) {
  // v is row in query results, corresponds to one edge

  // cast to integer
  foreach (['x1','y1','z1','x2','y2','z2','objNum1','objNum2','cb1','cb2','continNum'] as $k) {
    $v[$k] = intval($v[$k]);
  }

  // add edge to skeleton
  // no longer separate by series
  $data['skeleton'][] = array($v['objNum1'],$v['objNum2']);
  //// add edge
  //if ($s1 == $s2) {
  //  $data['skeleton'][$s1][] = array($v['objNum1'],$v['objNum2']);
  //}
  //else {
  //  $data['skeleton']['in_between'][] = array($v['objNum1'],$v['objNum2']);
  //}

  $s1 = $v['series1'];
  $s2 = $v['series2'];

  $data['objSeries'][$v['objNum1']] = $s1;
  $data['objSeries'][$v['objNum2']] = $s2;

  // for whatever fucking reason, the old code has
  // makes x negative (see add_x)
	$data['objCoord'][$v['objNum1']] = array(-$v['x1'],$v['y1'],$v['z1']);
	$data['objCoord'][$v['objNum2']] = array(-$v['x2'],$v['y2'],$v['z2']);

  // record cellbody; may duplicate, make unique later
  // for some reaons cb2 is not an indicator of
  // being cellbody, dunno what it's for then...
  // anyway we go back to the old method,
  // which is that we make an edge in cellbody
  // if cb1 is 1
  // and we return the edges individually as pairs
  if ($v['cb1'] == 1) {
    $data['cellbody'][] = [$v['objNum1'], $v['objNum2']];
  }
  //if ($v['cb2'] == 1) {
  //  $data['cellbody'][] = $v['objNum2'];
  //}

  if ($v['remarks1'] != ''){
    $data['remarks'][$v['objNum1']] = $v['remarks1'];
	}
	if ($v['remarks2'] != ''){
    $data['remarks'][$v['objNum2']] = $v['remarks2'];
  }
}
$data['cellbody'] = array_unique($data['cellbody']);

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
// pre synapses (synapses where $cell is the pre)
// work on this later, need to figure out what to do
// with some issues with the data:
// some times post can have the same cell several times,
// which by itself is not an issue
// but the problem is that the object numbers
// of some of them turn out to be the same
// At first I thought perhaps it's a recording issue,
// but now I'm thinking, perhaps the same cell object
// (i.e. a slice of the cell) can be so big
// that it wraps around another cell
// Indeed, there are cases where preobj = postobj1
// options:
// -stick to old method, for post, pick one object
// -return one entry for each post object
// -return the whole query result, have JS figure it out
// for now, postponing work on this, just have gap junctions,
// and get working version of the 2D viewer
// (but of couse have the 3D version work fine too)

$sql = "select
    pre, post, sections, continNum, mid,
    preobj as preObj,
    postobj1 as postObj1,
    postobj2 as postObj2,
    postobj3 as postObj3,
    postobj4 as postObj4
  from synapsecombined 
  where pre like '%$cell%' 
    and type like 'chemical' 
  order by post asc, sections desc";
$query_results = $dbcon->_return_query_rows_assoc($sql);
foreach ($query_results as $v) {
  // cast to integer
  foreach (['continNum','preObj','postObj'] as $k) {
    $v[$k] = intval($v[$k]);
  }

  //$data[$v['mid']] = $v;
}


//===================================================
// gap junctions
// essentially returns query results as is,
// except
// sectionNum1,sectionNum2 swapped out for zLow,zHigh

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
    post1,
    post2,
    post3,
    post4,
    preobj as preObj,
    postobj1 as postObj1,
    postobj2 as postObj2,
    postobj3 as postObj3,
    postobj4 as postObj4,
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
