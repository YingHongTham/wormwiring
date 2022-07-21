<?php

// new and improved version of getSynapse.php
// just gets the relevant data about each section
// of a synapse, given its contin number
//
// the image itself, with the drawings over it,
// is obtained from loadSynapseImage-alt.php
//
// for my local testing, I only have N2U/NR/0(61,62,63).tif
// so test on synapse with CON_Number = 3321

require_once('./dbconnect.php');

$db = $_GET['db'];
$contin = $_GET['contin'];

// connection to mysql database; dbconnect.php
$dbcon = new DB();
$dbcon->connect($db);


$sql = "select
    synapsecombined.pre as pre,
    synapsecombined.post as post,
    synapsecombined.sections as sections,
  	object.OBJ_Name as objNum,
  	object.IMG_Number as imgNum,
  	image.IMG_SectionNumber as sectNum,
  	image.IMG_File as file,
  	image.IMG_Series as series,
  	object.type as type 
  from object 
    join synapsecombined 
    	on object.CON_Number = synapsecombined.continNum 
    join image 
    	on object.IMG_Number = image.IMG_Number 
  where CON_Number = $contin
  order by image.IMG_SectionNumber";

$query_results = $dbcon->_return_query_rows_assoc($sql);
echo json_encode($query_results);
?>
