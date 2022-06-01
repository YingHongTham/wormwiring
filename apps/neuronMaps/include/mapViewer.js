// apps/include/three/threex.resizewindow.js
//
// note confusing terminology, series can refer to database N2U etc
// or also the regions of the worm: VC, NR, DC, VC2, RIG, LEF
//
// YH fixed php to ensure return integers for position/objNums etc
// so got rid of stuff with parseInt

/* @constructor
 * usage (in importerapp.js):
 *  viewer = new MapViewer(canvas, {
 *    menuObj: this.menuObj, // not used??
 *    menuGroup: this.menuGroup, // not used??
 *    synClick: this.InfoDialog,
 *    app: this,
 * });
 */
MapViewer = function(_canvas,_menu,_debug=false)
{
  //Parameters
  // TODO figure out these scalings.. is it correct?
  this.XYScale = 0.05;
  this.SynScale = 0.4;
  this.SynMax = 20;
  this.SkelColor = 0x4683b2;
  this.PreColor = 0xfa5882;
  this.PostColor = 0xbf00ff;
  this.GapColor = 0x00ffff;
  this.CBColor = 0xff0000;
  this.SkelWidth = 2;
  this.CBWidth = 5;
  // some default value of translation, probably to avoid the origin..
  // don't think it is ever updated
  // also.. why??
  this.translate = {
    x:0,//200,
    y:0,//100,
    z:0
  };
  this.defaultTextColor = "rgba(255,0,0,0.95)";
  this.remarksColor = "rgba(0,255,25,0.95)";
  this.objRemarksColor = "rgba(0,255,25,0.95)";

  // plotParam as returned in map object by retrieve_trace_coord
  // is the same for all cells in a given db
  // this is updated each time a cell is retrieved,
  // TODO better to only update when db changes
  // regardless, makes more sense to be an attribute here
  // rather than passed around for this.applyParamsTranslate(..)
  this.plotParam = {
    xmid: 0,
    xmin: 0,
    ymid: 0,
    ymax: 0,
    zmid: 0,
    zmin: 0,
  };
  
  // keeps track of movement of skeleton etc by the user (slider)
  // (see this.translateMapsTo)
  // note this is NOT the view origin of the camera,
  // i.e. moving the slider changes this,
  // but the camera and angle stays put, so the skeleton moves
  // (relative to the grid also)
  // note also that this should always be negative of *-slider values
  // (i.e. this.position.x = doc.get..Id('x-slider').value
  this.position = new THREE.Vector3(100,0,0);
      
  // no need anymore!
  // in old php, returns $data object,
  // with keys for the series/regions, like 'NR' and 'VC',
  // and keys not for skeleton, like 'preSynapse' etc.
  // but YH changed php so the series/region keys are
  // put into its own key $data['skeleton']
  //this.non_series_keys = ["plotParam","cellBody",
  //  "preSynapse","postSynapse",
  //  "gapJunction","remarks","nmj",
  //  "name","series",
  //  "objRemarks","db"]; // YH added
  
  // redundant as each skeleton will need its own Material
  // (which allows individual color change)
  // TODO maybe can optimize this by only create material if change color
  this.skelMaterial = new THREE.LineBasicMaterial({ color: this.SkelColor, linewidth: this.SkelWidth });
  this.cbMaterial = new THREE.LineBasicMaterial({color:this.CBColor,linewidth:this.CBWidth});
  this.preMaterial = new THREE.MeshLambertMaterial({color:this.PreColor});
  this.postMaterial = new THREE.MeshLambertMaterial({color:this.PostColor});
  this.gapMaterial = new THREE.MeshLambertMaterial({color:this.GapColor});
  
  this.maxY = 0;
  this.minX = 0;
  this.aspectRation = 1;
  this.sphereWidthSegments = 5;
  this.sphereHeightSegments = 5;
  
  this.debug = _debug;
  this.menu = _menu;
  this.canvas = _canvas;
  
  
  this.recalcAspectRatio();
  
  this.scene = null;
  this.cameraDefaults = {
    posCamera: new THREE.Vector3( -250.0, 225.0, 1000.0),
    posCameraTarget: new THREE.Vector3( 0, 0, 0),
    near: 0.1,
    far: 10000,
    fov: 45
  };
  this.camera = null;

  // where the camera is looking
  this.cameraTarget = this.cameraDefaults.posCameraTarget;
  this.controls = null;
  
  this.textLabels = [];
  this.maps = {}; // see loadMap for expected form
  this.gridHelper = null; // defined in initGL
  this.axesText = new THREE.Group(); // also has arrows

  // YH see toggleRemarks
  // this default value should be same as the value in AddToggleButton
  // (search self.viewer.toggleRemarks in importerapp.js)
  //this.remarksAllVisible = false;
  // however, for synapse label we need because
  // we can have them individually and collectively toggled..
  this.synapseLabelsAllVisible = false;
};

MapViewer.prototype.initGL = function()
{
  this.renderer = new THREE.WebGLRenderer({
    canvas: this.canvas,
    antialias: true,
    autoClear: true
  });
  //this.renderer.setClearColor(0x050505);
  this.renderer.setClearColor(0xffffff);
    
  this.scene = new THREE.Scene();
    
  this.camera = new THREE.PerspectiveCamera(
    this.cameraDefaults.fov,
    this.aspectRatio,
    this.cameraDefaults.near,
    this.cameraDefaults.far);
  this.resetCamera();
  this.controls = new THREE.OrbitControls(this.camera,this.renderer.domElement);
  //this.controls = new THREE.TrackballControls(this.camera,this.renderer.domElement); // z-axis not preserved
  this.domEvents = new THREEx.DomEvents(this.camera,this.renderer.domElement);

  // lighting is not necessary for line objects,
  // but is necessary for spheres.. so it seems..
  var ambientLight = new THREE.AmbientLight(0x404040);
  var directionalLight1 = new THREE.DirectionalLight(0xC0C090);
  var directionalLight2 = new THREE.DirectionalLight(0xC0C090);
  
  directionalLight1.position.set(-100,-50,100);
  directionalLight2.position.set(100,50,-100);
  
  this.scene.add(directionalLight1);
  this.scene.add(directionalLight2);
  this.scene.add(ambientLight);
  
  this.gridHelper = new THREE.GridHelper(10000,100,0xFF4444,0x404040);
  this.scene.add(this.gridHelper);

  // TODO high z is anterior or posterior?
  this.scene.add(this.axesText);
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
  // YH adding arrow for the axesText too
  const origin = new THREE.Vector3(0,0,0);
  const arrowColor = 0x5500ff;
  const length = 300;
  this.axesText.add( new THREE.ArrowHelper(
      new THREE.Vector3(0,0,-1), origin, length, arrowColor));
  this.axesText.add( new THREE.ArrowHelper(
      new THREE.Vector3(1,0,0), origin, length, arrowColor));
  this.axesText.add( new THREE.ArrowHelper(
      new THREE.Vector3(0,-1,0), origin, length, arrowColor));
};

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
 * old:
 * @param {Array} container - contains references to the
 *    THREE mesh/text object created displaying the text
 *    (addText push-es the object into this container)
 *
 * 
 * YH modified to also return the THREE object, clearer logic
 * let the caller deal with saving to whatever container they want
 */
//MapViewer.prototype.addText = function(text,params,container=null)
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
  // text can't go smaller than a certain font size
  // (would become too blurry)
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
 * @param {Object} params - almost same as addText
 *  but with additional keys
 * @param {Vector3} params.offset - THREE.Vector3 (required)
 * @param {boolean} params.arrowhead: boolean, if false, use line segment (optional)
 * @param {Number} params.arrowColor: (optional) default is 0x5500ff
 *  }
 *  text object is set to pos + offset
 *  and arrow points from text object to pos
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
      params.arrowColor : 0x5500ff;
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

MapViewer.prototype.clearMaps = function()
{
  for (var name in this.maps){
    this.scene.remove(this.maps[name].allGrps);
  };
  this.maps = {};
}

/*
 * loads cell into viewer
 * synchronous
 *
 * loads/processes map (data from retrieve_trace_coord.php)
 * into this.maps[map.name] and into viewer object
 *
 * note that the map data is also stored directly in ImporterApp object
 * as importerApp.data[mapname]
 *
 * (map.name = mapname = name of neuron/muscle)
 *
 * @param {Object} map - object returned by retrieve_trace_coord.php
 * keys are the series NR, VC, ... and this.non_series_keys
 * (this notion of series should be called 'region'..)
 *
 * map expected of following form:
 * {
 *  name: 'ADAR'
 *  db: 'N2U' // YH added to avoid confusion with 'NR','VC',..
 *  series: 'N2U' // database
 *  NR: {
 *    // edge from
 *    // (NR.x[k][0], NR.y[k][0], NR.z[k][0]) to
 *    // (NR.x[k][1], NR.y[k][1], NR.z[k][1])
 *    x: [
 *      [-1588, -1612],
 *      ...
 *    ],
 *    y: [
 *      [735, 762],
 *      ...
 *    ],
 *    z: [
 *      [60, 61],
 *      ...
 *    ],
 *    cb: [
 *      0, // whether is cellbody (0/1)
 *      ...
 *    ]
 *  }
 *  VC: //similar to NR
 *  // potentially other series (region) names: DC, VC2, RIG, LEF
 *  cellBody: sub-skeleton consisting of those part of cell body (no cb)
 *  plotParam: { // max/mins of given series(db)
 *    xScaleMax: -205
 *    xScaleMin: -8907
 *    yScaleMax: 7023 // note that old code php returns strings
 *    yScaleMin: 45
 *    zScaleMax: 2551
 *    zScaleMin: 2
 *  }
 *  preSynapse: [
 *    {
 *      continNum: "5872",
 *      x: -1089,
 *      y: "1847",
 *      z: "219",
 *      label: "AVBR,RIMR",
 *      numSections: "5",
 *      pre: "ADAR",
 *      post: "AVBR,RIMR",
 *      zLow: "217"
 *      zHigh: "221",
 *    },
 *    ...
 *  ]
 *  postSynapse: same as preSynapse
 *  gapJunction: same as preSynapse
 *  remarks: [ // about endpoints of the skeleton
 *    {
 *      objNum: "477998"
 *      x: -1588
 *      y: "735"
 *      z: "60"
 *      remarks: "end"
 *      series: "NR"
 *    },
 *    ...
*   ]
 * }
 *
 * TODO maybe also add map.cellType?
 * do in ImporterApp:
 * var group = 'Neurons';
 * if (!main_this.selectedNeurons[group].hasOwnProperty(cell))
     group = 'Muscles';
 *
 * @param {Array} map.objRemarks - OBJ_Remarks,
 *  each entry is object, with keys:
 *  -objNum, x,y,z, and remarks
 */
MapViewer.prototype.loadMap = function(map)
{
  var self = this;
  this.plotParam.xmid = 0.5*(map.plotParam.xScaleMin + map.plotParam.xScaleMax);
  this.plotParam.xmin = Math.min(this.minX,map.plotParam.xScaleMin);
  this.plotParam.ymid = 0.5*(map.plotParam.yScaleMin + map.plotParam.yScaleMax);
  this.plotParam.ymax = Math.max(this.maxY, map.plotParam.yScaleMax);
  this.plotParam.zmid = 0.5*(map.plotParam.zScaleMin + map.plotParam.zScaleMax);
  this.plotParam.zmin = map.plotParam.zScaleMin;

  var params = {
    neuron: map.name,
    db: map.db,
    // changed from 0.5*(map.plotParam ....
    xmid: this.plotParam.xmid,
    xmin: this.plotParam.xmin,
    ymid: this.plotParam.ymid,
    ymax: this.plotParam.ymax,
    zmid: this.plotParam.zmid,
    zmin: this.plotParam.zmin,
    default: '---',
    remarks: false
  };
  // linewidth actually no longer supported
  var skelMaterial = new THREE.LineBasicMaterial({ color: this.SkelColor,
    linewidth: this.SkelWidth});


  /*
   * this.maps[cellname] is MapViewer's way of storing data about cells
   *
   * synLabels is Group of labels for synapses,
   * the Group's visibility is set to true, toggle visibility individually
   * because vis responds to mouse events over the synapses
   * synLabel can be distinguished by the contin id
   * (synLabel.name; see toggleSynapseLabels)
   *
   * this.maps[cell] has the key synapses, which is of form:
   *  synapses: { // organized by the name(s) of other cell and type
   *    'RIPR': {
   *      Presynaptic: [
   *        THREE.Sphere objects
   *      ],
   *      Postsynaptic: same
   *      'Gap junction': same
   *    },
   *    ...
   *  }
   *
   *  since synObjs and synapses essentially store the same info,
   *  when doing concrete things like deleting from viewer,
   *  e.g. in clearMaps, or toggleAllSynapses
   *  only need to do on synObjs (which is more convenient to go through)
   *
   *  TODO add region?
   */
  this.maps[map.name] = {
    visible : true,
    allGrps: new THREE.Group(), // contains all three Groups below
    skeleton : [], //array of line segments, each is one THREE object!!
    skelMaterial : skelMaterial,
    skeletonGrp: new THREE.Group(), // YH; old was []
    synObjs: new THREE.Group(), // YH; old was []
    pre: new THREE.Group(),
    post: new THREE.Group(),
    gap: new THREE.Group(),
    synapses : {}, // same, but organized by cell name of other side
    synLabels : new THREE.Group(), // YH
    remarks : new THREE.Group(), // remarks about endpoints
    //objRemarks: [], // YH attempt to add remarks, realized already exist
    params : params,
  };

  this.scene.add(this.maps[map.name].allGrps);
  this.maps[map.name].allGrps.add(this.maps[map.name].skeletonGrp);
  this.maps[map.name].allGrps.add(this.maps[map.name].synObjs);
  this.maps[map.name].allGrps.add(this.maps[map.name].synLabels);
  this.maps[map.name].allGrps.add(this.maps[map.name].remarks);
  this.maps[map.name].synObjs.add(this.maps[map.name].pre);
  this.maps[map.name].synObjs.add(this.maps[map.name].post);
  this.maps[map.name].synObjs.add(this.maps[map.name].gap);
  
  // default visibilities
  // see use of AddToggleButton in importerapp.js,
  // which should have the same default values
  this.maps[map.name].skeletonGrp.visible = true;
  this.maps[map.name].synObjs.visible = true;
  this.maps[map.name].remarks.visible = false; // see remarksparams
  this.maps[map.name].synLabels.visible = true; // toggle individually
  // because synLabels visibility respond to mouseover events

  // series keys like VC, NR etc, and value map[key]
  // comes from NeuronTrace constructor/TraceLocation from dbaux.php
  // TBH I don't understand why series was kept,
  // I think I will use it for the 2D view
  // but it wasn't utilized at all before
  // it used to give me such a headache
  for (const key in map.skeleton) {
    // no longer need to check!
    //if (this.non_series_keys.indexOf(key) == -1){
    this.addSkeleton(map.name,map.skeleton[key],params);     
  }

  // map['pre..'] is array of objects,
  // each representing one synapse
  // each map['pre..'], map['post..'], map['gap..']
  // is order by z value ascending
  // we want to add them in ascending order
  // because of the labeling stuff
  allSyn = [];
  allSyn = allSyn.concat(
    map['preSynapse'].map(syn => [syn.z, 'pre', syn]));
  allSyn = allSyn.concat(
    map['postSynapse'].map(syn => [syn.z, 'post', syn]));
  allSyn = allSyn.concat(
    map['gapJunction'].map(syn => [syn.z, 'gap', syn]));
  allSyn.sort((obj1, obj2) => obj1[0] - obj2[0]);
  for (const obj of allSyn) {
    const sphereMaterial = this[`${obj[1]}Material`];
    this.addOneSynapse(map.name,obj[2],sphereMaterial,obj[1],params);
  }

  //this.addSynapse(map.name,map['preSynapse'],this.preMaterial,'pre',params);
  //this.addSynapse(map.name,map['postSynapse'],this.postMaterial,'post',params);
  //this.addSynapse(map.name,map['gapJunction'],this.gapMaterial,'gap',params);

  // map.remarks[i] has 5 keys:
  //    x, y, z, series, remark
  // note that for some reason the x is -x...
  // see dbaux.php add_remark(..)
  // YH rewrote to follow add_remark_alt (returns ASSOC array)
  // YH also got rid of parseInt, fixed php
  map.remarks.forEach( obj => {
    const pos = this.applyParamsTranslate(new THREE.Vector3(
        obj.x, obj.y, obj.z));
    console.log('pos: ', pos.x, pos.y, pos.z);
    console.log('obj: ', obj.x, obj.y, obj.z);
    const params2 = {
      pos: pos,
      offset: new THREE.Vector3(200,200,0),
      color: self.remarksColor,
      font: "Bold 20px Arial",
      visible: true, // visibility handled by remarks Group
      arrowhead: false,
    };

    self.maps[map.name].remarks.add(
        self.addTextWithArrow(obj.remarks, params2));
  });

  // let importerapp call overall translation
  //var m = new THREE.Matrix4();
  //m.makeTranslation(-this.position.x,-this.position.y,-this.position.z)
  //this.translateSkeleton(this.maps[map.name].skeleton,m);
};

// TODO? pass cellType as optional value
MapViewer.prototype.getLoadedCells = function() {
  return Object.keys(this.maps);
};

/*
 * @param {Object} vec - Vector3, or object with keys x,y,z
 * @param {Object} params - default value is this.plotParam
 *
 * this.translate seems pretty useless
 */
MapViewer.prototype.applyParamsTranslate = function(vec,params=null) {
  if (params === null) {
    params = this.plotParam;
  }
  return new THREE.Vector3(
    (params.xmin - vec.x - params.xmid)*this.XYScale + this.translate.x,
    (params.ymax - vec.y - params.ymid)*this.XYScale + this.translate.y,
    vec.z - params.zmin
  );
};

/*
 * add the neuron skeleton to THREE scene
 * called by loadMap:
 *    this.addSkeleton(map.name,map[key],params);     
 * pass skeleton (=map.skeleton[key]) as object with keys x,y,z,cb:
 * (see loadMap comments above)
 *  {
 *    x: [ [-1588, -1612], ... ],
 *    y: [ [735, 762], ... ],
 *    z: [ [60, 61], ... ],
 *    cb: [ 0, ... ],
 *  }
 */
MapViewer.prototype.addSkeleton = function(name,skeleton,params)
{ 
  for (var i=0; i < skeleton.x.length; i++){
    var lineGeometry = new THREE.Geometry();
    var v0 = 
      this.applyParamsTranslate(new THREE.Vector3(
          skeleton.x[i][0],
          skeleton.y[i][0],
          skeleton.z[i][0]
        ),
        params
      );
    var v1 = 
      this.applyParamsTranslate(new THREE.Vector3(
          skeleton.x[i][1],
          skeleton.y[i][1],
          skeleton.z[i][1]
        ),
        params
      );
    lineGeometry.vertices.push(v0, v1);
    if (skeleton.cb != undefined && skeleton.cb[i]==1){
      var line = new THREE.Line(lineGeometry,this.cbMaterial);
      line.cellBody = true;
    } else {
      var line = new THREE.Line(lineGeometry,this.maps[name].skelMaterial);
      line.cellBody = false;
    }
    this.maps[name].skeletonGrp.add(line);
  }
};

/*
 * add just one synapse
 * (see commented addSynapse for original)
 * in original, synapse given as plain array:
 * 0,1,2: x,y,z
 * 3: numSections
 * 4: label
 * 5: zLow
 * 6: zHigh
 * 7: continNum
 * 8: pre
 * 9: post
 * 
 * creates THREE.Sphere and adds to
 * -this.maps[name].synObjs, THREE.Group already added to scene
 * -this.maps[name].synapses, same but organized by other cell
 * 
 * also adds text labels to each synapse, not shown by default
 * stored in this.maps[name].synLabels, THREE.Group already in scene
 * 
 * @param {String} name - cell name
 * @param {Object} synapse - see map.preSynapse[0] in comment for loadMap
 * @param {THREE.Material} sphereMaterial
 * @param {String} synType - 'pre','post','gap'
 * @param {Object} params - {
 *     neuron: name of cell?? seems redundant to pass this
 *     db: map.series,
 *     xmid : 0.5*(parseInt(map.plotParam.xScaleMin) + parseInt(map.plotParam.xScaleMax)),
 *     xmin : Math.min(this.minX,map.plotParam.xScaleMin),
 *     ymid : 0.5*(parseInt(map.plotParam.yScaleMin) + parseInt(map.plotParam.yScaleMax)),
 *     ymax : Math.max(this.maxY,parseInt(map.plotParam.yScaleMax)),
 *     zmid : 0.5*(parseInt(map.plotParam.zScaleMin) + parseInt(map.plotParam.zScaleMax)),
 *     zmin : parseInt(map.plotParam.zScaleMin),
 *     default : '---',
 *     remarks : false
 *   }
 */

MapViewer.prototype.addOneSynapse = function(name,synapse,sphereMaterial,synType,params)
{
  const self = this;
  var synapsePos = new THREE.Vector3(synapse.x, synapse.y, synapse.z);
  synapsePos = this.applyParamsTranslate(synapsePos, params);
  var _radius = synapse['numSections'];
  var radius = Math.min(self.SynMax,synapse['numSections']*self.SynScale);
  var partner = synapse['label'];
  var sect1 = synapse['zLow'];
  var sect2 = synapse['zHigh'];
  var contin = synapse['continNum'];
  var source = synapse['pre'];
  var target = synapse['post'];

  var geometry = new THREE.SphereGeometry(radius,self.sphereWidthSegments,self.sphereHeightSegments);
  var sphere = new THREE.Mesh(geometry,sphereMaterial);
  sphere.name = contin;
  sphere.position.copy(synapsePos);
  sphere.material.transparent = true;

  // add sphere to scene via pre/post/gap Group
  self.maps[name][synType].add(sphere);

  // function for determining the offset
  // previously defined based on input z value
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
  const synLabelObj = this.addTextWithArrow(partner,{
    pos: sphere.position.clone(),
    rotate: { x: -Math.PI/3 },
    scale: { x: 0.2, y: 0.2, z: 0.2 },
    offset: new THREE.Vector3(offsetx(),0,0),
        //offsetx(Math.floor(sphere.position.z)),0,0),
    font: '20px Arial',
    arrowhead: false,
  });
  synLabelObj.name = contin;
  synLabelObj.visible = false;
  self.maps[name].synLabels.add(synLabelObj);

  // setting up events/listeners to respond to
  // mouse events over synapse in viewer
  const info = {
    cellname: name,
    syntype: synType,
    synsource: source,
    syntarget: target,
    synweight: _radius,
    synsection: `(${sect1},${sect2})`,
    syncontin: contin,
    synposition: sphere.getWorldPosition(), // must be updated when emit event
  };

  self.domEvents.addEventListener(sphere,'mouseover',function(event){
    sphere.getWorldPosition(info.synposition);
    synLabelObj.visible = true;
    self.menu.app.UpdateSynapseInfo(info);
    self.renderer.render(self.scene,self.camera);
  });
  self.domEvents.addEventListener(sphere,'mouseout',function(event){
    if (self.menu.app.GetSynapseInfoContin() !== info.syncontin) {
      synLabelObj.visible = false;
    }
    self.menu.app.RestoreSynapseInfo();
    self.renderer.render(self.scene,self.camera);
  });

  // YH change behaviour of clicking;
  // floating dialog now handled by button
  // (see AddSynapseInfo in importerapp.js)
  self.domEvents.addEventListener(sphere,'click',function(event){
    if (self.menu.app.GetSynapseInfoContin() === info.syncontin) {
      synLabelObj.visible = false;
      self.menu.app.ResetDefaultSynapseInfo();
    }
    else {
      self.toggleSynapseLabels(info.cellname, false);
      synLabelObj.visible = true;
      sphere.getWorldPosition(info.synposition);
      self.menu.app.UpdateClickedSynapseInfo(info);
    }
    self.renderer.render(self.scene,self.camera);
  });
};


//should be called addSynapseS!
MapViewer.prototype.addSynapse = function(name,synapses,sphereMaterial,synType,params) {
  for (const synapse of synapses) {
    this.addOneSynapse(name,synapse,sphereMaterial,synType,params);
  }
};


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
  //var posnew = new THREE.Vector3(x,y,z);
  //var delta =  this.position.clone();
  //delta.sub(posnew);
  //this.position = posnew.clone();
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
 * by this.position to match others
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
  this.maps[name].remarks.applyMatrix(m);
};

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
  //this.maps[name].skeletonGrp.applyMatrix(m);
  //this.maps[name].synObjs.applyMatrix(m);
  //this.maps[name].synLabels.applyMatrix(m);
  //this.maps[name].remarks.applyMatrix(m);
};

/*
 * new, toggles visible of all stuff,
 * but keep subgroups hidden if they were separately hidden
 * (e.g. if toggle remarks to hidden,
 * doing toggleMaps(name, true) will still keep it hidden)
 */
MapViewer.prototype.toggleMaps = function(name, visible=null) {
  if (typeof(visible) !== 'boolean') {
    visible = !this.maps[name].allGrps.visible;
  }
  this.maps[name].allGrps.visible = visible;
}

/*
 * used to be toggleMaps;
 * but then 'maps' is not used consistently,
 * as this.maps[name] refers to all the stuff, not just skeleton
 */
MapViewer.prototype.toggleSkeleton = function(name, visible=null)
{
  if (typeof(visible) !== 'boolean') {
    visible = !this.maps[name].skeletonGrp.visible;
  }
  this.maps[name].skeletonGrp.visible = visible;
};


MapViewer.prototype.toggleAllSynapses = function(visible=null)
{
  for (var name in this.maps){
    this.toggleSynapses(name,visible);
  }
};

// used to be _toggleAllSynapses essentially
MapViewer.prototype.toggleSynapses = function(name, visible=null)
{
  if (typeof(visible) !== 'boolean') {
    visible = !this.maps[name].synObjs.visible;
  }
  this.maps[name].synObjs.visible = visible;
};


/*
 * toggles all cells and syn types
 * using lowest level group (maps[name][synType])
 */
MapViewer.prototype.toggleAllSynapseTypeHard = function(visible) {
  for (const name in this.maps) {
    for (const synTypeGrp of this.maps[name].synObjs.children) {
      synTypeGrp.visible = visible;
    }
  }
};


MapViewer.prototype.toggleSynapsesByType = function(name,synType,visible=null) {
  if (typeof(visible) !== 'boolean') {
    visible = !this.maps[name][synType].visible;
  }
  this.maps[name][synType].visible = visible;
};

// replaced by toggleSynapsesByType, note 's'
MapViewer.prototype.toggleSynapseByType = function(synType,bool=null,cells=null)
{
  if (typeof(bool) !== 'boolean') {
    bool = true; // TODO should be toggling behaviour
  }
  for (var name in this.maps){
    this._toggleSynapseByTypeName(name,synType,bool=null,cells=cells);
  };
};

MapViewer.prototype._toggleSynapseByTypeName
  = function(name,synType,bool=null,cells=null) {
  if (typeof(bool) !== 'boolean') {
    bool = true; // TODO should be toggling behaviour
  }

  const keys = (cells != null) ?
    cells : Object.keys(this.maps[name].synapses);

  keys.forEach( cell => {
    this.maps[name].synapses[cell][synType].forEach( syn => {
      syn.visible = true;
    });
    //for (var j in this.maps[name].synapses[cell][synType]){
    //  this.maps[name].synapses[cell][synType][j].visible = true;
    //}
  });
};

MapViewer.prototype.toggleSynapseContin = function(contin)
{
  var object = this.scene.getObjectByName(contin);
  object.visible = !object.visible;
};

// toggle all remarks
MapViewer.prototype.toggleRemarks = function(bool=null) {
  for (const cell in this.maps) {
    this.toggleRemarksByCell(cell, bool);
  }
};

// YH better version of _toggleRemarks
MapViewer.prototype.toggleRemarksByCell = function(cell, bool) {
  if (typeof(bool) !== 'boolean') {
    bool = !this.maps[cell].remarks.visible;
  }
  this.maps[cell].remarks.visible = bool;
};

// YH old method; toggle remarks by cell
MapViewer.prototype._toggleRemarks = function(name,bool=null)
{
  if (typeof(bool) === 'boolean') {
    this.maps[name].remarks.visible = bool;
  } else {
    this.maps[name].remarks.visible = !this.maps[name].remarks.visible;
  }
};

/*
 * YH currently not in use; decided to fix the original remarks stuff
 *
 * toggle visibility of objRemarks in viewer
 *
 * @param {String} name - neuron/muscle name
 * @param {Boolean} bool - if given, specifies whether visible
 */
MapViewer.prototype._toggleObjRemarks = function(name,bool=null)
{
  this.maps[name].objRemarks.forEach( rmk => {
    if (bool != null){
      rmk.visible = bool;
    } else {
      if (typeof(rmk.visible) !== 'boolean') {
        rmk.visible = false;
      } else {
        rmk.visible = !rmk.visible;
      }
    }
  });
};

MapViewer.prototype.toggleGrid = function() {
  this.gridHelper.visible = !this.gridHelper.visible;
};

MapViewer.prototype.toggleAxes = function() {
  this.axesText.visible = !this.axesText.visible;
};

MapViewer.prototype.toggleAllSynapseLabels = function(bool=null) {
  for (const name in this.maps){
    this.toggleSynapseLabels(name, bool);
  };
};

MapViewer.prototype.toggleSynapseLabels = function(name,bool=null) {
  if (typeof(bool) !== 'boolean') {
    //bool = !this.maps[name].synLabels.visible;
    bool = !this.synapseLabelsAllVisible;
  }
  this.synapseLabelsAllVisible = bool;
  for (const synLabel of this.maps[name].synLabels.children) {
    synLabel.visible = bool;
    if (this.menu.app.GetSynapseInfoContin() === synLabel.name) {
      synLabel.visible = true;
    }
  }
  //this.maps[name].synLabels.visible = bool;
};


MapViewer.prototype.resizeDisplayGL = function(){
  // YH
  //OrbitControls doesn't have resize
  //this.controls.handleResize();
  //this.recalcAspectRatio();
  //this.renderer.setSize(this.canvas.offsetWidth,this.canvas.offsetHeight,false);
  //this.updateCamera();

  // YH
  const renderer = this.renderer;
  const camera = this.camera;
  const canvas = this.canvas;
  // from apps/include/three/threex.resizewindow.js
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

MapViewer.prototype.dumpJSON = function() {
  return {
    mapsSettings: this.dumpMapsJSON(),
    cameraSettings: this.dumpCameraJSON(),
  };
};

// color: {r: 0.2, g: 0.4, b: 0.7} values are between 0 and 1
// (usual RGB color / 255)
// note: color selector thing is created when user clicks button,
// so we just need to modify the color directly on the object
MapViewer.prototype.setColor = function(cell, color) {
  for (const obj of this.maps[cell].skeletonGrp.children) {
    if (!obj.cellBody) {
      obj.material.color.r = color.r;
      obj.material.color.g = color.g;
      obj.material.color.b = color.b;
    }
  }
};

/*
 * get skeleton color
 * note it is out of 1.0
 * should x 255 and round
 */
MapViewer.prototype.getColor = function(cell) {
  for (const obj of this.maps[cell].skeletonGrp.children) {
    if (!obj.cellBody) {
      return {
        r: obj.material.color.r,
        g: obj.material.color.g,
        b: obj.material.color.b,
      };
    }
  }
  return { r: 0, g: 0, b: 0 };
};

// return color of maps
MapViewer.prototype.dumpMapsJSON = function() {
  const mapsSettings = {};
  for (const cell in this.maps) {
    mapsSettings[cell] = {
      color: this.getColor(cell),
    };
  }
  return mapsSettings;
};

// return camera position/lookAt origin
MapViewer.prototype.dumpCameraJSON = function() {
  const cameraSettings = {
    position: this.camera.position,
    viewOrigin: this.controls.target, // where camera is looking
  };
  return cameraSettings;
};

MapViewer.prototype.SetCameraFromJSON = function(cameraSettings) {
  this.camera.position.x = cameraSettings.position.x;
  this.camera.position.y = cameraSettings.position.y;
  this.camera.position.z = cameraSettings.position.z;
  this.SetCameraTarget(cameraSettings.viewOrigin);
  this.updateCamera();
};

/*
 * @param {Object} target - THREE.Vector3 or just {x: , y: , z: }
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

// get average position of cell, used for recentering view on LoadMap
MapViewer.prototype.GetAveragePosition = function(name) {
  const len = this.maps[name].skeletonGrp.children.length;
  if (len === 0) {
    return;
  }
  const tot = new THREE.Vector3(0,0,0);
  for (const line of this.maps[name].skeletonGrp.children) {
    const [v0, v1] = line.geometry.vertices;
    tot.add(v0);
    tot.add(v1);
  }
  //tot.scale(0.5 / len); // #vertices = 2*#lines
  tot.x = tot.x * 0.5 / len;
  tot.y = tot.y * 0.5 / len;
  tot.z = tot.z * 0.5 / len;
  console.log(tot);
  return tot;
};
