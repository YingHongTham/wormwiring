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
require_once('./dbaux.php');
require_once('./images-alt.php');

// dimensions of rectangle drawn around synapse object
// (in pixels in original image)
$iWidth = 600;
$iHeight = 600;

$RELPATH = "../../image_data/";

$db = $_GET["db"];
$contin = $_GET["contin"];
$objNum = $_GET["objNum"];
$zoom = $_GET["zoom"];

// connect to MySQL database, all queries made through here
$dbcon = new DB(); // see dbconnect.php
$dbcon->connect($db);

//===================================================
// get image filename
// MySQL has the filename but the tif format
$sql = "select
		image.IMG_File as file,
		image.IMG_Series as series
	from object
	join image
		on object.IMG_Number = image.IMG_Number
	where object.CON_Number = $contin
		and object.OBJ_Name = $objNum";
$query_results = $dbcon->_return_query_rows_assoc($sql);
if (count($query_results) != 1) {
	// there should be exactly one result
	return;
}
$r = $query_results[0];
$imageFilenameTIF = $r['file'];
$series = $r['series'];

// replace the .TIF with .jpg
$dotPosition = strrpos($imageFilenameTIF,'.');

$imageFilenameJPG = substr_replace(
	$imageFilenameTIF,
	'jpg',
	$dotPosition + 1);

$fullpathFilename =
	$RELPATH.$db."/".$series."/".$imageFilenameJPG;

//===============================================
// Get synapse locations (and cells?)
$syn_loc = $dbcon->get_object_xy($objNum);

$dbcon->con->close();

//===============================================
// image

$IMG = new Image($fullpathFilename);
$IMG->set_rect_dimensions($iWidth,$iHeight);
$IMG->set_rect_center($syn_loc['x'], $syn_loc['y']);

$IMG->load();

if ($IMG->img === false) {
	// load failed, file not found
	return;
}

if ($zoom == 0) {
  $IMG->draw_rect();
} else {
	$cellsyn = get_syncell($db,$contin,$objNum); // dbaux
  $IMG->crop_image_to_rect($cellsyn);
};

$data = $IMG->encode();
$IMG->clear(); // just destroys image

echo json_encode($data);


