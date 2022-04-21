<?php
include_once('./dbconnect.php');
include_once('dbaux.php');

$TEST = False;
//is DISPLAY=3 ever used in production??
$DISPLAY = 2;


//initialize $db = database, and $cell
//get them from the url (see importerapp.js
//url = '../php/retrieve_trace_coord.php?neuron='+mapname+'&db='+db;)
if ($TEST) {
	$db = 'N2U';
	$cell = 'ASHL';
} else {
	$db = $_GET["db"];
	$cell = $_GET["neuron"];
}

//var holding the connection to mysql database
//see dbconnect.php
$_db = new DB();
$_db->connect($db);
$time_end = microtime(true);

//print_r($_db->get_display2_series(113));


//get trace of neuron from display2
//NeuronTrace from dbaux.php
$nt = new NeuronTrace($_db,$cell);

// YH sent this stuff to initialization of NeuronTrace
//$nt->retrieve_traces_maybe();
/*
foreach ($nt->series as $s => $_v){
	if ($DISPLAY == 2){   
		$sql = $nt->display2_sql($s);
	} elseif ($DISPLAY == 3){
		$sql = $nt->display3_sql($s);
	}
	$val = $_db->_return_query_rows_assoc($sql);
	print_r($val);
	foreach ($val as $v){
		$nt->series[$s]->add_x($v['x1'],$v['x2']);
		$nt->series[$s]->add_y($v['y1'],$v['y2']);
		$z1 = $_db->get_object_section_number($v['objName1']);
		$z2 = $_db->get_object_section_number($v['objName2']);
		$nt->series[$s]->add_z($z1,$z2);
		$nt->series[$s]->add_cb($v['cellbody']);
		$nt->add_object($v['objName1'],$v['x1'],$v['y1'],$z1);
		$nt->add_object($v['objName2'],$v['x2'],$v['y2'],$z2);
		if ($v['cellbody'] == 1){
			$nt->cellBody->add_x($v['x1'],$v['x2']);
			$nt->cellBody->add_y($v['y1'],$v['y2']);
			$nt->cellBody->add_z($z1,$z2);
		}
		if ($v['remarks1'] != ''){
			$nt->add_remark($v['x1'],$v['y1'],$z1,$s,$v['remarks1']);
		}
		if ($v['remarks2'] != ''){
			$nt->add_remark($v['x2'],$v['y2'],$z2,$s,$v['remarks2']);
		}
	}
}
 */


//table of gap junctions,
//each row is a gap junction, column indexes mean:
// 0 = pre, 1 = post, 2 = sections,
// 3 = continNum, 4 = IMG_SectionNumber
/*
$data = $_db->get_gap_junction_synapses($nt->continName);
foreach($data as $d){
	$label = $d[1];
	if ($nt->continName == $d[1]){
		$label = $d[0];
	}
	$c = $d[3];
	$dict = $_db->get_synapse_cell_object_dict($c);
	if (!array_key_exists($nt->continName,$dict)){
		continue;
	}
	//$xyz = $_db->get_object_xyz($dict[$nt->continName]);
	$xyz = $nt->get_object_xyz($dict[$nt->continName]);
	if ($xyz == -1) {
		continue;
	}
	$zrange = $_db->get_synapse_section_range($c);
	if (!is_null($xyz['x']) and !is_null($xyz['y']) and !is_null($xyz['z'])){
		$nt->gapJunction->add_synapse($xyz['x'],$xyz['y'],$xyz['z'],
			$d[2],$label,$zrange['sectionNum1'],
			$zrange['sectionNum2'],$c,$d[0],$d[1]);
	}
}
 */

$data = $_db->get_gap_junction_synapses_assoc($nt->continName);
foreach($data as $d){
	$label = $d['post'];
	if ($nt->continName == $d['pre']){
		$label = $d['pre'];
	}
	$c = $d['continNum'];
	$dict = $_db->get_synapse_cell_object_dict($c);
	if (!array_key_exists($nt->continName,$dict)){
		continue;
	}
	//$xyz = $_db->get_object_xyz($dict[$nt->continName]);
	$xyz = $nt->get_object_xyz($dict[$nt->continName]);
	if ($xyz == -1) {
		continue;
	}
	$zrange = $_db->get_synapse_section_range($c);
	if (!is_null($xyz['x']) and !is_null($xyz['y']) and !is_null($xyz['z'])){
		$nt->gapJunction->add_synapse($xyz['x'],$xyz['y'],$xyz['z'],
			$d['sections'],$label,$zrange['sectionNum1'],
			$zrange['sectionNum2'],$c,$d['pre'],$d['post']);
	}
}

// get synapses on cell (=continName)
// 'pre', 'post', 'sections' = numSections, 'continNum'
// and 'image.IMG_SectionNumber'
// (image.IMG_SectionNumber is not used directly,
// but we include for ordering purposes..)
$data = $_db->get_pre_chemical_synapses_assoc($nt->continName);
//$data = $_db->get_pre_chemical_synapses($nt->continName);
foreach($data as $d){
  $c = $d['continNum'];
	$dict = $_db->get_synapse_cell_object_dict($c);
	if (!array_key_exists($nt->continName,$dict)){
		continue;
	}
	//$xyz = $_db->get_object_xyz($dict[$nt->continName]);
	$xyz = $nt->get_object_xyz($dict[$nt->continName]);
	if ($xyz == -1) {
		continue;
	}
	$zrange = $_db->get_synapse_section_range($c);
	if (!is_null($xyz['x']) and !is_null($xyz['y']) and !is_null($xyz['z'])){
		$nt->preSynapse->add_synapse($xyz['x'],$xyz['y'],$xyz['z'],
			$d['sections'],$d['post'],$zrange['sectionNum1'],
			$zrange['sectionNum2'],$c,$d['pre'],$d['post']);
	}
}



$data = $_db->get_post_chemical_synapses($nt->continName);
foreach($data as $d){
	$c = $d[3];
	$dict = $_db->get_synapse_cell_object_dict($c);
	if (!array_key_exists($nt->continName,$dict)){
		continue;
	}
	//$xyz = $_db->get_object_xyz($dict[$nt->continName]);
	$xyz = $nt->get_object_xyz($dict[$nt->continName]);
	if ($xyz == -1) {
		continue;
	}
	$zrange = $_db->get_synapse_section_range($c);
	if (!is_null($xyz['x']) and !is_null($xyz['y']) and !is_null($xyz['z'])){
		$nt->postSynapse->add_synapse($xyz['x'],$xyz['y'],$xyz['z'],
			$d[2],$d[0],$zrange['sectionNum1'],
			$zrange['sectionNum2'],$c,$d[0],$d[1]);
	}
}

// YH wait is there already remarks?
// class DB in dbconnect.php
$data = $_db->get_obj_remarks($nt->continName);
$nt->objRemarks = $data;



if ($DISPLAY == 2){   
	$nt->load_map2_params($_db);   
} elseif ($DISPLAY == 3){
	$nt->load_map3_params($_db);  
}

$data = $nt->compile_data();
echo json_encode($data);


//$time = microtime(true) - $_SERVER["REQUEST_TIME_FLOAT"];
//echo "Did stuff in $time seconds\n";
//about 5.34 seconds for ADAL, N2U
?>
