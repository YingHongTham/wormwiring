/*
 * MapViewer class
 * handles display of 3D viewer
 *
 * note confusing terminology, series may mean database N2U etc
 * or also the regions of the worm: VC, NR, DC, VC2, RIG, LEF
 * we avoid using 'series' to mean the database sense
 *
 * the main data is held in this.dbMaps
 * sometimes use this.maps, which is always set to
 * this.dbMaps[db] for some database db
 * (previously only allowed cells from one db)
 * see loadMap for details on this.maps
 *
 * after initialization, the main jobs of viewer is to
 * -load cells (loadMap)
 *
 * Sections of this file: (search *Section*)
 * -more intiliazation stuff
 * -Clear Maps
 * -Load Cell
 * -2D viewer stuff
 * -Maps, settings
 * -stuff for Synapse Info
 * -Translate Maps section
 * -for Synapse Filter section
 * -toggle visibility of stuff
 * -Global Viewer Options
 * -Scale Synapses section
 * -Volume
 * -save to file
 * -coordinates of stuff
 * -stuff related to camera/viewer
 * -synpase and cell object
 * -text in viewer
 * -some auxiliary functions for graphs
 *
 */



// requires:
// apps/include/cellLists.js
// apps/include/plotParams.js
// apps/include/cytoscape-3.21.1.min.js
// apps/include/three/threex.windowresize.js

if (celllistByDbType === undefined) {
  console.error('expect /apps/include/cellLists.js');
}
if (plotTransform === undefined) {
  console.error('require /apps/include/plotParams.js');
}
if (cytoscape === undefined) {
  console.error('require /apps/include/cytoscape-3.21.1.min.js');
}
if (typeof(THREEx.WindowResize) === undefined) {
  console.error('require /apps/include/three/threex.windowresize.js');
}

/*
 * @constructor
 * usage (in importerapp.js):
 *  viewer = new MapViewer(canvas, this);
 *  (here this refers to ImporterApp;
 *  allows methods here to get stuff from HTML via ImporterApp)
 *
 * the main object storing data is this.maps,
 * which holds data of the skeleton, synapses, etc
 * see loadMap for a full description
 */

MapViewer = function(canvas,app)
{
  this.canvas = canvas;
  this.app = app;

  // largest possible synapse size,
  // ScaleSynapse may change synapses, but synMax stays const
  this.synMax = 10;

  // colors
  this.skelColor = 0x4683b2; // skeleton
  this.preColor = 0xfa5882; // synapse, chemical
  this.postColor = 0xfa5882; // synapse, chemical
  //this.postColor = 0xbf00ff;
  this.gapColor = 0x00ffff; // synapse, electrical
  this.cellbodyColor = 0xff0000; // cellbody
  this.remarksColor = "rgba(0,255,25,0.95)"; // remarks text
  this.defaultTextColor = "rgba(255,0,0,0.95)";
  this.defaultArrowColor = 0x5500ff;

  // width not supported in new version of THREE
  this.skelWidth = 2; // so these are not really useful
  this.cellbodyWidth = 5;

  // for smoothness of synapse sphere
  this.sphereWidthSegments = 5;
  this.sphereHeightSegments = 5;
  
  // keeps track of movement of skeleton etc by the user
  // in Translate Maps section, using id='x-slider' etc
  // (see this.translateMapsTo/By)
  // note this is NOT the view target of the camera,
  // i.e. the cell moves relative to the grid,
  // but the camera and view target remain fixed
  //
  // should always be equal to this.GetTranslateOnMaps
  //
  // for overall
  const transPos = this.app.GetTranslationSlider();
  this.position = new THREE.Vector3(
    transPos.x, transPos.y, transPos.z);
  // same but for each db, relative to this.position
  // (see 
  this.dbPosition = {
    'N2U': new THREE.Vector3(),
    'JSE': new THREE.Vector3(),
    'N2W': new THREE.Vector3(),
    'JSH': new THREE.Vector3(),
    'n2y': new THREE.Vector3(),
    'n930': new THREE.Vector3(),
  };
  for (const db in this.dbPosition) {
    const transPos = this.app.GetTranslationSlider(db);
    this.dbPosition[db].x = transPos.x;
    this.dbPosition[db].y = transPos.y;
    this.dbPosition[db].z = transPos.z;
  }
  
  // this.skelMaterial a bit redundant
  // as each skeleton will need its own Material
  // (which allows individual color change)
  this.skelMaterial = new THREE.LineBasicMaterial({ color: this.skelColor, linewidth: this.skelWidth });
  this.cbMaterial = new THREE.LineBasicMaterial({color:this.cellbodyColor,linewidth:this.cellbodyWidth});
  this.preMaterial = new THREE.MeshLambertMaterial({color:this.preColor});
  this.postMaterial = new THREE.MeshLambertMaterial({color:this.postColor});
  this.gapMaterial = new THREE.MeshLambertMaterial({color:this.gapColor});

  // in the past, we basically assumed that
  // user only selects cells from one db,
  // and never changes it later
  // this is obviously bad practice,
  // but there are too many references to this.maps
  // so we'll simply change this.maps to which ever db
  // e.g. this.maps = this.dbMaps['N2U'];
  // before doing anything
  // in particular, every method with cell as a variable
  // should also have db as variable
  // see e.g. ClearMaps for a simple example
  this.dbMaps = {
    'N2U': {},
    'JSE': {},
    'N2W': {},
    'JSH': {},
    'n2y': {},
    'n930': {},
  };
  this.maps = {}; // see loadMap for expected form

  // for the global option of showing synapse labels
  // if it's true, then all synapse labels should be shown
  // if not, they will show when synapse is clicked/hover
  // value should agree with HTML
  // (see document.getElementById('btnToggleAllSynLabels')
  // in ImporterApp)
  // updated in toggleAllSynapseLabels 
  this.allSynLabelVisible = false;

  // synapses clicked by user,
  // they are used by ImporterApp to display synapse info
  this.clickedSynapses = [];
  // index of synapse that should be displayed in synapse info
  // typically is the last clicked one
  this.clickedSynapsesInd = -1;

  // volume made of all the volumes in given db
  this.aggrVol = {
    'N2U': null,
    'JSH': null,
    'n2y': null,
  };
  
  // but wait! there's more! (and more variables)
  this.InitGL(); // camera stuff

  // and even more!
  this.InitStuffInScene(); // grid and axes
};

//========================================================
// *Section*: more intiliazation stuff

// Initialize the viewer
// e.g. camera, rendering, handle mouse events etc.
MapViewer.prototype.InitGL = function() {
  // in order to make an object visible,
  // add it to this.scene or one of its descendents
  // (a lot like DOM Tree)
  this.scene = new THREE.Scene();

  //============================================
  // camera/renderer

  this.cameraDefaults = {
    posCamera: new THREE.Vector3( -250.0, 225.0, 1000.0),
    posCameraTarget: new THREE.Vector3( 0, 0, 0),
    near: 0.1,
    far: 20000,
    fov: 45,
  };

  this.aspectRatio = 1;
  this.recalcAspectRatio();

  // where the camera is currently looking
  this.cameraTarget = this.cameraDefaults.posCameraTarget;

  this.camera = new THREE.PerspectiveCamera(
    this.cameraDefaults.fov,
    this.aspectRatio,
    this.cameraDefaults.near,
    this.cameraDefaults.far);
  this.resetCamera(); // sets pos/target to default
  
  this.renderer = new THREE.WebGLRenderer({
    canvas: this.canvas,
    antialias: true,
    autoClear: true,
  });
  this.renderer.setClearColor(0xffffff);

  // allows user to control camera position/target
  this.controls = new THREE.OrbitControls(this.camera,this.renderer.domElement);

  //=======================================
  // used to set up mouse events to be able to interact with
  // objects in the viewer
  // in particular, the synapses
  this.domEvents = new THREEx.DomEvents(this.camera,this.renderer.domElement);

  //===============================================
  // lighting is not necessary for line objects,
  // but is necessary for spheres.. so it seems..
  const ambientLight = new THREE.AmbientLight(0x404040);
  const directionalLight1 = new THREE.DirectionalLight(0xC0C090);
  const directionalLight2 = new THREE.DirectionalLight(0xC0C090);
  
  directionalLight1.position.set(-100,-50,100);
  directionalLight2.position.set(100,50,-100);
  
  this.scene.add(directionalLight1);
  this.scene.add(directionalLight2);
  this.scene.add(ambientLight);
};

// grid and axes
MapViewer.prototype.InitStuffInScene = function() {
  //=====================================
  // the 2D square grid in the x-z plane
  // put two square grids because
  // n2y is very far away from (0,0,0)
  this.gridGrp = new THREE.Group();
  this.scene.add(this.gridGrp);

  const gridWidth = 15000;
  const gridNumSquaresAcross = 150;
  const generalGridLineColor = 0x404040;
  const mainAxesGridLineColor = 0xFF4444;
  let grid = new THREE.GridHelper(
    gridWidth,
    gridNumSquaresAcross,
    mainAxesGridLineColor,
    generalGridLineColor);
  //grid.visible = false;
  this.gridGrp.add(grid);

  grid = new THREE.GridHelper(
    gridWidth,
    gridNumSquaresAcross,
    mainAxesGridLineColor,
    generalGridLineColor);
  grid.position.z += gridWidth;
  //grid.visible = false;
  this.gridGrp.add(grid);


  //// for finding the right plotTransform
  //let gridWidthP = 1000;
  //let gridNumSquaresAcrossP = 100;
  //grid = new THREE.GridHelper(
  //  gridWidthP,
  //  gridNumSquaresAcrossP,
  //  mainAxesGridLineColor,
  //  generalGridLineColor);
  //const mm = new THREE.Matrix4();
  //mm.makeTranslation(500,-500,0);
  //grid.applyMatrix(mm);
  //grid.rotation.x = Math.PI/2;
  //this.gridGrp.add(grid);


  //========================================
  // axes arrows and text labeling axes
  // one set at origin, other at (0,0,15000)
  // for the n2y
  this.axesText = new THREE.Group();
  this.scene.add(this.axesText);

  let origin = new THREE.Vector3(0,0,0);
  const arrowColor = 0x5500ff;
  const length = 300;
  this.axesText.add( new THREE.ArrowHelper(
      new THREE.Vector3(0,0,-1), origin, length, arrowColor));
  this.axesText.add( new THREE.ArrowHelper(
      new THREE.Vector3(1,0,0), origin, length, arrowColor));
  this.axesText.add( new THREE.ArrowHelper(
      new THREE.Vector3(0,-1,0), origin, length, arrowColor));

  const axesTextDist = 200;
  this.axesText.add( this.addText('Anterior (-z)', {
    pos: new THREE.Vector3(0,0,-axesTextDist),
  }));
  this.axesText.add( this.addText('Right (+x)', {
    pos: new THREE.Vector3(axesTextDist,0,0),
    rotate: { y: -Math.PI/2 },
  }));
  this.axesText.add( this.addText('Ventral (-y)', {
    pos: new THREE.Vector3(0,-axesTextDist,0),
    rotate: { x: -Math.PI/2 },
  }));


  // repeat but at (0,0,gridWidth=15000)
  origin = new THREE.Vector3(0,0,gridWidth);
  this.axesText.add( new THREE.ArrowHelper(
      new THREE.Vector3(0,0,-1), origin, length, arrowColor));
  this.axesText.add( new THREE.ArrowHelper(
      new THREE.Vector3(1,0,0), origin, length, arrowColor));
  this.axesText.add( new THREE.ArrowHelper(
      new THREE.Vector3(0,-1,0), origin, length, arrowColor));

  this.axesText.add( this.addText('Anterior (-z)', {
    pos: new THREE.Vector3(
      origin.x,
      origin.y,
      origin.z - axesTextDist),
  }));
  this.axesText.add( this.addText('Right (+x)', {
    pos: new THREE.Vector3(
      origin.x + axesTextDist,
      origin.y,
      origin.z),
    rotate: { y: -Math.PI/2 },
  }));
  this.axesText.add( this.addText('Ventral (-y)', {
    pos: new THREE.Vector3(
      origin.x,
      origin.y - axesTextDist,
      origin.z),
    rotate: { x: -Math.PI/2 },
  }));


  // make synapse labels, remarks, axes text rotate
  // to face camera whenever mouse is unclicked
  // (because only need to rotate when view rotates,
  // and also don't want to rotate labels all the time)
  const self = this;
  document.onmouseup = () => {
    for (const db in self.dbMaps) {
      for (const cell in self.dbMaps[db]) {
        let map = self.dbMaps[db][cell];
        for (const contin in map.allSynData) {
          self.RotateTextFaceCamera(
            map.allSynData[contin].synLabelObj);
        }
        for (const rmkText of map.remarksGrp.children) {
          self.RotateTextFaceCamera(rmkText);
        }
      }
    }
    for (const m of self.axesText.children) {
      if (m.name === 'text') {
        self.RotateTextFaceCamera(m);
      }
    }
  };

};


//=========================================================
// *Section*: Clear Maps

MapViewer.prototype.clearMaps = function() {
  for (const db in this.dbMaps) {
    for (const cell in this.dbMaps[db]){
      this.scene.remove(this.dbMaps[db][cell].allGrps);
    }
    this.dbMaps[db] = {};
  }
};

//==========================================================
// *Section*: Load Cell
// main routine for loading cell data into viewer

/*
 * to be compatible w/ LoadMap in importerapp.js
 * and retrieveSkeletonMaps.php,
 * where object numbers are used efficiently
 *
 * expect format of @param data:
 *  {
 *    db: database name,
 *    name: cell name,
 *    skeleton: [
 *      // edges between objects that make up skeleton
 *      [43946,43945],[43945,43944],...
 *    ],
 *    objCoord: {
 *      // object number: x,y,z coord's
 *      '43946': [-1529,701,61],
 *      ...
 *      // note here coordinates given as array,
 *      // but in this.maps[name].objCoord it's
 *      // THREE.Vector3 object
 *    },
 *    objSeries: {
 *      '43946': 'NR',
 *      '98874': 'VC',
 *      ...
 *    }
 *    gap: {
 *      '4881': {
 *        pre: 'ADAR',
 *        post: 'ADAL',
 *        sections: 3,
 *        continNum: 4881,
 *        mid: 63063,
 *        preObj: 14814,
 *        postObj: 43945,
 *      },
 *    },
 *    pre: { // synapses where data.name is the pre
 *      // same as gap
 *    },
 *    post: { // synapses where data.name is in post
 *      // same as gap
 *    },
 *    cellbody: { // php has no chill, only associative arrs
 *      0: [obj1, obj2],
 *      1: [obj2, obj3],
 *      ...
 *    }, // use Object.values(data.cellbody) to get array
 *    remarks: {
 *      '43946': 'end',
 *      '94628': 'start RVG commissure',
 *      ...
 *    },
 *  }
 *
 */
MapViewer.prototype.loadMap = function(data)
{
  this.maps = this.dbMaps[data.db];
  const db = data.db;
  const cell = data.name;

  // linewidth actually no longer supported
  const skelMaterial = new THREE.LineBasicMaterial({ color: this.skelColor,
    linewidth: this.skelWidth});


  /*
   * this.maps[cellname] is MapViewer's way of
   * storing data about cells
   * it is an object, with keys as seen in the initialization
   * here are some notes on the meaning/uses of
   * some of these keys:
   *
   * -synLabels: THREE.Group of labels for synapses,
   * the Group's visibility is set to true, toggle visibility individually
   * because want visibility to respond to mouse events
   * (want it to appear when mouse over the synapses)
   * synLabel can be distinguished by the contin id
   * (TODO check this: synLabel.name; see toggleAllSynapseLabels)
   * (note also that allSynData also has reference to the
   * synLabel object attached to that synapse,
   * i.e. allSynData[contin].synLabelObj
   * is the label for allSynData[contin].sphere)
   *
   * -allGrps: THREE.Group that contains all the
   *  THREE objects relevant to the cell
   *  makes it convenient to apply any transformations
   *  in the viewer on the entire cell,
   *  e.g. translations
   *
   * -synObjs: THREE.Group of sphere objects of synapses
   *  -organized by type, that is, it contains 3 THREE.Group's
   *  pre,post,gap (also keys of this.maps[..])
   *
   * -synapses: another way to organize the synapses,
   *  this time by the name(s) of the other cell;
   *  further subdivide into arrays by type:
   *  synapses: {
   *    RIPR: {
   *      Presynaptic: [ THREE.Sphere objects ],
   *      Postsynaptic: [ THREE.Sphere objects ],
   *      'Gap junction': [ THREE.Sphere objects ],
   *    },
   *    ...
   *  }
   *
   *  -allSynData: {
   *    3860: { // key is contin number of synapse
   *      db: db,
   *      pre: syn.pre,
   *      post: syn.post,
   *      type: 'pre'/'post/'gap',
   *      contin: syn.continNum, (=3860)
   *      size: syn.sections,
   *      zLow: syn.zLow, // lowest and highest z of synapse
   *      zHigh: syn.zHigh,
   *      cellname: map.name,
   *        cell on which this synapse is shown
   *      partners: all cells involved
   *        (used to be other cell(s) on other side of synapse
   *        e.g. if we have RICL -> AVAL,ADAL
   *        and cellname = ADAL (so type = post),
   *        then partner is just RICL)
   *      cellObj: object that synapse is attached to
   *        (use its coordinates to position synapse sphere)
   *      sphere: THREE Object for the synapse
   *      synLabelObj: THREE Object for label
   *    },
   *    ...
   *  }
   *
   *  when doing concrete things like deleting from viewer,
   *  e.g. in clearMaps, or toggleAllSynapses
   *  only need to do on synObjs (which is more convenient to go through)
   */
  this.maps[cell] = {
    name: cell,
    db: data.db,
    allGrps: new THREE.Group(),
    objCoord: {}, // key,value = objNum, THREE.Vector3
    objCoordDisplay: {},
    objSeries: data.objSeries,
    skeletonGraph: {},
    skeletonLines: [],
    skeletonGrp: new THREE.Group(),
    cellbodyGrp: new THREE.Group(),
    skelMaterial : skelMaterial,
    synObjs: new THREE.Group(),
    preGrp: new THREE.Group(),
    postGrp: new THREE.Group(),
    gapGrp: new THREE.Group(),
    //gap: [], // used?
    allSynData: {},
    synLabels : new THREE.Group(),
    remarksGrp : new THREE.Group(),
    remarks: {}, // the data behind remarksGrp
    volumeObj: null, // see loadVolumetric
  };
  // continued initialization of maps
  const map = this.maps[cell];
  this.scene.add(map.allGrps);
  map.allGrps.add(map.skeletonGrp);
  map.allGrps.add(map.cellbodyGrp);
  map.allGrps.add(map.synObjs);
  map.allGrps.add(map.synLabels);
  map.allGrps.add(map.remarksGrp);
  map.synObjs.add(map.preGrp);
  map.synObjs.add(map.postGrp);
  map.synObjs.add(map.gapGrp);
  
  // default visibilities
  map.skeletonGrp.visible = true;
  map.synObjs.visible = true;
  map.remarksGrp.visible = false; // see remarksparams
  map.synLabels.visible = true; // but individually not vis

  // set object coordinates, apply transformation
  // note that objCoord is modified in SmoothSkeletonCoord
  // (probably not anymore, was trying to manually smooth)
  for (const obj in data.objCoord) {
    map.objCoord[obj] = 
      this.ApplyPlotTransform(db,
        new THREE.Vector3(
          data.objCoord[obj].x,
          data.objCoord[obj].y,
          data.objCoord[obj].z)
      );
  }
  for (const obj in data.objCoordDisplay) {
    map.objCoordDisplay[obj] = 
      this.ApplyPlotTransformDisplay2(db,
        new THREE.Vector3(
          data.objCoordDisplay[obj].x,
          data.objCoordDisplay[obj].y,
          data.objCoordDisplay[obj].z)
      );
  }

  // process skeleton data into graph/lines
  // note: graph's nodes are object numbers
  // but because keys of object in JS are strings,
  // be careful if comparing key and value with ===
  // e.g. for (v in G) --> v is string, while G[v] = [int's]

  map.skeletonGraph =
      BuildGraphFromEdgeList(data.skeleton);
  map.skeletonLines = 
      BreakGraphIntoLineSubgraphs(map.skeletonGraph);

  //this.SmoothSkeletonCoord(db,map.name);

  this.loadSkeletonIntoViewer(db,map.name);

  //===============================================
  // cellbody

  // color cellbody edges
  // that is, edges whose both ends are in cellbody
  // just add as a collection of line segments,
  // one for each edge, to cellbodyGrp
  const cellbodyList = Object.values(data.cellbody);
  for (const edge of cellbodyList) {

    const points = edge.map(obj => map.objCoord[obj]);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const l = new THREE.Line(geometry, this.cbMaterial);
    map.cellbodyGrp.add(l);
  }

  //=============================================
  // Load Synapses

  // add gap junctions to allSynData
  for (const contin in data.gap) {
    const syn = data.gap[contin];
    let synData = {
      db: db,
      pre: syn.pre,
      post: syn.post,
      type: 'gap',
      contin: parseInt(syn.continNum),
      size: parseInt(syn.sections),
      coord: syn.coord === 'NOT_FOUND' ?
        null :
        this.ApplyPlotTransform(db,
          new THREE.Vector3(
            syn.coord['x'],
            syn.coord['y'],
            syn.coord['z'])
        ),
      zLow: syn.zLow,
      zHigh: syn.zHigh,
      cellname: map.name,
      partners: '',
      cellObj: null, // may be bad
      sphere: null, // set later in addOneSynapse2
      synLabelObj: null, // set later in addOneSynapse2
    };
    let synDataP = Object.assign({}, synData);
    // set partner so that this cell is in front
    synDataP.partners = (syn.pre === cell) ?
      `${cell}--${syn.post}` :
      `${cell}--${syn.pre}`;

    // set cellObj
    // first try to use syn.preObj or syn.postObj directly
    // but these numbers may be bad
    let preCellObj = null;
    let postCellObj = null;
    if (syn.pre === cell) {
      preCellObj = parseInt(syn.preObj);
      if (!map.objCoord.hasOwnProperty(preCellObj)) {
        preCellObj = null;
      }
    }
    if (syn.post === cell) {
      postCellObj = parseInt(syn.postObj);
      if (!map.objCoord.hasOwnProperty(postCellObj)) {
        postCellObj = null;
      }
    }

    if (preCellObj !== null) {
      synDataP.cellObj = preCellObj;
    }
    else if (postCellObj !== null) {
      synDataP.cellObj = postCellObj;
    }
    else { // both objects are bad
      if (synDataP.coord !== null) {
        synDataP.cellObj =
          this.GetClosestCellObjToCoord(db,cell,synDataP.coord);
      }
    }
    map.allSynData[synData.contin] = synDataP;
  }

  // add pre synapses to allSynData
  for (const contin in data.pre) {
    //if (!data.pre.hasOwnProperty(contin)) continue;
    const syn = data.pre[contin];
    let synData = {
      db: db,
      pre: syn.pre,
      post: syn.post,
      type: 'pre',
      contin: parseInt(syn.continNum),
      size: parseInt(syn.sections),
      coord: syn.coord === 'NOT_FOUND' ?
        null :
        this.ApplyPlotTransform(db,
          new THREE.Vector3(
            syn.coord['x'],
            syn.coord['y'],
            syn.coord['z'])
        ),
      zLow: syn.zLow,
      zHigh: syn.zHigh,
      cellname: map.name,
      partners: '',
      cellObj: null, // set below
      sphere: null, // set later in addOneSynapse2
      synLabelObj: null, // set later in addOneSynapse2
    };
    let synDataP = Object.assign({}, synData);

    synDataP.cellObj = parseInt(syn.preObj);
    if (!map.objCoord.hasOwnProperty(synDataP.cellObj)) {
      if (synDataP.coord !== null) {
        synDataP.cellObj =
          this.GetClosestCellObjToCoord(db,cell,synDataP.coord);
      }
    }
    synDataP.partners = `${syn.pre}->${syn.post}`;
    map.allSynData[synData.contin] = synDataP;
  }


  // add post synapses to allSynData
  for (const contin in data.post) {
    const syn = data.post[contin];
    let synData = {
      db: db,
      pre: syn.pre,
      post: syn.post,
      type: 'post',
      contin: parseInt(syn.continNum),
      size: parseInt(syn.sections),
      coord: syn.coord === 'NOT_FOUND' ?
        null :
        this.ApplyPlotTransform(db,
          new THREE.Vector3(
            syn.coord['x'],
            syn.coord['y'],
            syn.coord['z'])
        ),
      zLow: syn.zLow,
      zHigh: syn.zHigh,
      cellname: map.name,
      partners: '',
      cellObj: null, // set below
      sphere: null, // set later in addOneSynapse2
      synLabelObj: null, // set later in addOneSynapse2
    };
    let synDataP = Object.assign({}, synData);
    synDataP.partners = `${syn.pre}->${syn.post}`;

    for (let i = 1; i <= 4; i++) {
      if (syn['post'+i] === cell) {
        synDataP.cellObj = parseInt(syn['postObj'+i]);
        if (map.objCoord.hasOwnProperty(synDataP.cellObj)) {
          // cellObj is good
          break;
        }
        synDataP.cellObj = null;
      }
    }
    // cellObj is still bad, use closest object
    if (synDataP.cellObj === null) {
      if (synDataP.coord !== null) {
        synDataP.cellObj =
          this.GetClosestCellObjToCoord(db,cell,synDataP.coord);
      }
    }
    map.allSynData[synData.contin] = synDataP;
  }

  //==================================================
  // preprocessing synapses done, now add to viewer

  // order by z value ascending
  // ordering is implicitly used in addOneSynapse2
  // for the synLabels (to stagger them to avoid overlap)
  let allSynList = [];
  for (const contin in map.allSynData) {
    allSynList.push(map.allSynData[contin]);
  }
  allSynList.sort((obj1, obj2) => {
    const pos1 = obj1.coord.z;
    const pos2 = obj2.coord.z;
    return pos1.z - pos2.z;
  });
  for (const synData of allSynList) {
    this.addOneSynapse2(synData);
  }

  // synapses done
  //================================================
  // remarks


  //  data.remarks = {
  //    objNum: remark,
  //    ...
  //  }
  map.remarks = Object.assign({}, data.remarks);
  for (const obj in map.remarks) {
    //if (!map.remarks.hasOwnProperty(obj)) continue;
    const params = {
      pos: map.objCoord[obj],
      offset: new THREE.Vector3(200,200,0),
      color: this.remarksColor,
      font: "Bold 20px Arial",
      visible: true, // visibility handled by remarksGrp
      arrowhead: false,
    };
    map.remarksGrp.add(
        this.addTextWithArrow(map.remarks[obj], params));
  };

  // translate cell by the slider values
  // and update view/camera
  this.translateOneMapsToThisPos(db,map.name);
  this.CenterViewOnCell(db,map.name);
};


// assumes that this.dbMaps[db][cell] exists,
// objCoord and skeletonGrph has already been defined
// note not every object in objCoord has entry in skeletonGraph
// (should only be used once in loadMap)
// (probably not used)
MapViewer.prototype.SmoothSkeletonCoord = function(db,cell) {
  const map = this.dbMaps[db][cell];
  const neighborAverage = {};

  const depth = 7; // max degree of separation to be included

  for (const obj in map.objCoord) {
    if (!map.skeletonGraph.hasOwnProperty(obj))
      continue;
    if (map.skeletonGraph[obj].length <= 1)
      continue;
    
    let neighbors = new Set();
    neighbors.add(obj);
    for (let i = 0; i < depth; ++i) {
      for (const s of neighbors) {
        for (const w of map.skeletonGraph[s]) {
          neighbors.add(w);
        }
      }
    }

    let v = new THREE.Vector3(0,0,0);
    for (const s of neighbors) {
      v.add(map.objCoord[s]);
    }
    v.multiplyScalar(1.0 / neighbors.size);
    neighborAverage[obj] = v;
  };

  for (const obj in neighborAverage) {
    console.log(obj,map.objCoord[obj]);
    console.log(obj,neighborAverage[obj]);
    // 0.8 * objCoord + 0.2 * neighborAverage
    // (but only for x,y)
    neighborAverage[obj].z = map.objCoord[obj].z;
    map.objCoord[obj].multiplyScalar(0.8);
    neighborAverage[obj].multiplyScalar(0.2);
    map.objCoord[obj].add(neighborAverage[obj]);
  }
};


/*
 * add the cell skeleton to THREE scene
 * uses this.maps[name].skeletonLines
 * as computed by BreakGraphIntoLineSubgraphs
 * and this.maps[name].skelMaterial for material
 * (need to make new material object so can change
 * color of each cell separately)
 * (see loadMap)
 *
 * for now, ignoring series(region)
 *
 * @param {String} name - cell name
 */
MapViewer.prototype.loadSkeletonIntoViewer = function(db,cell) { 
  // this is only ever used once,
  // and in that context, this.maps is properly set
  for (const line of this.dbMaps[db][cell].skeletonLines) {
    const points = line.map(obj =>
        this.dbMaps[db][cell].objCoord[obj]);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = this.dbMaps[db][cell].skelMaterial;
    const l = new THREE.Line(geometry, material);
    this.dbMaps[db][cell].skeletonGrp.add(l);
  }
  // load both coordinates
  for (const line of this.dbMaps[db][cell].skeletonLines) {
    const points = line.map(obj =>
        this.dbMaps[db][cell].objCoordDisplay[obj]);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = this.dbMaps[db][cell].skelMaterial;
    const l = new THREE.Line(geometry, material);
    this.dbMaps[db][cell].skeletonGrp.add(l);
  }
};


/*
 * create THREE.Sphere for synapse and add to viewer
 * sphere has emits events when clicked and hover
 * (shows synapse details in menu,
 * and synapse label in viewer)
 *
 * no return, adds Sphere to:
 * -this.maps[name].synObjs - THREE.Group already in scene
 * -this.maps[name].allSynData[contin] - for easy ref
 *    (see Filter Synapses section)
 * 
 * also adds text labels to each synapse,
 * stored and added to this.maps[name].synLabels,
 * which is a THREE.Group already in scene
 * not visible by default, but responds to mouse:
 * -if only hover, becomes visible and disappears afterwards
 * -if clicked, stays visible after no hover
 * 
 * (usually I prefer to return the object
 * and leave the adding to viewer(scene) to the caller,
 * but here because there are lots of other stuff like
 * event listeners and synapse labels in the viewer,
 * easier to add to viewer(scene) here)
 *
 * used to have 'name' variable, but incorporated into synData
 * //@param {String} name - cell name
 * // (sphere object appears attached to this cell)
 * @param {Object} synData - allSynData[contin]
 */
MapViewer.prototype.addOneSynapse2 = function(synData) {
  // this.maps should already be properly set
  // in the use context on addOneSynapse2
  // but reset just in case
  const db = synData.db;
  this.maps = this.dbMaps[db];

  const name = synData.cellname; // cell on which synapse shows

  //const synPos = this.maps[name].objCoord[synData.obj];
  const synPos = synData['coord'];

  const synType = synData.type;
  const numSect = synData.size;
  //const numSect = synData.zHigh - synData.zLow + 1;

  const radius = this.SynapseRadiusFromSections(numSect);
  const partners = synData.partners;
  const contin = synData.contin;

  //=============================
  // create and add the synapse to viewer via Group
  const geometry = new THREE.SphereGeometry(radius,this.sphereWidthSegments,this.sphereHeightSegments);
  const sphereMaterial = this[`${synType}Material`];
  const sphere = new THREE.Mesh(geometry,sphereMaterial);

  sphere.name = contin;
  sphere.position.copy(synPos);
  sphere.material.transparent = true;

  // add sphere to scene via pre/post/gap Group
  // and to allSynData for easy individual synapse reference
  // (in particular for Filter Synapses section)
  this.maps[name][`${synType}Grp`].add(sphere);
  this.maps[name].allSynData[synData.contin].sphere = sphere;

  //=========================
  // text label for synapse

  // function for determining the offset for synLabel
  // purely for visual purposes
  // keeps its own internal counter
  // (the this in this.count is not for MapViewer)
  function offsetx() {
    if (this.count === undefined) {
      this.count = 0;
    }
    ++this.count;
    switch(this.count % 4) {
      case 0: return -400;// + 10*this.count;
      case 1: return 200;// + 10*this.count;
      case 2: return -200;// + 10*this.count;
      case 3: return 400;// + 10*this.count;
    }
  };
    
  // add text label to scene via synLabels
  // accessed by this reference in the event listener callback
  // also adds it to synData
  const synLabelObj = this.addTextWithArrow(partners,{
    pos: sphere.position.clone(),
    rotate: { x: -Math.PI/3 },
    //scale: { x: 0.2, y: 0.2, z: 0.2 },
    offset: new THREE.Vector3(offsetx(),0,0),
    font: '20px Arial',
    arrowhead: false,
  });
  synLabelObj.name = contin;
  synLabelObj.visible = false;
  this.maps[name].synLabels.add(synLabelObj);
  this.maps[name].allSynData[synData.contin].synLabelObj = synLabelObj;

  //===================================
  // mouse events over synapses
  // updates the synapse info section
  const self = this;

  this.domEvents.addEventListener(sphere,'mouseover',() => {
    self.SynapseOnMouseOver(db,name,contin);
  });
  this.domEvents.addEventListener(sphere,'mouseout',() => {
    self.SynapseOnMouseOut(db,name,contin);
  });
  this.domEvents.addEventListener(sphere,'click',() => {
    self.SynapseOnClick(db,name,contin);
  });
};

/*
 * scale/translate coordinates appropriately
 * (this is not related to the Translate Maps section,
 * that section deals with user,
 * this one is internal, takes coords from MySQL tables
 * and transforms appropriately,
 * in particular, it applies scaling to x,y,z
 * so that it matches real worm values
 * (see README on method of finding these scaling)
 *
 * note that there is a negative factor in the y component
 * (see plotParams.js)
 * so after transform, we have:
 * +x = right
 * +y = dorsal
 * +z = posterior
 *
 * @param {String} db - database
 * @param {Object} vec - Vector3, or object with keys x,y,z
 */
MapViewer.prototype.ApplyPlotTransform = function(db,vec) {
  const trans = plotTransform[db].translate;
  const scale = plotTransform[db].scale;
  return new THREE.Vector3(
    trans.x + vec.x * scale.x,
    trans.y + vec.y * scale.y,
    trans.z + vec.z * scale.z
  );
};
// same as above, but for transforming skeleton coordinates
// that come from display2 table
// to fit coordinates from object table
// (that is, ApplyPlotTransform(object table coord)
// ~= ApplyPlotTransformDisplay2(display2 table coord) )
MapViewer.prototype.ApplyPlotTransformDisplay2 = function(db,vec) {
  const trans = plotTransformDisplay2[db].translate;
  const scale = plotTransformDisplay2[db].scale;
  return new THREE.Vector3(
    trans.x + vec.x * scale.x,
    trans.y + vec.y * scale.y,
    trans.z + vec.z * scale.z
  );
};


//========================================================
// *Section*: 2D viewer stuff

/*
 * loads cells into 2D Viewer with Cytoscape
 *
 * the real work is done in Get2DGraphCY
 *
 * note to self: some of the graph algorithms have to be
 * a little more complicated than expected because
 * the relevant graph is NOT always a tree,
 * which is what one might expect from the skeleton of a cell
 * this typically involves an extra layer of bookkeeping
 * to ensure we don't go into infinite loops
 *
 * @param {HTMLDivElement} elem - where Cytoscape will load into
 */
MapViewer.prototype.load2DViewer = function(elem) {
  let cy_elems = [];
  let maxHoriz = 0; // rightmost x position so far
  let sepBtCells = 10;
  // maxHoriz is the furthest that the graph goes to the right
  // is updated each time a cell is added
  for (const db in this.dbMaps) {
    for (const cell in this.dbMaps[db]) {
      console.log(maxHoriz);
      let ee = this.Get2DGraphCY(db,cell,maxHoriz);
      cy_elems = cy_elems.concat(ee.cy_elems);
      maxHoriz += ee.maxHoriz + sepBtCells;
    }
  }

  const cy = cytoscape({
    container: elem,
    elements: cy_elems,
    // cy_elems is array of objects
    // -nodes: { data: { id: 'a', label: .. } },
    // -edges: { data: { id: 'ab', source: 'a', target: 'b' } }

    style: [ // the stylesheet for the graph
      {
        selector: 'node',
        style: {
          'background-color': '#666',
          'label': 'data(label)',
          'width': 'data(width)',
          'height': 'data(height)',
        }
      },
      {
        selector: 'edge',
        style: {
          'width': 3,
          'line-color': '#ccc',
          'target-arrow-color': '#ccc',
          //'target-arrow-shape': 'triangle',
          'curve-style': 'bezier'
        }
      }
    ],
    layout: {
      name: 'preset',
    },
    wheelSensitivity: 0.2, // zoom speed
  });

  // event listeneres
  const self = this;
  cy.on('tap', 'node', function(evt){
    const id = evt.target.id();
    const db = id.split('-')[0];
    const cell = id.split('-')[1];
    const obj = parseInt(id.split('-')[2]);
    const contins = self.ObjToSynapseContin(db,cell,obj);
    if (contins.length > 0) {
      self.SynapseOnClick(db,cell,contins[0]);
      self.CenterViewOnSynapse(db,cell,contins[0]);
    }
    else { // clicked obj is not a synapse
      const pos = self.GetObjCoordInViewer(db,cell,obj);
      self.SetCameraTarget(pos);
      pos.y += 100;
      self.SetCameraPosition(pos);
    }
  });
};


/* returns cy_elems, which is data for cytoscape
 * to create 2D graph
 *
 * -computes 2D coordinates for nodes
 *  attempt to make graph as "straigt" as possible
 *  (see GetLongestLine below)
 *
 * @param {String} cell - cellname
 * @param {Number} horizInit - horizontal starting position for drawing
 * (for separating different cells;
 * load2DViewer loads all cells into one div element;
 * in future, maybe can add edges between cells
 * to indicate synapses)
 *
 * used to be called load2DViewerHelper 
 */
MapViewer.prototype.Get2DGraphCY = function(db,cell,horizInit) {
  // below we store coordinate in pos2D,
  // which will have integer entries
  // this is scale between the integer units to
  // actual coordinates in the cytoscape
  // (see cy_elems.push(...))
  const UNITS_TO_CYTOSCAPE_COORD = 50;
  const map = this.dbMaps[db][cell];
  const objCoord = Object.assign({},map.objCoord);
  const synCoord = {};
  const cy_elems = [];

  // get the set of vertices
  // (synapses + remarks + vertices of degree != 2)
  // and reduced the skeleton graph to just those vertices

  const X = new Set();
  // for the synapses, we also want to keep track of
  // the contin number(s) of the synapses
  // that have that a given obj num
  const continByObj = {}; // key=obj, val=array of continNums
  for (const contin in map.allSynData) {
    let cellObj = map.allSynData[contin].cellObj;
    if (cellObj === null || cellObj === undefined) {
      continue;
    }
    cellObj = parseInt(cellObj);

    X.add(cellObj);
    if (!continByObj.hasOwnProperty(cellObj)) {
      continByObj[cellObj] = [];
    }
    continByObj[cellObj].push(contin);

    synCoord[contin] = map.allSynData[contin].coord;
  }
  for (const obj in map.remarks) {
    X.add(parseInt(obj));
  }
  // vertices of deg != 2
  for (const v in map.skeletonGraph) {
    const vNum = parseInt(v);
    if (map.skeletonGraph[v].length !== 2) {
      X.add(vNum);
    }
  }
  let Gred = ReduceGraph(map.skeletonGraph, X);
  // testing on entire graph
  //Gred = map.skeletonGraph;

  // want to go through vertices in increasing z
  let Xlist = [...X];
  // testing on entire graph
  //Xlist = [];
  //for (const v in map.skeletonGraph) {
  //  if (map.skeletonGraph.hasOwnProperty(v)) {
  //    Xlist.push(parseInt(v));
  //  }
  //}
  Xlist.sort((v,w) => objCoord[v].z - objCoord[w].z);

  // next we need to give the 2D coordinates
  // for the graph embedding in the 2D view
  // we want embedding to be as "vertical" as possible
  // so we look for long lines,
  // a little bit like BreakGraphIntoLineSubgraphs,
  // but here we want the lines to be
  // -monotone in z coord (generally?)
  // -have disjoint vertices

  // longestLine will keep such partition of graph
  // into collection of lines
  // key: node (objNum),
  // value: array of nodes in longest line graph
  //    from this node to a leaf,
  //    in a direction away from the root
  //    (should have lowest/highest z in that connected comp)
  //    (in GetLongestLine, it is computed in reverse
  //    because pushing array from the right is easier,
  //    but later reversed back so it's node to leaf)
  const longestLine = {};

  // GetLongestLine(cur) is a recursive function,
  // it looks at the longestLines of children of cur
  // (neighbors that are not parentNode[cur])
  // and picks the longest one,
  // say starting at v,
  // and adds cur to it:
  // longestLine[cur] = [cur] + longestLine[v]
  // the entry for v is be deleted from longestLine
  // since that line has been subsumed into cur's
  //
  // implicitly we find a rooted tree
  // (rooted at the node from which we call GetLongestLine)
  // parentNode[w] is the parent of w in this rooted tree
  // (parentNode[root] = null)
  // (since the given graph is not necessarily a tree,
  // this is not unique but it doesn't really matter)
  //
  // parentNode is also used to keep track of
  // whether a node has been visited
  // (=== whether node is a key of parentNode)
  //
  // calling GetLongestLine(cur,prev)
  // is an attempt to make prev the parent of cur,
  // but if cur has been visited, then we just return
  const parentNode = {};

  // orderOfVisit is needed for assembling the lines together
  // we give coordinates to each line in longestLine
  // based on the parent of the first node in that line,
  // so we want to do this in the right order
  // (in principal we could just do another graph traversal
  // but ain't nobody got time for that)
  const orderOfVisit = {};
  let orderOfVisitCounter = 0;

  // recursive; if want root to be at v,
  // call with GetLongestLine(v,null)
  function GetLongestLine(cur, prev) {
    if (parentNode.hasOwnProperty(cur)) {
      return;
    }
    parentNode[cur] = prev;
    orderOfVisit[cur] = orderOfVisitCounter++;
    let v; // the neighbor of cur that longest line runs thru
    let maxLen = -1;
    for (const w of Gred[cur]) {
      if (w === parentNode[cur]) continue;
      if (parentNode.hasOwnProperty(w)) continue; // technically redundant
      GetLongestLine(w, cur);
      if (longestLine[w].length > maxLen) {
        v = w;
        maxLen = longestLine[w].length;
      }
    }
    if (maxLen === -1) { // cur is leaf
      longestLine[cur] = [cur];
      return;
    }
    longestLine[v].push(cur);
    longestLine[cur] = longestLine[v];
    delete longestLine[v];
  }

  // start from all possible positions because Gred not conn
  for (const v of Xlist) {
    if (parentNode.hasOwnProperty(v)) {
      continue; // technically redundant
    }
    GetLongestLine(v, null);
  }

  console.log(longestLine);

  // want to sort lines by orderOfVisit
  // linesList: lines, but represented by the
  //    nodes that are starting points of lines
  // also reverse lines as promised
  const linesList = [];
  for (const v in longestLine) {
    if (longestLine.hasOwnProperty(v)) {
      longestLine[v].reverse();
      linesList.push(v);
    }
  }
  linesList.sort((v,w) => orderOfVisit[v] - orderOfVisit[w]);
  
  // now give 2D coord
  // since we've sorted by orderOfVisit,
  // parentNode below will be a node that has been given pos2D
  // the starting node v of a longestLine[v]
  // will have its y coord defined relative to its parent
  // (above/equal/below based on z coord)
  // the rest of the line will also go up or down
  // based on z coord
  const pos2D = {};
  linesList.forEach((v,i) => {
    let h = 0; // height/y for starting node v
    let par = parentNode[v];
    if (par !== null && pos2D.hasOwnProperty(par)) {
      const comp = Math.sign(objCoord[v].z - objCoord[par].z);
      h = pos2D[par][1] + comp;
    }
    if (longestLine[v].length === 1) {
      pos2D[v] = [i + horizInit, h];
    }
    else {
      const comp2 = 
          objCoord[longestLine[v][1]].z
          >= objCoord[longestLine[v][0]].z
          ? 1 : -1;
      longestLine[v].forEach((w,j) => {
        pos2D[w] = [i + horizInit, h + comp2 * j];
      });
    }
  });

  // wtf there's a loop?? in ADAL
  // 43615, 43612, 43610, 43609 (in reduced graph)
  // upon further inspection, the loop in the actual graph
  // is 43615, 43614, 43611, 43610, 43609, 43612, 43613

  Xlist.forEach((v,i) => {
    // label v with the partners of the synapse(s) at v
    // empty label if not synapse
    const vLabels = [];
    if (continByObj.hasOwnProperty(v)) {
      for (const contin of continByObj[v]) {
        vLabels.push(map.allSynData[contin].partners);
      }
    }
    if (map.remarks.hasOwnProperty(v)) {
      vLabels.push(map.remarks[v]);
    }
    const vlabel = vLabels.join(' / ');
    cy_elems.push({
      data: {
        id: `${db}-${cell}-${v}`,
        label: vlabel,
        width: 10,
        height: 10,
      },
      position: {
        x: pos2D[v][0] * UNITS_TO_CYTOSCAPE_COORD,
        y: pos2D[v][1] * UNITS_TO_CYTOSCAPE_COORD,
      }
    });
    for (const w of Gred[v]) {
      if (v < w) {
        cy_elems.push({
          data: {
            id: `${db}--${cell}--${v}--${w}`,
            source: `${db}-${cell}-${v}`,
            target: `${db}-${cell}-${w}`,
          },
        });
      }
    }
  });
  
  // get the width of the graph
  let maxHoriz = 0;
  for (const v in pos2D) {
    maxHoriz = Math.max(pos2D[v][0], maxHoriz);
  }
  maxHoriz -= horizInit;

  // final node, to label the entire graph by db and cell
  cy_elems.push({
    data: {
      id: `graph-${db}-${cell}`,
      label: `${db} ${cell}`,
      width: 10,
      height: 10,
    },
    style: {
      'font-size': 80,
    },
    position: {
      x: (horizInit + maxHoriz / 2) * UNITS_TO_CYTOSCAPE_COORD,
      y: -1 * UNITS_TO_CYTOSCAPE_COORD,
    }
  });
  return {
    cy_elems: cy_elems,
    maxHoriz: maxHoriz,
  };
};



//=====================================================
// *Section*: Maps, settings
// mainly color, also dumpMapSettingsJSON for saving to file

// used in particular in LoadMapMenu,
// which is called after LoadMap in ImporterApp (?),
// which is async (waits for xhttp request for data)
// so when writing items to menu need to check if done loading
MapViewer.prototype.isCellLoaded = function(db,cell) {
  return this.dbMaps.hasOwnProperty(db)
      && this.dbMaps[db].hasOwnProperty(cell);
};

// color: {r: 0.2, g: 0.4, b: 0.7} values are between 0 and 1
// (usual RGB color / 255)
// note: color selector thing is created when user clicks button,
// so we just need to modify the color directly on the object
MapViewer.prototype.SetSkeletonColor = function(db,cell,color) {
  for (const obj of this.dbMaps[db][cell].skeletonGrp.children) {
    obj.material.color.r = color.r;
    obj.material.color.g = color.g;
    obj.material.color.b = color.b;
  }
};
MapViewer.prototype.SetSkeletonColorHex = function(db,cell,hex) {
  const color = this.app.hexToRGB(hex);
  color.r = color.r / 255.0;
  color.g = color.g / 255.0;
  color.b = color.b / 255.0;
  this.SetSkeletonColor(db,cell,color);
};
// get skeleton color
// note it is out of 1.0, for rgb should *255 and round
MapViewer.prototype.GetSkeletonColor = function(db,cell) {
  if (this.dbMaps[db][cell].skeletonGrp.children.length === 0) {
    return { r: 0, g: 0, b: 0 };
  }
  const obj = this.dbMaps[db][cell].skeletonGrp.children[0];
  return {
    r: obj.material.color.r,
    g: obj.material.color.g,
    b: obj.material.color.b,
  };
};
MapViewer.prototype.SetVolumeColor = function(db,cell,color) {
  const volumeObj = this.dbMaps[db][cell].volumeObj;
  for (const obj of volumeObj.children) {
    obj.material.color.r = color.r;
    obj.material.color.g = color.g;
    obj.material.color.b = color.b;
  }
};
MapViewer.prototype.SetVolumeColorHex = function(db,cell,hex) {
  const color = this.app.hexToRGB(hex);
  color.r = color.r / 255.0;
  color.g = color.g / 255.0;
  color.b = color.b / 255.0;
  this.SetVolumeColor(db,cell,color);
};
// get volume color
// note it is out of 1.0, for rgb should *255 and round
MapViewer.prototype.GetVolumeColor = function(db,cell) {
  if (!this.dbMaps.hasOwnProperty(db)
    || !this.dbMaps[db].hasOwnProperty(cell)) {
    return { r: 0, g: 0, b: 0 };
  }
  if (!this.dbMaps[db][cell].hasOwnProperty('volumeObj')
    || this.dbMaps[db][cell].volumeObj === null
    || this.dbMaps[db][cell].volumeObj.children.length === 0) {
    return { r: 0, g: 0, b: 0 };
  }
  const obj = this.dbMaps[db][cell].volumeObj.children[0];
  return {
    r: obj.material.color.r,
    g: obj.material.color.g,
    b: obj.material.color.b,
  };
};

// return object for saving to file
//  {
//    'N2U': {
//      'ADAL': {
//        color: { r: , g: , b: }
//      },
//      ...
//    },
//    ...
//  }
MapViewer.prototype.dumpMapSettingsJSON = function() {
  const mapsSettings = {};
  for (const db in this.dbMaps) {
    mapsSettings[db] = {};
    this.maps = this.dbMaps[db];
    for (const cell in this.maps) {
      mapsSettings[db][cell] = {
        color: this.GetSkeletonColor(db,cell),
      };
    }
  }
  return mapsSettings;
};


//=====================================================
// *Section*: stuff for Synapse Info
// e.g. mouse events for the sphere objects in viewer

// returns a copy of synapse data with given contin
MapViewer.prototype.GetSynData = function(db,cellname,contin) {
  const synData = Object.assign({},
    this.dbMaps[db][cellname].allSynData[contin]);
  return synData;
};


MapViewer.prototype.SynapseOnMouseOver = function(db,cell,contin) {
  const synData = this.dbMaps[db][cell].allSynData[contin];
  synData.synLabelObj.visible = true;
  this.app.UpdateSynapseInfo(db,cell,contin);
  this.render();
};

MapViewer.prototype.SynapseOnMouseOut = function(db,cell,contin) {
  const synData = this.dbMaps[db][cell].allSynData[contin];
  if (this.IndexOfClickedSynapse(db,cell,contin) === -1) {
    if (!this.allSynLabelVisible) {
      synData.synLabelObj.visible = false;
    }
  }
  this.app.RestoreSynapseInfoLastClicked();
  this.render();
};

MapViewer.prototype.SynapseOnClick = function(db,cell,contin) {
  const synData = this.dbMaps[db][cell].allSynData[contin];

  // if click same synapse, 'unclick' it
  let ind = this.IndexOfClickedSynapse(db,cell,contin);
  if (ind !== -1) {
    // only hide if allSynLabelVisible is not true
    if (!this.allSynLabelVisible) {
      synData.synLabelObj.visible = false;
    }
    this.RemoveFromClickedSynapseInd(ind);
  }
  else {
    synData.synLabelObj.visible = true;
    this.AddClickedSynapse(db,cell,contin);
  }
  this.app.RestoreSynapseInfoLastClicked();
  this.render();
};

// get index of given synapse
// returns -1 if not found, i.e. synpase not in clicked
MapViewer.prototype.IndexOfClickedSynapse = function(db,cell,contin) {
  for (let i = 0; i < this.clickedSynapses.length; ++i) {
    let syn = this.clickedSynapses[i];
    if (syn.contin === contin
      && syn.cell === cell
      && syn.db === db) {
      return i;
    }
  }
  return -1;
};
MapViewer.prototype.RemoveFromClickedSynapseInd = function(ind) {
  if (ind < 0 || ind >= this.clickedSynapses.length) {
    return;
  }
  this.clickedSynapses.splice(ind,1);
  if (this.clickedSynapsesInd > ind) {
    this.clickedSynapsesInd -= 1;
  }
  // should update HTML but in current use case that's
  // already done outside
};
// one should check that this.clickedSynapses
// doesn't have this new synapse, as in SynapseOnClick
// as we want no duplicates,
// although it doesn't break anything
MapViewer.prototype.AddClickedSynapse = function(db,cell,contin) {
  this.clickedSynapses.push({
    db: db,
    cell: cell,
    contin: contin,
  });
  this.clickedSynapsesInd = this.clickedSynapses.length - 1;
};

// get the synapse that should be displayed in Synapse Info
// when mouse no longer hovers over a synapse
// returns null if no clicked synapses
// (a bit of a misnomer as the returned synapse
// may not be the last clicked synapse)
MapViewer.prototype.LastClickedSynapse = function() {
  if (this.clickedSynapsesInd < 0 ||
      this.clickedSynapsesInd >= this.clickedSynapses.length) {
    return null;
  }
  return this.clickedSynapses[this.clickedSynapsesInd];
};

// for arrow keys to cycle through clicked synapses
MapViewer.prototype.CycleClickedSynapseLeft = function() {
  this.clickedSynapsesInd -= 1;
  if (this.clickedSynapsesInd < 0) {
    this.clickedSynapsesInd = this.clickedSynapses.length - 1;
  }
};
MapViewer.prototype.CycleClickedSynapseRight = function() {
  this.clickedSynapsesInd += 1;
  if (this.clickedSynapsesInd >= this.clickedSynapses.length) {
    this.clickedSynapsesInd = 0;
  }
};

//======================================================
// *Section*: Translate Maps section
// stuff related to translations/position of cell/skeleton

/*
 * translate this.position to given x,y,z
 * this.position is (0,0,0) at the beginning
 * maps of each cell relative position to this.position
 * this.position is controlled directly by user
 * through the x/y/z-slider
 */
MapViewer.prototype.translateMapsTo = function(x,y,z) {
  const delta = new THREE.Vector3(x,y,z);
  delta.sub(this.position);

  this.position.set(x,y,z);

  const m = new THREE.Matrix4();
  m.makeTranslation(delta.x,delta.y,delta.z);
  
  for (const db in this.dbMaps) {
    for (const name in this.dbMaps[db]) {
      this.transformStuffOneCell(m,db,name);
    }
  }

  for (const db in this.aggrVol) {
    if (this.aggrVol[db] !== null)
      this.aggrVol[db].applyMatrix(m);
  }
};
MapViewer.prototype.translateMapsToDb = function(db,x,y,z) {
  const delta = new THREE.Vector3(x,y,z);
  delta.sub(this.dbPosition[db]);

  this.dbPosition[db].set(x,y,z);

  const m = new THREE.Matrix4();
  m.makeTranslation(delta.x,delta.y,delta.z);
  
  for (const name in this.dbMaps[db]) {
    this.transformStuffOneCell(m,db,name);
  }

  if (this.aggrVol.hasOwnProperty(db)) {
    if (this.aggrVol[db] !== null) {
      this.aggrVol[db].applyMatrix(m);
    }
  }
};

/*
 * same as translateMapsTo, but adds, not absolute
 */
//MapViewer.prototype.translateMapsBy = function(x,y,z) {
//  this.position.x += x;
//  this.position.y += y;
//  this.position.z += z;
//
//  const m = new THREE.Matrix4();
//  m.makeTranslation(x,y,z);
//
//  for (const name in this.maps) {
//    this.transformStuffOneCell(m, name);
//  }
//};

/*
 * translate one cell (usually when newly loaded)
 * by this.position and this.dbPosition[db] to match others
 * that have been translated by slider
 * important that all operations here are synchronous
 * so that if user is sliding, this will complete
 * before this.position is updated again
 */
MapViewer.prototype.translateOneMapsToThisPos = function(db,cellname) {
  const m = new THREE.Matrix4();
  m.makeTranslation(
    this.position.x + this.dbPosition[db].x,
    this.position.y + this.dbPosition[db].y,
    this.position.z + this.dbPosition[db].z
  );

  this.transformStuffOneCell(m,db,cellname);
};

/*
 * translate only one cell
 * add x,y,z to current position
 */
//MapViewer.prototype.translateOneMapsBy = function(cellname,x,y,z) {
//  const m = new THREE.Matrix4()
//  m.makeTranslation(x,y,z);
//
//  this.transformStuffOneCell(m, cellname);
//};



/*
 * @param {Object} m - THREE.Matrix4 object representing transformation
 * @param {String} name - cell name
 *
 * not used? I think everything done in transformStuffOneCell
 */
MapViewer.prototype.transformSynapses = function(m,db,name) {
  this.maps = this.dbMaps[db];
  this.maps[name].synObjs.applyMatrix(m);
};

/*
 * @param {Object} m - THREE.Matrix4 object representing transformation
 * @param {String} name - cell name
 *
 * not used? I think everything done in transformStuffOneCell
 */
MapViewer.prototype.transformRemarks = function(m,db,name) {
  this.maps = this.dbMaps[db];
  this.maps[name].remarksGrp.applyMatrix(m);
};

/*
 * transform all stuff (skeleton,synapse,labels,remarks)
 * for one cell
 * @param {Object} m - THREE.Matrix4 object representing transformation
 * @param {String} name - cell name
 */
MapViewer.prototype.transformStuffOneCell = function(m,db,name) {
  this.maps = this.dbMaps[db];
  this.maps[name].allGrps.applyMatrix(m);
};



//========================================================
// *Section*: for Synapse Filter section

/*
 * filter synapses from view
 * performed on all synapses from all db,cell
 *
 * note that this operation is subtractive only
 * in that if previously we applied a filter,
 * we do not automatically restore visibility of a synapse
 * if it is not filtered by the new filter
 *
 * @param {Object} filters - has the following keys:
 *  types - 'pre','post', and/or 'gap'
 *  sizeRange - range on number of sections
 *  cells - cells which a synapse should touch at least one of
 *  contins - strictest, only show synapses in this list
 *
 * in each of the variables, if the array given is null,
 * then we do not filter based on that
 */
MapViewer.prototype.FilterSynapses = function(filters) {
  this.FilterSynapsesByType(filters.types);
  this.FilterSynapsesBySize(filters.sizeRange);
  this.FilterSynapsesByCells(filters.cells);
  this.FilterSynapsesByContins(filters.contins);
};

MapViewer.prototype.FilterSynapsesByType = function(types) {
  if (types === null) return;
  if (types.length === 0) return;

  for (const db in this.dbMaps) {
    this.maps = this.dbMaps[db];
    for (const cell in this.maps) {
      for (const type of ['pre','post','gap']) {
        if (!types.includes(type)) {
          this.maps[cell][type+'Grp'].visible = false;
        }
      }
    }
  }
};
// expect sizeRange = { min: num or null, max: num or null}
// or null if no filtering
MapViewer.prototype.FilterSynapsesBySize = function(sizeRange) {
  if (sizeRange === null) return;

  for (const db in this.dbMaps) {
    this.maps = this.dbMaps[db];
    for (const cell in this.maps) {
      for (const contin in this.maps[cell].allSynData) {
        const synData = this.maps[cell].allSynData[contin];
        if ((sizeRange.min !== null
              && synData.size < sizeRange.min)
          || (sizeRange.max !== null
              && synData.size > sizeRange.max)) {
          synData.sphere.visible = false;
        }
        // no else, don't set true if pass
        // because we are doing subtractive filtering
      }
    }
  }
};
MapViewer.prototype.FilterSynapsesByCells = function(cells) {
  if (cells === null) return;
  if (cells.length === 0) {
    // don't filter by cell if no cells given
    return;
  }

  for (const db in celllistByDbType) {
    const cellsSet = new Set(cells);

    this.maps = this.dbMaps[db];
    for (const cell in this.maps) {
      for (const contin in this.maps[cell].allSynData) {
        const syn = this.maps[cell].allSynData[contin];
        const synCells = [syn.pre].concat(syn.post.split(','));

        let isBad = true;
        for (const c of synCells) {
          if (cellsSet.has(c)) {
            isBad = false;
            break;
          }
        }
        if (isBad) {
          syn.sphere.visible = false;
        }
      }
    }
  }
};
MapViewer.prototype.FilterSynapsesByContins = function(contins) {
  if (contins === null) return;
  if (contins.length === 0) {
    // don't filter by contin if none given
    return;
  }
  for (const db in this.dbMaps) {
    this.maps = this.dbMaps[db];
    for (const cell in this.maps) {
      for (const contin in this.maps[cell].allSynData) {
        const continNum = parseInt(contin);
        if (!contins.includes(continNum)) {
          this.maps[cell].allSynData[contin].sphere.visible = false;
        }
      }
    }
  }
};

// a bit different from old methods of toggleAllSynapses etc
// because in FilterSynapses, affect visibility of both
// the groups (preGrp etc) and individual sphere objects
MapViewer.prototype.RestoreSynapses = function() {
  for (const db in this.dbMaps) {
    this.maps = this.dbMaps[db];
    for (const cell in this.maps) {
      const map = this.maps[cell];
      map.preGrp.visible = true;
      map.postGrp.visible = true;
      map.gapGrp.visible = true;
      for (const contin in map.allSynData) {
        map.allSynData[contin].sphere.visible = true;
      }
    }
  }
};


//=====================================================
// *Section*: toggle visibility of stuff
// (skeleton, synapses, volume)

/*
 * toggles visible of all stuff of a cell,
 * note subgroups stay hidden if they were separately hidden
 * (e.g. if toggle remarks to hidden,
 * doing toggleMaps(name, true) will still keep it hidden)
 */
MapViewer.prototype.toggleMaps = function(db,name,visible=null) {
  if (typeof(visible) !== 'boolean') {
    visible = !this.dbMaps[db][name].allGrps.visible;
  }
  this.dbMaps[db][name].allGrps.visible = visible;
}

MapViewer.prototype.mapIsVisible = function(db,name) {
  return this.dbMaps[db][name].allGrps.visible;
};


// only toggle visibility of skeleton of one cell
// not in use
MapViewer.prototype.toggleSkeleton = function(db,name,visible=null)
{
  if (typeof(visible) !== 'boolean') {
    visible = !this.dbMaps[db][name].skeletonGrp.visible;
  }
  this.dbMaps[db][name].skeletonGrp.visible = visible;
};

// toggle visibility of all synapses
// not in use, UI only allows filtering
MapViewer.prototype.toggleAllSynapses = function(visible=null)
{
  for (const db in this.dbMaps) {
    for (const cell in this.dbMaps[db]) {
      this.toggleSynapsesByCell(cell,visible);
    }
  }
};
// also not in use
MapViewer.prototype.toggleSynapsesByCell = function(db,cell,visible=null)
{
  if (typeof(visible) !== 'boolean') {
    visible = !this.dbMaps[db][cell].synObjs.visible;
  }
  this.dbMaps[db][cell].synObjs.visible = visible;
};

// synType = 'pre','post','gap'
// not in use, essentially replaced by FilterSynapsesByType
MapViewer.prototype.toggleSynapsesByType = function(db,cell,synType,visible=null) {
  const grp = synType + 'Grp';
  if (typeof(visible) !== 'boolean') {
    visible = !this.dbMaps[db][cell][grp].visible;
  }
  this.dbMaps[db][cell][grp].visible = visible;
};


//=========================================================
// *Section*: Global Viewer Options
// show/hide visibility of some (mostly) global stuff,
// i.e. functionality for Global Viewer Options

MapViewer.prototype.toggleAllRemarks = function(bool=null) {
  for (const db in this.dbMaps) {
    for (const cell in this.dbMaps[db]) {
      this.toggleRemarksByCell(db,cell,bool);
    }
  }
};

MapViewer.prototype.toggleRemarksByCell = function(db,cell,bool=null) {
  if (typeof(bool) !== 'boolean') {
    bool = !this.dbMaps[db][cell].remarksGrp.visible;
  }
  this.dbMaps[db][cell].remarksGrp.visible = bool;
};

MapViewer.prototype.GetRemarkVis = function(db,cell) {
  return this.dbMaps[db][cell].remarksGrp.visible;
};


MapViewer.prototype.toggleGrid = function(bool=null) {
  if (typeof(bool) !== 'boolean') {
    bool = !this.gridGrp.visible;
  }
  this.gridGrp.visible = bool;
};

MapViewer.prototype.toggleAxes = function(bool=null) {
  if (typeof(bool) !== 'boolean') {
    bool = !this.axesText.visible;
  }
  this.axesText.visible = bool;
};

MapViewer.prototype.toggleAllSynapseLabels = function(bool=null) {
  if (typeof(bool) !== 'boolean') {
    bool = !this.allSynLabelVisible;
  }
  this.allSynLabelVisible = bool;
  // if bool, set all to viisble,
  // else, set all to hidden except those in clickedSynapses
  for (const db in this.dbMaps) {
    for (const cell in this.dbMaps[db]) {
      const allSynData = this.dbMaps[db][cell].allSynData;
      for (const contin in allSynData) {
        let synLabel = allSynData[contin].synLabelObj;
        synLabel.visible = bool;
      }
    }
  }
  // keep label visible if that synapse was clicked
  for (const syn of this.clickedSynapses) {
    this.dbMaps[syn.db][syn.cell].allSynData[syn.contin].synLabelObj.visible = true;
  }
};

// visibility of all volume (true if all visible)
MapViewer.prototype.GetAllVolumeVis = function() {
  for (const db in this.dbMaps) {
    this.maps = this.dbMaps[db];
    for (const cellname in this.maps) {
      if (!this.GetVolumeVis(db,cellname))
        return false;
    }
  }
  return true;
};
MapViewer.prototype.ToggleAllVolume = function(bool=null) {
  if (typeof(bool) !== 'boolean') {
    bool = !this.GetAllVolumeVis();
  }
  for (const db in this.dbMaps) {
    this.maps = this.dbMaps[db];
    for (const name in this.maps){
      this.ToggleVolumeByCell(db,name,bool);
    };
  }
};

// return false if at least one volume is hidden
MapViewer.prototype.GetAllAggregateVolumeVis = function() {
  for (const db in this.aggrVol) {
    if (!this.GetAggregateVolumeVisByDb(db))
      return false;
  }
  return false;
};
MapViewer.prototype.ToggleAllAggregateVolume = function(bool=null) {
  if (typeof(bool) !== 'boolean') {
    bool = !this.GetAllAggregateVolumeVis();
  }
  console.log(bool);
  for (const db in this.aggrVol) {
    this.ToggleAggregateVolumeByDb(db,bool);
  }
};


//=========================================================
// *Section*: Scale Synapses section

MapViewer.prototype.ScaleSynapses = function(scale) {
  for (const db in this.dbMaps) {
    for (const cell in this.dbMaps[db]) {
      for (const contin in this.dbMaps[db][cell].allSynData) {
        this.dbMaps[db][cell].allSynData[contin].sphere.scale.setScalar(scale);
      }
    }
  }
}

// compute radius of sphere for synapse from num of sections
// depends on this.synMax
// min synapse radius will be this.synMax/2
MapViewer.prototype.SynapseRadiusFromSections = function(numSect) {
  return this.synMax/2 * (2 - Math.pow(2, 1 - numSect / 2));
}

//=========================================================
// *Section*: Volume

MapViewer.prototype.GetVolumeVis = function(db,cellname) {
  this.maps = this.dbMaps[db];
  let volumeObj = this.maps[cellname].volumeObj;
  if (volumeObj === null || volumeObj === undefined) {
    return;
  }
  return volumeObj.visible;
};
MapViewer.prototype.GetAggregateVolumeVisByDb = function(db) {
  return this.aggrVol[db].visible;
};

MapViewer.prototype.ToggleAggregateVolumeByDb = function(db,bool=null) {
  if (typeof(bool) !== 'boolean') {
    bool = !this.GetAggregateVolumeVisByDb(db);
  }
  // if 'hide vol' clicked before properly loaded
  if (!this.aggrVol.hasOwnProperty(db) ||
      this.aggrVol[db] === null ||
      this.aggrVol[db] === undefined) {
    return;
  }
  this.aggrVol[db].visible = bool;
};
MapViewer.prototype.ToggleVolumeByCell = function(db,cellname,bool=null) {
  this.maps = this.dbMaps[db];
  let volumeObj = this.maps[cellname].volumeObj;
  if (volumeObj === null || volumeObj === undefined) {
    return;
  }
  if (typeof(bool) !== 'boolean') {
    bool = !this.GetVolumeVis(db,cellname);
  }
  volumeObj.visible = bool;
};

//==========================================================
// *Section*: save to file

// not in use directly, ImporterApp just uses
// dumpMapSettingsJSON() and dumpCameraJSON() directly
MapViewer.prototype.dumpJSON = function() {
  return {
    mapsSettings: this.dumpMapSettingsJSON(),
    cameraSettings: this.dumpCameraJSON(),
  };
};

//========================================================
// *Section*: coordinates of stuff
// we store the coords of obj in this.maps[cell].objCoord
// but the actual coordinates as appearing in the viewer
// also adds a translation that the user can perform
// in the Translate Maps section
//
// we say posiiton/coord "in viewer" for the latter,
// and "absolute" for the former
// (note the absolute coord's have already been transformed
// under ApplyPlotTransform

// get average position of cell in viewer
// used for recentering view on LoadMap
//
// returns null if no skeleton
MapViewer.prototype.GetAverageSkeletonPosAbsolute = function(db,cell) {
  // maybe easier to just do objCoord directly,
  // but in the future might add objs that are
  // not part of the skeleton per se
  const lines = this.dbMaps[db][cell].skeletonLines;
  const objCoord = this.dbMaps[db][cell].objCoord;
  const tot = new THREE.Vector3(0,0,0);
  let count = 0;
  for (const line of lines) {
    for (const v of line) {
      tot.add(objCoord[v]);
      ++count;
    }
  }

  // some cells have no skeleton data, like JSH-AIZR
  if (count === 0) {
    return null;
  }

  tot.multiplyScalar(1.0 / count);

  return tot;
};
MapViewer.prototype.GetAverageSkeletonPosViewer = function(db,cell) {
  const pos = this.GetAverageSkeletonPosAbsolute(db,cell);
  if (pos === null) return null;
  const trans = this.GetTranslateOnMaps(db,cell);
  pos.add(trans);

  return pos;
};
// sometimes skeleton data is missing,
// use objCoord directly
// returns null if objCoord is empty
MapViewer.prototype.GetAverageObjCoordAbsolute = function(db,cell) {
  const objCoord = this.dbMaps[db][cell].objCoord;
  const tot = new THREE.Vector3(0,0,0);
  let count = 0;
  for (const obj in objCoord) {
    tot.add(objCoord[obj]);
  }

  // objCoord may also be empty
  if (count === 0) {
    return null;
  }

  tot.multiplyScalar(1.0 / count);

  return tot;
};
MapViewer.prototype.GetAverageObjCoordViewer = function(db,cell) {
  const pos = this.GetAverageObjCoordAbsolute(db,cell);
  if (pos === null) return null;
  const trans = this.GetTranslateOnMaps(db,cell);
  pos.add(trans);

  return pos;
};
// sometimes skeleton data/objCoord is missing,
// use average of synapses instead in CenterViewOnCell
MapViewer.prototype.GetAverageSynapsePosAbsolute = function(db,cell) {
  const tot = new THREE.Vector3(0,0,0);
  let count = 0;
  for (const contin in this.dbMaps[db][cell].allSynData) {
    const synData = this.dbMaps[db][cell].allSynData[contin];
    tot.add(synData.coord);
    count += 1;
  }
  if (count === 0) {
    return null;
  }

  tot.multiplyScalar(1.0 / count);

  return tot;
};
MapViewer.prototype.GetAverageSynapsePosViewer = function(db,cell) {
  const pos = this.GetAverageSynapsePosAbsolute(db,cell);
  if (pos === null) return null;
  const trans = this.GetTranslateOnMaps(db,cell);
  pos.add(trans);

  return pos;
};

// get the amount that this cell has been translated
// (translations are put in effect by
// translateOneMapsToThisPos,
// which only affects maps[cellname].allGrps)
//
// this shold return the same as ImporterApp.GetMapsTranslate
// but this returns as THREE, importer app no THREE
// also, it should really be independent of cell
// but in all use cases, there is reference to a cell
//
// should be equal to this.position actually..
MapViewer.prototype.GetTranslateOnMaps = function(db,cell) {
  return this.dbMaps[db][cell].allGrps.position;
};

// get syn's coordinates as seen in 3D viewer,
// i.e. taking into account translations too
MapViewer.prototype.GetSynCoordInViewer = function(db,cell,contin) {
  const trans = this.GetTranslateOnMaps(db,cell);
  const coord = this.GetSynCoordAbsolute(db,cell,contin);
  return new THREE.Vector3(
    trans.x + coord.x,
    trans.y + coord.y,
    trans.z + coord.z);
};

// get obj's coordinates as seen in 3D viewer,
// i.e. taking into account translations too
MapViewer.prototype.GetObjCoordInViewer = function(db,cellname,obj) {
  const trans = this.GetTranslateOnMaps(db,cellname);
  const coord = this.GetObjCoordAbsolute(db,cellname,obj);
  return new THREE.Vector3(
    trans.x + coord.x,
    trans.y + coord.y,
    trans.z + coord.z);
};

MapViewer.prototype.GetSynCoordAbsolute = function(db,cellname,contin) {
  return this.dbMaps[db][cellname].allSynData[contin].coord;
};

MapViewer.prototype.GetObjCoordAbsolute = function(db,cellname,objNum) {
  return this.dbMaps[db][cellname].objCoord[objNum];
};


//========================================================
// *Section*: stuff related to camera/viewer

MapViewer.prototype.resizeDisplayGL = function(){
  const renderer = this.renderer;
  const camera = this.camera;
  const canvas = this.canvas;
  // from apps/include/three/threex.windowresize.js
  THREEx.WindowResize(renderer, camera, () => {
    return {
      width: canvas.offsetWidth,
      height: canvas.offsetHeight,
    };
  });
};

MapViewer.prototype.render = function(){  
  if (! this.renderer.autoClear){
    this.renderer.clear();
  };
  this.controls.update();
  this.renderer.render(this.scene,this.camera);
};

// useless?
MapViewer.prototype.recalcAspectRatio = function(){
  this.aspectRatio = (this.canvas.offsetHeight === 0) ? 1 : this.canvas.offsetWidth / this.canvas.offsetHeight;
};

MapViewer.prototype.resetCamera = function(){
  this.camera.position.copy(this.cameraDefaults.posCamera);
  this.cameraTarget.copy(this.cameraDefaults.posCameraTarget);
  this.updateCamera();
};

// must be called everytime camera positions/target changes
MapViewer.prototype.updateCamera = function(){
  this.camera.apsect = this.aspectRatio;
  this.camera.lookAt(this.cameraTarget);
  this.camera.updateProjectionMatrix();
};


/*
 * make camera point at a position
 *
 * @param {THREE.Vector3} target - where to point
 *    ( or just {x: , y: , z: } )
 */
MapViewer.prototype.SetCameraTarget = function(target) {
  this.controls.target.x = target.x;
  this.controls.target.y = target.y;
  this.controls.target.z = target.z;
  this.cameraTarget.x = target.x;
  this.cameraTarget.y = target.y;
  this.cameraTarget.z = target.z;
  this.updateCamera();
};

/*
 * set position of camera
 *
 * @param {THREE.Vector3} pos - position of camera
 *    ( or just {x: , y: , z: } )
 */
MapViewer.prototype.SetCameraPosition = function(pos) {
  this.camera.position.x = pos.x;
  this.camera.position.y = pos.y;
  this.camera.position.z = pos.z;
  this.updateCamera();
};

MapViewer.prototype.CenterViewOnCell = function(db,cellname) {
  let pos = this.GetAverageSkeletonPosViewer(db,cellname);
  if (pos === null) {
    pos = this.GetAverageObjCoordViewer(db,cellname);
    if (pos === null) {
      pos = this.GetAverageSynapsePosViewer(db,cellname);
      if (pos === null) {
        console.log('no coordinate data...');
        return;
      }
    }
  }
  this.SetCameraTarget(pos);
  pos.y += 1000;
  this.SetCameraPosition(pos);
  this.updateCamera();
};


MapViewer.prototype.CenterViewOnSynapse = function(db,cellname,contin) {
  const pos = this.GetSynCoordInViewer(db,cellname,contin);
  this.SetCameraTarget(pos);
  pos.y += 100;
  this.SetCameraPosition(pos);
  this.updateCamera();
};


MapViewer.prototype.SetCameraFromJSON = function(cameraSettings) {
  this.camera.position.x = cameraSettings.position.x;
  this.camera.position.y = cameraSettings.position.y;
  this.camera.position.z = cameraSettings.position.z;
  this.SetCameraTarget(cameraSettings.viewOrigin);
  this.updateCamera();
};

// return camera position/lookAt origin
MapViewer.prototype.dumpCameraJSON = function() {
  const cameraSettings = {
    position: this.camera.position,
    viewOrigin: this.controls.target, // where camera is looking
  };
  return cameraSettings;
};




//=========================================================
// *Section*: synpase and cell object


// can't use this in loadMap because
// allSynData is not defined yet
// (in fact, this is used to define synData.coord in loadMap)
MapViewer.prototype.GetClosestCellObjToSynapse = function(db,cell,contin) {
  this.GetClosestCellObjToSynapse(db,cell,
    this.dbMaps[db][cell].allSynData[contin].coord);
};
// used in loadMap when the cell object number is bad
MapViewer.prototype.GetClosestCellObjToCoord = function(db,cell,coord) {
  let minDist = 10e9;
  let cellObj = null;
  let objCoord = this.dbMaps[db][cell].objCoord;
  for (const obj in objCoord) {
    let c = objCoord[obj];
    let dist = (c.x - coord.x)*(c.x - coord.x)
      + (c.y - coord.y)*(c.y - coord.y)
      + (c.z - coord.z)*(c.z - coord.z);
    if (dist < minDist) {
      cellObj = parseInt(obj);
      minDist = dist;
    }
  }
  return cellObj;
};


// get the skeleton obj that a synapse is attached to
// null if no good object found
// (this happens when php gives syn.coord = NOT_FOUND
// and also the pre/postObj numbers are bad;
// but from inspection of MySQL tables,
// syn.coord is never NOT_FOUND, so should be never null)
MapViewer.prototype.SynapseContinToObj = function(db,cellname,contin) {
  return this.dbMaps[db][cellname].allSynData[contin].cellObj;
};

// get synapses that have the same cellObj in given cell
MapViewer.prototype.ObjToSynapseContin = function(db,cellname,obj) {
  let ans = [];
  obj = parseInt(obj);
  const allSynData = this.dbMaps[db][cellname].allSynData;
  for (const contin in allSynData) {
    if (obj === allSynData[contin].cellObj) {
      ans.push(parseInt(contin));
    }
  }
  return ans;
};


//==========================================================
// *Section*: text in viewer

/*
 * usage: labels for obj with remarks, coordinate label (anterior etc)
 *
 * returns a THREE mesh object with given text
 * (it has name property = 'text' which helps
 * in this.RotateTextFaceCamera to identify the text child)
 *
 * by default (no rotations), text appears in
 * x-y plane,
 * perpendicular to Anterior-Posterior axis
 *
 * @param {string} text
 * @param {Object} params -
 *  keys:
 *    pos: THREE.Vector3 (required)
 *    rotate: {x,y,z} (optional, default x-y plane)
 *      rotates by right-hand rule, e.g.
 *      x=-pi/2 means turn text from face +z to face +y
 *    scale: {x,y,z} (optional, default {1,1,1})
 *      (for rotate and scale, allowed to omit some,
 *        e.g. scale = {x:1})
 *    font: optional (default "Bold 20px Arial")
 *    color: optional (default this.defaultTextColor)
 */
MapViewer.prototype.addText = function(text,params) {
  // some hard-coded values, probably good to change in future
  const defaultTextFont = "Bold 20px Arial";
  const textHeight = 30;

  // text is written onto a canvas element,
  // and somehow THREE creates a texture from it
  const textCanvas = document.createElement('canvas');
  const ctx = textCanvas.getContext('2d');
  ctx.clearRect(0, 0, textCanvas.width, textCanvas.height);
  const font = ('font' in params) ?
    params.font : defaultTextFont;
  ctx.font = font;
  const fillStyle = ('color' in params) ?
    params.color : this.defaultTextColor;
  ctx.fillStyle = fillStyle;

  textCanvas.width = ctx.measureText(text).width;
  textCanvas.height = textHeight;

  // browser bugs: this is reset to default after measureText!
  ctx.font = font;
  ctx.fillStyle = fillStyle;

  ctx.fillText(text, 0, textCanvas.height - 5);
    
  // textCanvas contents will be used for a texture
  const texture = new THREE.Texture(textCanvas) 
  texture.needsUpdate = true;

  // material for the rectangle in which text is written
  // hence set to transparent
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    side:THREE.DoubleSide
  });
  material.transparent = true;

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(textCanvas.width, textCanvas.height),
    material
  );
  mesh.name = 'text';

  // text mesh object created, now do some transformation

  // scale the text
  // (font size of text can't be set to smaller than
  // say 10pt; would become too blurry)
  if ('scale' in params) {
    const m = new THREE.Matrix4();
    m.makeScale(
      'x' in params.scale ? params.scale.x : 1,
      'y' in params.scale ? params.scale.y : 1,
      'z' in params.scale ? params.scale.z : 1
    );
    mesh.applyMatrix(m);
  }

  // note apparently must scale first;
  // seems scaling after rotating undoes rotation?
  if ('rotate' in params) {
    const rot = params.rotate;
    if ('x' in rot) { mesh.rotateX(rot.x); }
    if ('y' in rot) { mesh.rotateY(rot.y); }
    if ('z' in rot) { mesh.rotateZ(rot.z); }
  }

  if ('visible' in params) {
    mesh.visible = params.visible
  };

  // position is of the center of the canvas
  mesh.position.set(params.pos.x,params.pos.y,params.pos.z);

  return mesh;
}

/*
 * similar to addText, but the text is set to position
 * params.pos + params.offset,
 * and an arrow points from text to position params.pos
 *
 * returns a group consisting of an arrow
 * and text from addText
 * in RotateTextFaceCamera, use the 'name' property
 * of the mesh returned by addText
 * to find it as a child of this group
 *
 * @param {Object} params - almost same as addText
 *  but with the following additional keys:
 * @param {Vector3} params.offset - THREE.Vector3 (required)
 * @param {Boolean} params.arrowhead: boolean, if false, use line segment (optional)
 * @param {Number} params.arrowColor: (optional) default is 0x5500ff
 *  }
 */
MapViewer.prototype.addTextWithArrow = function(text,params) {
  // return value
  const group = new THREE.Group();

  const offset = params.offset.clone();
  const pos = params.pos.clone();

  // make a copy of params for this.addText
  // without offset
  const textParams = {};
  for (const key in params) {
    if (key === 'offset' || key === 'arrowOptions') {
      continue;
    }
    if (['rotate', 'scale'].includes(key)) {
      textParams[key] = Object.assign({}, params[key]);
    } else if (key === 'pos') {
      textParams[key] = params[key].clone();
    } else {
      textParams[key] = params[key];
    }
  }
  textParams.pos.add(offset);

  group.add(this.addText(text,textParams));

  const arrowColor = ('arrowColor' in params) ?
      params.arrowColor : this.defaultArrowColor;
  const length = offset.length();
  offset.normalize();
  offset.negate();

  if (params.arrowhead === false) {
    const geometry = new THREE.BufferGeometry().setFromPoints(
        [textParams.pos, pos]);
    const material = new THREE.LineBasicMaterial({ color: arrowColor });
    const line = new THREE.Line( geometry, material );
    group.add(line);
  }
  else {
    group.add(new THREE.ArrowHelper(offset, textParams.pos, length, arrowColor));
  }

  return group;
};

// expect textGrp to be created from addText
// or addTextWithArrow
// (in particular, the text to be rotated should be a
// child of textGrp, and have property name = 'text'
MapViewer.prototype.RotateTextFaceCamera = function(textGrp) {
  if (textGrp.name !== 'text' && !textGrp.isGroup) {
    console.log('given object is not text or group containing text');
    return;
  }
  let mesh = null;
  if (!textGrp.isGroup) {
    mesh = textGrp;
  }
  else {
    for (const m of textGrp.children) {
      if (m.name === 'text') {
        mesh = m;
        break;
      }
    }
    if (mesh === null) {
      console.log("textGrp expected to have child node with name = 'text'");
      return;
    }
  }
  let direction = new THREE.Vector3();
  // = mesh + (camera - target)
  direction.copy(this.camera.position);
  direction.sub(this.controls.target);
  direction.add(mesh.position);
  mesh.lookAt(direction);
};


//=========================================================
// Volumetric

MapViewer.prototype.loadVolumetric = function(db,cell,volumeObj) {
  if (!cellsWithVolumeModels.hasOwnProperty(db)) {
    // probably wouldn't even be called if this was the case
    console.log(`Volumetric data not available for ${db}`);
    return;
  }

  if (volumeObj === null || volumeObj === undefined) {
    console.log(`Volumetric data not available for ${cell}`);
    return;
  }

  // note that volumeObj has one child,
  // and that child is the actual object
  // useful to know because this is how to find the
  // bounding box of the object,
  // which I used to help look for the loaded object
  // in the viewer...
  //const obj = volumeObj.children[0];
  //obj.geometry.computeBoundingBox();
  //const boundingBox = obj.geometry.boundingBox;
  //console.log(boundingBox);

  volumeObj.scale.set(
    plotTransformVol[db].scale.x,
    plotTransformVol[db].scale.y,
    plotTransformVol[db].scale.z);
  volumeObj.position.x = plotTransformVol[db].translate.x;
  volumeObj.position.y = plotTransformVol[db].translate.y;
  volumeObj.position.z = plotTransformVol[db].translate.z;

  volumeObj.visible = true;

  // add aggregate volume object separately
  if (cell.includes('PARTIAL_REDUCED_COMBINED')) {
    for (const mtl of volumeObj.children[0].material) {
      mtl.transparent = true;
      mtl.opacity = 0.1;
    }
    this.aggrVol[db] = volumeObj;
    this.scene.add(volumeObj);
    return;
  }

  this.dbMaps[db][cell].volumeObj = volumeObj;
  this.dbMaps[db][cell].allGrps.add(volumeObj);
};



//==========================================================
// *Section*: some auxiliary functions for graphs


/*
 * convert edgelist into neighbor list
 * returned object should have one key for each node,
 * and value is an array consisting of its neighbors
 *  
 *  graph = {
 *    43945: [43946,43944],
 *    ...
 *  }
 * remove multiedges, self-loop
 *
 * @param {Array} edges - array of two-elem arrays
 *    whose entries are the nodes that are connected edge
 *    nodes can be anything, String or Number,
 *    but in our use case expected numbers
 */
function BuildGraphFromEdgeList(edges) {
  const graph = {}; // return object
  for (const edge of edges) {
    if (edge[0] === edge[1]) {
      continue;
    }
    if (!graph.hasOwnProperty(edge[0])) {
      graph[edge[0]] = [];
    }
    if (!graph.hasOwnProperty(edge[1])) {
      graph[edge[1]] = [];
    }
    graph[edge[0]].push(edge[1]);
    graph[edge[1]].push(edge[0]);
  }
  // clean up multiedges
  for (const v in graph) {
    graph[v] = [... new Set(graph[v])];
  };
  return graph;
}

/*
 * given graph (in neighbor list format)
 * return an Array of lines (line = Array of nodes)
 * whose union make up the graph,
 * and no edges are repeated
 */
function BreakGraphIntoLineSubgraphs(graph) {
  // first make a copy,
  // but in the form of "weighted graph" (just 0/1)
  // to keep track of whether we've visited an edge
  const G = {};
  for (const v in graph) {
    G[v] = {};
    for (const w of graph[v]) {
      G[v][w] = 0;
    }
  }

  // return value
  const lines = [];

  // the main strategy is to start at an edge
  // and attempt to travel as far as possible
  // in either direction (choosing random next step
  // if there are more than one option,
  // so actually not guarantee longest, but doesn't matter)
  // 
  // in order to avoid searching through edges we've
  // encountered each time we finish performing
  // the main strategry,
  // we simply systematically go through all possible
  // starting edges;
  // if we indeed have encountered the edge,
  // then we just continue and attempt the next edge
  for (const v in G) {
    for (const w in G) {
      if (G[v][w] !== 0) {
        continue;
      }

      // v,w is our starting edge; mark as visited
      G[v][w] = 1;
      G[w][v] = 1;

      // our lines; starting at v, going in each direction
      // final result would be reverse(l1) + l2
      const l1 = [w];
      const l2 = [v];

      let a = w; // the frontier vertex
      while (true) {
        let b = null; // attempt to find next vertex
        for (const c in G[a]) {
          if (G[a][c] !== 1) {
            b = c;
            break;
          }
        }
        if (b === null) {
          break; // end travel
        }
        
        G[a][b] = 1; // mark visit
        G[b][a] = 1;
        l1.push(b); // add to line
        a = b; // b is new frontier vertex
      }

      // same as above, just in the other direction
      a = v; // the frontier vertex
      while (true) {
        let b = null; // attempt to find next vertex
        for (const c in G[a]) {
          if (G[a][c] !== 1) {
            b = c;
            break;
          }
        }
        if (b === null) {
          break; // end travel
        }
        
        G[a][b] = 1; // mark visit
        G[b][a] = 1;
        l2.push(b); // add to line
        a = b; // b is new frontier vertex
      }

      lines.push(l1.reverse().concat(l2));
    }
  }

  return lines;
}


/*
 * given a graph G and a subset X of vertices,
 * returns a new graph which "reduces" G to X,
 * where vertices are connected if there is a path in G
 * between them that does not pass through other vertices of X
 * we also remove self-loops from the result;
 * turns out the graphs do have loops... very weird!!
 * similarly, in general there could be multiple such paths
 * between vertices in X, but in the output we simply
 * have one edge, no weights
 *
 * strict assumption (which we check for!)
 * X must contain all vertices of degree != 2
 * G no self-loops
 *
 * with this assumption, essentially we just want to
 * collapse all 'line subgraphs' between vertices of X
 *
 * currently we're implicitly assuming that nodes of G
 * are given by numbers;
 * but because nodes are keys, they are turned into strings,
 * so be careful when comparing a node and its neighbors!!
 *
 * @param {Object} G - graph given in neighbor list form
 * @param {Set} X - subset of vertices of G
 */
function ReduceGraph(G, X) {
  // perform some checks
  for (const v in G) {
    //if (!G.hasOwnProperty(v)) continue;
    const vNum = parseInt(v);
    if (G[v].length !== 2 && !X.has(vNum)) {
      console.error('ReduceGraph expects X to contain all vertices of degree not 2; vertex in error: ', v);
      return null;
    }
    if (G[v].indexOf(v) > -1) {
      console.error('Expect G to have no self-loops; vertex in error: ', v);
    }
  }

  // result graph to be returned
  const res = {};
  X.forEach(v => {
    res[v] = [];
    if (!G.hasOwnProperty(v)) {
      console.log('weird, X should be subset of G; vertex in error: ', v);
      return;
    }
    // attempt to go in every direction
    for (const w of G[v]) {
      // go all the way in that direction
      let u = w, prev = v;
      while (!X.has(u)) {
        // so G[u] must have exactly two elements
        let y = u;
        u = (G[u][0] != prev) ? G[u][0] : G[u][1];
        prev = y;
      }
      // now u must be in X; add it to neighbor of v
      res[v].push(u);
    }
    // remove duplicates and self-loops
    res[v]= [...new Set(res[v])];
    res[v] = res[v].filter(p => p !== v);
  });

  return res;
}

