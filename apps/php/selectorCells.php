<?php

/*
 * gets the list of cells
 * receives request via url, two parameters: sex, db
 * (extract by $_GET["sex"], $_GET["db"]
 * php returns the value requested by echo-ing
 *
 * wa in wa_link stands for WormAtlas
 * the wa file helps to get a wormatlas page from a cellname
 * essentially it truncates the cellname, but there's not one obvious rule
 * multiple rules, shouldn't be hard to find the rules
 *
 * fun exercise: check that the stems (the shortening of these
 * cell names, like VB09 -> VB) do not contain one another,
 * and if that's true, can use a prefix tree to implement
 * the shortening
 * But it's probably not worth the effort,
 * and probably more efficient to just create a lookup table
 *
 * returns JSON object of the form:
 *  {
 *    Neurons: {
 *      'ADAL': {
 *        value: 'ADAL',
 *        visible: 0,
 *        plotted: 0,
 *        walink: WormAtlas link
 *      },
 *      ...
 *    },
 *    Muscles:
 *  }
 *
 * TODO database name capitalize issue (url makes it caps)
 */
include('dbaux.php');
include('common.php');

//0 if don't debug
$debug = 0;

if ( $debug == 1){
	$sex = 'male';
	$db = 'n930';
} else {
	$sex = $_GET["sex"];
	$db = $_GET["db"];
};

//$wafile = '/var/www/wormwiring/cell_files/wa_link.txt';
$wafile = '../../cell_files/wa_link.txt';

if ($db == 'N2W'){
	$neuron_list = '../../cell_files/pharynx_neurons.txt';
	$muscle_list = '../../cell_files/pharynx_muscle.txt';
} 
else if ($db == 'JSE'){
	$neuron_list = '../../cell_files/jse_neurons.txt';
	$muscle_list = '../../cell_files/jse_muscles.txt';
} else {
	if ($sex == 'herm'){
		$neuron_list = '../../cell_files/full_herm_neurons.txt';
		$muscle_list = '../../cell_files/full_herm_muscles.txt';     
	} elseif ($sex == 'male'){
		$neuron_list = '../../cell_files/full_male_neurons.txt';
		$muscle_list = '../../cell_files/full_male_muscle.txt';      
	};  
}

$neurons = file($neuron_list,FILE_IGNORE_NEW_LINES);
$muscles = file($muscle_list,FILE_IGNORE_NEW_LINES);
$contins = get_contin_names($db);

foreach ($contins as $i => $c){
	$c = str_replace(array('[',']'),'',$c);
	$contins[$i] = $c;
};

$neurons = array_intersect($neurons,$contins);
$muscles = array_intersect($muscles,$contins);


//==========================
// get wormatlas links

$walinks = get_csv($wafile);

$_neurons = array();
$_muscles = array();
foreach ($neurons as &$value){
	$link = 0;
	if (array_key_exists($value,$walinks)){
		$n = $walinks[$value];
		$link = 'https://www.wormatlas.org/neurons/Individual%20Neurons/'.$n.'mainframe.htm';
	};
	$_tmp = explode('.',$value);
	$_val = $_tmp[0];
	$_neurons[$_val] = array(
		'value' => $value,
		'visible' => 0,
		'plotted' => 0,
		'walink' => $link
	);
};

foreach ($muscles as &$value){
	$_muscles[$value] = array(
		'value' => $value,
		'visible' => 0,
		'plotted' => 0
		);
};


$cells = array( 
	'Neurons' => $_neurons,
	'Muscles' => $_muscles 
);      

if ($debug == 0) echo json_encode($cells);
?>
