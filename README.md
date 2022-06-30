# wormwiring
Connectome project for wormwiring.org

# MySQL Tables
The Skeleton Viewer app pulls data directly from several MySQL databases.
The data is collected with the Elegance software.
The main organizing concepts are objects, relationships, and contins:
* an object is a slice/section of something, e.g. a cell body,
a synapse, etc
* a relationship connects two objects in different z-slices that should be part of one thing
* a contin is a connected set of objects (that is, any two objects are connected by a sequence of relationships)

Cells are often made of several contins,
appearing to be disconnected
(this may be due to difficulty in tracing in the nerve ring),
but synapses are always connected in one contin.

Note that contins may not always consist of a 'line graph',
some objects in a contin may have degree 3.

A *contin* is referred to by its contin number/ID
(this is CON_Number, not continID, in contin table,
and often continNum in other tables);
since a synapse only has one contin, synapses are referred to
by their contin numbers (sometimes call it synapse ID)

A *section* refers to an EM section,
and section number is treated as the z-coordinate.
It is, oddly, not found in the object table,
but in the image table, as IMG_SectionNumber;
the object table has an IMG_Number field,
which allows you to join to the image table
to extract the IMG_SectionNumber.

Sometimes name means cell, other times it means number..
e.g. objName1 is a number

Here is a summary of the relevant tables:

**contin**: conti(g)uous pieces; only connects across z-sections
note: contins can go up AND down in z-direction (even branch)
- continID: id for the table (other tables don't use this)
- CON_Number: id used by Elegance; also unique; other tables use this to identify contins (typically as continNum)
- CON_AlternateName: cell name, if applicable
- (... where CON_AlternateName like '%${ADAL}%')
- CON_AlternateName2: ??
- CON_Remarks: nothing to do with remarks in display2
- type: neuron, chemical, electrical
- series: NR (nerve ring), VC (ventral cord), ...
- count: number of sections which the contin spans, but.. (see warning below)
- sectionNum1: lowest section of contin (see warning below)
- sectionNum2: highest (see warning below)
- synSections: always 0..??
- eleSections: also always 0..??

**WARNING**: sectionNum1/2 may not be the actual section number;
I THINK they refer to section numbers within the relevant series (NR,VC, etc)
warning: count may not be the most accurate either; it seems some slices are missing.
For example, the synapse with contin=761 has count=7, and sectionNum1/2 = 89/96,
and this is because there is no image slice at z=92,
so here sectionNum1/2 is more accurate..

Worse example: the synapse with contin=5785 has count=5, and sectionNum1/2 = 201/383,
and the actual sections are z=183,201,202,203,204...
(sections here refers to IMG_SectionNumber in the image table)

There are some weird data where count = 0; e.g. contin = 368.

**relationship**: connects objects that belong to the same thing
(cell, synapse, etc).
I don't think this is really used in the Viewer apps,
as display2 has more information.
- relID: id for the table
- REL_Remarks: ??
- ObjName1: object number connect to ObjName2
- ObjName2: object number connected to ObjName1
- segmentNum: diff in section number bt obj 1 and 2 (I think)
- continNum: contin number

Synapses appear on the skeleton
because the query looks in synapsecombind for all synapse
with that cell as pre, and gets that cell's object number,
and gets the coordinates for that object number,
NOT the coordinates of the synapse object

**synapsecombined**: each row is one synapse
- idx: id for table
- pre: name of pre cell
- post: name(s) of post cell(s) (comma-sep list)
- type: chemical/gap junction
- members: objects in the synapse (comma-sep list of length = sections)
- sections: number of sections; used as proxy for size
- post1,2.. : just post, separated out
- type2: ??
- series: VC, NR, etc. (possibly multiple)
- partnerNum: number of post ??
- mid: object number of object in middle of contin of synapse
- preobj, postobj1.. : object number of pre,post
- continNum: clear


**display2**: essentially relationship, but with the coordinates,
and it has been smoothed out by Elegance.
- objName1, objName2: object numbers of connected objects
- x1, y1, z1, x2, y2, z2: their coordinates
- cellbody1: == 1 if and only if this segment is part of the cellbody
  (it's not a 0/1 thing, e.g. -2 is a possible value,
	which maybe means is a synapse? unclear)
- cellbody2: no idea what it's for, not used, differs from cellbody1
	(e.g. can be 1 even though it's in a synapse)
- remarks1, remarks2: remarks attached to respective objects
  (e.g. 'end', 'start dorsal commissure')
- continNum: contin which this segment is part of
- segmentNum: ??
- idx: id for table?
- branch1: ??
- series1, series2: series that objects belong to
  (can be different)



# Skeleton Viewer
The Skeleton Viewer app is the app that makes the most queries,
in quantity and complexity, to the MySQL tables.
Here we give a summary of the queries made
in a single request for the skeleton/synapses etc of a cell
in the app,
php mostly processed by retrieve_trace_coord_alt.php and dbconnect.php
in the /apps/php folder.

TODO

# Setup

The MySQL tables are queried via php,
see /apps/php/dbconnect.php

The EM section images shown in Synapse Viewer
are in image_data
(which is really a symlink to some folder
outside of here)
Volumetric Viewer gets its .obj and .mtl files from
/apps/neuronVolume/models/{db}/
(which are also symlinks to the relevant folder)


