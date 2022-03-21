// ImporterMenu class from apps/include/importers.js

ImporterApp = function (params)
{
	//params are obtained from the url
	//(e.g. when clicking on neuron from the Interactive Diagram)
	//https://wormwiring.org/apps/neuronMaps/?cell=RMDDR&sex=herm&db=N2U 
	this.params = params;
	this.db = 'JSH';
	this.selectedCell = '';
	this.validCells = []; //used by GetCellDisplay()
	this.GetCellDisplay(); //what does this really do??
	this.neuronGroup = null; //who uses this?
	
	this.series = {
		herm : [
			{value: 'N2U', text: 'Adult head (N2U)'},
			{value: 'JSE', text: 'Adult tail (JSE)'},
			{value: 'N2W', text: 'Pharynx (N2W)'},
			{value: 'JSH', text: 'L4 head (JSH)'}
		],
		male : [
			{value: 'n2y', text: 'Adult tail (N2Y)'},
			{value: 'n930', text: 'Adult head (N930)'}
		]
	};
	// holds the data passed back from retrieve_trace_coord.php
  // which is a MySQL
	// the skeleton, synapse locations etc.
  //data['ADAL'] = { ... }
	this.data = {};

  // HTML elements of menu items on the left
  // assigned in GenerateMenu()
  // e.g. this.menuGroup['maps'] = AddDefaultGroup(...);
	this.menuGroup = {};
	
	//selectedNeurons are cells to appear in the cell selector dialog
	//often run through loop: selectedNeurons[group][i]
	//	group = 'Neurons' or 'Muscles'
	//	i = the cell name e.g. 'ADAL'
	this.selectedNeurons = {};

  // but wait, there's more...
  // many more members defined in Init()
  // in particular,
  // this.viewer, the object dealing with the viewer inside canvas

	this.helpParams =  [
		{
			title : 'Quick start',
			text : 'Cell skeletons are intially displayed in blue. This can be altered in the maps menu. Cell bodies are displayed as thicker red segements. '
				+ 'This color cannot be changed. Presynapses are pink, postsynapses are purple and gap junctions are blue spheres. '
				+ 'For presyanpses, the cell is the presynaptic partner. For the postsynapses, the cell is the postsynaptic partners. '
				+ 'The size of the sphere reflects the size of the synapse. Mousing over displays the synapse info in the menu. '
				+ 'Clicking on the synapse takes the user to the electron micrographs where the synapse was scored. '
				+ 'Left mouse button rotates the mapse. Mouse wheel zooms in/out of the maps. Right mouse button pans the maps.',
			video: 'https://www.youtube.com/embed/hySW0Q57iL4',
			name : 'help-display'
		},
		{
			title : 'Cell selector',
			text : 'First select the sex and data series from the dropdown menus on the left. Then click on the Select Neuron button.',
			video: 'https://www.youtube.com/embed/l_oCC-3GdVQ',
			name : 'help-series'
		},
		{
			title : 'Synapse info',
			text : 'Synapses are represented as spheres. Mousing over synapse to display info for that synapse in the left panel. '
				+ 'There are three types of synapses: presynapses (pink), '
				+ 'postsynapses (purple), and gap junctions (blue). For presynapses and postsynapses, the cel pre- and postsynaptic, respectively. '
				+ 'The info dialog gives the the cell on which the synapse sphere is located (Cell), the synapse type, the presynaptic source, '
				+ 'the postsynaptic target, the estimated volume of the synapse (# of EM sections), the sections over which the synapse occurs '
				+ 'and numerical id of the synapse.',
			video: 'https://www.youtube.com/embed/DDjFMjFSdO0',
			name : 'help-synapse-info'
		},
		{
			title : 'Synapse Viewer',
			text : 'Click on synapse sphere to view the synapse in the associated electron micrograph (EM). The synapse viewer '
				+ 'has both a high and low magnification. Use the dropdown to to select the a different EM section in which the '
				+ 'synapse was scored.',
			video: 'https://www.youtube.com/embed/Qiy6JO2YeDU',
			name : 'help-synapse-viewer'
		},
		{
			title : 'Synapse filter',
			text : 'Display only the selected synapses. Check presynaptic (Pre.), postsynaptic (Post.) or gap junction (Gap.).'
				+ 'Then enter the partner cells to keep. Mulitple cells should be separated by a comma (e.g. AVAL,ASHL).'
				+ 'You can also select synapses by synapse id number. '
				+ 'Filter button will hide all but the selected synapses. Restore button makes all synapses visible.',
			video: 'https://www.youtube.com/embed/1vGvdg3cUlY',
			name : 'help-filter'
		},
		{
			title : 'Map translate',
			text : 'Translate the map along the x, y and z axes. Some maps may not be centered when selected. This can be used to manually center the maps.',
			video: 'https://www.youtube.com/embed/23dytw_7yRM',
			name : 'help-translate'
		},
		{
			title : 'Comments',
			text : 'Toggle map comments on/off.',
			video: 'https://www.youtube.com/embed/D25joOnz1XE',
			name : 'help-comments'
		},
		{
			title : 'Maps',
			text : 'Displays info for each map. Visibility of each map can be toggled on/off with the eye icon. Clicking on the cell reveals map info. '
				+ 'Map color can be changed. Map remarks toggled on/off. If a WormAtlas link exists it can be accessed. Synaptic partners and synapse partners '
				+ 'can also be displayed.',
			video: 'https://www.youtube.com/embed/9aVMiiGVwYA',
			name : 'help-maps'
		},
		{
			title : 'Clear maps',
			text : 'Clears all maps. Maps can also be cleared with the browser refresh button.',
			video: 'https://www.youtube.com/embed/LT3PTMcnFAo',
			name : 'help-clear'
		}
	];
};


/*
 * loads all the top buttons, Help, Select Neurons, Clear
 * the left menu is loaded in GenerateMenu
 */
ImporterApp.prototype.Init = function ()
{
	if (!Detector.webgl){
		var warning = Detector.getWebGLErrorMessage();
		console.log(warning);
		//alert(warning);
		alert('WebGL failed to load, viewer may not work');
	};

	//set up the Help, selector, clear menu
	var self = this;
	var top = document.getElementById ('top');
	var importerButtons = new ImporterButtons (top);
	importerButtons.AddLogo('Help',()=>{self.HelpDialog();});
	importerButtons.AddLogo('Select neuron',()=>{self.NeuronSelectorDialog();});
	importerButtons.AddLogo('Clear maps',()=>{self.ClearMaps();});

	//the small window in which help/selector is shown
	//and also when you click synapse (synClick)
	this.dialog = new FloatingDialog();
	
  // can't have two callbacks for one event..
	//window.addEventListener ('resize', this.Resize.bind (this), false);
	this.Resize();
	
	var canvas = document.getElementById('meshviewer');
	
	this.GenerateMenu();
	
	var viewer = new MapViewer(canvas, {
			menuObj:this.menuObj,
			menuGroup:this.menuGroup,
			synClick: this.InfoDialog
		},
		debug=false);
	this.viewer = viewer;
	
	var resizeWindow = function(){
    viewer.resizeDisplayGL();
	};
    
	var render = function(){
		// TODO commenting for testing
		requestAnimationFrame(render);
    // TODO make animating/pausing part of MapViewer class
		self.viewer.render();
	};

  window.addEventListener('resize', () => {
    self.Resize();
    resizeWindow();
  },false);
	this.viewer.initGL();
	this.viewer.resizeDisplayGL();
	render();
  
	//
	if (this.PreloadParamsLoaded()){
		this.PreloadCells();
	} else {
		this.SetCellSelector();
	};
};

// YH
ImporterApp.prototype.AddLoadSave = function() {
  // following AddSynapseFilter
  const parent = this.menuGroup['load-save'];

  const inputLoad = document.createElement('input');
  inputLoad.type = 'file';
  inputLoad.id = 'LoadFromFileInput';
  inputLoad.accept = '.json';
  inputLoad.onchange = () => this.LoadFromFile();
  parent.appendChild(inputLoad);

  const buttonSave = document.createElement('button');
  buttonSave.innerHTML = 'Save';
  buttonSave.id = 'SaveToFileButton';
  buttonSave.onclick = () => this.SaveToFile();
  parent.appendChild(buttonSave);

  const a = document.createElement('a');
  a.id = 'forSaveToFileButton';
  parent.appendChild(a);
};

/*
 * YH
 * load settings from file
 * file expected to be .json, object
 * one attritbute for each cell,
 * with 
 */
ImporterApp.prototype.LoadFromFile = function() {
  const input = document.getElementById('LoadFromFileInput');
  const file = new FileReader();
  if (input === null)
    return;
  file.readAsText(input.files[0]);

  const main_this = this;
  file.onloadend = function(ev) {
    // read data is in this.result
    const data = JSON.parse(this.result);
    for (const cell in data.sqlData) {
      console.log('loadmap ', cell);
      main_this.data[cell] = data.sqlData[cell];
      main_this.viewer.loadMap(main_this.data[cell]);
    }
    // update color (OK, viewer.loadMap is synchronous)
    for (const cell in data.mapsSettings) {
      // seems like the color selector thing is created
      // when user clicks the button,
      // so we just need to modify the color directly on the object
      obj = main_this.viewer.setColor(
        cell,
        data.mapsSettings[cell].color
      );
    }
    console.log(JSON.parse(this.result));
  };
};

/*
 * json file expected:
 *
 *
 */
ImporterApp.prototype.SaveToFile = function() {
  const data = {
    sqlData: this.data,
    mapsSettings: this.viewer.dumpMapsJSON(),
    cameraSettings: this.viewer.dumpCameraJSON(),
    mapsTranslation: this.GetMapsTranslate(),
  };// object to hold data to save

  console.log(data);

  const a = document.getElementById('forSaveToFileButton');
  if (a === null)
    return;
  a.href = URL.createObjectURL(new Blob(
    [JSON.stringify(data)],
    { type: 'application/json', }
  ));
  a.setAttribute('download', 'session.json');
  a.click();
};

ImporterApp.prototype.SetCellColor = function(cell, r,g,b) {

};

ImporterApp.prototype.PreloadParamsLoaded = function() {
	return "cell" in this.params
		&& "db" in this.params
		&& "sex" in this.params;
	//if ("cell" in this.params && "db" in this.params && "sex" in this.params){ return true; } else { return false; };
};

ImporterApp.prototype.PreloadCells = function()
{
	var self = this;
	this.LoadMap(this.params.db,this.params.cell);
	document.getElementById('sex-selector').value = this.params.sex
	var sex = document.getElementById('sex-selector').value;
	var series = document.getElementById('series-selector')
	while(series.length > 0){
		series.remove(series.length-1);
	};
	for (var i=0;i<self.series[sex].length;i++){
		var opt = document.createElement('option');
		opt.value = self.series[sex][i].value;
		opt.innerHTML = self.series[sex][i].text;
		series.appendChild(opt);
	};
	document.getElementById('series-selector').value = this.params.db
	var xhttp = new XMLHttpRequest();    
	var url = '../php/selectorCells.php?sex='+this.params.sex+'&db='+this.params.db;
  console.log(`PreloadCell sgetting selectorCells from url ${url}`);
	xhttp.onreadystatechange = function(){
		if (this.readyState == 4 && this.status == 200){
			self.selectedNeurons = JSON.parse(this.responseText);
			for (var group in self.selectedNeurons){
				if (self.params.cell in self.selectedNeurons[group]){
					self.selectedNeurons[group][self.params.cell].visible = 1;
					self.selectedNeurons[group][self.params.cell].plotted = 1;
					self.LoadMapMenu(self.params.cell,
						self.selectedNeurons[group][self.params.cell].walink);
				}
			}
		}
	};
    
	xhttp.open("GET",url,true);
	xhttp.send(); 
};



ImporterApp.prototype.HelpDialog = function()
{
	var self = this;
	var dialogText = [
		'<div class="container">',
		'</div>',
		].join ('');
	this.dialog.Open({
		className: 'dialog',
		title : 'Help',
		text : dialogText,
		buttons : [
			{
				text : 'close',
				callback : function (dialog) {
					dialog.Close();
				}
			}		]
	});
    
	var container = document.getElementsByClassName('container')[0];
	var panelGroup = document.createElement('div');
	panelGroup.id = 'accordion';
	panelGroup.className = 'panel-group';
	for (var i = 0; i < this.helpParams.length; i++){
		this.AddHelpPanel(panelGroup,this.helpParams[i]);
	}
	container.appendChild(panelGroup);
}

ImporterApp.prototype.AddHelpPanel = function(parent,params)
{
	var self = this;
	var panel = document.createElement('div');
	panel.className = 'panel panel-default';
	var panelHeader = document.createElement('div');
	panelHeader.className = 'panel-heading';
	var panelTitle = document.createElement('h4');
	panelTitle.className = 'panel-title';
	var panelA = document.createElement('a');
	panelA.className = 'accordion-toggle';
	panelA.setAttribute('data-toggle','collapse');
	panelA.setAttribute('data-parent','#accordion');
	panelA.href = '#' + params.name;
	panelA.innerHTML = params.title;
	panelTitle.appendChild(panelA);
	panelHeader.appendChild(panelTitle);
	panel.appendChild(panelHeader);
	var panelCollapse = document.createElement('div');
	panelCollapse.id = params.name;
	panelCollapse.className = 'panel-collapse collapse';
	if (typeof params.text !== "undefined"){
		var panelBody = document.createElement('div');
		panelBody.className = 'panel-body';
		panelBody.innerHTML = params.text;
		panelCollapse.appendChild(panelBody);
	};
	if (typeof params.video !== "undefined"){
		panelIFrame = document.createElement("iframe");
		panelIFrame.setAttribute("width","1140");
		panelIFrame.setAttribute("height","740");
		panelIFrame.setAttribute("src",params.video);
		panelCollapse.appendChild(panelIFrame);
	};
	panel.appendChild(panelCollapse);
	parent.appendChild(panel);
}

ImporterApp.prototype.InfoDialog = function(url,title)
{
  var self = this;
  var dialogText = [
	  '<div class="importerdialog">',
	  '<iframe src="'+url+'"',
	  'id="infoFrame"></iframe>',
	  '</div>',
    ].join ('');
  dialog = new FloatingDialog ();
  dialog.Open ({
	  className: 'infoFrame',
	  title : title,
	  text : dialogText,
	  buttons : [{
        text : 'close',
        callback : function (dialog) {
          dialog.Close();
        }
	  }]
  });
}


/*
 * loads, creates neuron selector dialog when click 'Select neuron'
 * for neurons that are selected, calls LoadMaps,
 * which sends request to php for the neuron data,
 * skeleton, synapses etc
 */
ImporterApp.prototype.NeuronSelectorDialog = function()
{
	var self = this;
	var dialogText = [
		'<div class="selectordialog">',
		//this.NeuronSelector (),
		'</div>',
	].join ('');
	this.dialog.Open({
		className: 'cell-selector',
		title : 'Cell Selector',
		text : dialogText,
		buttons : [{
			text : 'ok',
			callback : function (dialog) {
				var sex = document.getElementById('sex-selector').value;
				var series = document.getElementById('series-selector').value;
				for (var group in self.selectedNeurons){
					for (var i in self.selectedNeurons[group]){
						if (self.selectedNeurons[group][i].visible == 1 && self.selectedNeurons[group][i].plotted == 0){
							self.LoadMap(series,i);
							self.LoadMapMenu(i,self.selectedNeurons[group][i].walink);
							self.selectedNeurons[group][i].plotted = 1;
						}
					}
				}
				dialog.Close();
			}
		}, {
			text : 'close',
			callback : function (dialog) {
				dialog.Close();
			}
		}
		]
	});

	//this.SetCellSelector();
	//adds cells from selected database to the selector dialog
	var selector = document.getElementsByClassName('selectordialog')[0];
	for (var group in this.selectedNeurons){
		this.AddSelectPanel(selector,group);
	};
	console.log(self.selectedNeurons);
}

ImporterApp.prototype.ClearMaps = function(mapName)
{
	var menuGroup = this.menuGroup.maps;
	while(menuGroup.lastChild){
		menuGroup.removeChild(menuGroup.lastChild);
	};
	this.viewer.clearMaps();

	for (var group in this.selectedNeurons){
		for (var i in this.selectedNeurons[group]){
			if (this.selectedNeurons[group][i].visible==1){
				this.selectedNeurons[group][i].visible=0;
			}
		};
	}; 
}

/*
 * calls php to ask mysql for synapses and stuff
 * and loads it to viewer by its method loadMap
 * mapname: neuron that we want
 * db: database from which to select
 *
 * does not create entry in menu on the left,
 * that's handled by LoadMapMenu (see NeuronSelectorDialog)
 *
 * I don't like how neurons, and all it's traces, positions etc
 * are stored twice, once in ImporterApp (.data)
 * and another time in mapViewer.
 * Store it once!
 */
ImporterApp.prototype.LoadMap = function(db,mapname)
{
	var self = this;
	console.log(db + ', ' + mapname);
	var url = '../php/retrieve_trace_coord.php?neuron='+mapname+'&db='+db;
	console.log('retrieving skeleton map via '+url);
	var xhttp = new XMLHttpRequest();    
	xhttp.onreadystatechange = function(){
		if (this.readyState == 4 && this.status == 200){
			self.data[mapname] = JSON.parse(this.responseText);
			self.viewer.loadMap(self.data[mapname]);
			//console.log(self.data[mapname]);
		}
	};
	xhttp.open("GET",url,true);
	xhttp.send();
}

/*
 * YH
 * retrieves trace, synapses etc and loads into viewer,
 * and also takes callback to perform after loaded
 *
 * callback expected to take db, mapname as input
 * TODO do this when allow loading from
 * json file that didn't save the skeleton and stuff
 * perhaps even use this as unified way to load via url params
 */
ImporterApp.prototype.LoadMapCallback = function(db, mapname, callback)
{
	var self = this;
	console.log(db + ', ' + mapname);
	var url = '../php/retrieve_trace_coord.php?neuron='+mapname+'&db='+db;
	console.log('retrieving skeleton map via '+url);
	var xhttp = new XMLHttpRequest();    
	xhttp.onreadystatechange = function(){
		if (this.readyState == 4 && this.status == 200){
			self.data[mapname] = JSON.parse(this.responseText);
			self.viewer.loadMap(self.data[mapname]);
			//console.log(self.data[mapname]);
      callback(db, mapname);
		}
	};
	xhttp.open("GET",url,true);
	xhttp.send();
}



ImporterApp.prototype.LoadMapMenu = function(mapname,walink)
{
	var self = this;
	var menuObj = this.menuObj;
	var menuGroup = this.menuGroup.maps;    
	var colorparams = {
		openCloseButton:{
			visible : false,
			open : 'images/opened.png',
			close: 'images/closed.png',
			title: 'Map color',
			onOpen : function(content,mapName){
				while(content.lastChild){
					content.removeChild(content.lastChild);
				};
				colorInput = document.createElement('input');
        // class no CSS, but used below
				colorInput.className = 'colorSelector';
				colorInput.setAttribute('type','text');
				var obj = self.viewer.maps[mapname].skeleton[0];
				var r = Math.round(255*obj.material.color.r);
				var b = Math.round(255*obj.material.color.b);
				var g = Math.round(255*obj.material.color.g);
				var rgb = b | (g << 8) | (r << 16);
				var hex = '#' + rgb.toString(16);
				colorInput.setAttribute('value',hex);
				content.appendChild(colorInput);
				$(".colorSelector").spectrum({
					preferredFormat: "rgb",
					showInput: true,
					move: function(color){
						var rgb = color.toRgb();
						for (var i in self.viewer.maps[mapname].skeleton){
							var obj = self.viewer.maps[mapname].skeleton[i];
							if (!obj.cellBody){
								obj.material.color.r = rgb.r/255.;
								obj.material.color.g = rgb.g/255.;
								obj.material.color.b = rgb.b/255.;
							}
						};
					}
				});
			},
			userDate : mapname
		}
	};
    
	var remarksparams = {
		userButton:{
			visible: false,
			onCreate : function(image){
				image.src = 'images/hidden.png';
			},
			onClick : function(image,modelName){
				var visible = self.viewer.maps[mapname].params.remarks;
				self.viewer._toggleRemarks(mapname);
				image.src = visible ? 'images/hidden.png' : 'images/visible.png';
				self.viewer.maps[mapname].params.remarks = !visible;
			},
			title : 'Show/Hide remarks',
			userdata : mapname
		}
	};

	var infoparams = {
		openCloseButton:{
			visible : false,
			open : 'images/info.png',
			close: 'images/info.png',
			title: 'WormAtlas',
			onOpen : function(content,mapName){
				var url = walink;
				self.InfoDialog(url,'WormAtlas');
			},
			userDate : mapname
		}
	};  

	var partnerListparams = {
		openCloseButton:{
			visible : false,
			open : 'images/info.png',
			close: 'images/info.png',
			title: 'Synaptic partners',
			onOpen : function(content,mapName){
				var sexSelect = document.getElementById('sex-selector').value;
				var seriesSelect = document.getElementById('series-selector').value;
				var url = '../partnerList/?continName='+mapname+'&series='+seriesSelect;
				console.log('url: ' + url); 
				self.InfoDialog(url,'Synaptic partners');
			},
			userDate : mapname
		}
	}; 

	var synapseListparams = {
		openCloseButton:{
			visible : false,
			open : 'images/info.png',
			close: 'images/info.png',
			title: 'Synapes',
			onOpen : function(content,mapName){
				var sexSelect = document.getElementById('sex-selector').value;
				var seriesSelect = document.getElementById('series-selector').value;
				var url = '../synapseList/?continName='+mapname+'&series='+seriesSelect;
				self.InfoDialog(url,'Synapse list');
			},
			userDate : mapname
		}
	};

	menuObj.AddSubItem(menuGroup,mapname,{
		openCloseButton:{
		  visible : false,
		  open: 'images/info.png',
		  close: 'images/info.png',
		  onOpen : function(content,mapName){
		  	while(content.lastChild){
		  		content.removeChild(content.lastChild);
		  	};
		  	menuObj.AddSubItem(content,'Color',colorparams);
		  	menuObj.AddSubItem(content,'Remarks',remarksparams);
		  	if (walink != undefined){
		  		menuObj.AddSubItem(content,'WormAtlas',infoparams);
		  	}
		  	menuObj.AddSubItem(content,'Synaptic partners',partnerListparams);
		  	menuObj.AddSubItem(content,'Synapse list',synapseListparams);
		  },
		  title : 'Show/Hide Information',
		  userData : mapname
		},
		userButton : {
			visible : true,
			onCreate : function(image){
				image.src = 'images/visible.png';
			},
			onClick: function(image,modelName){
				var visible = self.viewer.maps[modelName].visible
				image.src = visible ? 'images/hidden.png' : 'images/visible.png';
				self.viewer.maps[modelName].visible = !visible;
				self.viewer.toggleMaps(modelName);
				self.viewer._toggleAllSynapses(modelName,!visible);
				self.viewer._toggleRemarks(modelName,bool=false);
			},
			title : 'Show/Hide map',
			userData : mapname
		}
	});
}

ImporterApp.prototype.SetCellSelector = function()
{
	/*
	 * js <-> php is structured as a callback
	 * we send the request by xhttp.send()
	 * but configure the request (via .open("GET",url))
	 * xhttp.onready...nge waits until php is done
	 * returning the value in the xhttp object as its
	 * responseText attribute
	 * then performs the callback fn we assign,
	 * in this case simply parsing and saving the data
	 * in self.selectedNeurons
	 */
	var self = this;
	var sex = document.getElementById('sex-selector').value
	var db = document.getElementById('series-selector').value;  
	var xhttp = new XMLHttpRequest();    
	var url = '../php/selectorCells.php?sex='+sex+'&db='+db;
  console.log(`SetCellSelector getting selectorCells from url ${url}`);
	xhttp.onreadystatechange = function(){
		if (this.readyState == 4 && this.status == 200){
			self.selectedNeurons = JSON.parse(this.responseText);
      //console.log(self.selectedNeurons);
		};
	};
	xhttp.open("GET",url,true);
	xhttp.send();  
};

/*
 * adds the Neuron and Muscles panels
 */
ImporterApp.prototype.AddSelectPanel = function(parent,name)
{
	var self = this;
	var header = document.createElement('button');
	header.className = 'panel-header';
	header.setAttribute('type','button');
	header.setAttribute('data-toggle','collapse');
	header.setAttribute('data-target','#'+name);
	header.innerHTML = name
	var panel = document.createElement('div');
	panel.id = name;
	panel.className = 'collapse';
	for (var i in this.selectedNeurons[name]){
		var div = document.createElement('div');
		div.className = 'selectCell';//for entries in selector dialog
		div.id = i;
		div.innerHTML = i;
		panel.appendChild(div);
	};
	parent.appendChild(header);
	parent.appendChild(panel);
    
	$("div#"+name+" > .selectCell").click(function () {
		self.selectedNeurons[name][this.id].visible = 
			(self.selectedNeurons[name][this.id].visible==1)?0:1;
		$(this).toggleClass("select");
	});

	for (var i in this.selectedNeurons[name]){
		if (this.selectedNeurons[name][i].visible==1){
			$("div#"+i).toggleClass("select");  
		}
	}
};

ImporterApp.prototype.SetDB = function(_db)
{
    this.db = _db;
}

ImporterApp.prototype.SetCell = function(_cell)
{
    this.selectedCell = _cell;
}

ImporterApp.prototype.HelpButton = function()
{
    var HelpText = [
	'<div class="btn-group">',
	'<button type="button" class="btn btn-danger">Action</button>',
	'<button type="button" class="btn btn-danger" data-toggle="collapse" data-target="#demo">',
	'<span class="glyphicon glyphicon-minus"></span>',
	'</button>',
	'</div>',
        '<div id="demo" class="collapse in">Some dummy text in here.</div>'
    ].join('');
    return HelpText;
}


/*
 * no one seems to call this
 */
ImporterApp.prototype.NeuronSelector = function()
{
	var VolSelectorText = [
		'<div class="cellclass-heading',
		'<a class="cellclass" data-toggle="neurons" href="#neurons">Neurons</a>',
	].join(''); // no </div>?
    
	return VolSelectorText;
};

/*
 * what does this do??
 * asks for some cells, then push to validCells,
 * but no one else uses validCells??
 */
ImporterApp.prototype.GetCellDisplay = function()
{
	var self = this;
	var oReq = new XMLHttpRequest();
	oReq.addEventListener("load",function(){
		var list = this.responseText.split('\n');
		for (l of list){
			var tmp = l.split(',');
			for (_tmp of tmp){
				self.validCells.push(_tmp);
			}
		}
	});
	//oReq.open("GET","./models/volcells.txt");
	//oReq.send();
}


ImporterApp.prototype.Resize = function ()
{
	function SetWidth (elem, value)
	{
		elem.width = value;
		elem.style.width = value + 'px';
	}

	function SetHeight (elem, value)
	{
		elem.height = value;
		elem.style.height = value + 'px';
	}

	var headerimage = document.getElementById ('headerimage');
	var nav = document.getElementById ('nav');
	var top = document.getElementById ('top');
	//why left and not just do the menu
	var left = document.getElementById ('left');
	var canvas = document.getElementById ('meshviewer');
	// YH; subtracting the nav/image heights too
	var height = window.innerHeight - top.offsetHeight - headerimage.offsetHeight - nav.offsetHeight - 10;

	SetHeight (canvas, 0);
	//SetWidth (canvas, 0);

	SetHeight (left, height);

	SetHeight (canvas, height);
	SetWidth (canvas, document.body.clientWidth - left.offsetWidth);
	
	this.dialog.Resize();
};

ImporterApp.prototype.GenerateMenu = function()
{
	var self = this;
  // AddDefaultGroup returns the HTML element
	function AddDefaultGroup (menu, name, visible=false) {
		var group = menu.AddGroup(name, {
			openCloseButton : {
				visible : visible,
				open : 'images/opened.png',
				close : 'images/closed.png',
				title : 'Show/Hide ' + name
			}
		});
		return group;
	};

	function AddSexSelector(menu,menuGrp,name) {
		menu.AddSelector(menuGrp,name,{
			options:[
				{value:'herm',text:'Hermaphrodite'},
				{value:'male',text:'Male'}
			],
			onChange: function(){
				var sex = document.getElementById('sex-selector').value;
				var series = document.getElementById('series-selector')
				while(series.length > 0){
					series.remove(series.length-1);
				};
				for (var i=0;i<self.series[sex].length;i++){
					var opt = document.createElement('option');
					opt.value = self.series[sex][i].value;
					opt.innerHTML = self.series[sex][i].text;
					series.appendChild(opt);
				};
				self.SetCellSelector();
			},
			id : 'sex-selector'
			//again this looks sketchy as there may be many with this id
		});
	};

	function AddSeriesSelector(menu,menuGrp,name){
		menu.AddSelector(menuGrp,name,{
			options:self.series.herm,
      onChange: () => self.SetCellSelector(),
			id : 'series-selector'
		});
	};

	function AddSynapseInfo(parent){
		var synElems = {
			'cellname':'Cell: ',
			'syntype':'Synapse type: ',
			'synsource':'Source: ',
			'syntarget':'Target: ',
			'synweight':'# EM sections: ',
			'synsection':'Sections: ',
			'syncontin':'Synapse Id: '
		};
		for (var i in synElems){
			var left = document.createElement('div');
			var right = document.createElement('div');
			left.className = 'synLeft';
			right.className = 'synRight';
			right.innerHTML = '---';	
			left.innerHTML = synElems[i];
			right.id = i;
			parent.appendChild(left);
			parent.appendChild(right);
		}
	};

	function AddSynapseFilter(parent){
		var filterChecks = document.createElement('div')
		filterChecks.id = 'synfiltercheck'
		var _filters = {
			'Presynaptic':'Pre.',
			'Postsynaptic':'Post.',
			'Gap junction':'Gap'
		};
		for (var i in _filters){
			var label = document.createElement('label')
			var chkbx = document.createElement('input')
			chkbx.type = 'checkbox';
			chkbx.className = 'synfilter';
			chkbx.id = i
			
			label.appendChild(chkbx);
			//label.innerHTML = _filters[i];
			label.appendChild(document.createTextNode(_filters[i]));
			filterChecks.appendChild(label);
		};
		parent.appendChild(filterChecks);
		var filterDialog = document.createElement('div');
		filterDialog.id = 'synfiltercellsdialog';
		var filterDialogLabel = document.createElement('label');
		filterDialogLabel.appendChild(document.createTextNode('Cells: '));
		var filterText = document.createElement('input');
		filterText.type = 'text';
		filterText.id = 'synfiltercells';
		filterDialogLabel.appendChild(filterText);
		filterDialog.appendChild(filterDialogLabel);
		parent.appendChild(filterDialog);
		var filterBtn = document.createElement('button');
		filterBtn.innerHTML = 'Filter';
		filterBtn.className = 'filterButton';
		filterBtn.onclick = function(){
		self.viewer.toggleAllSynapses(false);
		var cells = document.getElementById('synfiltercells').value
			if (cells != ""){
				cells = cells.split(',');
			} else {
				cells = null;
			};
			for (var i in _filters){
				if (document.getElementById(i).checked){
					self.viewer.toggleSynapseType(i,cells=cells);
				};
			};
		}
		var restoreBtn = document.createElement('button');
		restoreBtn.innerHTML = 'Restore';
		restoreBtn.className = 'filterButton';
		restoreBtn.onclick = function(){
			document.getElementById('synfiltercells').value=null;
			self.viewer.toggleAllSynapses(true);
		};
		parent.appendChild(filterBtn);
		parent.appendChild(restoreBtn);	

		var filterContinDialog = document.createElement('div');
		filterContinDialog.id = 'synfiltercellsdialog';
		var filterContinDialogLabel = document.createElement('label');
		filterContinDialogLabel.appendChild(document.createTextNode('Synapse Id: '));
		var filterContinText = document.createElement('input');
		filterContinText.type = 'text';
		filterContinText.id = 'synfiltercontins';
		filterContinDialogLabel.appendChild(filterContinText);
		filterContinDialog.appendChild(filterContinDialogLabel);
		parent.appendChild(filterContinDialog);	
		var filterBtn = document.createElement('button');
		filterBtn.innerHTML = 'Filter';
		filterBtn.className = 'filterContinButton';
		filterBtn.onclick = function(){
		    self.viewer.toggleAllSynapses(false);
		    var contins = document.getElementById('synfiltercontins').value
		    if (contins != ""){
			contins = contins.split(',');
		    } else {
			contins = null;
		    };
		    
		    if (contins != null){
			console.log(contins);
			for (var i in contins){
			    self.viewer.toggleSynapseContin(contins[i]);
			};
		    };
		}
		var restoreBtn = document.createElement('button');
		restoreBtn.innerHTML = 'Restore';
		restoreBtn.className = 'filterContinButton';
		restoreBtn.onclick = function(){
		    document.getElementById('synfiltercontins').value=null;
		    self.viewer.toggleAllSynapses(true);
		};
		parent.appendChild(filterBtn);
		parent.appendChild(restoreBtn);	

	};

	function AddMapTranslate(parent,slider,callback){
		var params = {className:'map-translate',
			      min: -2000,
			      max: 2000,
			      value: 0,
			     callback:callback};
		var text = {x:'<-Left / Right->',
			    y:'<-Ventral / Dorsal->',
			    z:'<-Anterior / Posterior->'};
		for (var i in text){
		    var p = document.createElement('p')
		    p.innerHTML = text[i] + ': '
		    parent.appendChild(p);
		    slider(parent,i,params);
		}
	};

	function AddSlider(parent,name,params){
		var self = this;
		var slider = document.createElement('input');
		slider.id = name + '-slider';
		slider.className = params.className;
		slider.type ='range';
		slider.min = params.min;
		slider.max = params.max;
		slider.value = params.value;
		slider.onchange = function(){
		  var x = document.getElementById('x-slider').value;
		  var y = document.getElementById('y-slider').value;
		  var z = document.getElementById('z-slider').value;
      // why negative? probably something to do with EM coords
		  params.callback(-x,-y,-z);
		};
		parent.appendChild(slider);
	};

	function AddToggleButton(parent,onText,offText,callback){
		var remarkBtn = document.createElement('button');
		remarkBtn.innerHTML = onText;
		remarkBtn.value = true;
		remarkBtn.className = 'filterbutton';
		//remarkBtn.id = 'remarkBtn';
		remarkBtn.onclick = function(){
				this.innerHTML=(this.innerHTML==onText)?offText:onText;
				callback();
		};
		parent.appendChild(remarkBtn);
	};

	//add menu on the left
	//in apps/include/importers.js
	var menu = document.getElementById('menu');
	this.menuObj = new ImporterMenu(menu);
  
	this.menuGroup['maps'] = AddDefaultGroup(this.menuObj,'Maps',visible=true);
	this.menuGroup['series-selector'] =
		AddDefaultGroup(this.menuObj,'Series selector',visible=true);
	this.menuGroup['synapse-info'] = AddDefaultGroup(this.menuObj,'Synapse info',visible=true);
	this.menuGroup['synapse-filter'] = AddDefaultGroup(this.menuObj,'Synapse filter',visible=true);
	this.menuGroup['map-translate'] = AddDefaultGroup(this.menuObj,'Map translate',visible=true);
	this.menuGroup['comments'] = AddDefaultGroup(this.menuObj,'Comments',visible=true);
    
    //Series selector
    AddSexSelector(this.menuObj,this.menuGroup['series-selector'],'Sex');
    AddSeriesSelector(this.menuObj,this.menuGroup['series-selector'],'Series');
    
    //Synapse info
    AddSynapseInfo(this.menuGroup['synapse-info']);

    //Synapse filter
    AddSynapseFilter(this.menuGroup['synapse-filter']);

    //Translate map
    AddMapTranslate(this.menuGroup['map-translate'],AddSlider,
		   function(x,y,z){self.viewer.translateMaps(x,y,z);});

    //Synapse remarks
    AddToggleButton(this.menuGroup['comments'],'Axes ON',
		    'Axes OFF',function(){self.viewer.toggleAxes();});
    //AddToggleButton(this.menuGroup['comments'],'Remarks OFF',
    //'Remarks ON',function(){self.viewer.toggleRemarks();});

  // YH
	this.menuGroup['load-save'] = AddDefaultGroup(this.menuObj,'Load/Save',visible=true);
  this.AddLoadSave();
};

ImporterApp.prototype.SetMapsTranslate = function(x,y,z) {
  const xEl = document.getElementById('x-slider');
  const yEl = document.getElementById('y-slider');
  const zEl = document.getElementById('z-slider');

  xEl.value = x;
  yEl.value = y;
  zEl.value = z;

  // trigger the usual function to update the viewer
  xEl.onchange();
  yEl.onchange();
  zEl.onchange();
};


ImporterApp.prototype.GetMapsTranslate = function() {
  const xEl = document.getElementById('x-slider');
  const yEl = document.getElementById('y-slider');
  const zEl = document.getElementById('z-slider');

  return {
    x: parseInt(xEl.value),
    y: parseInt(yEl.value),
    z: parseInt(zEl.value),
  };
};
