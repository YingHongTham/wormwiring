<?php
// redoing retrieve_trace_coord.php
// main changes are
// - blazingly fast
// - most data is relayed via object numbers
//    and the object coordinates relayed in its own table
//    (previously e.g. skeleton was given as pairs of points
//    given by their coordinates directly)

include_once('./dbconnect.php');

$db = $_GET["db"];
$cell = $_GET["cell"];

// connection to mysql database; dbconnect.php
$dbcon = new DB();
$dbcon->connect($db);

//cell is recorded in several contins
$continNums = $dbcon->get_contin_numbers($cell);


//cell also goes through several parts of worm e.g. NR, VC etc
//store the neuron trace for each part separately
//  $this->series['NR'] = trace data for part of neuron in NR
$this->series = array();
// YH new; store skeleton by object numbers;
// coordinates stored separately, once for each object
// each entry is itself an array of pairs:
// $thi->skeletonObjs['NR'] = array([351,89],[89,1841],...)
$this->skeletonObjs = array();
foreach ($this->continNums as $c){
  // get series(regions) that the cell does go through/appear in
  $series = $dbcon->get_display2_series($c);
	foreach ($series as $s){
		$tmp = $s;
		if (strcmp('Ventral Cord',$s) == 0 or strcmp('Ventral Cord 2',$s) == 0) {
			$tmp = 'VC'; 
		} 
    $this->series[$tmp] = new TraceLocation();
    $this->skeletonObjs[$tmp] = array(); // YH new
	}
}
$this->cellBody = new TraceLocation();
$this->preSynapse = new TraceSynapse();
$this->postSynapse = new TraceSynapse();
$this->gapJunction = new TraceSynapse();
$this->remarks = array();
$this->plotParam = array();
//$this->objects = array(); // no longer in use
$this->objCoord = array(); // replaces $this->objects
$this->cbObjs = array(); // just store objNum of cellbody

$sql = $this->display2_sql_better();
$query_results = $dbcon->_return_query_rows_assoc($sql);
foreach ($query_results as $v){
  // v is row in query results, corresponds to one edge

  // cast to integer, because for some reason
  // MySQL table has string entries for these position values wtf
  foreach (['x1','y1','z1','x2','y2','z2','objNum1','objNum2','cellbody','continNum'] as $k) {
    $v[$k] = intval($v[$k]);
  }

  $s = $v['series'];
  
  // add edge
  $this->series[$s]->add_segment($v['x1'],$v['y1'],$v['z1'],$v['x2'],$v['y2'],$v['z2'],$v['cellbody']);
  $this->skeletonObjs[$s][] = array($v['objNum1'],$v['objNum2']);

  // for whatever fucking reason, the old code has
  // makes x negative (see add_x)
	$this->objCoord[$v['objNum1']][] = array(-$v['x1'],$v['y1'],$v['z1']);
	$this->objCoord[$v['objNum1']][] = array(-$v['x2'],$v['y1'],$v['z1']);

  if ($v['cellbody'] == 1){
    $this->cbObjs[] = $v['objNum1']; // may duplicate
    $this->cbObjs[] = $v['objNum2']; // make unique later
  }

  // remarks now assoc array
  if ($v['remarks1'] != ''){
    $this->remarks[$v['objNum1']] = $v['remarks1'];
	}
	if ($v['remarks2'] != ''){
    $this->remarks[$v['objNum2']] = $v['remarks2'];
  }
}
$this->cbObjs = array_unique($this->cbObjs);

?>
