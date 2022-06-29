# wormwiring
Connectome project for wormwiring.org

(neuronVolume mtl files are in
/apps/neuronVolume/models/{db}/
which is a symlink to the relevant folder)


# MySQL Tables
The Skeleton Viewer app pulls data directly from several MySQL databases.
The data is collected with the Elegance software.
The main organizing concepts are objects, relationships, and contins:
* an object is a slice/section of something, e.g. a cell body,
a synapse, etc
* a relationship connects two objects in different z-slices that should be part of one thing
* a contin is a connected set of objects (that is, any two objects are connected by a sequence of relationships)

Cells are often made of several contins
(this may be due to difficulty in tracing in the nerve ring),
but synapses are always connected in one contin.

Note that contins may not always consist of a 'line graph',
some objects in a contin may have degree 3
e.g. see sql tables:
 select * from (select count(*) as degree, continNum, ObjName1 from relationship group by continNum, ObjName1) as tmp where degree > 2 limit 50; 
 select * from (select count(*) as degree, continNum, objName1 from display2 group by continNum, objName1) as tmp where degree > 2 limit 50;


Here is a summary of the relevant terms, tables and, fields:

contins are referred to by their contin number/ID
(this is CON_Number, not continID, in contin table,
and often continNum in other tables);
since a synapse only has one contin, synapses are referred to
by their contin numbers (sometimes call it synapse ID)

section refers to the EM section number,
basically the z-coordinate.

contin: conti(g)uous pieces; only connects across z-sections
note: contins can go up AND down in z-direction (even branch)
* continID: id for the table (other tables don't use this)
* CON_Number: id used by Elegance; also unique; other tables use this to identify contins (typically as continNum)
* CON_AlternateName: cell name, if applicable
  (... where CON_AlternateName like '%${ADAL}%')
* CON_AlternateName2: ??
* CON_Remarks: nothing to do with remarks in display2
* type: neuron, chemical, electrical
* series: NR (nerve ring), VC (ventral cord), ...
* count: number of sections which the contin spans, but.. (see warning below)
* sectionNum1: lowest section of contin (see warning below)
* sectionNum2: highest (see warning below)
* synSections: always 0..??
* eleSections: also always 0..??

warning: sectionNum1/2 may not be the actual section number;
I THINK they refer to section numbers within the relevant series (NR,VC, etc)
warning: count may not be the most accurate either; it seems some slices are missing.
For example, the synapse with contin=761 has count=7, and sectionNum1/2 = 89/96,
and this is because there is no image slice at z=92,
so here sectionNum1/2 is more accurate..

Worse example: the synapse with contin=5785 has count=5, and sectionNum1/2 = 201/383,
and the actual sections are z=183,201,202,203,204...
(sections here refers to IMG_SectionNumber in the image table)

there are some weird data where count = 0; e.g. contin = 368

relationship: tells you the objects in a contin
- relID: id for the table
- REL_Remarks: ??
- ObjName1: object number
- ObjName2: object number connected to ObjName1
- segmentNum: diff in section number bt obj 1 and 2
- continNum: contin number

sometimes name means cell, other times it means number..
e.g. objName1 is a number

display2 is something that Elegance generates,
which is more smoothed out, apparently.
in original version (see cellSynapseChemicalPre),
synapses appear on the skeleton
because the query looks in synapsecombind for all synapse
with that cell as pre, and gets that cell's object number,
and gets the coordinates for that object number,
NOT the coordinates of the synapse object

synapsecombined: each row is one synapse
- idx: some index
- pre: name of pre cell
- post: name(s) of post cell(s) (comma-sep list)
- type: chemical/gap junction
- members: objects encoding the synapse (comma-sep list)
- sections: number of sections, as proxy for size
- post1,2.. : just post, separated out
- type2: ??
- series: VC, NR, both?
- partnerNum: number of post
- mid: object number of 
- preobj, postobj1.. : object number of pre,post
- continNum: clear


