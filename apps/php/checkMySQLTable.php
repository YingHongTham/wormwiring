<?php

error_reporting(E_ALL);
ini_set("display_errors", 1);
ini_set('memory_limit',"10240M");


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
 */

$db = "N2U";

require_once('./dbconnect.php');
$dbcon = new DB(); // see dbconnect.php
$dbcon->connect($db);


//=====================================================
// table recording bad synapses with error message
// types of errors

$badSynapses = array();

$NO_OBJECTS_IN_SYNAPSESCOMBINED = array(
	"table" => "synapsecombined",
	"error" => "Members field in synapsecombined is empty"
);
$NO_OBJECTS_IN_OBJECT = array(
	"table" => "object",
	"error" => "No objects for synapse found in object table"
);
$VARYING_NUMBER_OF_POST = array(
	"table" => "object",
	"error" => "Number of postsynaptic partners varies through sections in object table"
);
$VARYING_CELLS = array(
	"table" => "object",
	"error" => "Objects in a certain position do not belong to the same cell through sections (e.g. presynaptic partner may be RICR in the beginning but becomes AIBR later"
);

function recordBadSynapse($contin, $error) {
	global $badSynapses;
	$badSynapses[$contin] = $error;
}


//$NO_OBJECTS_IN_SYNAPSESCOMBINED = 0;
//$NO_OBJECTS_IN_OBJECT = 1;
//$VARYING_NUMBER_OF_POST = 2;
//$VARYING_CELLS = 3;

//function recordBadSynapse($contin, $errorType) {
//	switch($errorType) {
//		case $NO_OBJECTS_IN_SYNAPSESCOMBINED:
//			$badSynapses[$contin] = array(
//				"table" => "synapsecombined",
//				"error" => "Members field in synapsecombined is empty"
//			);
//			return;
//		case $NO_OBJECTS_IN_OBJECT:
//			$badSynapses[$contin] = array(
//				"table" => "object",
//				"error" => "No objects for synapse found in object table"
//			);
//			return;
//		case $VARYING_NUMBER_OF_POST:
//			$badSynapses[$contin] = array(
//				"table" => "object",
//				"error" => "Number of postsynaptic partners varies through sections in object table"
//			);
//			return;
//		case $VARYING_CELLS:
//			$badSynapses[$contin] = array(
//				"table" => "object",
//				"error" => "Objects in a certain position do not belong to the same cell through sections (e.g. presynaptic partner may be RICR in the beginning but becomes AIBR later"
//			);
//			return;
//	}
//}


// key = obj num of everything
$objTable = array();

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

/*
 * ok wtf see contin 3278 in object table,
 * the slice with OBJ_Name = 59556
 * has fromObj = 35002
 * but this object is itself not in object table!
 * (i.e. no row in object table with OBJ_Name = 35002)
 */

echo "Database: ";
echo $db;
echo "; Number of bad synapses: ";
echo count($badSynapses);
echo "<br/>";
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
