<?php
/*
 * gets list of synapses of a given cell
 * separated by synapse type (gap/pre/post),
 *
 * a row of data returned is an associative array of the form
 * array(
 *  // we let client-side recreated partner from pre/post
 *  // helps with combining this with partnerList app
 *  //"partner" => "ADFL->ADAL,RIAL",
 *  "pre" => "ADFL",
 *  "post" => "ADAL,RIAL",
 *  "db" => "N2U",
 *  "sections" => 2,
 *  "contin" => 5860,
 *  "z" => 212
 * );
 * for a row corresponding to a gap junction,
 * $pre is always $cell
 *
 * (so unlike the old version getSynapseList.php,
 * we do not group by partner (which the Syn class does),
 * and instead let the client-side handle;
 * that also means getPartnerList(-alt).php is obsolete)
 *
 * for chemical synpases,
 * pre means synapses where given cell is pre, likewise for post
 */

include('./dbconnect.php'); // for DB, connection to MySQL
include('./unkClass.php'); // for Unk

// get database, cellname value from url
$db = $_GET['db']; // 'series' in old version
$cell = $_GET['cell']; // 'continName' in old version

// connection to mysql database; dbconnect.php
$dbcon = new DB();
$dbcon->connect($db);

// class which helps deal with unknown entries
$unk = new Unk($db);

//=======================================================
// gap junctions
$gap = array();
$sql = "select
    pre, post, sections,
    continNum as contin,
    image.IMG_SectionNumber as z
  from synapsecombined
    join object
      on synapsecombined.mid = object.OBJ_Name
    join image
      on object.IMG_Number = image.IMG_Number
  where (pre like '%$cell%'
    or post like '%$cell%')
    and synapsecombined.type like 'electrical'
  order by pre desc,sections desc";

$query_results = $dbcon->_return_query_rows_assoc($sql);

foreach ($query_results as $v) {
  $v['pre'] = $unk->clean_name_or_unk($v['pre']);
  $v['post'] = $unk->clean_name_or_unk($v['post']);
  $partner = ($v['pre'] != $cell) ? $v['pre'] : $v['post'];

  // ensure integer not string
  foreach (['sections','contin','z'] as $k) {
    $v[$k] = intval($v[$k]);
  }
  $gap[] = array(
    //'partner' => $partner,
    'pre' => $cell,
    'post' => $partner,
    'db' => $db,
    'sections' => $v['sections'],
    'contin' => $v['contin'],
    'z' => $v['z']);
}



//=======================================================
// chemical synapses, pre
$pre = array();
$sql = "select
    pre, post, sections,
    continNum as contin,
    image.IMG_SectionNumber as z
  from synapsecombined
    join object
      on synapsecombined.mid = object.OBJ_Name
    join image
    on object.IMG_Number = image.IMG_Number
  where pre like '%$cell%'
    and synapsecombined.type like 'chemical'
  order by pre desc,sections desc";

$query_results = $dbcon->_return_query_rows_assoc($sql);

foreach ($query_results as $v) {
  $partner = $unk->clean_names_csv($v['post']);

  // ensure integer not string
  foreach (['sections','contin','z'] as $k) {
    $v[$k] = intval($v[$k]);
  }
  $pre[] = array(
    //'partner' => $partner,
    'pre' => $cell,
    'post' => $partner,
    'db' => $db,
    'sections' => $v['sections'],
    'contin' => $v['contin'],
    'z' => $v['z']);
}



//=======================================================
// chemical synapses, post
// in pre query, rather lax on pre like '%$cell%',
// so I don't get why we're stricter on post;
// the old query uses:
//  where (post like binary '$cell'
//    or post like binary '%,$cell'
//    or post like binary '$cell,%'
//    or post like binary '%,$cell,%')
//    and ...
$post = array();
$sql = "select
    pre, post, sections,
    continNum as contin,
    image.IMG_SectionNumber as z
  from synapsecombined 
    join object
      on synapsecombined.mid = object.OBJ_Name
    join image
      on object.IMG_Number = image.IMG_Number
    where post like '%$cell%'
      and synapsecombined.type like 'chemical'
    order by
      image.IMG_SectionNumber asc, pre desc, sections desc";

$query_results = $dbcon->_return_query_rows_assoc($sql);

foreach ($query_results as $v) {
  $cleaned_pre = $unk->clean_name_or_unk($v['pre']);
  $cleaned_post = $unk->clean_names_csv($v['post']);
  $partner = $cleaned_pre."->".$cleaned_post;

  // ensure integer not string
  foreach (['sections','contin','z'] as $k) {
    $v[$k] = intval($v[$k]);
  }
  $post[] = array(
    //'partner' => $partner,
    'pre' => $cleaned_pre,
    'post' => $cleaned_post,
    'db' => $db,
    'sections' => $v['sections'],
    'contin' => $v['contin'],
    'z' => $v['z']);
}


$data = array(
  'gap' => $gap,
  'pre' => $pre,
  'post' => $post
);

echo json_encode($data);
?>
