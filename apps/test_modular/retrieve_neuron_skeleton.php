<?php

//echo '{"test": "hello"}';
$data = array();
$data['a'] = 'b';
$data['c'] = array();
$data['c']['d'] = 'e';
echo json_encode($data);

?>
