<?php

// improved versioin of images.php

class Image {
  // $file is just the filename
  // need to call load to actually get the image
  function __construct($file) {
    $this->file = $file;
    $this->rectLineThickness = 25;
    $this->maxWidth = 800;
    $this->maxHeight = 800;        

    // to be set by set_rect_dimensions and set_rect_center
    $this->rectWidth = 0;
    $this->rectHeight = 0;
    $this->center_x = 0;
    $this->center_y = 0;

    // derived quantity, reset whenver dim/center are set
    $this->corner_x = 0;
    $this->corner_y = 0;
  }

  // set dims of rectangle drawn around synapse object
  // replaces set_dimensions
  function set_rect_dimensions($width,$height) {
    $this->rectWidth = $width;
    $this->rectHeight = $height;

    $this->corner_x = $this->center_x - $this->rectWidth / 2;
    $this->corner_y = $this->center_y - $this->rectHeight / 2;
  }

  // typically the coordinates of synapse object
  function set_rect_center($x, $y) {
    $this->center_x = $x;
    $this->center_y = $y;

    $this->corner_x = $this->center_x - $this->rectWidth / 2;
    $this->corner_y = $this->center_y - $this->rectHeight / 2;
  }

  function load() {
    $this->img = imagecreatefromjpeg($this->file);
    //or die("Cannot create new JPEG image");
  }

  // the functions image..() are standard php functions
  function draw_rect() {
    // set line color/thickness
    $red = imagecolorallocate($this->img,255,0,0);
    imagesetthickness($this->img, $this->rectLineThickness);

    // draw rectangle around object
    imagerectangle($this->img,
      $this->corner_x,
      $this->corner_y,
      $this->corner_x + $this->rectWidth,
      $this->corner_y + $this->rectHeight,
      $red);

    // reset line thickness
    imagesetthickness($this->img, 1);

    //=========================
    // may need to scale down if original image is too big

    $iOrigWidth = imagesx($this->img);
    $iOrigHeight = imagesy($this->img);

    $fScale = min($this->maxWidth / $iOrigWidth,
                  $this->maxHeight / $iOrigHeight);

    if ($fScale >= 1) {
      return;
    }

    $iNewWidth = floor($fScale * $iOrigWidth);
    $iNewHeight = floor($fScale * $iOrigHeight);

    // creates black image of given size
    $tmpimg = imagecreatetruecolor($iNewWidth, $iNewHeight);

    imagecopyresampled(
      $tmpimg,                    $this->img,
      0, 0,                       0, 0,
      $iNewWidth, $iNewHeight,    $iOrigWidth, $iOrigHeight
    );

    imagedestroy($this->img);
    $this->img = $tmpimg;
  }

  function show(){
    ob_start();
    imagejpeg($this->img,NULL,100);
    $rawImageBytes = ob_get_clean();
    echo "<img src='data:image/jpeg;base64,".base64_encode($rawImageBytes)."'/>";         
  }

  function encode(){
    ob_start();
    imagejpeg($this->img,NULL,100);
    $rawImageBytes = ob_get_clean();
    return base64_encode($rawImageBytes);      
  }     

  function clear(){
    imagedestroy($this->img);
  }

  function crop_image_to_rect($cellsyn) {
    if ($cellsyn['synapse']->get_type() == 'electrical') {
      $pre = imagecolorallocate($this->img,0,255,255);
      $post = imagecolorallocate($this->img,0,255,255);
    } else {
      $pre = imagecolorallocate($this->img,250,88,130); 
      $post = imagecolorallocate($this->img,191,0,255);
    }
    $white = imagecolorallocate($this->img, 255, 255, 255);
    $red = imagecolorallocate($this->img,255,0,0);
    $font = './font.ttf';     
         
    imagettftext(
      $this->img, 15, 0,
      $cellsyn['synapse']->get_x(),
      $cellsyn['synapse']->get_y(),
      $red, $font, 'x');
   
    imagettftext($this->img, 15, 0,
      $cellsyn['pre']->get_x(),
      $cellsyn['pre']->get_y(),
      $pre, $font, $cellsyn['pre']->get_name());
   
    $tmp = array('post1','post2','post3','post4');
    foreach ($tmp as $k) {
      if (array_key_exists($k,$cellsyn)) {
        imagettftext($this->img, 15, 0,
          $cellsyn[$k]->get_x(),
          $cellsyn[$k]->get_y(),
          $post, $font, $cellsyn[$k]->get_name());
      }
    }

    $this->img = imagecrop($this->img, [
      'x' => $this->corner_x,
      'y' => $this->corner_y,
      'width' => $this->rectWidth,
      'height' => $this->rectHeight
    ]);
  }
}

?>
