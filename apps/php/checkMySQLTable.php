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

require_once('./dbconnect.php');
$dbcon = new DB(); // see dbconnect.php
$dbcon->connect("N2U");

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
		on object.CON_Number = contin.CON_Number
	limit 10000";
$query_results = $dbcon->_return_query_rows_assoc($sql);
foreach ($query_results as $v) {
	$v['postObjList'] = explode(',', $v['toObj']);
	$objTable[$v['objNum']] = $v;
}

$synapseCombinedTable = array();

$sql = "select
		pre, post,
		post1, post2, post3, post4,
		preobj, postobj1, postobj2, postobj3, postobj4,
		continNum as contin
	from synapsecombined";
$query_results = $dbcon->_return_query_rows_assoc($sql);
foreach ($query_results as $v) {
	$v['postList'] = explode(',', $v['post']);
	$synapseCombinedTable[$v['contin']] = $v;
}

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
		echo 'and';
		print_r($synComb);
	}
}


?>
