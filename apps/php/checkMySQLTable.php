<?php

// uncomment when done testing,
// avoid unwanted calls to run this file
//return;

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

$db = $_GET["db"];

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
	"error" => "01",
	"message" => "Members field in synapsecombined is empty"
);
$SYNAPSE_NOT_FOUND_IN_OBJECT = array(
	"table" => "object",
	"error" => "02",
	"message" => "Synapse not found in object table"
);
$SYNAPSE_NOT_FOUND_IN_CONTIN = array(
	"table" => "object",
	"error" => "03",
	"message" => "Synapse not found in contin table"
);
$NUM_SECTIONS_DIFFER = array(
	"table" => "object/synapsecombined",
	"error" => "04",
	"message" => "Number of sections in synapsecombined (number of objects in 'members' field) is different from the number of objects in contin table with this CON_Number"
);
$SECTIONS_OBJECTS_DIFFER = array(
	"table" => "object/synapsecombined",
	"error" => "05",
	"message" => "set of objects with given contin number do not agree"
);
$VARYING_NUMBER_OF_POST = array(
	"table" => "object",
	"error" => "06",
	"message" => "Number of postsynaptic partners varies through sections in object table"
);
$VARYING_PRE = array(
	"table" => "object",
	"error" => "07",
	"message" => "The pre object ('fromObj' field in object table) does not correspond to the same cell through sections"
);
$VARYING_POST = array();
$VARYING_POST[] = array(
	"table" => "object",
	"error" => "08",
	"message" => "The 1st post object (in 'toObj' field in object table) does not correspond to the same cell through sections"
);
$VARYING_POST[] = array(
	"table" => "object",
	"error" => "08",
	"message" => "The 2nd post object (in 'toObj' field in object table) does not correspond to the same cell through sections"
);
$VARYING_POST[] = array(
	"table" => "object",
	"error" => "08",
	"message" => "The 3rd post object (in 'toObj' field in object table) does not correspond to the same cell through sections"
);
$VARYING_POST[] = array(
	"table" => "object",
	"error" => "08",
	"message" => "The 4th post object (in 'toObj' field in object table) does not correspond to the same cell through sections"
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
//
// many of the check require the previous ones to pass
// in order for the checking procedure to work correctly
// or even run properly
// for example, the check for
// consistency of cells involved across sections
// (failing produces error $VARYING_PRE/POST)
// requires that the number of post cells is the same
// in each section (as found in object table)
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
	// first check pre

	$pass = true;
	$preObj0 = $objTable[$synObjs[0]]['fromObj'];
	$preName0 = $objTable[$preObj0]['name'];
	foreach($synObjs as $obj) {
		$preObj = $objTable[$obj]['fromObj'];
		$preName = $objTable[$preObj]['name'];
		if ($preName != $preName0) {
			recordBadSynapse($contin, $VARYING_PRE);
			$pass = false;
			break;
		}
	}

	// now check post, checking each position
	$postObjList0 = $objTable[$synObjs[0]]['postObjList'];
	for ($i = 0; $i < count($postObjList0); $i++) {
		foreach ($synObjs as $obj) {
			$postObjList = $objTable[$obj]['postObjList'];

			$postObj0 = $postObjList0[$i];
			$postObj = $postObjList[$i];
			// their corresponding names
			$postObjName0 = $objTable[$postObj0]['name'];
			$postObjName = $objTable[$postObj]['name'];
			if ($postObjName != $postObjName0) {
				recordBadSynapse($contin, $VARYING_POST[$i]);
				$pass = false;
				break; // move to next position
			}
		}
	}
	if (!$pass) {
		continue;
	}

	//===================================================
	// check cell names pre/post1/2/3/4 matches
	// the cell name of the pre/postobj1/2/3/4 as told in
	// object join contin tables
	$pass = true;
}

//=========================================================
// print out stuff

echo "Database: ";
echo $db;
echo "; Number of bad synapses: ";
echo count($badSynapses);
echo "; Number of bad objects: ";
echo count($badObjects);
echo "<br/>";

echo "(to check other databases, change the ?db=$db value in the url)";
echo "<br/>";
echo "<br/>";

echo "Number of bad synapses by error type";
$numSynByErrorType = array();
foreach ($badSynapses as $contin => $val) {
	$errorType = $val['error'];
	if (!array_key_exists($errorType, $numSynByErrorType)) {
		$numSynByErrorType[$errorType] = 0;
	}
	$numSynByErrorType[$errorType]++;
}
print_r($numSynByErrorType);
echo "<br/>";
echo "<br/>";

echo "Some MySQL queries that can be helpful:";
echo "<br/>";
echo "<br/>";

echo "Get synapse with given contin number from synapsecombined:";
echo "<br/>";
echo "<i>";
echo "select * from synapsecombined where continNum = &lt;contin&gt;;";
echo "</i>";
echo "<br/>";

echo "Get synapse with given contin number from contin table:";
echo "<br/>";
echo "<i>";
echo "select * from contin where CON_Number = &lt;contin&gt;;";
echo "</i>";
echo "<br/>";

echo "Get the objects in a synapse with given contin number from object table:";
echo "<br/>";
echo "<i>";
echo "select * from object where CON_Number = &lt;contin&gt;;";
echo "</i>";
echo "<br/>";

echo "Get object given object number(s) from object table:";
echo "<br/>";
echo "<i>";
echo "select * from object where OBJ_Name = &lt;objNum&gt;;";
echo "<br/>";
echo "select * from object where OBJ_Name in (&lt;objNum1&gt;,&lt;objNum2&gt;,...);";
echo "</i>";
echo "<br/>";

echo "Get object with given pre object number from object table:";
echo "<br/>";
echo "<i>";
echo "select * from object where fromObj = &lt;objNum&gt;;";
echo "</i>";
echo "<br/>";

echo "Get object with given post object number from object table:";
echo "<br/>";
echo "<i>";
echo "select * from object where toObj like '%&lt;objNum&gt;%';";
echo "</i>";
echo "<br/>";

echo "<br/>";
echo "<br/>";

echo "Synapse Viewer for synapse with given contin number:";
echo "<br/>";
echo "https://dev.wormwiring.org/apps/synapseViewer/?db=$db&continNum=&lt;contin&gt;";
echo "<br/>";
echo "<br/>";

echo "<b>Bad objects:</b><br/>";
echo "These are object numbers which show up in some table,
	but doesn't have it's own entry in object table
	(that is, there is no row in object table with
	OBJ_Name equal this object number";
echo "<br/>";
echo "Meaning of output below:";
echo "<br/>";
echo "<pre>
bad object number: Array(
	[table] => MySQL table in which this object appears
	[field] => the field (column) of the table where this object appears
	[row] => where clause that identifies the row of the table where this object appears (typically it's OBJ_Name = .., and here this OBJ_Name is not of this object, but the object number of a synapase section
)</pre>";
echo "<br/>";
echo "<br/>";

echo "<pre>";
foreach ($badObjects as $obj => $error) {
	echo $obj;
	echo ": ";
	print_r($error);
	echo "<br/>";
}
echo "</pre>";
echo "<br/>";
echo "<br/>";

echo "<b>Bad synapses:</b><br/>";
echo "Here the key (the number before the colon)
	is the contin number of the synapse in question.
	The [table] value refers to the table where the error was found
	(the error may be incompatibility between tables,
	so it could be multiple tables).";
echo "<pre>";
foreach ($badSynapses as $contin => $error) {
	echo $contin;
	echo ": ";
	print_r($error);
	echo "<br/>";
}
echo "</pre>";


?>
