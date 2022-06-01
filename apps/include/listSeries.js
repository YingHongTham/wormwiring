const listOfAllSeries = [

]


/*
 * obtained by:
select distinct(series1) from n2y.display2;
select distinct(series2) from n2y.display2;
select distinct(series1) from n930.display2;
select distinct(series2) from n930.display2;
select distinct(series1) from N2U.display2;
select distinct(series2) from N2U.display2;
select distinct(series1) from N2W.display2;
select distinct(series2) from N2W.display2;
select distinct(series1) from JSE.display2;
select distinct(series2) from JSE.display2;
select distinct(series1) from JSH.display2;
select distinct(series2) from JSH.display2;

should be updated in future update script

*/

mysql> select distinct(series1) from n2y.display2;
| DRG       |
| LL        |
| RL        |
| Right     |
| PAG       |
| DGL4      |
| LA        |
| VC        |
| Left      |
| Dorsal    |
| nervering |
mysql> select distinct(series2) from n2y.display2;
| DRG            |
| LL             |
| RL             |
| Right          |
| PAG            |
| DGL4           |
| LA             |
| Ventral Cord   |
| Ventral Cord 2 |
| Left           |
| Dorsal         |
| nervering      |
mysql> select distinct(series1) from n930.display2;
| VG      |
| dorsal  |
| ventral |
| NR      |
mysql> select distinct(series2) from n930.display2;
| VG      |
| dorsal  |
| ventral |
| NR      |
mysql> select distinct(series1) from N2U.display2;
| NR      |
| VC      |
| DC      |
| VC2     |
| RIG     |
| LEF     |
mysql> select distinct(series2) from N2U.display2;
| NR      |
| VC      |
| DC      |
| VC2     |
| RIG     |
| LEF     |
mysql> select distinct(series1) from N2W.display2;
| ph      |
mysql> select distinct(series2) from N2W.display2;
| ph      |
mysql> select distinct(series1) from JSE.display2;
| PAG        |
| dorsal     |
| Brown      |
| Red        |
| Red Series |
mysql> select distinct(series2) from JSE.display2;
| PAG          |
| dorsal       |
| Brown Series |
| Red Series   |
| Red          |
| Brown        |
mysql> select distinct(series1) from JSH.display2;
| JS      |
| NR      |
mysql> select distinct(series2) from JSH.display2;
| JS      |
| NR      |

