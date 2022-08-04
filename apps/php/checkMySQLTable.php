<?php

error_reporting(E_ALL);
ini_set("display_errors", 1);
ini_set('memory_limit',"10240M");

/*
 * just writing to clarify what exactly I'm doing..
 *
 * what would one expect from these tables?
 *
 * object table records both synapse objects
 * and cell objects
 * for the synapse objects,
 * the fromObj and toObj fields tell you which cell objects
 * that that synapse object is attached to
 *
 * expectation:
 * -all the objects in fromObj and toObj exist,
 *  that is, there should be a row with OBJ_Name = those obj
 * -synapse should have nonzero number of sections
 * -the cells involved in a synapse remain consistent
 *  through the sections of the synapse
 *  -in particular, the number of cells involved should stay constant
 *
 */

/*
 * for ease of analysis,
 * we perform queries and keeps results in dictionaries:
 * -objTable: keys = objNum, value = array(
 *    objNum (self),
 *    contin to which this object belongs to,
 *    cell name if object is part of cell not synapse,
 *    type = cell/chemical/electrical,
 *    fromObj, toObj - the cell objects if is synapse
 *  )
 *
 * -continObjs: key = contin num, value = array of
 *   object numbers in this contin
 *   (this table is obtained from object,contin table)
 *
 * -synapseCombinedTable: key = contin, value = array(
 *    pre, post,
 *    post1, post2, post3, post4,
 *    preobj, postobj1, postobj2, postobj3, postobj4,
 *    members,
 *    continNum as contin
 *  )
 */


/*
 * synapsecombined has many many errors in the
 * preobj/postobj1/2/3/4 fields,
 * in that the object number doesn't match the corresponding
 * cell name in pre/post1/2/3/4
 *
 * for example, for synapse with contin 3321,
 * in synapsecombined,
 * pre = 'BAGL', preobj = 45607
 * post1 = 'AINR', postobj1 = 45607
 * (pre is correct, in that object with number 45607
 * is indeed part of 'BAGL', according to *object* table)
 *
 * then I realized the object table has fromObj and toObj,
 * which seem to be correct for the synapses I checked
 *
 * so this script is to check whether it's correct for
 * every synapse;
 * if so, I will switch queries to this
 *
 * when done with this testing, should comment everything
 * so we don't waste CPU power in case anyone requests this
 * php page directly,
 * or just delete this page all together eventually..
 *
 * strategy:
 * query object table joined to contin table
 * to get a dictionary that gives
 * objNum -> { objNum, contin, name, type, fromObj, toObj }
 * for every entry
 *
 * parse out toObj by comma, become
 *
 * objNum -> { .., preobj = fromObj, postobj1, postobj2, ... }
 *
 * then we query synapsecombined table to get the pre,post
 * cell names for every synapse, giving dictionary
 * contin -> { pre, post1, post2, post3, post4 }
 * then for each entry corresponding to a synapse,
 *
 * ok wtf see contin 3278 in object table,
 * the slice with OBJ_Name = 59556
 * has fromObj = 35002
 * but this object is itself not in object table!
 * (i.e. no row in object table with OBJ_Name = 35002)
 */

$db = "N2U";

require_once('./dbconnect.php');
$dbcon = new DB(); // see dbconnect.php
$dbcon->connect($db);


//=====================================================
// table recording bad synapses with error message
// types of errors

// dictionary with keys = contin of synapse, value = error msg
$badSynapses = array();

// dictionary with keys = objects that SHOULD exist,
// value = table and field in which it's found
$badObjects = array();

$NO_OBJECTS_IN_SYNAPSESCOMBINED = array(
	"table" => "synapsecombined",
	"error" => "Members field in synapsecombined is empty"
);
$SYNAPSE_NOT_FOUND_IN_OBJECT = array(
	"table" => "object",
	"error" => "Synapse not found in object table"
);
$SYNAPSE_NOT_FOUND_IN_CONTIN = array(
	"table" => "object",
	"error" => "Synapse not found in contin table"
);
$NUM_SECTIONS_DIFFER = array(
	"table" => "object/synapsecombined",
	"error" => "Number of sections in synapsecombined (number of objects in 'members' field) is different from the number of objects in contin table with this CON_Number"
);
$SECTIONS_OBJECTS_DIFFER = array(
	"table" => "object/synapsecombined",
	"error" => "set of objects with given contin number do not agree"
);
$VARYING_NUMBER_OF_POST = array(
	"table" => "object",
	"error" => "Number of postsynaptic partners varies through sections in object table"
);
$VARYING_CELLS = array(
	"table" => "object",
	"error" => "Objects in a certain position do not belong to the same cell through sections (e.g. presynaptic partner may be RICR in the beginning but becomes AIBR later"
);

// expect $error to be one of the above
function recordBadSynapse($contin, $error) {
	global $badSynapses;
	$badSynapses[$contin] = $error;
}

// record that object with object number $obj
// was found in $table, column $field,
// but not found in object table (as the OBJ_Name)
// (note that this could happen multiple times to
// a single missing object,
// the table and field just gets rewritten)
// $row_id is a unique identifier of the row where error found,
// e.g. 'OBJ_Name = 31331'
function recordBadObject($obj, $table, $field, $row_id) {
	global $badObjects;
	$badObjects[$obj] = array(
		'table' => $table,
		'field' => $field,
		'row' => $row_id,
	);
}

//================================================
// table recording bad object numbers..
// sometimes there are object numbers referenced
// but do not have a corresponding row,
// e.g. 35002 is the fromObj of synapse object 59556,
// but there is no row in object table with OBJ_Name = 35002..
//

$badObjects = array();


// key = obj num (synapses and cells)
$objTable = array();

// key = contin, value = objects in it
$continObjs = array();

$sql = "select
		OBJ_Name as objNum,
		object.CON_Number as contin,
		contin.CON_AlternateName as name,
		object.type,
		fromObj,
		toObj
	from object
	join contin
		on object.CON_Number = contin.CON_Number";
$query_results = $dbcon->_return_query_rows_assoc($sql);
foreach ($query_results as $v) {
	$v['postObjList'] = explode(',', $v['toObj']);
	$objTable[$v['objNum']] = $v;

	// add object to $continObjs
	if (!array_key_exists($v['contin'], $continObjs)) {
		$continObjs[$v['contin']] = array();
	}
	$continObjs[$v['contin']][] = $v['objNum'];
}



// key = synapse contin num
$synapseCombinedTable = array();

$sql = "select
		pre, post,
		post1, post2, post3, post4,
		preobj, postobj1, postobj2, postobj3, postobj4,
		members,
		continNum as contin
	from synapsecombined";
$query_results = $dbcon->_return_query_rows_assoc($sql);
foreach ($query_results as $v) {
	$v['postList'] = explode(',', $v['post']);
	$synapseCombinedTable[$v['contin']] = $v;
}

// go through synapses, trying to find error
// we stop and go to next synapse when we hit an error
// so after each fix, you should run this check again,
// as it may bring up errors that were not detected
foreach ($synapseCombinedTable as $contin => $v) {
	// get synapse objects in contin
	$synObjs = explode(',', $v['members']);

	//==================================================
	// check if synapsecombined records the objects
	if (count($synObjs) == 0) {
		recordBadSynapse($contin, $NO_OBJECTS_IN_SYNAPSESCOMBINED);
		continue;
	}

	//==================================================
	// check that synapse is found in object tables
	if (!array_key_exists($contin, $continObjs)) {
		recordBadSynapse($contin, $SYNAPSE_NOT_FOUND_IN_OBJECT);
		continue;
	}

	//==================================================
	// check same number of synapses in both tables,
	// synapsecombined and object
	if (count($synObjs) != count($continObjs[$contin])) {
		recordBadSynapse($contin, $NUM_SECTIONS_DIFFER);
		continue;
	}

	//==================================================
	// check that the 'members' objects are indeed
	// the same in object table
	// (i.e. objects in object table with contin number
	// match up with $synObjs as defined above)
	$synObjs_copy = $synObjs;
	$continObjs_copy = $continObjs[$contin];
	sort($synObjs_copy);
	sort($continObjs_copy);
	if ($synObjs_copy != $continObjs_copy) {
		recordBadSynapse($contin, $SECTIONS_OBJECTS_DIFFER);
		return;
	}


	//==================================================
	// check consistency of number of post partners

	$pass = true;
	$numPost0 = count($objTable[$synObjs[0]]['postObjList']);
	// go through each object in contin
	foreach($synObjs as $obj) {
		$numPost = count($objTable[$obj]['postObjList']);
		if ($numPost != $numPost0) {
			recordBadSynapse($contin, $VARYING_NUMBER_OF_POST);
			$pass = false;
			break;
		}
	}
	if (!$pass) {
		continue;
	}

	//===================================================
	// check that every from/toObj actually exists
	$pass = true;
	foreach($synObjs as $obj) {
		$preObj = $objTable[$obj]['fromObj'];
		$postObjList = $objTable[$obj]['postObjList'];
		if (!array_key_exists($preObj, $objTable)) {
			recordBadObject($preObj, 'object', 'fromObj', "OBJ_Name = $obj");
			$pass = false;
		}
		foreach($postObjList as $postObj) {
			if (!array_key_exists($postObj, $objTable)) {
				recordBadObject($postObj, 'object', 'toObj', "OBJ_Name = $obj");
				$pass = false;
			}
		}
	}
	if (!$pass) {
		continue;
	}

	//===================================================
	// check consistency of cells involved across sections

	$pass = true;
	$preObj0 = $objTable[$synObjs[0]]['fromObj'];
	$preName0 = $objTable[$preObj0]['name'];
	foreach($synObjs as $obj) {
		$preObj = $objTable[$obj]['fromObj'];
		$preName = $objTable[$preObj]['name'];
		if ($preName != $preName0) {
			recordBadSynapse($contin, $VARYING_CELLS);
			$pass = false;
			break;
		}
	}
	if (!$pass) {
		continue;
	}
}

echo "Database: ";
echo $db;
echo "; Number of bad synapses: ";
echo count($badSynapses);
echo "<br/>";
echo "Bad objects: <br/>";
foreach ($badObjects as $obj => $error) {
	echo $obj;
	echo ": ";
	print_r($error);
	echo "<br/>";
}
echo "<br/>";
echo "Bad synapses: <br/>";
foreach ($badSynapses as $contin => $error) {
	echo $contin;
	echo ": ";
	print_r($error);
	echo "<br/>";
}

return;




// do chemical first cos no need to flip and check
foreach ($objTable as $obj => $v) {
	if ($v['type'] != 'chemical') {
		// not synapse
		continue;
	}
	$contin = $v['contin'];
	$synComb = $synapseCombinedTable[$contin];

	// cell names according to object table
	$preName = $objTable[$v['fromObj']]['name'];

	if ($synComb['pre'] != $preName) {
		echo $obj;
		print_r($objTable[$v['fromObj']]);
		echo '<br/>';
		echo 'and';
		print_r($synComb);
		echo '<br/>';
	}
}


?>
