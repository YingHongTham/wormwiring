// note confusing terminology, series can refer to database N2U etc
// or also the regions of the worm: VC, NR, DC, VC2, RIG, LEF

// requires:
// apps/include/plotParams.js
// apps/include/cytoscape-3.21.1.min.js
// apps/include/three/threex.windowresize.js

if (plotMinMaxValues === undefined) {
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
 * see loadMap2 for a full description
 */

MapViewer = function(canvas,app)
{
  this.canvas = canvas;
  this.app = app;

  // Parameters
  // TODO figure out these scalings.. is it correct?
  // (refer to actual EM micrographs)
  this.XYScale = 0.05;
  this.synMax = 20; // limit on synapse radius in viewer
  this.synScale = 0.4; // radius = synScale * num sections

  this.skelColor = 0x4683b2;
  this.preColor = 0xfa5882;
  this.postColor = 0xbf00ff;
  this.gapColor = 0x00ffff;
  this.cellbodyColor = 0xff0000;

  this.skelWidth = 2;
  this.cellbodyWidth = 5;

  this.remarksColor = "rgba(0,255,25,0.95)";
  this.defaultTextColor = "rgba(255,0,0,0.95)";
  this.defaultArrowColor = 0x5500ff;

  // for smoothness of synapse sphere
  this.sphereWidthSegments = 5;
  this.sphereHeightSegments = 5;

  // plotParam as returned in map object by retrieve_trace_coord
  // is the same for all cells in a given db
  // this is updated each time a cell is retrieved,
  // TODO better to only update when db changes
  // regardless, makes more sense to be an attribute here
  // rather than passed around for this.applyPlotParamsTransform(..)
  this.plotParam = {
    xmid: 0,
    xmin: 0,
    ymid: 0,
    ymax: 0,
    zmid: 0,
    zmin: 0,
  };
  
  // keeps track of movement of skeleton etc by the user
  // in Translate Maps section, using id='x-slider' etc
  // (see this.translateMapsTo/By)
  // note this is NOT the view target of the camera,
  // i.e. the cell moves relative to the grid,
  // but the camera and view target remain fixed
  //
  // should always be equal to this.GetTranslateOnMaps
  const transPos = this.app.GetTranslationSliderValue();
  this.position = new THREE.Vector3(
    transPos.x, transPos.y, transPos.z);

  
  // skelMaterial a bit redundant
  // as each skeleton will need its own Material
  // (which allows individual color change)
  // TODO maybe can optimize this by only create material if change color
  this.skelMaterial = new THREE.LineBasicMaterial({ color: this.skelColor, linewidth: this.skelWidth });
  this.cbMaterial = new THREE.LineBasicMaterial({color:this.cellbodyColor,linewidth:this.cellbodyWidth});
  this.preMaterial = new THREE.MeshLambertMaterial({color:this.preColor});
  this.postMaterial = new THREE.MeshLambertMaterial({color:this.postColor});
  this.gapMaterial = new THREE.MeshLambertMaterial({color:this.gapColor});

  this.maps = {}; // see loadMap2 for expected form
  
  // but wait! there's more!
  this.initGL();
};

/*
 * initialize the viewer
 */
MapViewer.prototype.initGL = function()
{
  // in order to make an object visible,
  // add it to scene or one of its descendents
  // (a lot like DOM Tree)
  this.scene = new THREE.Scene();

  //============================================
  // camera/renderer

  this.cameraDefaults = {
    posCamera: new THREE.Vector3( -250.0, 225.0, 1000.0),
    posCameraTarget: new THREE.Vector3( 0, 0, 0),
    near: 0.1,
    far: 10000,
    fov: 45
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
    autoClear: true
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
  
  //=====================================
  // the 2D grid in the x-z plane
  this.gridHelper = new THREE.GridHelper(10000,100,0xFF4444,0x404040);
  this.scene.add(this.gridHelper);


  //========================================
  // axes arrows and text labeling axes
  this.axesText = new THREE.Group();
  this.scene.add(this.axesText);

  const origin = new THREE.Vector3(0,0,0);
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
};


MapViewer.prototype.clearMaps = function()
{
  for (var name in this.maps){
    this.scene.remove(this.maps[name].allGrps);
  };
  this.maps = {};
};

/*
 * new version of loadMap,
 * to be compatible w/ LoadMap2 in importerapp.js
 * and retrieve_trace_coord_alt.php,
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
MapViewer.prototype.loadMap2 = function(data)
{
  // scale/translate obj coords
  const plotMinMax = plotMinMaxValues[data.db];
  this.plotParam.xmid = 0.5*(plotMinMax.xMin+plotMinMax.xMax);
  this.plotParam.xmin = plotMinMax.xMin;
  this.plotParam.ymid = 0.5*(plotMinMax.yMin+plotMinMax.yMax);
  this.plotParam.ymax = plotMinMax.yMax;
  this.plotParam.zmid = 0.5*(plotMinMax.zMin+plotMinMax.zMax);
  this.plotParam.zmin = plotMinMax.zMin;

  // linewidth actually no longer supported
  var skelMaterial = new THREE.LineBasicMaterial({ color: this.skelColor,
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
   * (synLabel.name; see toggleSynapseLabels)
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
   *      pre: syn.pre,
   *      post: syn.post,
   *      type: 'pre'/'post/'gap',
   *      contin: 3860,
   *      zLow: syn.zLow, // lowest and highest z of synapse
   *      zHigh: syn.zHigh,
   *      cellname: cell on which this synapse is shown
   *        (i.e. this is part of self.maps[cellname])
   *      partner: other cell(s) on other side of synapse
   *        (if we have RICL -> AVAL,ADAL
   *        and cellname = ADAL (so type = post),
   *        then partner is just RICL)
   *      obj: object that synapse is attached to
   *        (use its coordinates to position synapse sphere)
   *      sphere: THREE Object
   *      synLabelObj: THREE Object for label
   *    },
   *    ...
   *  }
   *
   *  when doing concrete things like deleting from viewer,
   *  e.g. in clearMaps, or toggleAllSynapses
   *  only need to do on synObjs (which is more convenient to go through)
   *
   *  TODO add region?
   */
  this.maps[data.name] = {
    name: data.name,
    db: data.db,
    allGrps: new THREE.Group(),
    objCoord: {}, // key,value = objNum, THREE.Vector3
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
    allSynData: {}, // TODO new
    synLabels : new THREE.Group(),
    remarksGrp : new THREE.Group(),
    remarks: {}, // the data behind remarksGrp
    volumeObj: null, // see loadVolumetric
  };
  // continued initialization of maps
  const map = this.maps[data.name];
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
  // see use of AddToggleButton in importerapp.js,
  // which should have the same default values
  map.skeletonGrp.visible = true;
  map.synObjs.visible = true;
  map.remarksGrp.visible = false; // see remarksparams
  map.synLabels.visible = true;

  // set object coordinates, apply transformation
  for (const obj in data.objCoord) {
    map.objCoord[obj] = 
      this.applyPlotParamsTransform(new THREE.Vector3(
        data.objCoord[obj][0],
        data.objCoord[obj][1],
        data.objCoord[obj][2]
      ));
  }

  // process skeleton data
  // note: graph's nodes are object numbers
  // but because keys of object in JS are strings,
  // be careful if comparing key and value with ===
  // e.g. for (v in G) --> v is string, while G[v] = [int's]
  map.skeletonGraph =
      BuildGraphFromEdgeList(data.skeleton);
  map.skeletonLines = 
      BreakGraphIntoLineSubgraphs(map.skeletonGraph);
  this.loadSkeletonIntoViewer(map.name);

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


  // add gap junctions to allSynData
  // note: if gap is from cell to itself,
  // creates two sphere objects, one for each skeleton obj
  for (const contin in data.gap) {
    //if (!data.gap.hasOwnProperty(contin)) continue;
    const syn = data.gap[contin];
    let synData = {
      pre: syn.pre,
      post: syn.post,
      type: 'gap',
      contin: syn.continNum,
      zLow: syn.zLow,
      zHigh: syn.zHigh,
      cellname: map.name,
      partner: '',
      obj: null,
      sphere: null, // set later in addOneSynapse2
      synLabelObj: null, // set later in addOneSynapse2
    };
    if (syn.pre === data.name) {
      if (!map.objCoord.hasOwnProperty(syn.preObj)) {
        console.log('Bad synapse object numbers? synapse contin number: ', syn.continNum);
      }
      else {
        let synDataP = Object.assign({}, synData);
        synDataP.obj = syn.preObj;
        synDataP.partner = syn.post;
        map.allSynData[synData.contin] = synDataP;
      }
    }
    if (syn.post === data.name) {
      if (!map.objCoord.hasOwnProperty(syn.postObj)) {
        console.log('Bad synapse object numbers? synapse contin number: ', syn.continNum);
      }
      else {
        let synDataP = Object.assign({}, synData);
        synDataP.obj = syn.postObj;
        synDataP.partner = syn.pre;
        map.allSynData[synData.contin] = synDataP;
      }
    }
  }

  // add pre synapses to allSynData
  for (const contin in data.pre) {
    //if (!data.pre.hasOwnProperty(contin)) continue;
    const syn = data.pre[contin];
    let synData = {
      pre: syn.pre,
      post: syn.post,
      type: 'pre',
      contin: syn.continNum,
      zLow: syn.zLow,
      zHigh: syn.zHigh,
      cellname: map.name,
      partner: '',
      obj: null,
      sphere: null, // set later in addOneSynapse2
      synLabelObj: null, // set later in addOneSynapse2
    };
    if (!map.objCoord.hasOwnProperty(syn.preObj)) {
      console.log('Bad synapse object numbers? synapse contin number: ', syn.continNum,
        'preObj: ', syn.preObj);
    }
    else {
      let synDataP = Object.assign({}, synData);
      synDataP.obj = syn.preObj;
      synDataP.partner = syn.post;
      map.allSynData[synData.contin] = synDataP;
    }
  }


  // add post synapses to allSynData
  for (const contin in data.post) {
    //if (!data.post.hasOwnProperty(contin)) continue;
    const syn = data.post[contin];
    let synData = {
      pre: syn.pre,
      post: syn.post,
      type: 'post',
      contin: syn.continNum,
      zLow: syn.zLow,
      zHigh: syn.zHigh,
      cellname: map.name,
      partner: '',
      obj: null,
      sphere: null, // set later in addOneSynapse2
      synLabelObj: null, // set later in addOneSynapse2
    };
    // go through post(Obj)1/2/3/4
    for (let i = 1; i <= 4; ++i) {
      if (syn['post' + i] !== data.name) continue;
      const postObji = 'postObj' + i;
      const obj = parseInt(syn[postObji]);
      if (!map.objCoord.hasOwnProperty(obj)) {
        console.log('Bad synapse object numbers? synapse contin number: ', syn.continNum,
          postObji, ': ', obj);
      }
      else {
        let synDataP = Object.assign({}, synData);
        synDataP.obj = obj;
        synDataP.partner = syn.pre;
        map.allSynData[synData.contin] = synDataP;
      }
    }
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
    const pos1 = map.objCoord[obj1.obj];
    const pos2 = map.objCoord[obj2.obj];
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
  this.translateOneMapsToThisPos(map.name);
  this.CenterViewOnCell(map.name);
};

MapViewer.prototype.getLoadedCells = function() {
  return Object.keys(this.maps);
};

/*
 * TODO this is fucked up, now it's inverted in y too?
 * fuck me
 *
 * @param {Object} vec - Vector3, or object with keys x,y,z
 * @param {Object} params - default value is this.plotParam
 */
MapViewer.prototype.applyPlotParamsTransform = function(vec,params=null) {
  if (params === null) {
    params = this.plotParam;
  }
  return new THREE.Vector3(
    (params.xmin - vec.x - params.xmid)*this.XYScale,
    (params.ymax - vec.y - params.ymid)*this.XYScale,
    vec.z - params.zmin
  );
};


/*
 * add the cell skeleton to THREE scene
 * uses this.maps[name].skeletonLines
 * as computed by BreakGraphIntoLineSubgraphs
 * (see loadMap2)
 *
 * takes the place of this.addSkeleton(..) in importerapp.js
 *
 * for now, ignoring series(region)
 *
 * @param {String} name - cell name
 */
MapViewer.prototype.loadSkeletonIntoViewer = function(name) { 
  for (const line of this.maps[name].skeletonLines) {
    const points = line.map(obj => this.maps[name].objCoord[obj]);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = this.skelMaterial;
    const l = new THREE.Line(geometry, material);
    this.maps[name].skeletonGrp.add(l);
  }
};


/*
 * new version of addOneSynapse
 *
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
  const name = synData.cellname; // cell on which synapse shows
  const synPos = this.maps[name].objCoord[synData.obj];
  const synType = synData.type;
  const numSections = synData.zHigh - synData.zLow + 1;
  const radius = Math.min(this.synMax,numSections*this.synScale);
  const partner = synData.partner;
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
  function offsetx() {
    if (this.count === undefined) {
      this.count = 0;
    }
    ++this.count;
    switch(this.count % 4) {
      case 0: return -50;// + 10*this.count;
      case 1: return 25;// + 10*this.count;
      case 2: return -25;// + 10*this.count;
      case 3: return 50;// + 10*this.count;
    }
  };
    
  // add text label to scene via synLabels
  // accessed by this reference in the event listener callback
  // also adds it to synData
  const synLabelObj = this.addTextWithArrow(partner,{
    pos: sphere.position.clone(),
    rotate: { x: -Math.PI/3 },
    scale: { x: 0.2, y: 0.2, z: 0.2 },
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

  this.domEvents.addEventListener(sphere,'mouseover',function() {
    self.SynapseOnMouseOver(name, contin);
  });
  this.domEvents.addEventListener(sphere,'mouseout',function() {
    self.SynapseOnMouseOut(name, contin);
  });

  this.domEvents.addEventListener(sphere,'click',function() {
    self.SynapseOnClick(name, contin);
  });
};


/*
 * returns a copy of synapse data with given contin
 */
MapViewer.prototype.GetSynData = function(cellname,contin) {
  const synData = Object.assign({}, this.maps[cellname].allSynData[contin]);
  return synData;
};

//=====================================================
// mouse events for the sphere objects in viewer

MapViewer.prototype.SynapseOnMouseOver = function(cellname, contin) {
  const synData = this.maps[cellname].allSynData[contin];
  synData.synLabelObj.visible = true;
  this.app.UpdateSynapseInfo2(cellname, contin);
  this.render();
};

MapViewer.prototype.SynapseOnMouseOut = function(cellname, contin) {
  const synData = this.maps[cellname].allSynData[contin];
  if (this.app.GetSynapseInfoContin2() !== contin) {
    synData.synLabelObj.visible = false;
  }
  this.app.RestoreSynapseInfo2();
  this.render();
};

MapViewer.prototype.SynapseOnClick = function(cellname, contin) {
  const synData = this.maps[cellname].allSynData[contin];
  // if click same synapse, 'unclick' it
  if (this.app.GetSynapseInfoContin2() === contin) {
    synData.synLabelObj.visible = false;
    this.app.RestoreSynapseInfoToDefault2();
  }
  else {
    this.toggleSynapseLabels(cellname, false);
    synData.synLabelObj.visible = true;
    this.app.UpdateClickedSynapseInfo2(cellname, contin);
  }
  this.render();
};


//======================================================
// stuff related to translations/position of cell/skeleton
// in particular the Translate Maps section

/*
 * translate this.position to given x,y,z
 * this.position is (0,0,0) at the beginning
 * maps of each cell relative position to this.position
 * should be unchanged
 * this.position is controlled directly by user
 * through the x/y/z-slider
 * note that this used to be called with -x,-y,-z
 * in the onchange functions of the sliders
 * old code here did delta = old position - new position
 */
MapViewer.prototype.translateMapsTo = function(x,y,z)
{
  const delta = new THREE.Vector3(x,y,z);
  delta.sub(this.position);

  this.position.set(x,y,z);

  const m = new THREE.Matrix4();
  m.makeTranslation(delta.x,delta.y,delta.z);
  
  for (const name in this.maps) {
    this.transformStuffOneCell(m, name);
  }
};

/*
 * same as translateMapsTo, but adds, not absolute
 */
MapViewer.prototype.translateMapsBy = function(x,y,z) {
  this.position.x += x;
  this.position.y += y;
  this.position.z += z;

  const m = new THREE.Matrix4();
  m.makeTranslation(x,y,z);

  for (const name in this.maps) {
    this.transformStuffOneCell(m, name);
  }
};

/*
 * translate one cell (usually when newly loaded)
 * by this.position (ThisPos) to match others
 * important that all operations here are synchronous
 * so that if user is sliding, this will complete
 * before this.position is updated again
 */
MapViewer.prototype.translateOneMapsToThisPos = function(cellname) {
  const m = new THREE.Matrix4();
  const pos = this.position;
  m.makeTranslation(pos.x,pos.y,pos.z);

  this.transformStuffOneCell(m, cellname);
};

/*
 * translate only one cell
 * add x,y,z to current position
 */
MapViewer.prototype.translateOneMapsBy = function(cellname,x,y,z) {
  const m = new THREE.Matrix4()
  m.makeTranslation(x,y,z);

  this.transformStuffOneCell(m, cellname);
};


MapViewer.prototype.translateSkeleton = function(skeleton,transMatrix)
{
  for (var i=0; i < skeleton.length;i++){
    skeleton[i].applyMatrix(transMatrix);
  };    
};

/*
 * @param {Object} m - THREE.Matrix4 object representing transformation
 * @param {String} name - cell name
 */
MapViewer.prototype.transformSynapses = function(m, name) {
  this.maps[name].synObjs.applyMatrix(m);
};

/*
 * @param {Object} m - THREE.Matrix4 object representing transformation
 * @param {String} name - cell name
 */
MapViewer.prototype.transformRemarks = function(m, name) {
  this.maps[name].remarksGrp.applyMatrix(m);
};

// old methods
MapViewer.prototype.translateRemarks = function(remarks,transMatrix)
{
  for (var i=0; i < remarks.length; i++){
    remarks[i].applyMatrix(transMatrix);
  };
};

/*
 * transform all stuff (skeleton,synapse,labels,remarks)
 * for one cell
 * @param {Object} m - THREE.Matrix4 object representing transformation
 * @param {String} name - cell name
 */
MapViewer.prototype.transformStuffOneCell = function(m, name) {
  this.maps[name].allGrps.applyMatrix(m);
};



//========================================================
// for Synapse Filter section

/*
 * filter synapses from view
 * performed on all cells
 *
 * note that this operation is subtractive only
 * in that if previously we applied a filter,
 * we do not automatically restore visibility of a synapse
 * if it is not filtered by the new filter
 *
 * @param {Array} typesSelected - 'pre','post', and/or 'gap'
 * @param {Array} cells - cells which a synapse should touch
 *  at least one of
 * @param {Array} contins - strictest, only show synapses in this list
 *
 * in each of the variables, if the array given is empty,
 * then we do not filter based on that
 */
MapViewer.prototype.FilterSynapses = function(typesSelected, cells, contins) {
  this.FilterSynapsesByType(typesSelected);
  this.FilterSynapsesByCells(cells);
  this.FilterSynapsesByContins(contins);
};
MapViewer.prototype.FilterSynapsesByType = function(typesSelected) {
  if (typesSelected.length === 0) return;
  for (const cell in this.maps) {
    for (const type of ['pre','post','gap']) {
      if (!typesSelected.includes(type)) {
        this.maps[cell][type+'Grp'].visible = false;
      }
    }
  }
};
MapViewer.prototype.FilterSynapsesByCells = function(cells) {
  cells = cells.filter(c =>
    this.app.cellsInSlctdSrs.neuron.includes(c)
    || this.app.cellsInSlctdSrs.muscle.includes(c));
  if (cells.length === 0) return;
  const cellsSet = new Set(cells);
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
};
MapViewer.prototype.FilterSynapsesByContins = function(contins) {
  if (contins.length === 0) return;
  for (const cell in this.maps) {
    for (const contin in this.maps[cell].allSynData) {
      const continNum = parseInt(contin);
      if (!contins.includes(continNum)) {
        this.maps[cell].allSynData[contin].sphere.visible = false;
      }
    }
  }
};

// a bit different from old methods of toggleAllSynapses etc
// because in FilterSynapses, affect visibility of both
// the groups (preGrp etc) and individual sphere objects
MapViewer.prototype.RestoreSynapses = function() {
  for (const cell in this.maps) {
    const map = this.maps[cell];
    map.preGrp.visible = true;
    map.postGrp.visible = true;
    map.gapGrp.visible = true;
    for (const contin in map.allSynData) {
      map.allSynData[contin].sphere.visible = true;
    }
  }
};


//=====================================================
// toggle visibility of cell/skeleton

/*
 * new, toggles visible of all stuff of a cell,
 * note subgroups stay hidden if they were separately hidden
 * (e.g. if toggle remarks to hidden,
 * doing toggleMaps(name, true) will still keep it hidden)
 */
MapViewer.prototype.toggleMaps = function(name, visible=null) {
  if (typeof(visible) !== 'boolean') {
    visible = !this.maps[name].allGrps.visible;
  }
  this.maps[name].allGrps.visible = visible;
}

MapViewer.prototype.mapIsVisible = function(name) {
  return this.maps[name].allGrps.visible;
};

/*
 * only toggle visibility of skeleton of one cell
 * seems like not used for now
 */
MapViewer.prototype.toggleSkeleton = function(name, visible=null)
{
  if (typeof(visible) !== 'boolean') {
    visible = !this.maps[name].skeletonGrp.visible;
  }
  this.maps[name].skeletonGrp.visible = visible;
};

//===========================================================
// toggle synapses
// not really in use for now,
// since our UI only allows filtering

MapViewer.prototype.toggleAllSynapses = function(visible=null)
{
  for (const name in this.maps){
    this.toggleSynapsesByCell(name,visible);
  }
};

MapViewer.prototype.toggleSynapsesByCell = function(name, visible=null)
{
  if (typeof(visible) !== 'boolean') {
    visible = !this.maps[name].synObjs.visible;
  }
  this.maps[name].synObjs.visible = visible;
};


// synType = 'pre','post','gap'
MapViewer.prototype.toggleSynapsesByType = function(name,synType,visible=null) {
  const grp = synType + 'Grp';
  if (typeof(visible) !== 'boolean') {
    visible = !this.maps[name][grp].visible;
  }
  this.maps[name][grp].visible = visible;
};


//=========================================================
// show/hide visibility of some (mostly) global stuff,
// i.e. functionality for Global Viewer Options

MapViewer.prototype.toggleAllRemarks = function(bool=null) {
  for (const cell in this.maps) {
    this.toggleRemarksByCell(cell, bool);
  }
};

MapViewer.prototype.toggleRemarksByCell = function(cell, bool=null) {
  console.log('in toggleRemarksByCell: ', bool);
  if (typeof(bool) !== 'boolean') {
    bool = !this.maps[cell].remarksGrp.visible;
  }
  this.maps[cell].remarksGrp.visible = bool;
};

MapViewer.prototype.GetRemarkVis = function(cell) {
  return this.maps[cell].remarksGrp.visible;
};


MapViewer.prototype.toggleGrid = function(bool=null) {
  if (typeof(bool) !== 'boolean') {
    bool = !this.gridHelper.visible;
  }
  this.gridHelper.visible = bool;
};

MapViewer.prototype.toggleAxes = function(bool=null) {
  if (typeof(bool) !== 'boolean') {
    bool = !this.axesText.visible;
  }
  this.axesText.visible = bool;
};

MapViewer.prototype.toggleAllSynapseLabels = function(bool=null) {
  if (typeof(bool) !== 'boolean') {
    bool = !this.GetAllSynapseLabelsVisible();
  }
  for (const name in this.maps){
    this.toggleSynapseLabels(name, bool);
  };
};

MapViewer.prototype.toggleSynapseLabels = function(cellname,bool=null) {
  if (typeof(bool) !== 'boolean') {
    bool = !this.GetSynapseLabelsVisible(cellname);
  }
  for (const synLabel of this.maps[cellname].synLabels.children) {
    synLabel.visible = bool;
    if (this.app.GetSynapseInfoContin2() === synLabel.name) {
      // keep label visible if that synapse was clicked
      synLabel.visible = true;
    }
  }
};

MapViewer.prototype.GetAllSynapseLabelsVisible = function() {
  for (const cellname in this.maps) {
    if (!this.GetSynapseLabelsVisible(cellname))
      return false;
  }
  return true;
};
MapViewer.prototype.GetSynapseLabelsVisible = function(cellname) {
  for (const synLabel of this.maps[cellname].synLabels.children) {
    if (!synLabel.visible) return false;
  }
  return true;
};

//==================
// Volume

MapViewer.prototype.GetAllVolumeVis = function() {
  for (const cellname in this.maps) {
    if (!this.GetVolumeVis(cellname))
      return false;
  }
  return true;
};
MapViewer.prototype.GetVolumeVis = function(cellname) {
  let volumeObj = this.maps[cellname].volumeObj;
  if (volumeObj === null || volumeObj === undefined) {
    return;
  }
  return volumeObj.visible;
};

MapViewer.prototype.ToggleAllVolume = function(bool=null) {
  if (typeof(bool) !== 'boolean') {
    bool = !this.GetAllVolumeVis();
  }
  for (const name in this.maps){
    this.ToggleVolumeByCell(name, bool);
  };
};
MapViewer.prototype.ToggleVolumeByCell = function(cellname, bool=null) {
  let volumeObj = this.maps[cellname].volumeObj;
  if (volumeObj === null || volumeObj === undefined) {
    return;
  }
  if (typeof(bool) !== 'boolean') {
    bool = !this.GetVolumeVis(cellname);
  }
  volumeObj.visible = bool;
};

//==========================================================


// used in particular in LoadMapMenu,
// which is called after LoadMap in ImporterApp (?),
// which is async (waits for xhttp request for data)
// so when writing items to menu need to check if done loading
MapViewer.prototype.isCellLoaded = function(cellname) {
  return this.maps.hasOwnProperty(cellname);
};

MapViewer.prototype.dumpJSON = function() {
  return {
    mapsSettings: this.dumpMapSettingsJSON(),
    cameraSettings: this.dumpCameraJSON(),
  };
};

// color: {r: 0.2, g: 0.4, b: 0.7} values are between 0 and 1
// (usual RGB color / 255)
// note: color selector thing is created when user clicks button,
// so we just need to modify the color directly on the object
MapViewer.prototype.SetSkeletonColor = function(cell, color) {
  for (const obj of this.maps[cell].skeletonGrp.children) {
    obj.material.color.r = color.r;
    obj.material.color.g = color.g;
    obj.material.color.b = color.b;
  }
};

/*
 * get skeleton color
 * note it is out of 1.0, for rgb should *255 and round
 */
MapViewer.prototype.GetSkeletonColor = function(cell) {
  if (this.maps[cell].skeletonGrp.children.length === 0) {
    return { r: 0, g: 0, b: 0 };
  }
  const obj = this.maps[cell].skeletonGrp.children[0];
  return {
    r: obj.material.color.r,
    g: obj.material.color.g,
    b: obj.material.color.b,
  };
};

// return color of maps
MapViewer.prototype.dumpMapSettingsJSON = function() {
  const mapsSettings = {};
  for (const cell in this.maps) {
    mapsSettings[cell] = {
      color: this.GetSkeletonColor(cell),
    };
  }
  return mapsSettings;
};

//========================================================
// stuff related to getting positions of stuff
// we store the coords of obj in this.maps[cell].objCoord
// but the actual coordinates as appearing in the viewer
// also adds a translation that the user can perform
// in the Translate Maps section
// we say posiiton/coord "in viewer" for the latter,
// and "absolute" for the former
// (note the absolute coord's have already been transformed
// under plotParams)

// get average position of cell in viewer
// used for recentering view on LoadMap2
MapViewer.prototype.GetAveragePosition2 = function(name) {
  // maybe easier to just do objCoord directly,
  // but in the future might add objs that are
  // not part of the skeleton per se
  const lines = this.maps[name].skeletonLines;
  const objCoord = this.maps[name].objCoord;
  const tot = new THREE.Vector3(0,0,0);
  let count = 0;
  for (const line of lines) {
    for (const v of line) {
      tot.add(objCoord[v]);
      ++count;
    }
  }
  tot.x = tot.x / count;
  tot.y = tot.y / count;
  tot.z = tot.z / count;

  const trans = this.GetTranslateOnMaps(name);
  tot.x += trans.x;
  tot.y += trans.y;
  tot.z += trans.z;

  return tot;
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
MapViewer.prototype.GetTranslateOnMaps = function(cellname) {
  return this.maps[cellname].allGrps.position;
};

// get obj's coordinates as seen in 3D viewer,
// i.e. taking into account translations too
MapViewer.prototype.GetObjCoordInViewer = function(cellname,obj) {
  const trans = this.GetTranslateOnMaps(cellname);
  const coord = this.GetObjCoordAbsolute(cellname,obj);
  return new THREE.Vector3(
    trans.x + coord.x,
    trans.y + coord.y,
    trans.z + coord.z);
};

MapViewer.prototype.GetObjCoordAbsolute = function(cellname, objNum) {
  return this.maps[cellname].objCoord[objNum];
};


//========================================================
// stuff related to camera

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

MapViewer.prototype.render = function(){  
  if (! this.renderer.autoClear){
    this.renderer.clear();
  };
  this.controls.update();
  this.renderer.render(this.scene,this.camera);
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

MapViewer.prototype.CenterViewOnCell = function(cellname) {
  const pos = this.GetAveragePosition2(cellname);
  this.SetCameraTarget(pos);
  pos.y += 1000;
  this.SetCameraPosition(pos);
  this.updateCamera();
};


MapViewer.prototype.CenterViewOnSynapse = function(cellname,contin) {
  const obj = this.SynapseContinToObj(cellname, contin);
  const pos = this.GetObjCoordInViewer(cellname, obj);
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



//========================================================
// 2D viewer stuff

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
  for (const cell in this.maps) {
    //if (!this.maps.hasOwnProperty(cell)) continue;
    let ee = this.Get2DGraphCY(cell,maxHoriz);
    cy_elems = cy_elems.concat(ee.cy_elems);
    maxHoriz += ee.maxHoriz + sepBtCells;
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
    wheelSensitivity: 0.5, // zoom speed
  });

  // event listeneres
  const self = this;
  cy.on('tap', 'node', function(evt){
    const id = evt.target.id();
    const cell = id.split('-')[0];
    const obj = parseInt(id.split('-')[1]);
    const contins = self.ObjToSynapseContin(cell,obj);
    if (contins.length > 0) {
      self.SynapseOnClick(cell, contins[0]);
      self.CenterViewOnSynapse(cell, contins[0]);
    }
    else { // clicked not is not a synapse
      const pos = self.GetObjCoordInViewer(cell, obj);
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
MapViewer.prototype.Get2DGraphCY = function(cell, horizInit) {
  // below we store coordinate in pos2D,
  // which will have integer entries
  // this is scale between the integer units to
  // actual coordinates in the cytoscape
  // (see cy_elems.push(...))
  const UNITS_TO_CYTOSCAPE_COORD = 50;
  const map = this.maps[cell];
  const objCoord = map.objCoord;
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
    //if (!map.allSynData.hasOwnProperty(contin)) continue;
    const objNum = map.allSynData[contin].obj;
    X.add(objNum);
    if (!continByObj.hasOwnProperty(objNum)) {
      continByObj[objNum] = [];
    }
    continByObj[objNum].push(contin);
  }
  for (const objStr in map.remarks) {
    const obj = parseInt(objStr);
    X.add(obj);
  }
  // vertices of deg != 2
  for (const v in map.skeletonGraph) {
    //if (!map.skeletonGraph.hasOwnProperty(v)) continue;
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
  Xlist.sort((v,w) => map.objCoord[v].z - map.objCoord[w].z);

  // next we need to give the 2D coordinates
  // for the graph embedding in the 2D view
  // we want embedding to be as "vertical" as possible
  // so we look for long lines,
  // a little bit like BreakGraphIntoLineSubgraphs,
  // but here we need the lines to be
  // -monotone in z coord (TODO!)
  // -have disjoint vertices

  // longestLine will keep such partition of graph
  // into collection of lines
  // key: node (objNum),
  // value: array of nodes in longest line graph
  //    from this node to a leaf,
  //    in a direction away from the root
  //    (which should have lowest z in that connected comp)
  //    (in GetLongestLine, it is computed in reverse
  //    because pushing array from the right is easier,
  //    but later reversed back so it's node to leaf)
  //    TODO also impose line is monotone in z coord
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
    // label v with the partner(s) of the synapse(s) at v
    // empty label if not synapse
    const vLabels = [];
    if (continByObj.hasOwnProperty(v)) {
      for (const contin of continByObj[v]) {
        vLabels.push(map.allSynData[contin].partner);
      }
    }
    if (map.remarks.hasOwnProperty(v)) {
      vLabels.push(map.remarks[v]);
    }
    const vlabel = vLabels.join(' / ');
    cy_elems.push({
      data: {
        id: cell + '-' + v,
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
            id: `${cell}--${v}--${w}`,
            source: cell + '-' + v,
            target: cell + '-' + w,
          },
        });
      }
    }
  });
  
  //// testing entire graph
  //for (const v in map.skeletonGraph) {
  //  if (map.skeletonGraph.hasOwnProperty(v)) {
  //    cy_elems.push({data: {id: v}});
  //  }
  //}
  //for (const v in map.skeletonGraph) {
  //  if (!map.skeletonGraph.hasOwnProperty(v)) {
  //    continue;
  //  }
  //  for (const w of map.skeletonGraph[v]) {
  //    cy_elems.push({data: {id: `${v}--${w}`, source: v, target: w}});
  //  }
  //}
  
  // really should just be number of longeset lines
  // but do this just in case change in future
  let maxHoriz = 0;
  for (const v in pos2D) {
    //if (!pos2D.hasOwnProperty(v)) continue;
    maxHoriz = Math.max(pos2D[v][0], maxHoriz);
  }
  maxHoriz -= horizInit;

  // final node, to label by cell name
  cy_elems.push({
    data: {
      id: 'graph-' + cell,
      label: cell,
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


// get the skeleton obj that a synapse is attached to
// usually combined with GetObjCoordInViewer
MapViewer.prototype.SynapseContinToObj = function(cellname, contin) {
  return this.maps[cellname].allSynData[contin].obj;
};

// get synapses that have the same obj
MapViewer.prototype.ObjToSynapseContin = function(cellname, obj) {
  let ans = [];
  for (const continStr in this.maps[cellname].allSynData) {
    let contin = parseInt(continStr);
    if (obj === this.maps[cellname].allSynData[contin].obj) {
      ans.push(contin);
    }
  }
  return ans;
};



//==========================================================
// text in viewer

/*
 * usage: labels for obj with remarks, coordinate label (anterior etc)
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
 * @param {Object} params - almost same as addText
 *  but with additional keys
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


//=========================================================
// Volumetric

MapViewer.prototype.loadVolumetric = function(db, cell, volumeObj) {
  if (volumeObj === null || volumeObj === undefined) {
    return;
  }
  volumeObj.scale.set(4.5,-4.5,6.5);
  volumeObj.position.x = -270;
  volumeObj.position.y = 188;
  volumeObj.position.z = -5;

  volumeObj.visible = false;
  this.maps[cell].volumeObj = volumeObj;
  this.maps[cell].allGrps.add(volumeObj);
};



//==========================================================
// some auxiliary functions for graphs


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
  // return object
  const graph = {};
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

