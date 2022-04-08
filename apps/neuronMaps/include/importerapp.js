/*
 * ImporterMenu class from apps/include/importers.js
 * note confusing terminology, series can refer to database N2U etc
 * or also the regions of the worm, VC, NR etc..
 *
 *
 * note to self: viewer must be initialized after GenerateMenu()
 * because it needs references to the menu items...
 */

ImporterApp = function (params)
{
  //params are obtained from the url
  //(e.g. when clicking on neuron from the Interactive Diagram)
  //https://wormwiring.org/apps/neuronMaps/?cell=RMDDR&sex=herm&db=N2U 
  this.params = params;
  this.db = 'N2U'; // not updated, only used as default for loading..
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
  // YH made redundant by having ImporterMenu object (this.menuObj)
  // hold the reference to HTML elems
  // keeping it here for just in case for now
  this.menuGroup = {};
  
  // selectedNeurons are cells to appear in the cell selector dialog
  // reloaded each time different series is selected
  // this gives rise to a small problem:
  // the cell selector dialog highlights cells that are selected,
  // (by giving them a class 'select')
  // but this is info is lost when switch to different series and back
  // need to add this in SetCellSelector/PreloadCells
  // often run through loop: selectedNeurons[group][i]
  //  group = 'Neurons' or 'Muscles'
  //  i = the cell name e.g. 'ADAL'
  this.selectedNeurons = {};

  // starting value of the Synapse Info section
  // will be updated when a synapse is clicked
  // see AddSynapseInfo for more
  this.synapseInfoClicked = {
    'cellname': '---',
    'syntype': '---',
    'synsource': '---',
    'syntarget': '---',
    'synweight': '---',
    'synsection': '---',
    'syncontin': '---',
  }

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
      text :
      'Synapses are represented as spheres along the skeleton diagram. Click/hover over synapse to display info for that synapse in the left panel. Synapses come in three colors: gap junction = blue, chemical = pink/purple; pink if the cell on which the sphere appears is presynaptic, and purple if post. The Synapse info menu item shows the the cell on which the synapse sphere is located (Cell), the synapse type, the presynaptic source, the postsynaptic target(s), the estimated volume of the synapse (# of EM sections), the sections over which the synapse occurs, and numerical id of the synapse. The Details (EM Viewer) button opens a floating dialog that shows the electron micrographs containing the selected (clicked) synapse. (Video is a little outdated.)',
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
      text : 'Various global settings. Toggle visibility of grid, axes, cell remarks, synapse labels.',
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
 *
 * no idea why Init function is separate from constructor;
 * in practice it is immediately called after constructor wtf
 */
ImporterApp.prototype.Init = function ()
{
  const self = this;

  if (!Detector.webgl){
    var warning = Detector.getWebGLErrorMessage();
    console.log(warning);
    //alert(warning);
    alert('WebGL failed to load, viewer may not work');
  };

  //set up the Help, selector, clear menu
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
  //(see window.addEventListener below)
  this.Resize();
  
  var canvas = document.getElementById('meshviewer');
  
  this.GenerateMenu();
  
  var viewer = new MapViewer(canvas, {
    // YH don't think these two are actually used by viewer
    //menuObj: this.menuObj, // apps/include/importers.js
    //menuGroup: this.menuGroup,
    synClick: this.InfoDialog, // is a FUNCTION that spawns dialog
    app: this, // YH so viewer can refer back
  });
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
  //const parent = this.menuGroup['load-save'];
  const parent = this.menuObj.mainItems['Load/Save'].content;

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

    // update the series selector in menu
    const dbEl = document.getElementById('series-selector');
    const sexEl = document.getElementById('sex-selector');
    dbEl.value = data.db;
    sexEl.value = data.sex;

    // wait for selectedNeurons[group][cell] to have the attributes:
    // -walink
    // -visible
    // -plotted
    function LoadMapMenuWhenReady(cell) {
      if (!main_this.selectedNeurons.Neurons.hasOwnProperty(cell)
        && !main_this.selectedNeurons.Muscles.hasOwnProperty(cell)) {
        setTimeout(() => LoadMapMenuWhenReady(cell), 200);
      }
      else {
        var group = 'Neurons';
        if (!main_this.selectedNeurons[group].hasOwnProperty(cell)) {
          group = 'Muscles';
        }
        if (!main_this.selectedNeurons[group][cell].hasOwnProperty('walink')
          || !main_this.selectedNeurons[group][cell].hasOwnProperty('visible')
          || !main_this.selectedNeurons[group][cell].hasOwnProperty('plotted')) {
          setTimeout(() => LoadMapMenuWhenReady(cell), 200);
        }
        else {
          main_this.LoadMapMenu(cell, main_this.selectedNeurons[group][cell].walink);
          main_this.selectedNeurons[group][cell].visible = 1;
          main_this.selectedNeurons[group][cell].plotted = 1;
        }
      }
    }

    for (const cell in data.sqlData) {
      console.log('loadmap ', cell);
      main_this.data[cell] = data.sqlData[cell];
      main_this.viewer.loadMap(main_this.data[cell]);
      LoadMapMenuWhenReady(cell);
    }

    // update color (viewer.loadMap sync, ImporterApp.LoadMap async)
    for (const cell in data.mapsSettings) {
      // seems like the color selector thing is created
      // when user clicks the button,
      // so we just need to modify the color directly on the object
      obj = main_this.viewer.setColor(
        cell,
        data.mapsSettings[cell].color
      );
    }

    // ideally use some async methods..
    setTimeout(() => {
      main_this.SetMapsTranslate(data.mapsTranslation);
      main_this.viewer.SetCameraFromJSON(data.cameraSettings);
    }, 1000);
  };
};

/*
 * json file expected:
 * TODO
 */
ImporterApp.prototype.SaveToFile = function() {
  const data = {
    db: document.getElementById('series-selector').value,
    sex: document.getElementById('sex-selector').value,
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
  console.log(`PreloadCell getting selectorCells from url ${url}`);
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
      }   ]
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
  console.log(`opening info dialog for ${url}`);
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
            if (self.selectedNeurons[group][i].visible == 1
                && self.selectedNeurons[group][i].plotted == 0){
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
  for (var group in this.selectedNeurons){ // Neurons/Muscles
    this.AddSelectPanel(selector,group);
  };
  console.log(self.selectedNeurons);
};

ImporterApp.prototype.ClearMaps = function(mapName)
{
  //const menuMaps = this.menuGroup['maps'];
  const menuMaps = this.menuObj.mainItems['Maps'].content;
  while(menuMaps.lastChild){
    menuMaps.removeChild(menuMaps.lastChild);
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
 * @param {string} mapname: neuron/muscle name that we want
 * @param {string} db: database from which to select
 *
 * does not create entry in menu on the left,
 * that's handled by LoadMapMenu (see NeuronSelectorDialog)
 *
 * I don't like how neurons, and all it's traces, positions etc
 * are stored twice, once in ImporterApp (.data)
 * and another time in mapViewer.
 * Store it once!
 *
 * YH
 * modified retrieve_trace_coord.php to return
 * some data about OBJ_Remarks
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
    }
  };
  xhttp.open("GET",url,true);
  xhttp.send();
}

/*
 * YH so far not used..
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
  //var menuGroup = this.menuGroup.maps;    
  const mapsMenuItem = this.menuObj.mainItems['Maps'].content;

  // params for sub items under each cell entry in Maps

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
      userData : mapname // userDate originally lol
    }
  };

  // for the eye icon next to "Remarks" in Maps
  // (after clicking on a loaded cell)
  var remarksparams = {
    userButton:{
      //visible: false,
      imgSrc: 'images/visible.png',
      // see also loadMap in MapViewer, in the remarks.forEach(...)
      // which sets remarks to be visible by default
      // TODO make clear there's global visible setting too
      //onCreate : function(image){
      //  image.src = 'images/visible.png'; // YH orig hidden.png
      //},
      // mapname is cell name..
      onClick : function(image,mapname){ // YH modelName -> mapname
        if (self.viewer.maps[mapname].remarks.length === 0) {
          console.log('no remarks');
          return;
        }

        // it is unclear where params.remarks is defined
        // it seems it is automatically initialized to false?
        // whatever it is, bad practice to hard code default values
        // that depend on each other
        //self.viewer._toggleRemarks(mapname);
        //var visible = self.viewer.maps[mapname].params.remarks;
        //image.src = visible ? 'images/hidden.png' : 'images/visible.png';
        //self.viewer.maps[mapname].params.remarks = !visible;

        // better to rely directly on the THREE object
        self.viewer._toggleRemarks(mapname);
        var visible = self.viewer.maps[mapname].remarks[0].visible;
        image.src = visible ? 'images/visible.png' : 'images/hidden.png';
      },
      title : 'Show/Hide remarks',
      userData : mapname
    }
  };

  // YH rewriting of Remarks
  //var objRemarksParams = {
  //  userButton:{
  //    visible: true,
  //    onCreate : function(image){
  //      image.src = 'images/visible.png';
  //    },
  //    onClick : function(image,mapname){
  //      self.viewer._toggleObjRemarks(mapname);
  //      var visible = self.viewer.maps[mapname].params.remarks;
  //      image.src = visible ? 'images/hidden.png' : 'images/visible.png';
  //      self.viewer.maps[mapname].params.remarks = !visible;
  //    },
  //    title : 'Show/Hide remarks',
  //    userData : mapname
  //  }
  //};

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

  // see Importers in apps/include/importers.js
  menuObj.AddSubItem(mapsMenuItem,mapname,{
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
        //menuObj.AddSubItem(content,'Remarks',objRemarksParams);
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
      //visible : true, // is not even used..
      imgSrc: 'images/visible.png',
      //onCreate : function(image){
      //  image.src = 'images/visible.png';
      //},
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
 * adds the Neuron and Muscles entries in the Cell Selector Dialog
 * name = Neurons or Muscles
 * called by NeuronSelectorDialog, i.e. when click on 'Select neuron'
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

  // name is Neurons or Muscles, not cell name..
  // 'select' class adds highlighting to cell entry
  //const myDiv = document.getElementById(name)
  //                      .querySelector('.selectCell');
  //myDiv.click(function () {
  $("div#"+name+" > .selectCell").click(function () {
    self.selectedNeurons[name][this.id].visible = 
      (self.selectedNeurons[name][this.id].visible==1)?0:1;
    $(this).toggleClass("select");
  });

  // used when cell loaded from urlParams..
  // bad because if switch to different series and back,
  // this info would disappear
  // should use this.data as well!
  for (var i in this.selectedNeurons[name]){
    if ( this.selectedNeurons[name][i].visible == 1
        || this.data.hasOwnProperty(i) ) {
      $("div#"+i).toggleClass("select", true);
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

/*
 * Generates the menu to the left of the viewer
 * the menu is structured into several items(divs),
 * each created and returned by AddDefaultGroup
 *
 * all the action happens at the end of the function
 */
ImporterApp.prototype.GenerateMenu = function()
{
  var self = this;
  // sent to ImporterMenu in apps/include/importers.js
  // AddDefaultGroup returns the HTML element
  //function AddDefaultGroup(menu, name, visible=false) {
  //  var group = menu.AddGroup(name, {
  //    openCloseButton : {
  //      visible : visible,
  //      open : 'images/opened.png',
  //      close : 'images/closed.png',
  //      title : 'Show/Hide ' + name
  //    }
  //  });
  //  return group;
  //};

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

  // menu item that displays synapse info when mouse hovers over synapse
  // this is achieved by emitting an event
  // (using THREEx.DomEvents library)
  // elems here have id which the callback uses to identify and update
  // (see MapViewer.addOneSynapse)
  function AddSynapseInfo(parent){
    var synElems = {
      'cellname':'Cell: ',
      'syntype':'Synapse type: ',
      'synsource':'Source: ',
      'syntarget':'Target: ',
      'synweight':'# EM sections: ',
      'synsection':'Sections: ',
      'syncontin':'Synapse Id/Contin number: '
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

    // YH adding button to see synapse viewer
    const synViewerBtn = document.createElement('button');
    synViewerBtn.innerHTML = 'Details (EM Viewer)';
    synViewerBtn.onclick = () => {
      const cellname = document.getElementById('cellname').innerHTML;
      const db = document.getElementById('series-selector').value;
      const syncontin = document.getElementById('syncontin').innerHTML;
	    const url = `../synapseViewer/?neuron=${cellname}&db=${db}&continNum=${syncontin}`;
      // note url is relative to floatingdialog.js...
      self.InfoDialog(url,'Synapse viewer');
    };
    parent.appendChild(synViewerBtn);
  };

  function AddSynapseFilter(parent){
    var filterChecks = document.createElement('div');
    filterChecks.id = 'synfiltercheck';
    var _filters = {
      'Presynaptic':'Pre.',
      'Postsynaptic':'Post.',
      'Gap junction':'Gap'
    };
    for (var i in _filters){
      var label = document.createElement('label');
      var chkbx = document.createElement('input');
      chkbx.type = 'checkbox';
      chkbx.className = 'synfilter';
      chkbx.id = i;
      
      label.appendChild(chkbx);
      //label.innerHTML = _filters[i];
      label.appendChild(document.createTextNode(_filters[i]));
      filterChecks.appendChild(label);
    };
    parent.appendChild(filterChecks);

    const filterDialog = document.createElement('div');
    filterDialog.id = 'synfiltercellsdialog';

    const filterDialogLabel = document.createElement('label');
    filterDialogLabel.appendChild(document.createTextNode('Cells: '));

    const filterText = document.createElement('input');
    filterText.type = 'text';
    filterText.id = 'synfiltercells';

    filterDialogLabel.appendChild(filterText);
    filterDialog.appendChild(filterDialogLabel);
    parent.appendChild(filterDialog);

    // buttons for filtering by cells
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
      }
      for (var i in _filters){
        if (document.getElementById(i).checked){
          self.viewer.toggleSynapseByType(i,bool=true,cells=cells);
        }
      }
    };
    var restoreBtn = document.createElement('button');
    restoreBtn.innerHTML = 'Restore';
    restoreBtn.className = 'filterButton';
    restoreBtn.onclick = function(){
      document.getElementById('synfiltercells').value=null;
      self.viewer.toggleAllSynapses(true);
    };
    parent.appendChild(filterBtn);
    parent.appendChild(restoreBtn); 


    // filter by synapse ids/contin numbers
    var filterContinDialog = document.createElement('div');
    filterContinDialog.id = 'synfiltercellsdialog';
    var filterContinDialogLabel = document.createElement('label');
    filterContinDialogLabel.appendChild(
      document.createTextNode('Synapse Id(s): '));
    var filterContinText = document.createElement('input');
    filterContinText.type = 'text';
    filterContinText.id = 'synfiltercontins';
    filterContinDialogLabel.appendChild(filterContinText);
    filterContinDialog.appendChild(filterContinDialogLabel);
    parent.appendChild(filterContinDialog); 

    // buttons for filtering by synapse ids
    var filterBtn = document.createElement('button');
    filterBtn.innerHTML = 'Filter';
    filterBtn.className = 'filterContinButton';
    filterBtn.onclick = function(){
      self.viewer.toggleAllSynapses(false);
      const contins = document.getElementById('synfiltercontins').value;
      if (contins != ""){
        continList = contins.split(',');
        continList.forEach( contin => {
          self.viewer.toggleSynapseContin(contin);
        });
      }
      //else {
      //  contins = null;
      //}
      //  
      //if (contins != null){
      //  console.log(contins);
      //  for (var i in contins){
      //    self.viewer.toggleSynapseContin(contins[i]);
      //  }
      //}
    };
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

  // callback expects no arguments
  // (usage: application of viewer.toggleRemarks or toggleAxes)
  function AddToggleButton(parent,onText,offText,isOn,callback){
    var remarkBtn = document.createElement('button');
    remarkBtn.innerHTML = isOn ? onText : offText;
    remarkBtn.value = isOn;
    remarkBtn.className = 'filterbutton';
    //remarkBtn.id = 'remarkBtn';
    remarkBtn.onclick = function() {
      isOn = !isOn;
      this.innerHTML = isOn ? onText : offText;
      callback();
    };
    parent.appendChild(remarkBtn);
  };

  //add menu on the left
  //in apps/include/importers.js
  const menu = document.getElementById('menu');
  this.menuObj = new ImporterMenu(menu);
  
  this.menuGroup['maps'] =
      this.menuObj.AddDefaultGroup('Maps',visible=true);

  this.menuGroup['series-selector'] =
      this.menuObj.AddDefaultGroup('Series selector',visible=true);
  AddSexSelector(this.menuObj,this.menuGroup['series-selector'],'Sex');
  AddSeriesSelector(this.menuObj,this.menuGroup['series-selector'],'Series');

  this.menuGroup['synapse-info'] =
      this.menuObj.AddDefaultGroup('Synapse info',visible=true);
  AddSynapseInfo(this.menuGroup['synapse-info']);


  this.menuGroup['synapse-filter'] =
      this.menuObj.AddDefaultGroup('Synapse filter',visible=true);
  AddSynapseFilter(this.menuGroup['synapse-filter']);

  this.menuGroup['map-translate'] =
      this.menuObj.AddDefaultGroup('Map translate',visible=true);
  AddMapTranslate(this.menuGroup['map-translate'],AddSlider,
    function(x,y,z){self.viewer.translateMaps(x,y,z);});

  this.menuGroup['comments'] =
      this.menuObj.AddDefaultGroup('Comments',visible=true);

  AddToggleButton(this.menuGroup['comments'],
    'Hide Grid', 'Show Grid', true,
    () => { self.viewer.toggleGrid(); });

  AddToggleButton(this.menuGroup['comments'],
    'Hide Axes', 'Show Axes', true, // used to be Axes ON, Axes OFF
    () => { self.viewer.toggleAxes(); });

  // see maps[..].remarks in MapViewer.loadMap
  AddToggleButton(this.menuGroup['comments'],
    'Hide Remarks', 'Show Remarks', false, // used to be Remarks ON/OFF
    () => { self.viewer.toggleRemarks(); } );

  // YH
  AddToggleButton(this.menuGroup['comments'],
    'Hide Synapse Labels', 'Show Synapse Labels', false,
    () => {self.viewer.toggleAllSynapseLabels();});

  // YH
  this.menuGroup['load-save'] =
      this.menuObj.AddDefaultGroup('Load/Save',visible=true);
  this.AddLoadSave();
};

// translation = {x: .., y: .., z: ..}
ImporterApp.prototype.SetMapsTranslate = function(translation) {
  console.log('translation: ', translation);

  const xEl = document.getElementById('x-slider');
  const yEl = document.getElementById('y-slider');
  const zEl = document.getElementById('z-slider');

  xEl.value = translation.x;
  yEl.value = translation.y;
  zEl.value = translation.z;

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


/*
 * YH
 *
 * @param {Object} info - synapse info,
 * should be of the form this.synapseInfoClicked
 * (or inferred from code below..)
 */
ImporterApp.prototype.UpdateSynapseInfo = function(info) {
  document.getElementById('cellname').innerHTML = info.cellname;
  document.getElementById('syntype').innerHTML = info.syntype;
  document.getElementById('synsource').innerHTML = info.synsource;
  document.getElementById('syntarget').innerHTML = info.syntarget;
  document.getElementById('synweight').innerHTML = info.synweight;
  document.getElementById('synsection').innerHTML = info.synsection;
  document.getElementById('syncontin').innerHTML = info.syncontin;
};

// returns Synapse Info to last clicked synapse
ImporterApp.prototype.RestoreSynapseInfo = function() {
  const info = this.synapseInfoClicked;
  this.UpdateSynapseInfo(info);
};

// update clicked synapse and the synapse info panel
ImporterApp.prototype.UpdateClickedSynapseInfo = function(info) {
  Object.assign(this.synapseInfoClicked, info); // copy
  this.UpdateSynapseInfo(info);
}
