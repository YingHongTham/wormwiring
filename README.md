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

**On Coordinates**:
- positive x is right,
- positive y is dorsal,
- positive z is posterior.
(TODO but actually it's the opposite because of all the negative signs?)

Here is a summary of the relevant tables:

**contin**: conti(g)uous pieces; only connects across z-sections
note: contins can go up AND down in z-direction (and even branch)
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
(note to self: in the early days of Elegance,
synapse contins were not being tracked
(that is, synapse objects were marked but not connected
to other sections of the same synapse);
synapsecombined was created to record synapase objects
as being one synapse;
contin and object tables were later updated to reflect this)
- idx: id for table
- pre: name of pre cell
- post: name(s) of post cell(s) (comma-sep list)
- type: chemical/gap junction
- members: objects in the synapse (comma-sep list of length = sections)
- sections: number of sections; used as proxy for size
- post1/2/3/4 : post but separated out
- type2: ??
- series: VC, NR, etc. (possibly multiple)
- partnerNum: number of post ??
- mid: object number of object in middle of contin of synapse
- preobj, postobj1/2/3/4 : object number of pre, post1/2/3/4
- continNum: clear


**object**:
- OBJ_Name: object number in other tables, often used to join,
  e.g. object join synapsecombined on object.OBJ_Name = synapsecombined.postobj1
- OBJ_X, OBJ_Y: x,y coordinates
- OBJ_Remarks: remarks attached to respective objects
  (e.g. 'end', 'start dorsal commissure')
- IMG_Number: z coordinate
- CON_Number: continNum of contin to which this object belongs
- type: cell/cell branch point/electrical/chemical
- fromObj, toObj: pre,post object numbers (assuming object is part of synapse); toObj is comma-separated list of numbers if more than one
- checked: unclear
- username: person who recorded this object
- DateEntered: obvious
- certainty: we also recorded object that are uncertain
- size: unclear
- cellType: unclear - 0 or 1... same as cellbody?
- forMap: unclear - '' or 'normal'


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


# JS library files
Notes on various javascript files.
(All filepaths are relative to here)


General purpose libraries:
- apps/include/jquery-3.6.0.min.js: jQuery library
- apps/include/bootstrap-3.3.7.min.css / js: Bootstrap library, mainly used for
  implementing accordian-style dropdown menu
- apps/include/three/\*: still being used by neuronVolume, but that itself is
  sort of obsolete since volume rendering has been included into neuronMaps
- apps/include/THREE-alt/\*: using a more recent version of the THREE.js library
  (4.5 I think)
  and related things e.g. THREEx;
  note that I've made some modifications to OBJLoader.js and MTLLoader.js,
  see comments therein
- apps/include/cytoscape-3.21.1.min.js: for 2D viewer in neuronMaps

- header\*.js: helps build the header image and navigation items on all pages
  (note that this needs /css/home.css to work properly);
  header-retractable.js allows the header to be hidden, makes more space for
  viewer etc.

- apps/include/floatingdialog.js: library for floating window used in
  apps to display stuff e.g. Cell Selector, Help Dialog etc.
- apps/include/floatingdialog-alt.js: arguably better (but still incomplete)
  floating window, plan to make it replace floatingdialog.js
  (better because user can drag with mouse;
  incomplete because should add option to have 'modal-background',
  and also to add nice buttons)

- apps/include/importers.js: deals with menu items on the left of apps, still
  used by neuronVolume,
  but in neuronMaps has been just written into importerapp-alt.js

- apps/include/spectrum: probably for color selection, but unclear if still used
  (probably still in neuronVolume)

JS files that essentially act as data,
most should be updated if databases are updated:
- apps/include/cellLists-alt.js: list of cells grouped by database (series)
  and cell type (neuron/muscle)

- apps/include/wa_link.js: provides a function that,
  given a cell name, returns the WormAtlas link

- apps/include/plotParams.js: some parameters like min/max coords that help to
  adjust cell position in neuronMaps

- apps/neuronMaps/include/helpDialogItems.js


**App-specific files**, grouped by apps,
as named in the Emmonslab page

Synapse/Partner List:
- apps/listViewerAlt/include/build_listViewer_alt.js:
	entry point for listViewer,
	variables are initiliazed here,
	reads url parameters and preloads
- apps/listViewerAlt/include/importerapp-alt.js:
	provides ImporterApp class,
	which interacts with html to allow user to
	select database/cells,
  requests list data from php and loads tables;
  differs from old in that we make one request for both
  synapse list and partner list,
  but simply processes them separately,
  and loads table for both
  (see listViewer in the obsolete list)

Synapse Viewer
- apps/synapseViewer/include/build_synapseViewer.js
- apps/synapseViewer/include/importerapp.js


- apps/neuronMaps/include/build_neuronMaps.js:
	entry point for neuronMaps,
	variables are initiliazed here,
	in particular an instance of ImporterApp,
	and reads url parameters and preloads
- apps/neuronMaps/include/importerapp-alt.js
	provides ImporterApp class,
	intermediary between HTML and MapViewer class
- apps/neuronMaps/include/mapViewer.js:
	deals with the display/mouse events in the 3D viewer,
	e.g. zoom, rotate view, click on synapses,
	and also responsible for loading data from
	apps/php/retrieve_trace_coord_alt.php (via ImporterApp)
	into the viewer, and more
	
- apps/neuronVolume/include/build_neuronVolume.js
	entry point for neuronVolume,
	variables are initiliazed here,
	in particular an instance of ImporterApp,
	and reads url parameters and preloads
- apps/neuronVolume/include/meshviewer.js:
	counterpart to mapViewer.js
- apps/neuronVolume/include/importerapp.js:
	similar to importerapp-alt.js in neuronMaps
- apps/neuronVolume/include/importerviewer.js: seems unused?


Obsolete files/folders, probably should delete at some point:
- apps/include/selectorCells.js: at some point used to avoid requesting for
  cells in given database
- apps/include/cellLists.js: replaced by cellLists-alt.js
- apps/include/importWW.js
- apps/synapseList/include/build_synapseList.js
- apps/neuronMaps/include/importerapp.js
- apps/partnerList/include/build_partnerList.js
- apps/partnerList/include/build_partnerList_alt.js
- apps/synapseList/include/importerapp.js
- apps/partnerList/include/importerapp.js

- apps/neuronContacts/include/mapViewer.js: hmm neuronContacts itself seems to
	be obsolete..
- apps/listViewer/include/build_listViewer.js:
	entry point for listViewer,
	variables are initiliazed here,
	reads url parameters and preloads
- apps/listViewer/include/importerapp.js:
	provides ImporterApp class,
	which interacts with html to allow user to
	select database/cells,
	and also *loads* either synapseList or partnerList,
	depending on url parameter 'listtype';
  here 'loads' means literally loads the entire page
  within an iframe element.
- apps/synapseList/include/build_synapseList_alt.js:
	requests data from apps/php/getSynapseList-alt.php,
	groups by partner, and loads into table;
  for synapseList app
- apps/partnerList/include/build_partnerList_alt2.js:
	requests data from apps/php/getSynapseList-alt.php,
	groups by partner, and loads into table;
  for partnerList app

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







# Some obsolete files that I deleted
(but should still be in the repo;
go back to before July 25, 2022)
apps/php/synList.php
maps/neuronPage.php 
apps/php/redirectMaps.php
apps/synapseList/\*
apps/partnerList/\*
apps/php/images-alt.php
apps/php/getSynapse.php
apps/php/loadSynapseImage.php
apps/php/getSynapseList.php
apps/php/getPartnerList.php
apps/php/selectorCells.php
apps/listViewer/\*
apps/php/retrieve_trace_coord.php
apps/php/retrieve_trace_coord_test.php
wormwiring.m.html


eventaully dbaux.php too, but that has Unk,
TODO put Unk class in it's own file..

TODO some cells, like AIZR from JSH,
have contin with count = 0
(select * from contin where type = 'neuron' and count = 0;)
and this seems to freeze everything,
(importerApp.viewer.controls.target becomes NaN and camera.position too)

TODO volume viewer better feedback on volume availability (perhaps show on the
cell selector dialog which volumes are available)
TODO related: switch cell selector dialog to be like in listViewerAlt,
better because Series Selector is awkwardly placed in left menu

TODO scaling changed, but maybe need a bit of translation,
try to make the aggregate volumes line up between N2U and JSH;
n2y seems to line up nicely though it's quite far away.

TODO synapse balls and label disappear when aggregate volume present
also,
TODO fix the synapse labels popping up when it shouldn't
TODO apparently there's a way to make text face camera,
do something like mesh.lookAt(camera.position),
  though this needs to be called in each render,
  hopefully it won't slow down too much



## Figuring out the scaling for skeleton:
Fix some image, N2UNR061.
Find synapse objects with min/max x/y values:
select * from object where IMG_Number = 'N2UNR061' and type = 'chemical' order by OBJ_X asc limit 1;
-> obj 58251, coord = (2490,2707), contin = 2651
select * from object where IMG_Number = 'N2UNR061' and type = 'chemical' order by OBJ_X desc limit 1;
-> obj 60177, coord = (6957,3805), contin = 3605
select * from object where IMG_Number = 'N2UNR061' and type = 'chemical' order by OBJ_Y asc limit 1;
-> obj 59949, coord = (5323,1834), contin = 3492
select * from object where IMG_Number = 'N2UNR061' and type = 'chemical' order by OBJ_Y desc limit 1;
-> obj 55304, coord = (5318,5068), contin = 1610

Next, we go to Synapse Viewer, with those contin numbers:
http://wormwiring.localhost/apps/synapseViewer/?db=N2U&continNum=2651 etc.

Download the low zoom images of N2UNR061 with the red box.

Open GIMP (image processing software),
open two images corresponding to min/max y.
Make one opacity=0.5, then finding difference in y
between the two red boxes in the number of pixels
is about 272px,
while the difference in y for the objects is 3234 units.
Similarly, for objects with min/max in x,
difference in x between red boxes is 375px,
while the difference in x for the objects is 4467 units.

The width of the worm in the image is about 686px,
and height is about 576px,
average about 631px.
It's known that the diameter is about 50 microns,
but that's assuming it's perfectly round.
So we should have 50 microns = 631px.

From x: 375 px / 4467 units
From y: 272 px / 3234 units
both about 0.084px/unit

So 0.084px/unit * 0.05mm/631px = 6.66nm/unit

Now it's known that one section is about 50nm.
So we scale x and y by 0.13
