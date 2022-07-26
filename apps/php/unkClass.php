<?php

// helps in checking whether some names are unk(nown)
// essentially holds a list of 'unk(nown)' names,
// (unknown neurite process identification)
class Unk {
  function __construct($series) {
    $this->series = $series;
    $herm = array('N2U','JSE'); // N2W handled below, but JSH?
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

  function clean_name_or_unk($cell) {
    $cell = trim($cell);
    if (in_array($cell,$this->unk_array)){
      return 'unk';
    } else {
      return $cell;
    }
  }

  // good function name; stolen from check_syn
  // applies clean_name_or_unk to a comman-sep list of cells
  function clean_names_csv($cells){
    $cells = trim($cells);
    $cellList = explode(",",$cells);
    foreach ($cellList as &$cell) { // alter in place
      $cell = $this->clean_name_or_unk($cell);
    }
    return implode(",",$cellList);
  }
}

?>
