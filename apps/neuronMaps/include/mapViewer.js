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
 *		menuObj: this.menuObj, // not used??
 *		menuGroup: this.menuGroup, // not used??
 *		synClick: this.InfoDialog,
 *		app: this,
 * });
 */
MapViewer = function(_canvas,_menu,_debug=false)
{
	//Parameters
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
	this.translate = {
    x:200,
		y:100,
		z:0
  };
  this.defaultTextColor = "rgba(255,0,0,0.95)";
  this.remarksColor = "rgba(0,255,25,0.95)";
  this.objRemarksColor = "rgba(0,255,25,0.95)";
	
	// keeps track of movement of skeleton etc by the user (slider)
  // (see this.translateMaps)
  // note this is NOT the view origin of the camera,
  // i.e. moving the slider changes this,
  // but the camera and angle stays put, so the skeleton moves
  // (relative to the grid also)
  // note also that this should always be negative of *-slider values
  // (i.e. this.position.x = doc.get..Id('x-slider').value
	this.position = new THREE.Vector3(0,0,0);
	    
	this.non_series_keys = ["plotParam","cellBody",
	  "preSynapse","postSynapse",
	  "gapJunction","remarks","nmj",
	  "name","series",
    "objRemarks","db"]; // YH added
	
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

  // YH no need anymore
  // YH see toggleRemarks
  // this default value should be same as the value in AddToggleButton
  // (search self.viewer.toggleRemarks in importerapp.js)
  //this.remarksAllVisible = false;
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
  this.axesText.add(
      this.addText('Anterior (-z)',{x:0,y:0,z:-axesTextDist}));
  this.axesText.add(
      this.addText('Right (+x)',{x:axesTextDist,y:0,z:0,_y:-Math.PI/2}));
  this.axesText.add(
      this.addText('Ventral (-y)',{x:0,y:-axesTextDist,z:0,_x:-Math.PI/2}));
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
  // YH old method of adding axes text
  //this.addText('Anterior',{x:100,y:50,z:0},this.axesText);
  //this.addText('Right',{x:150,y:50,z:250,_y:-Math.PI/2},this.axesText);
  //this.addText('Ventral',{x:100,y:0,z:200,_x:-Math.PI/2},this.axesText);
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
 *    x,y,z: position (required)
 *    _x,_y,_z: rotation (optional, default x-y plane)
 *    font: optional (default "Bold 20px Arial")
 *    color: optional (default this.defaultTextColor)
 * @param {Array} container - contains references to the
 *    THREE mesh/text object created displaying the text
 *    (addText push-es the object into this container)
 * 
 * YH modified to also return the THREE object, clearer logic
 * let the caller deal with saving to whatever container they want
 */
MapViewer.prototype.addText = function(text,params,container=null)
{
  const textCanvas = document.createElement('canvas');
  const ctx = textCanvas.getContext('2d');
  const font = (params.font != undefined) ?
    params.font : "Bold 20px Arial";
  ctx.font = font;
  const fillStyle = (params.color != undefined) ?
    params.color : this.defaultTextColor;
  ctx.fillStyle = fillStyle;

  textCanvas.width = ctx.measureText(text).width;
  textCanvas.height = 30;

  // browser bugs: this is reset to default after measureText!
	ctx.font = font;
  ctx.fillStyle = fillStyle;

  ctx.fillText(text, 0, textCanvas.height - 5);
  //ctx.fillText(text, 0, 50); // 0, 50 relative pos of text in ctx
    
  // textCanvas contents will be used for a texture
  var texture = new THREE.Texture(textCanvas) 
  texture.needsUpdate = true;

  // material for the rectangle in which text is written
  // hence set to transparent
  var material = new THREE.MeshBasicMaterial({
    map: texture,
    side:THREE.DoubleSide
  });
  material.transparent = true;

  var mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(textCanvas.width, textCanvas.height),
    material
  );

  if (params._x != undefined){mesh.rotateX(params._x)};
  if (params._y != undefined){mesh.rotateY(params._y)};
  if (params._z != undefined){mesh.rotateZ(params._z)};

  if (params.visible != undefined){mesh.visible = params.visible};

  // position is of the center of the canvas
  mesh.position.set(params.x,params.y,params.z);

  if (container !== null) {
    container.push(mesh);
  }
  
  this.scene.add( mesh );

  return mesh;
}

MapViewer.prototype.clearMaps = function()
{
  for (var name in this.maps){
	  for (var i=0; i < this.maps[name].skeleton.length; i++){
	    this.scene.remove(this.maps[name].skeleton[i]);
	  }
    this.scene.remove(this.maps[name].synObjs);
    this.scene.remove(this.maps[name].synLabels);
    this.scene.remove(this.maps[name].remarks);
    // YH old code for when synObjs is []
	  //for (var i=0; i < this.maps[name].synObjs.length; i++){
	  //  this.scene.remove(this.maps[name].synObjs[i]);
	  //}
    // YH old code for when remarks is []
	  //for (var i=0; i < this.maps[name].remarks.length; i++){
	  //  this.scene.remove(this.maps[name].remarks[i]);
	  //}
  };
  this.maps = {};
}

/*
 * loads neuron
 * synchronous
 *
 * loads/processes map (data retrieved from retrieve_trace_coord.php)
 * into this.maps[map.name] and into viewer object
 *
 * note that the map data is also stored directly in ImporterApp object
 * as aa.data[mapname]
 *
 * (map.name = mapname = name of neuron/muscle)
 *
 * @param {Object} map - object returned by retrieve_trace_coord.php
 * keys are the series NR, VC, ... and this.non_series_keys
 *
 * map expected of following form:
 * {
 *  name: 'ADAR'
 *  db: 'N2U' // YH added to avoid confusion
 *  series: 'N2U' // confusing to call it series
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
 *  // potentially other series names, DC, VC2, RIG, LEF
 *  cellBody: sub-skeleton consisting of those part of cell body (no cb)
 *  plotParam: {
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
 *  remarks: [
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
 * @param {Array} map.objRemarks - OBJ_Remarks,
 *  each entry is object, with keys:
 *  -objNum, x,y,z, and remarks
 */
MapViewer.prototype.loadMap = function(map)
{
	var self = this;
  // YH fixed php so returns integers not strings
	var params = {
    neuron:map.name,
		db : map.db,
		xmid : 0.5*(map.plotParam.xScaleMin + map.plotParam.xScaleMax),
		xmin : Math.min(this.minX,map.plotParam.xScaleMin),
		ymid : 0.5*(map.plotParam.yScaleMin + map.plotParam.yScaleMax),
		ymax : Math.max(this.maxY, map.plotParam.yScaleMax),
		zmid : 0.5*(map.plotParam.zScaleMin + map.plotParam.zScaleMax),
		zmin : map.plotParam.zScaleMin,
		default : '---',
		remarks : false
	};
  // original params, just in case
	//var params = {neuron:map.name,
	//	db : map.db,
	//	xmid : 0.5*(parseInt(map.plotParam.xScaleMin) + parseInt(map.plotParam.xScaleMax)),
	//	xmin : Math.min(this.minX,map.plotParam.xScaleMin),
	//	ymid : 0.5*(parseInt(map.plotParam.yScaleMin) + parseInt(map.plotParam.yScaleMax)),
	//	ymax : Math.max(this.maxY,parseInt(map.plotParam.yScaleMax)),
	//	zmid : 0.5*(parseInt(map.plotParam.zScaleMin) + parseInt(map.plotParam.zScaleMax)),
	//	zmin : parseInt(map.plotParam.zScaleMin),
	//	default : '---',
	//	remarks : false
	//};

  // make a copy otherwise changing one color will affect all others
	var skelMaterial = new THREE.LineBasicMaterial({ color: this.SkelColor,
    linewidth: this.SkelWidth});


  /*
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
   */
	this.maps[map.name] = {
		visible : true,
		skeleton : [], //array of line segments, each is one THREE object!!
		skelMaterial : skelMaterial,
    synObjs: new THREE.Group(), // YH; old was []
		synapses : {}, // same, but organized by cell name of other side
    synLabels : new THREE.Group(), // YH
		remarks : new THREE.Group(), // remarks about endpoints
    //objRemarks: [], // YH attempt to add remarks, realized already exist
		params : params,
	};

  // in future just add synapses/labels to synObjs/synLabels/remarks
  // no need to add synapse to scene directly
  this.scene.add(this.maps[map.name].synObjs);
  this.scene.add(this.maps[map.name].synLabels);
  this.scene.add(this.maps[map.name].remarks);
  // default visibl.; see use of AddToggleButton in importerapp.js
  this.maps[map.name].remarks.synObjs = true;
  this.maps[map.name].remarks.visible = false;
  this.maps[map.name].synLabels.visible = false;

	// series keys like VC, NR etc, and value map[key]
	// comes from NeuronTrace constructor/TraceLocation from dbaux.php
	for (var key in map){
    // this is really bad; should check for inclusion, not exclusion
    // or even better, put the skeleton in its own key
    // but I'm too afraid to change this lest it breaks something else
		if (this.non_series_keys.indexOf(key) == -1){
      console.log('series key: ', key);
			this.addSkeleton(map.name,map[key],params);	    
		}
	}

	//map['..'] here are arrays of 
	this.addSynapse(map.name,map['preSynapse'],this.preMaterial,'Presynaptic',params);
	this.addSynapse(map.name,map['postSynapse'],this.postMaterial,'Postsynaptic',params);
	this.addSynapse(map.name,map['gapJunction'],this.gapMaterial,'Gap junction',params);

  // map.remarks[i] has 5 elements,
  // x, y, z, series, remark
  // note that for some reason the x is -x...
  // see dbaux.php add_remark(..)
	//for (var i in map.remarks){
	//	var x = parseInt(map.remarks[i][0] - params.xmid)*this.XYScale - 10;
	//	var y = (params.ymax - parseInt(map.remarks[i][1]) - params.ymid)*this.XYScale-30 + this.translate.y;
	//	var z = parseInt(map.remarks[i][2]) - params.zmin;
	//	var params2 = {x:x,y:y,z:z,
	//		//color : "rgba(255,255,255,0.95)",
	//		color : self.remarksColor,
	//		font : "Bold 10px Arial",
	//		visible : false
	//	};
	//	this.addText(map.remarks[i][4],params2,this.maps[map.name].remarks);
	//}
  //
  // YH rewriting above to follow add_remark_alt
  // which returns assoc array, not just array
  //
  // YH also got rid of parseInt, fixed php
  map.remarks.forEach( obj => {
		var x = (obj.x - params.xmid)*self.XYScale - 10;
		var y = (params.ymax - obj.y - params.ymid)*self.XYScale-30 + self.translate.y;
		var z = obj.z - params.zmin;
		var params2 = {
      x:x, y:y, z:z,
			color : self.remarksColor,
			font : "Bold 20px Arial",
			visible : true, // visibility handled by remarks Group
		};
    // YH old code use .push not .add
		self.maps[map.name].remarks.add(self.addText(obj.remarks,params2));
	});
    
  // YH copying the scaling/translation for objRemarks from remarks
  //map.objRemarks.forEach( obj => {
	//	var x = parseInt(obj.x - params.xmid)*self.XYScale - 10;
	//	var y = (params.ymax - parseInt(obj.y) - params.ymid)*self.XYScale-30 + self.translate.y;
	//	var z = parseInt(obj.z) - params.zmin;
	//	var params2 = {x:x,y:y,z:z,
	//		//color : "rgba(255,255,255,0.95)",
	//		color : self.objRemarksColor,
	//		font : "Bold 10px Arial",
	//		visible : true,
	//	};
	//	self.maps[map.name].objRemarks.push(self.addText(obj.remarks,params2));
	//});
    
	var m = new THREE.Matrix4();
	m.makeTranslation(-this.position.x,-this.position.y,-this.position.z)
	this.translateSkeleton(this.maps[map.name].skeleton,m);
};

/*
 * add the neuron skeleton to THREE scene
 * pass skeleton as ..?
 * called by loadMap
 */
MapViewer.prototype.addSkeleton = function(name,skeleton,params)
{ 
	for (var i=0; i < skeleton.x.length; i++){
		var lineGeometry = new THREE.Geometry();
		var vertArray = lineGeometry.vertices;
		var x1 = (params.xmin - skeleton.x[i][0] - params.xmid)*this.XYScale + this.translate.x;
		var x2 = (params.xmin - skeleton.x[i][1] - params.xmid)*this.XYScale + this.translate.x;
		var y1 = (params.ymax - skeleton.y[i][0] - params.ymid)*this.XYScale + this.translate.y;
		var y2 = (params.ymax - skeleton.y[i][1] - params.ymid)*this.XYScale + this.translate.y;
		var z1 = skeleton.z[i][0] - params.zmin;
		var z2 = skeleton.z[i][1] - params.zmin;
		//set end points of lineGeometry
		vertArray.push(
			new THREE.Vector3(x1,y1,z1),
			new THREE.Vector3(x2,y2,z2)
		);
		//console.log(vertArray);
		if (skeleton.cb != undefined && skeleton.cb[i]==1){
			var line = new THREE.Line(lineGeometry,this.cbMaterial);
			line.cellBody = true;
		} else {
			var line = new THREE.Line(lineGeometry,this.maps[name].skelMaterial);
			line.cellBody = false;
		}
		this.maps[name].skeleton.push(line);
		this.scene.add(line);
	}
};

//add just one synapse
//(see commented addSynapse for original)
//in original, synapse given as plain array:
//0,1,2: x,y,z
//3: numSections
//4: label
//5: zLow
//6: zHigh
//7: continNum
//8: pre
//9: post
//
// creates THREE.Sphere and adds to
// -this.maps[name].synObjs, THREE.Group already added to scene
// -this.maps[name].synapses, same but organized by other cell
//
// also adds text labels to each synapse, not shown by default
// stored in this.maps[name].synLabels, THREE.Group already in scene
//
// @param {String} name - cell name
// @param {Object} synapse - see map.preSynapse[0] in comment for loadMap
// @param {THREE.Material} sphereMaterial
// @param {String} synType - 'pre','post','gap'
// @param {Object} params - {
//    neuron: name of cell?? seems redundant to pass this
//    db: map.series,
//    xmid : 0.5*(parseInt(map.plotParam.xScaleMin) + parseInt(map.plotParam.xScaleMax)),
//    xmin : Math.min(this.minX,map.plotParam.xScaleMin),
//    ymid : 0.5*(parseInt(map.plotParam.yScaleMin) + parseInt(map.plotParam.yScaleMax)),
//    ymax : Math.max(this.maxY,parseInt(map.plotParam.yScaleMax)),
//    zmid : 0.5*(parseInt(map.plotParam.zScaleMin) + parseInt(map.plotParam.zScaleMax)),
//    zmin : parseInt(map.plotParam.zScaleMin),
//    default : '---',
//    remarks : false
//  }
MapViewer.prototype.addOneSynapse = function(name,synapse,sphereMaterial,synType,params)
{
	var self = this;
	var x = (params.xmin - synapse['x'] - params.xmid)*self.XYScale + self.translate.x;
	var y = (params.ymax - synapse['y'] - params.ymid)*self.XYScale + self.translate.y;
	var z = synapse['z'] - params.zmin;
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
	sphere.position.set(x-self.position.x,y-self.position.y,z-self.position.z);
	sphere.material.transparent = true;

  self.maps[name].synObjs.add(sphere); // old: .push(sphere)

  // putting synapse objects into the maps[name].synapses
  // which is just a more organized version
	var _partner = partner.split(',');
	for (var j in _partner){
		if (!(_partner[j] in self.maps[name].synapses)){
			self.maps[name].synapses[_partner[j]] = 
				{'Presynaptic':[],'Postsynaptic':[],'Gap junction':[]};
		};
		self.maps[name].synapses[_partner[j]][synType].push(sphere);
	};

  // adding text labels next to synapses
  this.maps[name].synLabels.add(this.addText(partner,{
    x: sphere.position.x,
    y: sphere.position.y,
    z: sphere.position.z,
    _x:-Math.PI/4,
    font: "20px Arial",
  }));


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
  };

	self.domEvents.addEventListener(sphere,'mouseover',function(event){
    // YH moved updating of html to importerapp,
    // keep separation of logic clear..
    self.menu.app.UpdateSynapseInfo(info);

    // YH why return this? not even clear it returns any value
		//return self.renderer.render(self.scene,self.camera);
		self.renderer.render(self.scene,self.camera);
		return;
	});
	self.domEvents.addEventListener(sphere,'mouseout',function(event){
		//document.getElementById('cellname').innerHTML = params.default;
    //same for all; params.default was '---'
    // YH moved updating of html to importerapp,
    // keep separation of logic clear..
    self.menu.app.RestoreSynapseInfo();

		self.renderer.render(self.scene,self.camera);
    return;
	});

  // what were these for again?
	//var url = '/maps/getImages.php?neuron=' +
	//  params.neuron + '&db=' + params.db +'&continNum='+contin;
	//THREEx.Linkify(self.domEvents,sphere,url);	    
  
  // YH change behaviour of clicking;
  // floating dialog now handled by button
  // (see AddSynapseInfo in importerapp.js)
  self.domEvents.addEventListener(sphere,'click',function(event){
    self.menu.app.UpdateClickedSynapseInfo(info);

    // note menu.synClick is really a floatingdialog object
    // which opens a floating dialog displaying url stuff
    // (see ../../include/floatingdialog.js)
    //self.menu.synClick(url,'Synapse viewer');
	});

  // YH already added to synObjs Group
	//self.scene.add(sphere);
};


//should be called addSynapseS!
MapViewer.prototype.addSynapse = function(name,synapses,sphereMaterial,synType,params) {
	for (var synapse of synapses) {
		this.addOneSynapse(name,synapse,sphereMaterial,synType,params);
	}
};


//hmm clickFunc is not used?
//I thought the point of having this class is to avoid
//having to pass variables like sphereMaterial...
/*
MapViewer.prototype.addSynapse = function(name,synapses,sphereMaterial,synType,params,clickFunc)
{
	var self = this;
	for (var i=0; i < synapses.length; i++){
		//WTF why wrap this in a function?
		(function (){
		var x = (params.xmin - parseInt(synapses[i][0]) - params.xmid)*self.XYScale + self.translate.x;
		var y = (params.ymax - parseInt(synapses[i][1]) - params.ymid)*self.XYScale + self.translate.y;
		var z = parseInt(synapses[i][2]) - params.zmin;
		var _radius = synapses[i][3];
		var radius = Math.min(self.SynMax,parseInt(synapses[i][3])*self.SynScale);
		var partner = synapses[i][4];
		var sect1 = synapses[i][5];
		var sect2 = synapses[i][6];
		var contin = synapses[i][7];
		var source = synapses[i][8];
		var target = synapses[i][9];
		var geometry = new THREE.SphereGeometry(radius,self.sphereWidthSegments,self.sphereHeightSegments);
		var sphere = new THREE.Mesh(geometry,sphereMaterial);
		sphere.name = contin;
		sphere.position.set(x-self.position.x,y-self.position.y,z-self.position.z);
		sphere.material.transparent = true;
		self.maps[name].synObjs.push(sphere);
		//var url = '/maps/getImages.php?neuron=' +
		//params.neuron + '&db=' + params.db +'&continNum='+contin;
		var url = '../synapseViewer/?neuron=' + 
		params.neuron + '&db=' + params.db +'&continNum='+contin;
		//THREEx.Linkify(self.domEvents,sphere,url);	    
    
		var _partner = partner.split(',');
		for (var j in _partner){
			if (!(_partner[j] in self.maps[name].synapses)){
				self.maps[name].synapses[_partner[j]] = 
					{'Presynaptic':[],'Postsynaptic':[],'Gap junction':[]};
			};
			self.maps[name].synapses[_partner[j]][synType].push(sphere);
		};

		self.domEvents.addEventListener(sphere,'mouseover',function(event){
			document.getElementById('cellname').innerHTML = name;
			document.getElementById('syntype').innerHTML = synType;
			document.getElementById('synsource').innerHTML = source;
			document.getElementById('syntarget').innerHTML = target;
			document.getElementById('synweight').innerHTML = _radius;
			document.getElementById('synsection').innerHTML = '('+sect1+','+sect2+')';
			document.getElementById('syncontin').innerHTML = sphere.name;
			return self.renderer.render(self.scene,self.camera);
		});
		self.domEvents.addEventListener(sphere,'mouseout',function(event){
			document.getElementById('cellname').innerHTML = params.default;
			document.getElementById('syntype').innerHTML = params.default;
			document.getElementById('synsource').innerHTML = params.default;
			document.getElementById('syntarget').innerHTML = params.default;
			document.getElementById('synweight').innerHTML = params.default;
			document.getElementById('synsection').innerHTML = params.default;
			document.getElementById('syncontin').innerHTML = params.default;
			return self.renderer.render(self.scene,self.camera);
		});

		self.domEvents.addEventListener(sphere,'click',function(event){
			self.menu.synClick(url,'Synapse viewer');
		});
		self.scene.add(sphere);
		}());
	};
};
*/

// translate this.position to given x,y,z
// 0,0,0 at the beginning
// The user may adjust with slider
// all stuff moves with this.position
// note that this is called with -x,-y,-z in the onchange functions
// of the sliders
// probably because of some sign conventions in the EMs..
MapViewer.prototype.translateMaps = function(x,y,z)
{
  var posnew = new THREE.Vector3(x,y,z);
  var delta =  this.position.clone();
  delta.sub(posnew);
  this.position = posnew.clone();

  var m = new THREE.Matrix4()
  m.makeTranslation(delta.x,delta.y,delta.z);
  
  for (var name in this.maps) {
    this.translateSkeleton(this.maps[name].skeleton,m)
    //this.translateSynapse(this.maps[name].synObjs,m)
    this.transformSynapses(m, name)
  };

};

MapViewer.prototype.translateSkeleton = function(skeleton,transMatrix)
{
  for (var i=0; i < skeleton.length;i++){
	  skeleton[i].applyMatrix(transMatrix);
  };    
};

// YH old code when synObjs = []
//MapViewer.prototype.translateSynapse = function(synObjs,transMatrix)
//{
//  for (var i=0; i < synObjs.length;i++){
//	  synObjs[i].applyMatrix(transMatrix);
//  }; 
//};

/*
 * @param {Object} m - THREE.Matrix4 object representing transformation
 * @param {String} name - cell name
 */
MapViewer.prototype.transformSynapses = function(m, name) {
  this.maps[name].synObjs.applyMatrix(m);
};

MapViewer.prototype.translateRemarks = function(remarks,transMatrix)
{
  for (var i=0; i < remarks.length; i++){
	  remarks[i].applyMatrix(transMatrix);
  };
};

MapViewer.prototype.toggleMaps = function(name)
{
  for (var i=0; i < this.maps[name].skeleton.length; i++){
	  this.maps[name].skeleton[i].visible= !this.maps[name].skeleton[i].visible;
  };
};

MapViewer.prototype.toggleAllSynapses = function(visible)
{
  for (var name in this.maps){
    this._toggleAllSynapses(name,visible);
  }
};


MapViewer.prototype._toggleAllSynapses = function(name,visible=null) {
  if (typeof(visible) === 'boolean') {
    this.maps[name].synObjs.visible = visible;
  } else {
    this.maps[name].synObjs.visible = !this.maps[name].synObjs.visible;
  }
};

MapViewer.prototype.toggleSynapseByType = function(synType,bool=null,cells=null)
{
  if (typeof(bool) !== 'boolean') {
    bool = true; // TODO should be toggling behaviour
  }
  for (var name in this.maps){
	  this._toggleSynapseByTypeName(name,synType,bool=null,cells=cells);
  };
};

// TODO perhaps better to store synObjs as having one Group
// for each synType, then this would be again trivial
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
  // YH old code when remarks was an Array
  //for (var i in this.maps[name].remarks) {
  //  if (typeof(bool) === 'boolean') {
	//  //if (bool != null){
	//    this.maps[name].remarks[i].visible = bool;
	//  } else {
	//    //this.maps[name].remarks[i].visible = (this.maps[name].remarks[i].visible==true)?false:true;
  //    if (typeof(this.maps[name].remarks[i].visible) !== 'boolean') {
  //      this.maps[name].remarks[i].visible = false;
  //    } else {
  //      this.maps[name].remarks[i].visible = !this.maps[name].remarks[i].visible;
  //    }
	//  }
  //}
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
    bool = !this.maps[name].synLabels.visible;
  }
  this.maps[name].synLabels.visible = bool;
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
MapViewer.prototype.setColor = function(cell, color) {
  for (const obj of this.maps[cell].skeleton) {
    if (!obj.cellBody) {
      obj.material.color.r = color.r;
      obj.material.color.g = color.g;
      obj.material.color.b = color.b;
    }
  }
};

MapViewer.prototype.getColor = function(cell) {
  for (const obj of this.maps[cell].skeleton) {
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
  console.log('cameraSettings: ', cameraSettings);
  this.camera.position.x = cameraSettings.position.x;
  this.camera.position.y = cameraSettings.position.y;
  this.camera.position.z = cameraSettings.position.z;
  this.cameraTarget.x = cameraSettings.viewOrigin.x;
  this.cameraTarget.y = cameraSettings.viewOrigin.y;
  this.cameraTarget.z = cameraSettings.viewOrigin.z;
  this.updateCamera();
};

