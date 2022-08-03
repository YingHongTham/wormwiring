<?php

// retrieves and labels/draws over image
// corresponding to a single section (given by objNum)
// of a synapse (given by contin)
// from a series/database (given by db)
// at a particular zoom level (given by zoom)

error_reporting(E_ALL);
ini_set("display_errors", 1);

ini_set('memory_limit',"10240M");

require_once('./dbconnect.php');
require_once('./images-alt.php');

// dimensions of rectangle drawn around synapse object
// (in pixels in original image)
$iWidth = 600;
$iHeight = 600;

$RELPATH = "../../image_data/";

$db = $_GET["db"];
$contin = $_GET["contin"]; // technically not needed
$objNum = $_GET["objNum"];
$zoom = $_GET["zoom"];

// connect to MySQL database, all queries made through here
$dbcon = new DB(); // see dbconnect.php
$dbcon->connect($db);

//===================================================
// get image filename
// and also coordinates
// and also the object numbers of relevant cells
$sql = "select
		image.IMG_File as file,
		image.IMG_Series as series,
		image.IMG_SectionNumber as sectNum,
		object.OBJ_Name as objNum,
		object.OBJ_X as x,
		object.OBJ_Y as y,
		object.CON_Number as contin,
		object.type,
		object.fromObj,
		object.toObj
	from object
	join image
		on object.IMG_Number = image.IMG_Number
	where object.OBJ_Name = $objNum";
	// not really needed: object.CON_Number = $contin
$query_results = $dbcon->_return_query_rows_assoc($sql);
if (count($query_results) != 1) {
	// there should be exactly one result
	return;
}
$syn = $query_results[0];

//=====================
// process file name
// MySQL has the filename but the tif format

$imageFilenameTIF = $syn['file'];
$series = $syn['series'];
$sectNum = $syn['sectNum'];

// replace the .TIF with .jpg
$dotPosition = strrpos($imageFilenameTIF,'.');

$imageFilenameJPG = substr_replace(
	$imageFilenameTIF,
	'jpg',
	$dotPosition + 1);

$fullpathFilename =
	$RELPATH.$db."/".$series."/".$imageFilenameJPG;

//===============================================
// Get synapse locations
$syn_pos = array( 'x' => $syn['x'], 'y' => $syn['y']);

//================================================
// get cell names corresponding to objects
$preObj = $syn['fromObj'];
$postObjArr = explode(',', $syn['toObj']);

$objStr = $preObj.','.$syn['toObj'];

$objTable = array();

$sql = "select
		OBJ_Name as objNum,
		OBJ_X as x,
		OBJ_Y as y,
		contin.CON_AlternateName as name
	from object
	join contin
		on object.CON_Number = contin.CON_Number
	where OBJ_Name in ($objStr)";
$query_results = $dbcon->_return_query_rows_assoc($sql);
foreach($query_results as $v) {
	$objTable[$v['objNum']] = $v;
}

print_r($objTable);

//===============================================
// image

$IMG = new Image($fullpathFilename);
$IMG->set_rect_dimensions($iWidth,$iHeight);
$IMG->set_rect_center($syn_pos['x'], $syn_pos['y']);

$IMG->load();
if ($IMG->img === false) {
	// load failed, file not found
	return;
}

if ($zoom == 0) {
	// low zoom, just draw a rectangle around the synapse
  $IMG->draw_rect();
} else {
	// high zoom
	// want to mark the synapse position and label cells
	// get synapse type, the cells around it,
	// and their object numbers

	// the color of text labels of the cells around the synapse
	if ($syn['type'] == 'electrical') {
		$preColor = $IMG->gapColor;
		$postColor = $IMG->gapColor;
	} else {
		$preColor = $IMG->preColor;
		$postColor = $IMG->postColor;
	}

	foreach ($objTable as $obj => $data) {

		// cell name
		$cellname = $data['name'];

		$cell_pos = array( 'x' => $data['x'], 'y' => $data['y'] );

		// color of text
		if ($obj == $preObj) {
			$pColor = $preColor;
		} else {
			$pColor = $postColor;
		}

		$IMG->write_text($cellname, $cell_pos['x'], $cell_pos['y'], $pColor);
	}

	// finally mark the synapse with an 'x'
	$IMG->write_text('x', $syn_pos['x'], $syn_pos['y'], $IMG->redColor);
  $IMG->crop_image_to_rect();
}


$dbcon->con->close();

$data = $IMG->encode();
$IMG->clear(); // just destroys image

echo json_encode($data);

?>
