<?php
/*
 * gets list of synaptic partners of given cell,
 * separated by synapse type (gap/pre/post),
 * totals up number of synapses and total number of sections
 * (ignores 'polyad' structure of chemical synapses)
 *
 * a row of data returned is an associative array of the form
 * [partner] => AVDL, [count] => 2, [sections] => 3
 *
 * for chemical synpases,
 * pre means synapses where given cell is pre, likewise for post
 */

include('./dbconnect.php');

// get database, cellname value from url
$db = $_GET['db']; // 'series' in old version
$cell = $_GET['cell']; // 'cell' in old version

// connection to mysql database; dbconnect.php
$dbcon = new DB();
$dbcon->connect($db);

//=======================================================
// auxiliary function
// $arr is $gap, $pre, or $post
// has a key for each partner
// record a synapse into $arr, keeping count and tot sect
function add_count_sections(& $arr, $partner, $sections) {
	if (!isset($arr[$partner])) {
		$arr[$partner] = array('count' => 0, 'sections' => 0);
	}
	$arr[$partner]['count'] += 1;
	$arr[$partner]['sections'] += $sections;
}

//=======================================================
// gap junctions
$gap = array();

// ideally could use MySQL 'GROUP BY',
// but we don't know whether $cell is pre or post here
$sql = "select pre,post,sections
	from synapsecombined
	where ( pre='$cell' or post='$cell' ) 
		and type = 'electrical'";

$query_results = $dbcon->_return_query_rows_assoc($sql);

// total up
foreach ($query_results as $v) {
	$partner = $v['pre'];
	if ($partner == $cell) {
		$partner = $v['post'];
	}
	add_count_sections($gap, $partner, $v['sections']);
}

//=======================================================
// chemical synapses
// if a post cell appears twice in a synapse,
// e.g. RMDDR -> dBWML6,dBWML6 (continNum=785)
// we count it twice, that is, we treat it as a regular synapse
// RMDDR -> dBMWL6 which occurs twice
// (this applies to the counting in $pre and $post)
$pre = array();
$post = array();

$sql = "select pre, post1, post2, post3, post4, sections
	from synapsecombined
	where pre='$cell' or post like '%$cell%'
		and type = 'chemical'";

$query_results = $dbcon->_return_query_rows_assoc($sql);

foreach ($query_results as $v) {
	if ($v['pre'] == $cell) {
		foreach (['post1','post2','post3','post4'] as $pp) {
			if ($v[$pp] != '') {
				add_count_sections($pre, $v[$pp], $v['sections']);
			}
		}
	}
	foreach (['post1','post2','post3','post4'] as $pp) {
		if ($v[$pp] == $cell) {
			add_count_sections($post, $v['pre'], $v['sections']);
		}
	}
}

$data = array(
  'headers' => $db,
  'gap' => $gap,
  'pre' => $pre,
  'post' => $post
);

echo json_encode($data);

?>
