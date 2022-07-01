<?php
include('./dbaux.php');

$series = $_GET['series'];
$continName = $_GET['continName']; // name of cell

// for debugging
//$series = 'N2U';
//$continName = 'ASHL';

// YH where 'sleep' from?
$series = str_ireplace('sleep','',$series);
$continName = str_ireplace('sleep','',$continName);

$data = array(
  'headers' => $series,
  'elec' => get_partner_lists($series,$continName,'elec'),
  'pre' => get_partner_lists($series,$continName,'pre'),
  'post' => get_partner_lists($series,$continName,'post')
);

echo json_encode($data);


/*
 * queries are made to synapsenomultiple table,
 * which I haven't looked at before.
 * attempting to figure out what it means.
 * Initially I thought it just gives one row per pair of cells,
 * as a summary of say number of synapses between them/total size
 * but it seems it has one row for each synapse..
 * so what does 'no multiple' in synapsenomultiple mean?
 * seems it's just that there are no polyads.
 * BUT!
 * you'd think that it agrees with synapsecombined.
 * but no, we can't have nice things in life.
 *
 * For example, this query should return empty:
 * select * from (select bb.pre, bb.post, bb.c1, count(*) as c2 from (select pre, post, count(*) as c1 from synapsenomultiple group by pre, post) as bb join synapsecombined on bb.pre = synapsecombined.pre and synapsecombined.post like CONCAT('%',bb.post,'%') group by bb.pre, bb.post) as cc where cc.c1 != c2;
 *
 * Granted, there are very few,
 * but the annoying thing is that sometimes c1 > c2 and sometimes c1 < c2,
 * so it's hard to tell which to trust.
 * I'm going with synapsecombined being the better source,
 * so I must rewrite the queries above.
 *
 * upon further inspection, it seems that
 * c1 > c2 because polyad like ADEL -> RMHR,RMHR gets counted twice
 * in synapsenomultiple, whereas,
 * c1 < c2 because synapsenomultiple may have bad names like
 * RIAL_old which don't get counted properly.
 */
