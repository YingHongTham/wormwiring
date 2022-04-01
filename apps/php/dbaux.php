<?php
/*
 * defines NeuronTrace class,
 * which is how retrieve_trace_coord.php handles cells
 * it is initialized (automatically queries for skeleton maps)
 * then call stuff like get_gap_junction_synapses_assoc
 * and then compile_data returns the data in a formate suitable for
 * sending back to client
 */



if (file_exists('./dbconnect.php')){
   require_once('./dbconnect.php');
}else{
   require_once('./php/dbconnect.php');
}

if (file_exists('./synObj.php')){
   include('./synObj.php');
}else{
   include('./php/synObj.php');
}

function get_dbs($series,$cell,$full=False){
	if ($series == 'herm'){
		return herm_dbs($cell,$full);	 
	} elseif ($series == 'male'){
		return male_dbs($cell,$full);
	} elseif ($series == 'pharynx'){
		return pharynx_dbs($cell);
	} else {
		return 0;
	}
}

function herm_dbs($cell,$full=False){
	$dbs = array();
	$_db = new DB();
	$_db->connect('N2U');
	if ($_db->has_cell($cell)){
		$dbs[] = array("N2U","Adult head (N2U)");
	}
	$_db->select_db('JSE');
	if ($_db->has_cell($cell)){
		$dbs[] = array("JSE","Adult tail (JSE)");
	}
	if ($full){
		$_db->select_db('fullanimal');
		if ($_db->has_cell($cell)){
			$dbs[] = array("fullanimal","Fullanimal");
		}
	}
	$_db->con->close();
	return $dbs;
}

function male_dbs($cell,$full=False){
	  $dbs = array();
	  $_db = new DB();
	  $_db->connect('n2y');
	  if ($_db->has_cell($cell)){
	     $dbs[] = array("n2y","Adult tail (N2Y)");
          }
          $_db->select_db('n930');
          if ($_db->has_cell($cell)){
             $dbs[] = array("n930","Adult head (N930)");
          } 
          if ($full){
	     $_db->select_db('fullanimal_male');
	     if ($_db->has_cell($cell)){
	        $dbs[] = array("fullanimal_male","Fullanimal");
             }
          }
          $_db->con->close();
          return $dbs;
}

function pharynx_dbs($cell){
	  $dbs = array();
	  $_db = new DB();
	  $_db->connect('N2W');
	  if ($_db->has_cell($cell)){
	      $dbs[] = array("N2W","Adult pharynx (N2W)");
	  }
   	  $_db->con->close();
          return $dbs;
}

function get_contin_names($db){
	$_db = new DB();
	$_db->connect($db);
	$contins = $_db->get_contin_names();
	return $contins;
}

function get_partner_lists($db,$cell,$ptype)
{
	$_db = new DB();
	$_db->connect($db);
	$idx_1 = 1;
	$idx_2 = 2;
	if ($ptype == "elec"){
	  $partners = $_db->get_gap_junction_partners($cell);
	  $idx_1 = 2;
	  $idx_2 = 3;		  
	} elseif ($ptype == "pre") {
	  $partners = $_db->get_pre_chemical_partners($cell);
	} elseif ($ptype == "post") {
	  $partners = $_db->get_post_chemical_partners($cell);
        };

	$results = array();
	foreach ($partners as $row){
	  $partner = $row[0];
	  if ($row[0] == $cell){
	     $partner = $row[1];
	  }
	  $results[] = array($partner,$row[$idx_1],$row[$idx_2]);
	}	
	
	$_db->con->close();
	return $results;
}

function _get_dbs($series){
	if ($series == 'herm'){
	    $dbs = array("N2U","JSE");
	} elseif ($series == 'male'){
	       $dbs = array("n2y","n930");
	} elseif ($series == 'pharynx'){
	       $dbs = array("N2W"); 
	} else {
	   echo "Series error!";
        }
	return $dbs;
}

function get_gap_junction_synapses($db,$cell){
	  $_db = new DB();
	  $_db->connect($db);
	  $unk = new Unk($db);
	  $syn = new Syn($cell);
	  $data = $_db->get_gap_junction_synapses($cell);
	  foreach ($data as $r){
	    $partner = $r[0];
	    if ($partner == $cell){
		$partner = $r[1];
	    }
	    $partner = $unk->check_syn($partner);
	    $tmp = array($partner,$db,
	 			$r[2],$r[3],$r[4]);
	    $syn->add_syn($tmp);
	  }

	  $_db->con->close();
          return $syn;
}

function get_pre_chemical_synapses($db,$cell){
	  $_db = new DB();
	  $_db->connect($db);

	  $unk = new Unk($db);
  	  $syn = new Syn($cell);
	  $data = $_db->get_pre_chemical_synapses($cell);
	  foreach ($data as $r){
	    $partner = $r[1];
	    $partner = $unk->check_syn($partner);
	    $tmp = array($partner,$db,
	    	 		$r[2],$r[3],$r[4]);
	    $syn->add_syn($tmp);
	  }
	  
	  $_db->con->close();
	  return $syn;
}

function get_post_chemical_synapses($db,$cell){
	  $_db = new DB();
	  $_db->connect($db);
	  $unk = new Unk($db);
	  $syn = new Syn($cell);
	  $_db->select_db($db); //strange, db already set by ->connect?
	  $data = $_db->get_post_chemical_synapses($cell);
	  foreach ($data as $r){
	    $partner = $unk->check_syn($r[0])."->".$unk->check_syn($r[1]);
	    $tmp = array($partner,$db,
	    	 		$r[2],$r[3],$r[4]);
	    $syn->add_syn($tmp);
	  }
	  $_db->con->close();
	  return $syn;  
}

function get_image($db,$contin){
	 $_db = new DB();
	 $_db->connect($db);
	 $data = $_db->get_image_data($contin);
	 $_db->con->close();
	 return $data;
}



function get_syncell($db,$continNum,$synObject){
      //Needed to map image locations
      $_db = new DB();
      $_db->connect($db);
      
      $syn = $_db->get_object_xy($synObject);
      
      $secNum = $_db->get_object_section_number($synObject);

      $cells = $_db->get_synapse_cell_objects($continNum);

      $data = array();
      foreach($cells as $k => $v){
      		$contin = $_db->get_object_contin($v);
      		$conName = $_db->get_contin_name($contin);
		$data[$k] = new CellSyn($contin);
		$data[$k]->add_name($conName);
		$objs = $_db->get_section_contin_object($secNum,$contin);
		$minDist = 10000000;
		foreach($objs as $o){
		      $loc = $_db->get_object_xy($o);
		      $dist = pow($syn['x'] - $loc['x'],2)
		          + pow($syn['y'] - $loc['y'],2);
		      if ($dist < $minDist){
		 	    $minX = $loc['x'];
		            $minY = $loc['y'];
		            $minDist = $dist;
		            $minObj = $o;
		      }
		}
		$data[$k]->add_object($minObj);
		$data[$k]->add_x($minX);
		$data[$k]->add_y($minY);
      }

      $data['synapse'] = new CellSyn($contin);
      $data['synapse']->add_object($synObject);
      $data['synapse']->add_x($syn['x']);
      $data['synapse']->add_y($syn['y']);
      $data['synapse']->add_type($_db->get_synapse_type($continNum));
      
      return $data;
      
}


class Unk {

      function __construct($series){
      	      $this->series = $series;
	      $herm = array('N2U','JSE');
	      $male = array('n2y','n930');
	      if (in_array($series,$herm)) {
	      	 $this->unk_file = '../../cell_files/unk_herm.txt';
	       } else if (in_array($series,$male)) {
	         $this->unk_file = '../../cell_files/unk_male.txt';
	       } else if ($series == 'N2W'){
	       	 $this->unk_file = '../../cell_files/unk_pharynx.txt';
	       }
	       
	       $this->unk_array = array_map('trim',file($this->unk_file));
      }


      function check_unk($cell){
      	       $cell = trim($cell);
      	       if (in_array($cell,$this->unk_array)){
	       	  return 'unk';
	       } else {
	       	  return $cell;
      	       }
      }


      function check_syn($syn){
      	       $syn = trim($syn);
      	       $_syn = explode(",",$syn);
	       foreach ($_syn as &$s){
	       	       $s = $this->check_unk($s);
	       }
	       $syn = implode(",",$_syn);
	       return $syn;
      }

}


class CellSyn {
      
      function __construct($contin){
      	              $this->contin = $contin;	       
      }

      function get_contin(){
      	              return $this->contin;
      }

      function add_object($obj){
      	     $this->object = $obj;
      }
      
      function get_object(){
      	     return $this->object;
      }
      
      function add_x($x){
      	     $this->x = $x;
      }
      
      function get_x(){
      	     return $this->x;
      }      

      function add_y($y){
      	      $this->y = $y;
      }
      
      function get_y(){
      	      return $this->y;
      }

      function add_name($name){
      	      $this->name = $name;
      }
      
      function get_name(){
      	      return $this->name;
      }

      function add_type($type){
      	      $this->type = $type;
      }
      
      function get_type(){
      	      return $this->type;
      }      

}     


class NeuronTrace {
	//$continName should be $cell?
	//that's how it's invoked in retrieve...php..
	function __construct($_db,$continName){
		$this->db = $_db->db; //just the name of db, not the object
		$this->db_obj = $_db; //gonna try to store the whole object too
		$this->continName = $continName;
		
		//cell is recorded in several contins; get those contin numbers
		$this->continNums = $_db->get_contin_numbers($continName);

		//cell also goes through several parts of worm e.g. NR, VC etc
		//store the neuron trace for each part separately
		//  $this->series['NR'] = trace data for part of neuron in NR
		$this->series = array();
		foreach ($this->continNums as $c){
			$series = $_db->get_display2_series($c);
			foreach ($series as $s){
				$tmp = $s;
				if (strcmp('Ventral Cord',$s) == 0 or strcmp('Ventral Cord 2',$s) == 0) {
					$tmp = 'VC'; 
				} 
				$this->series[$tmp] = new TraceLocation();
			}
		}
		$this->cellBody = new TraceLocation();
		$this->preSynapse = new TraceSynapse();
		$this->postSynapse = new TraceSynapse();
		$this->gapJunction = new TraceSynapse();
		$this->remarks = array();
		$this->plotParam = array();
		$this->objects = array();


    // YH
	  //stuff copied from retrieve_trace_coord.php
	  $DISPLAY = 2;
	  //_v is discarded
	  foreach ($this->series as $s => $_v){
	  	if ($DISPLAY == 2){
	  		$sql = $this->display2_sql($s);
	  	} elseif ($DISPLAY == 3){
	  		$sql = $this->display3_sql($s);
	  	}
      $val = $_db->_return_query_rows_assoc($sql);
	  	foreach ($val as $v){
	  		$this->series[$s]->add_x($v['x1'],$v['x2']);
	  		$this->series[$s]->add_y($v['y1'],$v['y2']);
	  		$z1 = $_db->get_object_section_number($v['objName1']);
	  		$z2 = $_db->get_object_section_number($v['objName2']);
	  		$this->series[$s]->add_z($z1,$z2);
	  		$this->series[$s]->add_cb($v['cellbody']);
	  		$this->add_object($v['objName1'],$v['x1'],$v['y1'],$z1);
	  		$this->add_object($v['objName2'],$v['x2'],$v['y2'],$z2);
	  		if ($v['cellbody'] == 1){
	  			$this->cellBody->add_x($v['x1'],$v['x2']);
	  			$this->cellBody->add_y($v['y1'],$v['y2']);
	  			$this->cellBody->add_z($z1,$z2);
        }
        // rather strange that the NULL values automatically become ''
	  		if ($v['remarks1'] != ''){
	  			$this->add_remark($v['x1'],$v['y1'],$z1,$s,$v['remarks1']);
	  		}
	  		if ($v['remarks2'] != ''){
	  			$this->add_remark($v['x2'],$v['y2'],$z2,$s,$v['remarks2']);
        }
        // YH basically same as remark, just we use assoc array
        // and keep the object number
        // TODO
	  	}
	  }
	}

	function add_object($obj,$x,$y,$z){
		$this->objects[$obj] = array( 
			'x' => $x,
			'y' => $y,
			'z' => $z
		);
	}
      
	
	//expect object number..
	//neuron made of many objects
	//xyz is added by add_object,
	//and is obtained from display2
	//this differs from the values from object table;
	//e.g. see the object 43881,
	//in display2, by
	// select * from display2 where objName1 = 43881;
	//get x1 = 1191, y1 = 709, z1 = 74
	//but in object, by
	// select * from object where OBJ_Name = 43881;
	//get OBJ_X = 4165, OBJ_Y = 2292
	function get_object_xyz($obj){
		if (array_key_exists($obj,$this->objects)){
			return $this->objects[$obj];
		} else {
			return -1;
		}
	}

	function display2_sql($series){
		$continStr = implode(",",$this->continNums);
		$sql = "select x1,x2,y1,y2,objName1,objName2,cellbody1 as cellbody,remarks1,remarks2 
			from display2
			where continNum in ($continStr)
			and series1 = '$series'
			order by display2.z1 asc";
		return $sql;
		//TODO if sql problem maybe tabs in sql query string gives problem
	}

	function display3_sql($series){
		$continStr = implode(",",$this->continNums);
		$sql = "select x1,x2,y1,y2,objName1,objName2,cellbody1 as cellbody,remarks1,remarks2 
			from display3
			where continNum in ($continStr)
			and series1 = '$series'
			order by display3.z1 asc";
		return $sql;
	}

	//who uses this?
	function _display_sql($series){
		$continStr = implode(",",$this->continNums);
		$sql = "select r.ObjName1 as objName1,o1.OBJ_X as x1,o1.OBJ_Y as y1,
			i1.IMG_SectionNumber as z1,o1.OBJ_Remarks as remarks1,
			o1.cellType as cellbody, 
			r.ObjName2 as objName2,o2.OBJ_X as x2,o2.OBJ_Y as y2,
			i2.IMG_SectionNumber as z2,o2.OBJ_Remarks as remarks2
			from relationship r 
			inner join object o1 on r.ObjName1 = o1.OBJ_Name 
			inner join object o2 on r.ObjName2 = o2.OBJ_Name 
			inner join image i1 on o1.IMG_Number = i1.IMG_Number 
			inner join image i2 on o2.IMG_Number = i2.IMG_Number 
			where continNum in ($continStr)
			and i1.IMG_Series = '$series' 
			order by z1 asc";
		return $sql;
	}


  function add_remark($x,$y,$z,$series,$remark){
    // why negative in x???
		$this->remarks[] = array(-$x,$y,$z,$series,$remark);
	}

	function load_map2_params($_db){
		$continStr = implode(",",$this->continNums);
		$query = array(
			'xScaleMin' => "select max(x1) as val from display2",
			'xScaleMax' => "select min(x1) as val from display2",
			'yScaleMin' => "select min(y1) as val from display2",
			'yScaleMax' => "select max(y1) as val from display2",
			'zScaleMin' => "select min(z1) as val from display3",
			'zScaleMax' => "select max(z1) as val from display3"
		);
		foreach($query as $k => $q){
			$val = $_db->_return_value_assoc($q,'val');
			$this->plotParam[$k] = $val;
		}    
		$this->plotParam['xScaleMin'] = -$this->plotParam['xScaleMin'];
		$this->plotParam['xScaleMax'] = -$this->plotParam['xScaleMax'];
	}

	//TODO these params are attributes of the series (N2Y or N2U etc)
	//and not of individual neurons
	//need better separation of logic!!
	function load_map3_params($_db){
		$continStr = implode(",",$this->continNums);
		$query = array(
			'xScaleMin' => "select max(x1) as val from display3",
			'xScaleMax' => "select min(x1) as val from display3",
			'yScaleMin' => "select min(y1) as val from display3",
			'yScaleMax' => "select max(y1) as val from display3",
			'zScaleMin' => "select min(z1) as val from display3 where continNum in ($continStr)",
			'zScaleMax' => "select max(z1) as val from display3 where continNum in ($continStr)"
		);
		foreach($query as $k => $q){
			$val = $_db->_return_value_assoc($q,'val');
			$this->plotParam[$k] = $val;
		}    
		$this->plotParam['xScaleMin'] = -$this->plotParam['xScaleMin'];
		$this->plotParam['xScaleMax'] = -$this->plotParam['xScaleMax'];
	}

	function compile_data(){
		$data = array();
		$data['name'] = $this->continName;
		$data['series'] = $this->db;
		$data['cellBody'] = $this->cellBody->get_data();
		$data['preSynapse'] = $this->preSynapse->get_synapses();
		$data['postSynapse'] = $this->postSynapse->get_synapses();
		$data['gapJunction'] = $this->gapJunction->get_synapses();
    $data['nmj'] = array();
    // original remarks; I think it returns duplicate objects
    // did my own version below, objRemarks
		$data['remarks'] = $this->remarks;
    $data['objRemarks'] = $this->objRemarks; // YH
		foreach($this->series as $s => $v){
			$data[$s] = $this->series[$s]->get_data();
		}
    $data['plotParam'] = $this->plotParam;
		return $data;     
	}

}     


/*
 * meant to store the neuron traces
 * x,y,z: array of pairs
 * so that you should draw a line segment
 * from (x[n][0],y[n][0],z[n][0])
 * to (x[n][1],y[n][1],z[n][1])
 * not sure what cb does, should stand for cell body
 */
class TraceLocation {
	function __construct(){
		$this->x = array();
		$this->y = array();
		$this->z = array();
		$this->cb = array(); //cb = cell body?
	}
      
	function add_x($x1,$x2){
		$this->x[] = array(-$x1,-$x2);
	}
	
	function add_y($y1,$y2){
		$this->y[] = array($y1,$y2);
	}
	
	function add_z($z1,$z2){
		$this->z[] = array($z1,$z2);
	}
	      
	function add_cb($cb){
		$this->cb[] = $cb;
	}     
	
	function get_data(){
		$tmp = array(
			'x' => $this->x,
			'y' => $this->y,
			'z' => $this->z,
			'cb' => $this->cb
		);
		return $tmp;
	}
}



class TraceSynapse{
	function __construct(){
		$this->synapses = array();
	}

	function add_synapse($x,$y,$z,$secs,$label,$z1,$z2,$cont,$pre,$post){
		$this->synapses[] = array(-$x,$y,$z,$secs,$label,
			$z1,$z2,$cont,$pre,$post);
	}

	function get_synapses(){
		return $this->synapses;
	}
}


?>
