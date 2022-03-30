// apps/include/three/threex.resizewindow.js

// usage:
//  viewer = new MapViewer(canvas, {
//		menuObj:this.menuObj,
//		menuGroup:this.menuGroup,
//		synClick: this.InfoDialog
//	},
//	debug=false);
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
	"name","series"];
	
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
	this.axesText = [];
	this.maps = {};
}

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
  
  var helper = new THREE.GridHelper(10000,100,0xFF4444,0x404040);
  this.scene.add(helper);

  this.addText('Anterior',{x:100,y:50,z:0},this.axesText);
  this.addText('Right',{x:150,y:50,z:250,_y:-Math.PI/2},this.axesText);
  this.addText('Ventral',{x:100,y:0,z:200,_x:-Math.PI/2},this.axesText);
};

//for adding the direction names
MapViewer.prototype.addText = function(text,params,container)
{
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    if (params.font != undefined){
	context.font = params.font;
    } else {
	context.font = "Bold 20px Arial";
    };
    if (params.color != undefined){
	context.fillStyle = params.color;
    } else {
	context.fillStyle = "rgba(255,0,0,0.95)";
    };
    context.fillText(text, 0, 50);
    
    // canvas contents will be used for a texture
    var texture = new THREE.Texture(canvas) 
    texture.needsUpdate = true;
    
    var material = new THREE.MeshBasicMaterial( {map: texture, side:THREE.DoubleSide } );
    material.transparent = true;

    var mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(canvas.width, canvas.height),
        material
    );
    if (params._x != undefined){mesh.rotateX(params._x)};
    if (params._y != undefined){mesh.rotateY(params._y)};
    if (params._z != undefined){mesh.rotateZ(params._z)};
    if (params.visible != undefined){mesh.visible = params.visible};
    mesh.position.set(params.x,params.y,params.z);
    container.push(mesh);
    
    this.scene.add( mesh );

}

MapViewer.prototype.clearMaps = function()
{
  for (var name in this.maps){
	  for (var i=0; i < this.maps[name].skeleton.length; i++){
	      this.scene.remove(this.maps[name].skeleton[i]);
	  };
	  for (var i=0; i < this.maps[name].synObjs.length; i++){
	      this.scene.remove(this.maps[name].synObjs[i]);
	  };
	  for (var i=0; i < this.maps[name].remarks.length; i++){
	      this.scene.remove(this.maps[name].remarks[i]);
	  };
  };
  this.maps = {};
}

/*
 * loads neuron
 * synchronous
 *
 * @param {Object} map - object returned by retrieve_trace_coord.php
 * keys are the series NR, VC, ... and this.non_series_keys
 */
MapViewer.prototype.loadMap = function(map)
{
	var self = this;
	var params = {neuron:map.name,
		db : map.series,
		xmid : 0.5*(parseInt(map.plotParam.xScaleMin) + parseInt(map.plotParam.xScaleMax)),
		xmin : Math.min(this.minX,map.plotParam.xScaleMin),
		ymid : 0.5*(parseInt(map.plotParam.yScaleMin) + parseInt(map.plotParam.yScaleMax)),
		ymax : Math.max(this.maxY,parseInt(map.plotParam.yScaleMax)),
		zmid : 0.5*(parseInt(map.plotParam.zScaleMin) + parseInt(map.plotParam.zScaleMax)),
		zmin : parseInt(map.plotParam.zScaleMin),
		default : '---',
		remarks : false
	};

  // make a copy otherwise changing one color will affect all others
	var skelMaterial = new THREE.LineBasicMaterial({ color: this.SkelColor,
    linewidth: this.SkelWidth});
	this.maps[map.name] = {
		visible : true,
		skeleton : [], //array of line segments, each is one THREE object!!
		skelMaterial : skelMaterial,
		synapses : {},
		synObjs : [],
		remarks : [],
		params : params
	};

	// series keys like VC, NR etc, and value map[key]
	// comes from NeuronTrace constructor/TraceLocation from dbaux.php
	for (var key in map){
		if (this.non_series_keys.indexOf(key) == -1){
			this.addSkeleton(map.name,map[key],params);	    
		}
	}
    
	//map['..'] here are arrays of 
	this.addSynapse(map.name,map['preSynapse'],this.preMaterial,'Presynaptic',params);
	this.addSynapse(map.name,map['postSynapse'],this.postMaterial,'Postsynaptic',params);
	this.addSynapse(map.name,map['gapJunction'],this.gapMaterial,'Gap junction',params);

	for (var i in map.remarks){
		var x = parseInt(map.remarks[i][0] - params.xmid)*this.XYScale - 10;
		var y = (params.ymax - parseInt(map.remarks[i][1]) - params.ymid)*this.XYScale-30 + this.translate.y;
		var z = parseInt(map.remarks[i][2]) - params.zmin;
		var params2 = {x:x,y:y,z:z,
			color : "rgba(255,255,255,0.95)",
			font : "10px Arial",
			visible : false
		};
		this.addText(map.remarks[i][4],params2,this.maps[map.name].remarks);
	}
    
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
		var x1 = (params.xmin - parseInt(skeleton.x[i][0]) - params.xmid)*this.XYScale + this.translate.x;
		var x2 = (params.xmin - parseInt(skeleton.x[i][1]) - params.xmid)*this.XYScale + this.translate.x;
		var y1 = (params.ymax - parseInt(skeleton.y[i][0]) - params.ymid)*this.XYScale + this.translate.y;
		var y2 = (params.ymax - parseInt(skeleton.y[i][1]) - params.ymid)*this.XYScale + this.translate.y;
		var z1 = (parseInt(skeleton.z[i][0]) - params.zmin);
		var z2 = (parseInt(skeleton.z[i][1]) - params.zmin);
		//set end points of lineGeometry
		vertArray.push(
			new THREE.Vector3(x1,y1,z1),
			new THREE.Vector3(x2,y2,z2)
		);
		//console.log(vertArray);
		if (skeleton.cb != undefined && parseInt(skeleton.cb[i])==1){
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
MapViewer.prototype.addOneSynapse = function(name,synapse,sphereMaterial,synType,params)
{
	var self = this;
	// why wrap this in a function?
	//(function (){
		//console.log(synapse[0],synapse[1],synapse[2],synapse[7]);
		var x = (params.xmin - parseInt(synapse[0]) - params.xmid)*self.XYScale + self.translate.x;
		var y = (params.ymax - parseInt(synapse[1]) - params.ymid)*self.XYScale + self.translate.y;
		var z = parseInt(synapse[2]) - params.zmin;
		var _radius = synapse[3];
		var radius = Math.min(self.SynMax,parseInt(synapse[3])*self.SynScale);
		var partner = synapse[4];
		var sect1 = synapse[5];
		var sect2 = synapse[6];
		var contin = synapse[7];
		var source = synapse[8];
		var target = synapse[9];
		var geometry = new THREE.SphereGeometry(radius,self.sphereWidthSegments,self.sphereHeightSegments);
		var sphere = new THREE.Mesh(geometry,sphereMaterial);
		sphere.name = contin;
		sphere.position.set(x-self.position.x,y-self.position.y,z-self.position.z);
		sphere.material.transparent = true;
		self.maps[name].synObjs.push(sphere);
		//var url = '/maps/getImages.php?neuron=' +
		//params.neuron + '&db=' + params.db +'&continNum='+contin;
    
    //note that this is relative to floatingdialog.js...
		var url = '../synapseViewer/?neuron=' + 
		params.neuron + '&db=' + params.db +'&continNum='+contin;
    //console.log('url:', url);
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
      // menu.synClick is really a floatingdialog object
      // (see importerapp.js, ImporterApp.InfoDialog)
      // (see also ../../include/floatingdialog.js
      // which opens a floating dialog displaying url stuff)
			self.menu.synClick(url,'Synapse viewer');
      console.log('synClick url: ', url);
		});
		self.scene.add(sphere);
	//});
};


//should be called addSynapses!
MapViewer.prototype.addSynapse = function(name,synapses,sphereMaterial,synType,params) {
	for (var synapse of synapses) {
		this.addOneSynapse(name,synapse,sphereMaterial,synType,params);
	}
};

//TODO!! skeleton diagram no longer displays synapses!




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
    this.translateSynapse(this.maps[name].synObjs,m)
  };

};

MapViewer.prototype.translateSkeleton = function(skeleton,transMatrix)
{
  for (var i=0; i < skeleton.length;i++){
	  skeleton[i].applyMatrix(transMatrix);
  };    
};

MapViewer.prototype.translateSynapse = function(synObjs,transMatrix)
{
  for (var i=0; i < synObjs.length;i++){
	  synObjs[i].applyMatrix(transMatrix);
  }; 
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
    };
};


MapViewer.prototype._toggleAllSynapses = function(name,visible)
{
    for (var cell in this.maps[name].synapses){
	for (var syntype in this.maps[name].synapses[cell]){
	    for (var i in this.maps[name].synapses[cell][syntype]){
		this.maps[name].synapses[cell][syntype][i].visible = visible;
	    };
	};
    };
};

MapViewer.prototype.toggleSynapseType = function(synType,cells=null)
{
    for (var name in this.maps){
	this._toggleSynapseType(name,synType,cells=cells);
    };
};

MapViewer.prototype._toggleSynapseType = function(name,synType,cells=null)
{
    var keys;
    if (cells != null){
	keys = cells;
    } else {
	keys = Object.keys(this.maps[name].synapses);
    };
    
    for (var i in keys){
	cell = keys[i];
	try {
	    for (var i in this.maps[name].synapses[cell][synType]){
		this.maps[name].synapses[cell][synType][i].visible = true;
	    };
	} catch(err) {
	    //console.log('Synapse not found!');
	};
	
    };
    
};

MapViewer.prototype.toggleSynapseContin = function(contin)
{
    var object = this.scene.getObjectByName(contin);
    object.visible = !object.visible;
};

MapViewer.prototype.toggleRemarks = function()
{
    for (var name in this.maps){
	this._toggleRemarks(name);
    };
};

MapViewer.prototype._toggleRemarks = function(name,bool=null)
{
    for (var i in this.maps[name].remarks){
	if (bool != null){
	    this.maps[name].remarks[i].visible = bool;
	} else {
	    this.maps[name].remarks[i].visible = (this.maps[name].remarks[i].visible==true)?false:true;
	};
    };
};

MapViewer.prototype.toggleAxes = function()
{
    for (var i in  this.axesText){
	this.axesText[i].visible = (this.axesText[i].visible==true)?false:true;
    };
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

