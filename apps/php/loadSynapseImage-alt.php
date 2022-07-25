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
		image.IMG_Series as series,
		image.IMG_SectionNumber as sectNum
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
$sectNum = $r['sectNum'];

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
$syn_pos = $dbcon->get_object_xy($objNum);

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
  $IMG->draw_rect();
} else {
	// want to mark the synapse position and label cells
	// get synapse type, the cells around it,
	// and their object numbers
	$sql = "select
			pre, post1, post2, post3, post4,
			preobj, postobj1, postobj2, postobj3, postobj4,
			type
		from synapsecombined
		where continNum = $contin";
	$query_results = $dbcon->_return_query_rows_assoc($sql);
	if (count($query_results) != 1) {
		// there should be exactly one result
		return;
	}
	$r = $query_results[0];

	// the color of text labels of the cells around the synapse
	if ($r['type'] == 'electrical') {
		$preColor = $IMG->gapColor;
		$postColor = $IMG->gapColor;
	} else {
		$preColor = $IMG->preColor;
		$postColor = $IMG->postColor;
	}

	$cellAndObj = array(
		"pre" => "preobj",
		"post1" => "postobj1",
		"post2" => "postobj2",
		"post3" => "postobj3",
		"post4" => "postobj4"
	);

	foreach ($cellAndObj as $pKey => $pObjKey) {
		if ($r[$pKey] == '' || $r[$pObjKey] == '') {
			// probably checking $r[$pKey] is enough
			continue;
		}

		// cell name
		$pName = $r[$pKey];
		$pObjNum = $r[$pObjKey];

		// get the objects in this slice (z = $sectNum)
		// that are part of cell = $pName
		// ideally, $pObjNum is in this list,
		// but for whatever reason, it's not uncommon to have
		// an object number, like postobj1, not be part of
		// the cell post1..
		// for example, for synapse with contin 3321,
		// in synapsecombined,
		// pre = 'BAGL', preobj = 45607
		// post1 = 'AINR', postobj1 = 45607
		// (pre is correct, in that object with number 45607
		// is indeed part of 'BAGL', according to *object* table)
		//
		// Actually, $pObjNum is almost never in this list
		// if the synapse has several sections,
		// since we are querying for the slice z = $sectNum
		// and not just the slice z =  synapsecombined.mid,
		// which is just the slice in the middle of the synapse
		$ahhsql = "select
				object.OBJ_Name as objNum,
				object.OBJ_X as x,
				object.OBJ_Y as y,
				image.IMG_SectionNumber as z
			from object
			join contin
				on object.CON_Number = contin.CON_Number
			join image
			on object.IMG_Number = image.IMG_Number
			where
				CON_AlternateName = '$pName'
				and image.IMG_SectionNumber = $sectNum";
		$query_results_2 = $dbcon->_return_query_rows_assoc($ahhsql);

		$objFound = false;
		$cell_pos = array( 'x' => 0, 'y' => 0);

		foreach ($query_results_2 as $v) {
			$v['objNum'] = intval($v['objNum']);

			if ($v['objNum'] == $pObjNum) {
				$objFound = true;

				$cell_pos['x'] = $v['x'];
				$cell_pos['y'] = $v['y'];

				break;
			}
		}

		if (!$objFound) {
			// get the closest object to syn_pos
			$minDistSquared = 100000000000;
			foreach ($query_results_2 as $v) {
				$distSquared =
						pow($syn_pos['x'] - $v['x'], 2)
						+ pow($syn_pos['y'] - $v['y'], 2);
				if ($distSquared < $minDistSquared) {
					$minDistSquared = $distSquared;
					$cell_pos['x'] = $v['x'];
					$cell_pos['y'] = $v['y'];
					$objFound = true;
				}
			}
		}

		// color of text
		if ($pKey == 'pre') {
			$pColor = $preColor;
		} else {
			$pColor = $postColor;
		}

		if ($objFound) {
			$IMG->write_text($pName, $cell_pos['x'], $cell_pos['y'], $pColor);
		}
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
