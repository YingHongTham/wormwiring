<?php

// retrieves and labels/draws over image
// corresponding to a single section (given by objNum)
// of a synapse (given by contin)
// from a series/database (given by db)
// at a particular zoom level (given by zoom)

ini_set('memory_limit',"10240M");
require_once('./dbconnect.php');
require_once('./dbaux.php');
include('./images.php');

//Parameters
$iWidth = 600;
$iHeight = 600;
$RELPATH = "../../image_data/";

$db = $_GET["db"];
$contin = $_GET["contin"];
$objNum = $_GET["objNum"];
$zoom = $_GET["zoom"];

$dbcon = new DB();
$dbcon->connect($db);

$cellsyn = get_syncell($db,$contin,$objNum); // dbaux

//Get cell and synapse locations
$syn_loc = $dbcon->get_object_xy($objNum);

// gets the obj num of cells involved
// but according to synapsecombined,
// so it's the same for each section wtf
// shouldn't one use the objects from each section??
$cells = $dbcon->get_synapse_cell_objects($contin);

foreach ($cells as $cell){
	$cell_loc = $dbcon->get_object_xy($objNum);
	$dx = abs($syn_loc['x'] - $cell_loc['x'])+750;
  $dy = abs($syn_loc['y'] - $cell_loc['y'])+750;			
	$iWidth = max($iWidth,$dx);
  $iHeight = max($iHeight,$dy);
};
$x0 = $syn_loc['x'] - $iWidth/2;
$y0 = $syn_loc['y'] - $iHeight/2;

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

$dbcon->con->close();

$IMG = new Image($fullpathFilename);
$IMG->set_dimensions($iWidth,$iHeight);
$IMG->set_center($x0,$y0);
$IMG->load();

if ($IMG->img === false) {
	// file not found
	return;
}

if ($zoom == 0){
  $IMG->_rect();
} else {
  $IMG->_crop($cellsyn);
};

$data = $IMG->encode();
$IMG->clear();

if ($debug == 0) echo json_encode($data);
