/*
 * ImporterMenu class from apps/include/importers.js
 * note confusing terminology, series can refer to database N2U etc
 * or also the regions of the worm, VC, NR etc..
 *
 * expect some libraries:
 * apps/include/floatingdialog.js - for FloatingDialog class
 *
 * css used: /css/importer.css
 *
 * note to self: viewer must be initialized after GenerateMenu()
 * because it needs references to the menu items...
 *
 * @param {Object} params - stuff from url
 * (e.g. when clicking on neuron from the Interactive Diagram,
 * opens the link https://wormwiring.org/apps/neuronMaps/?cell=RMDDR&sex=herm&db=N2U )
 *  this was preprocessed in build_neuronMaps.js
 *
 *
 * Resizing:
 * we added an event listener for 'resizeAll' to document
 * which calls the Reisze method
 * e.g. used by navigation collapsing
 *
 *
 * finally changed selectedNeurons to cellsInSlctdSrs 
 * cellsInSlctdSrs is just two arrays
 * (leave the walink, visied, plotted stuff to elsewhere)
 */


// requires /apps/include/cellLists.js, wa_link.js
if (celllistByDbType === undefined) {
  console.error('expect cellLists.js');
}
if (cellnameWALinkDict === undefined
    || cellnameToWALink === undefined) {
  console.error('expect wa_link.js');
}

if (helpDialogItems === undefined) {
  console.error('expect helpDialogItems.js');
}

ImporterApp = function (params)
{
  this.params = params;
  this.db = this.GetSeriesFromHTML();
  this.validCells = []; //used by GetCellDisplay()

  // cellsInSlctdSrs are cells in selected db/series
  // appear in the cell selector dialog
  // { neuron: [...], muscle: [...] }
  this.cellsInSlctdSrs = celllistByDbType[this.db];

  // starting value of the Synapse Info section
  // will be updated when a synapse is clicked
  // see AddSynapseInfo for more
  this.defaultSynapseInfo = {
    cellname: '---',
    syntype: '---',
    synsource: '---',
    syntarget: '---',
    synweight: '---',
    synsection: '---',
    syncontin: '---',
    synposition: '---',
  }
  this.synapseInfoClicked = Object.assign({}, this.defaultSynapseInfo);
  this.synapseClicked = { cellname: null, contin: null };

  // but wait, there's more...
  // many more members defined in Init()

  // object dealing with the viewer inside canvas
  this.viewer = null; // initialized properly in Init()

  // the small floating window in which
  // help/selector/2Dviewer/synapseviewer is shown
  this.dialog = new FloatingDialog();
};


/*
 * most of the HTML is already there
 * (unlike in the original importerapp.js)
 * Init() adds functionality to stuff
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

  const canvas = this.GetCanvasElem();
  
  //this.GenerateMenu();
  
  this.viewer = new MapViewer(canvas, {
    app: this, // YH so viewer can refer back
  });
  this.viewer.initGL();
  
  //const resizeWindow = function(){
  //  viewer.resizeDisplayGL();
  //};
    
  this.Resize();

  var render = function(){
    requestAnimationFrame(render);
    // TODO make animating/pausing part of MapViewer class
    self.viewer.render();
  };
  render();
  
  if (this.PreloadParamsLoaded()){
    this.PreloadCells2();
  }

  window.addEventListener('resize', () => {
    self.Resize();
    //resizeWindow();
  },false);

  document.addEventListener('loadMapComplete', (ev) => {
    console.log(`${ev.detail} loaded into viewer`);
  });

  document.addEventListener('resizeAll', (ev) => {
    self.Resize();
  });
  
  this.LinkFunctionalityWithHTML();
};

/*
 * making the buttons and menu work
 */
ImporterApp.prototype.LinkFunctionalityWithHTML = function() {
  const self = this;

  // set up the top menu, Help, cell selector etc.
  const topElem = document.getElementById ('top');
  const topItems = topElem.children;
  topItems[0].onclick = () => { this.OpenHelpDialog(); };
  topItems[1].onclick = () => { this.CellSelectorDialog(); };
  topItems[2].onclick = () => { this.Open2DViewer(); };
  topItems[3].onclick = () => { this.ClearMaps(); };

  // create menu items' accordian behaviour
  const menuSections = Array.from(
    document.getElementsByClassName('accordianSection')
  );
  menuSections.forEach( el => {
    // expect exactly two children - with classes
    // sectionTitle, sectionContent - in that order
    // state of open/close stored in presence/absence
    // of class active/inactive in title
    const title = el.children[0];
    const content = el.children[1];
    title.onclick = () => {
      const active = title.classList.contains('active')
                  || !title.classList.contains('inactive');
      content.style.display = active ? 'none' : 'block';
      title.classList.toggle('active', !active);
      title.classList.toggle('inactive', active);
    };
  });


  // link series-selector to this.db and this.cellsInSlctdSrs
  // make the HTML the source/"ground truth" for db value
  const seriesSelector = this.GetSeriesElem();
  this.SetSeriesInternal(seriesSelector.value);
  seriesSelector.onchange = () => {
    const newDb = self.GetSeriesFromHTML();
    self.SetSeriesInternal(newDb);
  };

  // link synapse filter, add button functionality
  const synFilterBtnFilter = document.getElementById('synFilterBtnFilter');
  synFilterBtnFilter.onclick = () => {
    const synFilterTypeNodes = document.querySelectorAll(`input[name='synFilterType']:checked`);
    let typesSelected = [];
    synFilterTypeNodes.forEach( nn => {
      typesSelected.push(nn.value);
    });

    const synFilterCells = document.getElementById('synFilterCells');
    let cells = synFilterCells.value.split(',');
    // TODO clean spaces, make case insensitive

    const synFilterContins = document.getElementById('synFilterContins');
    let continsStr = synFilterContins.value.split(',');
    let contins = [];
    for (const cStr of continsStr) {
      let c= parseInt(cStr);
      if (!isNaN(c))
        contins.push(c);
    }

    // TODO make mapViewer respond
    console.log(typesSelected, cells, contins);
  };

  // Restore
  const synFilterBtnRestore = document.getElementById('synFilterBtnRestore');
  synFilterBtnRestore.onclick = () => {
    const synFilterTypeNodes = document.querySelectorAll(`input[name='synFilterType']:checked`);
    synFilterTypeNodes.forEach( nn => {
      nn.checked = false;
    });

    const synFilterCells = document.getElementById('synFilterCells');
    synFilterCells.value = '';

    const synFilterContins = document.getElementById('synFilterContins');
    synFilterContins.value = '';

    //TODO make mapViewer respond
  };


  // link Translate Maps sliders
  // give all three sliders same response to change:
  // set the shown value and apply viewer.translateMapsTo
  function MapsTranslateSliderOnChange() {
    const pos = { x: 0, y: 0, z: 0 };
    for (const i of ['x','y','z']) {
      const slider = document.getElementById(i+'-slider');
      const span = document.getElementById(i+'-slider-show-value');
      const val = parseInt(slider.value);
      span.innerHTML = val;
      pos[i] = val;
    }
    self.viewer.translateMapsTo(pos.x,pos.y,pos.z);
  };
  for (const i of ['x','y','z']) {
    console.log(i+'-slider');
    const slider = document.getElementById(i+'-slider');
    slider.onchange = MapsTranslateSliderOnChange;
    slider.oninput = slider.onchange;
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
  const main_this = this;

  const input = document.getElementById('LoadFromFileInput');
  const file = new FileReader();
  if (input === null)
    return;
  file.readAsText(input.files[0]);

  file.onloadend = function(ev) {
    // read data is in this.result
    const data = JSON.parse(this.result);

    // update the series selector in menu
    main_this.SetSeriesToHTML(data.db);

    // wait for cellsInSlctdSrs[group][cell] to have the attributes:
    // -walink
    // -visible
    // -plotted
    function LoadMapMenuWhenReady(cell) {
      if (!main_this.cellsInSlctdSrs.Neurons.hasOwnProperty(cell)
        && !main_this.cellsInSlctdSrs.Muscles.hasOwnProperty(cell)) {
        setTimeout(() => LoadMapMenuWhenReady(cell), 200);
        return;
      }
      var group = 'Neurons';
      if (!main_this.cellsInSlctdSrs[group].hasOwnProperty(cell)) {
        group = 'Muscles';
      }
      if (!main_this.cellsInSlctdSrs[group][cell].hasOwnProperty('walink')
        || !main_this.cellsInSlctdSrs[group][cell].hasOwnProperty('visible')
        || !main_this.cellsInSlctdSrs[group][cell].hasOwnProperty('plotted')) {
        setTimeout(() => LoadMapMenuWhenReady(cell), 200);
        return;
      }
      main_this.LoadMapMenu(cell, main_this.cellsInSlctdSrs[group][cell].walink);
      main_this.cellsInSlctdSrs[group][cell].visible = 1;
      main_this.cellsInSlctdSrs[group][cell].plotted = 1;
    }

    // expect data.sqlData and data.mapsSettings have same keys
    for (const cell in data.sqlData) {
      main_this.data[cell] = data.sqlData[cell];
      main_this.viewer.loadMap(main_this.data[cell]);
      // update color (viewer.loadMap is sync, so this is OK)
      main_this.viewer.setColor(
        cell,
        data.mapsSettings[cell].color
      );
      LoadMapMenuWhenReady(cell);
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
 * TODO give expected format
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

// recall that the params here are a bit different from
// those given in url;
// see build_neuronMaps.js for how it was preprocessed
ImporterApp.prototype.PreloadParamsLoaded = function() {
  return 'cell' in this.params
      && 'db' in this.params
      && 'sex' in this.params;
};

// loads cell given in url
// new method, gets cell lists from a JS file
ImporterApp.prototype.PreloadCells2 = function()
{
  const db = this.params.db;
  const cell = this.params.cell;

  // update the series selector in menu
  this.SetSeriesToHTML(db);
  this.SetSeriesInternal(db);
  //this.cellsInSlctdSrs = celllistByDbType[db];

  this.LoadMap2(db,cell);
  this.LoadMapMenu2(cell);
};


// old method of preloading cell
ImporterApp.prototype.PreloadCells = function()
{
  var self = this;
  this.LoadMap(this.params.db,this.params.cell);

  // update the series selector in menu
  this.SetSeriesToHTML(this.params.db);

  const xhttp = new XMLHttpRequest();    
  const url = `../php/selectorCells.php?sex=${this.params.sex}&db=${this.params.db}`;
  console.log(`PreloadCell getting selectorCells from url ${url}`);
  xhttp.onreadystatechange = function(){
    if (this.readyState == 4 && this.status == 200){
      self.cellsInSlctdSrs = JSON.parse(this.responseText);
      for (var group in self.cellsInSlctdSrs){
        if (self.params.cell in self.cellsInSlctdSrs[group]){
          self.cellsInSlctdSrs[group][self.params.cell].visible = 1;
          self.cellsInSlctdSrs[group][self.params.cell].plotted = 1;
          self.LoadMapMenu(self.params.cell,
            self.cellsInSlctdSrs[group][self.params.cell].walink);
        }
      }
    }
  };
    
  xhttp.open("GET",url,true);
  xhttp.send(); 
};



ImporterApp.prototype.OpenHelpDialog = function()
{
  this.dialog.Open({
    className: 'dialog',
    title : 'Help',
    buttons : [
      {
        text : 'close',
        callback : function (dialog) {
          dialog.Close();
        }
      }
    ],
  });

  const contentDiv = this.dialog.GetContentDiv();
    
  const panelGroup = document.createElement('div');
  //panelGroup.id = 'accordion'; where used?
  panelGroup.classList.add('panel-group');
  // panel-group is from bootstrap.css
  for (const helpItem of helpDialogItems) {
    this.AddHelpPanel(panelGroup,helpItem);
  }
  contentDiv.appendChild(panelGroup);
}

/*
 * adds a help entry defined by params
 * to the 'parent' element
 * HTML:
 *  <div> // panel --> added to parent by appendChild
 *    <div> // panelHeader
 *      <div> // panelTitle
 *        <div> // panelA
 *          params.title (e.g. Quick Start)
 *        </div>
 *      </div>
 *    </div>
 *    <div> // panelCollapse, the main content
 *      <div> // panelBody - text
 *      </div>
 *      <iframe> // panelIFrame - for video
 *      </iframe>
 *    </div>
 *  </div>
 */
ImporterApp.prototype.AddHelpPanel = function(parent,params)
{
  var panel = document.createElement('div');
  panel.classList.add('panel','panel-default');

  var panelHeader = document.createElement('div');
  panelHeader.classList.add('panel-heading');

  var panelTitle = document.createElement('h4');
  panelTitle.classList.add('panel-title');

  var panelA = document.createElement('a');
  panelA.classList.add('accordion-toggle');
  panelA.setAttribute('data-toggle','collapse');
  panelA.setAttribute('data-parent','#accordion');
  panelA.href = '#' + params.name;
  panelA.innerHTML = params.title;

  panelTitle.appendChild(panelA);
  panelHeader.appendChild(panelTitle);
  panel.appendChild(panelHeader);

  var panelCollapse = document.createElement('div');
  //panelCollapse.id = params.name;
  panelCollapse.classList.add('panel-collapse','collapse');
  if (typeof params.text !== "undefined"){
    var panelBody = document.createElement('div');
    panelBody.classList.add('panel-body');
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

ImporterApp.prototype.OpenInfoDialog = function(url,title)
{
  console.log(`opening info dialog for ${url}`);
  this.dialog.Open ({
    className: 'infoFrame',
    title : title,
    //text : dialogText,
    buttons : [{
        text : 'close',
        callback : function (dialog) {
          dialog.Close();
        }
    }]
  });

  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.id = 'infoFrame';
  const contentDiv = this.dialog.GetContentDiv();
  contentDiv.appendChild(iframe);
}


/*
 * loads, creates neuron selector dialog when click 'Select neuron'
 * for neurons that are selected, calls LoadMaps,
 * which sends request to php for the neuron data,
 * skeleton, synapses etc
 *
 * old: NeuronSelectorDialog
 *
 * now using LoadMap2 instead of LoadMap
 */
ImporterApp.prototype.CellSelectorDialog = function()
{
  const self = this;
  this.dialog.Open({
    className: 'cell-selector',
    title : 'Cell Selector',
    //text : dialogText,
    buttons : [{
      // loads selected cells (indicated by visible=1,plotted=0)
      text : 'load',
      callback : function (dialog) {
        const series = self.GetSeriesFromHTML();
        const selectedCells = Array.from(
          document.getElementsByClassName('cellDiv cellDivSelected')
        );
        selectedCells.forEach( el => {
          const cell = el.value;
          self.LoadMap2(series,cell);
          self.LoadMapMenu(cell,cellnameToWALink(cell));
        });
        //for (const celltype in self.cellsInSlctdSrs){
        //  for (const cell of self.cellsInSlctdSrs[celltype]){
        //    if (!self.viewer.maps.hasOwnProperty(cell)) {
        //      console.log(cell,cellnameToWALink(cell));
        //      //self.LoadMap2(series,cell);
        //      //self.LoadMapMenu(cell,cellnameToWALink(cell));
        //    }
        //  }
        //}
        self.dialog.Close();
      }
    }, {
      text : 'close',
      callback : function (dialog) {
        self.dialog.Close();
      }
    }
    ]
  });

  //adds cells from selected database to the dialog
  const contentDiv = this.dialog.GetContentDiv();
  for (const celltype in this.cellsInSlctdSrs){
    contentDiv.appendChild(this.AddSelectPanel(celltype));
  }
};

/*
 * loads, creates 2D viewer in floating dialog
 */
ImporterApp.prototype.Open2DViewer = function()
{
  const self = this;
  this.dialog.Open({
    //className: '',
    title : '2DViewer',
    buttons : [{
      text : 'close',
      callback : function(dialog) {
        self.dialog.Close();
      }
    }],
  });

  const contentDiv = this.dialog.GetContentDiv();
  this.viewer.load2DViewer(contentDiv);
};

ImporterApp.prototype.ClearMaps = function() {
  //const menuMaps = this.menuGroup['maps'];
  const menuMaps = this.menuObj.mainItems['Maps'].content;
  while(menuMaps.lastChild){
    menuMaps.removeChild(menuMaps.lastChild);
  };
  this.viewer.clearMaps();

  this.data = {};

  for (var group in this.cellsInSlctdSrs){
    for (var i in this.cellsInSlctdSrs[group]){
      //if (this.cellsInSlctdSrs[group][i].visible == 1){
      this.cellsInSlctdSrs[group][i].visible = 0;
      //}
    }
  }
}

/*
 * calls php to ask mysql for synapses and stuff
 * and loads it to viewer by its method loadMap
 * @param {string} mapname: neuron/muscle name that we want
 * @param {string} db: database from which to select
 *
 * does not create entry in menu on the left,
 * that's handled by LoadMapMenu (see CellSelectorDialog)
 *
 * I don't like how neurons, and all it's traces, positions etc
 * are stored twice, once in ImporterApp (.data)
 * and another time in mapViewer.
 * Store it once!
 *
 * after loadMap into viewer, center view on neuron
 *
 * YH
 * modified retrieve_trace_coord.php to return
 * some data about OBJ_Remarks
 * also added emitting event when loaded
 */
ImporterApp.prototype.LoadMap = function(db,mapname)
{
  var self = this;
  console.log(db + ', ' + mapname);
  var url = '../php/retrieve_trace_coord.php?neuron='+mapname+'&db='+db;
  console.log('retrieving skeleton map via '+url);
  var xhttp = new XMLHttpRequest();    
  console.time(`Retrieve ${mapname}`);
  xhttp.onreadystatechange = function(){
    if (this.readyState == 4 && this.status == 200){
      console.timeEnd(`Retrieve ${mapname}`);
      console.time(`Load to viewer ${mapname}`);

      //console.log(this.responseText);

      self.data[mapname] = JSON.parse(this.responseText);
      self.viewer.loadMap(self.data[mapname]);
      // (also translates cell by slider data)

      // put these into loadMap since that's sync
      //self.viewer.translateOneMapsToThisPos(mapname);
      //self.viewer.SetCameraTarget(self.viewer.GetAveragePosition(mapname));

      console.timeEnd(`Load to viewer ${mapname}`);

      // YH maybe don't need this
      document.dispatchEvent(new CustomEvent('loadMapComplete', {
        detail: mapname,
      }));
    }
  };
  xhttp.open("GET",url,true);
  xhttp.send();
}


/*
 * better version of LoadMap
 * calls retrieve_trace_coord_alt.php
 * which returns data in terms of object numbers
 *
 * @param {String} db - name of database
 * @param {String} cell - name of cell
 */
ImporterApp.prototype.LoadMap2 = function(db,cell)
{
  const main_this = this;
  const url = `../php/retrieve_trace_coord_alt.php?db=${db}&cell=${cell}`;
  console.log('retrieving skeleton map via '+url);
  const xhttp = new XMLHttpRequest();    
  console.time(`Retrieve ${cell}`);
  xhttp.onreadystatechange = function(){
    if (this.readyState == 4 && this.status == 200){
      //console.timeEnd(`Retrieve ${cell}`);
      //console.time(`Load to viewer ${cell}`);

      //console.log(this.responseText);
      let data = JSON.parse(this.responseText);
      main_this.viewer.loadMap2(data);
      data = {};
      // some of loadMap2 might take stuff
      // from data by reference,
      // so set to {} to avoid affecting that

      //console.timeEnd(`Load to viewer ${cell}`);

      //// YH maybe don't need this
      //document.dispatchEvent(new CustomEvent('loadMapComplete', {
      //  detail: cell,
      //}));
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


/*
 * loads menu entry for cell in 'Maps'
 * @param {String} cellname - name of cell
 *
 * each cell entry should be of the form:
 *  <div> // div
 *    <div>Cellname</div> // title
 *    <div> // content
 *      <button>Color</button>
 *      <button>Show Remarks</button>
 *      <button>WormAtlas</button>
 *      <button>Synaptic Partners</button>
 *      <button>Synaptic List</button>
 *    </div>
 *  </div>
 */
ImporterApp.prototype.LoadMapMenu2 = function(cellname)
{
  const self = this;
  const mapsContentDiv = this.GetMapsContentDiv();

  const div = document.createElement('div');
  const title = document.createElement('div');
  const content = document.createElement('div');

  mapsContentDiv.appendChild(div);
  div.appendChild(title);
  div.appendChild(content);

  const colorBtn = document.createElement('button');
  const colorDiv = document.createElement('div');
  const remarksBtn = document.createElement('button');
  const walinkBtn = document.createElement('button');
  const parterListBtn = document.createElement('button');
  const synapseListBtn = document.createElement('button');

  content.appendChild(colorBtn);
  content.appendChild(colorDiv);
  content.appendChild(remarksBtn);
  content.appendChild(walinkBtn);
  content.appendChild(parterListBtn);
  content.appendChild(synapseListBtn);

  // structure done,
  // now we customize the stuff/buttons
  title.innerHTML = cellname;

  // add accordian functionality
  // same as in LinkFunctionalityWithHTML
  div.classList.add('accordianSection');
  title.classList.add('sectioinTitle');
  title.classList.add('inactive'); // default content hidden
  content.classList.add('sectionContent');
  content.style.display = 'none'; // default content hidden

  title.onclick = () => {
    const active = title.classList.contains('active')
                || !title.classList.contains('inactive');
    content.style.display = active ? 'none' : 'block';
    title.classList.toggle('active', !active);
    title.classList.toggle('inactive', active);
  };

  colorBtn.innerHTML = 'Set Color';
  colorBtn.value = 'close';
  colorDiv.style.display = 'none';
  colorBtn.onclick = () => {
    const isOpen = colorBtn.value === 'close' ? false : true;
    if (isOpen) {
      // perform close, delete everything in colorDiv
      colorBtn.value = 'close';
      colorDiv.style.display = 'none';
      while(colorDiv.lastChild){
        colorDiv.removeChild(colorDiv.lastChild);
      };
      return;
    }
    // perform open, create color input
    colorBtn.value = 'open';
    colorDiv.style.display = 'block';

    if (!self.viewer.isCellLoaded(cellname)) {
      colorDiv.innerHTML = 'Cell not loaded';
      return;
    }

    const colorInput = document.createElement('input');
    colorDiv.appendChild(colorInput);

    // class no CSS, but used below
    colorInput.classList.add('colorSelector');
    colorInput.type = 'color';

    // get color of cell, transform to appropriate format
    let {r, g, b} = self.viewer.getColor(cellname);
    r = Math.round(255*r);
    b = Math.round(255*b);
    g = Math.round(255*g);
    let rgb = b | (g << 8) | (r << 16);
    let hex = '#' + rgb.toString(16);

    colorInput.setAttribute('value',hex);
    colorInput.spectrum({
      preferredFormat: "rgb",
      showInput: true,
      move: function(color){
        const {r, g, b} = color.toRgb();
        self.viewer.setColor(cellname, {r:r/255., g:g/255., b:b/255.});
      },
    });
  };

  // do remarks
  const remarkVis = this.viewer.isCellLoaded(cellname) ?
    this.viewer.GetRemarkVis(cellname) : false;
  remarksBtn.innerHTML = !remarkVis ? 'Hide Remarks' : 'Show Remarks';
  remarksBtn.onclick = () => {
    const remarkVis = self.viewer.isCellLoaded(cellname) ?
      self.viewer.GetRemarkVis(cellname) : false;
    remarksBtn.innerHTML = !remarkVis ? 'Hide Remarks' : 'Show Remarks';
    self.viewer.toggleRemarksByCell(cellname, !remarkVis);
  };

  // WormAtlas link
  walinkBtn.innerHTML = 'WormAtlas';
  walinkBtn.onclick = () => {
    const url = cellnameToWALink(cellname);
    self.OpenInfoDialog(url, 'WormAtlas');
  };

  // Synaptic Partners
  parterListBtn.innerHTML = 'Synaptic Parters';
  parterListBtn.onclick = () => {
    const series = self.GetSeriesFromHTML();
    const url = `../partnerList/?continName=${cellname}&series=${series}`;
    self.OpenInfoDialog(url,'Synaptic Partners');
  };

  // Synapse List
  synapseListBtn.innerHTML = 'Synapse List';
  synapseListBtn.onclick = () => {
    const series = self.GetSeriesFromHTML();
    const url = `../synapseList/?continName=${cellname}&series=${series}`;
    self.OpenInfoDialog(url,'Synapse List');
  };
};

/*
 * params.visDefault:
 * TODO maybe useless
 */

ImporterApp.prototype.CreateButton = function(params) {
  menuContent = document.createElement ('div');
  menuContent.className = 'menugroup';
  menuContent.style.display = params.visible ?
      'block' : 'none';

  // set button image/character
  // currently not in use to avoid browser support issues
  //if (params.open.length <= 1) {
  //  // unicode character as image (typically arrow)
  //  // also asssumes that if using this option (i.e. no image)
  //  // then both open and close are like that
  //  image = document.createElement('div');
  //  image.style.display = 'inline';
  //  image.innerHTML = params.visible ?
  //      params.open : params.close;
  //}
  //else {
  image = document.createElement('img');
  image.className = 'menubutton';
  image.title = params.title;
  image.src = params.visible ?
      params.open : params.close;
  //}
  image.onclick = function () {
    // close to open
    if (menuContent.style.display == 'none') {
      menuContent.style.display = 'block';
      //if (this.nodeName === 'DIV') { // if use unicode for image
      //  this.innerHTML = params.open;
      //} else {
      this.src = params.open;
      //}
      if (params.onOpen !== undefined
          && params.onOpen !== null) {
        params.onOpen(menuContent);
            //params.userData);
      }
    } else { // open to close
      menuContent.style.display = 'none';
      //if (this.nodeName === 'DIV') { // if use unicode for image
      //  this.innerHTML = params.close;
      //} else {
      this.src = params.close;
      //}
      //onClose is never used/given in params!
      //if (params.onClose !== undefined
      //    && params.onClose !== null) {
      //  params.onClose(menuContent,
      //      params.userData);
      //}
    }
  };
  
  menuText.onclick = image.onclick;
  menuText.style.cursor = 'pointer';
  menuText.style.display = 'inline';
};


/*
 * adapted from ImporterMenu.AddSubItem
 * TODO maybe useless
 */
ImporterApp.prototype.AddSubItem = function(parent, name, parameters)
{
  // just for cutting displaying width
  function GetTruncatedName (name) {
    var maxLength = 20;
    if (name.length > maxLength) {
      return name.substr (0, maxLength) + '...';
    }
    return name;
  }

  // one big div containing the menuItem and menuContent divs
  const menuBigDiv = document.createElement('div');
  menuBigDiv.className = 'menuBigDiv';
  parent.appendChild(menuBigDiv);

  // div that will hold the buttons and menuText
  const menuItem = document.createElement ('div');
  menuItem.className = 'menuitem';
  menuBigDiv.appendChild(menuItem);

  const menuText = document.createElement ('div');
  menuText.className = 'menuitem';
  menuText.innerHTML = GetTruncatedName (name);
  menuText.title = name;
  menuItem.appendChild(menuText);

  var menuContent = null;
  var openCloseImage = null;
  var userImage = null;
    
  if (parameters === undefined || parameters === null) {
    // really should be menuBigDiv
    return menuContent;
  }

  if (parameters.hasOwnProperty('openCloseButton')) {
    menuContent = document.createElement ('div');
    menuContent.className = 'menugroup';
    menuContent.style.display = parameters.openCloseButton.visible ?
        'block' : 'none';

    // set button image/character
    // currently not in use to avoid browser support issues
    //if (parameters.openCloseButton.open.length <= 1) {
    //  // unicode character as image (typically arrow)
    //  // also asssumes that if using this option (i.e. no image)
    //  // then both open and close are like that
    //  openCloseImage = document.createElement('div');
    //  openCloseImage.style.display = 'inline';
    //  openCloseImage.innerHTML = parameters.openCloseButton.visible ?
    //      parameters.openCloseButton.open : parameters.openCloseButton.close;
    //}
    //else {
    openCloseImage = document.createElement('img');
    openCloseImage.className = 'menubutton';
    openCloseImage.title = parameters.openCloseButton.title;
    openCloseImage.src = parameters.openCloseButton.visible ?
        parameters.openCloseButton.open : parameters.openCloseButton.close;
    //}
    openCloseImage.onclick = function () {
      // close to open
      if (menuContent.style.display == 'none') {
        menuContent.style.display = 'block';
        //if (this.nodeName === 'DIV') { // if use unicode for image
        //  this.innerHTML = parameters.openCloseButton.open;
        //} else {
        this.src = parameters.openCloseButton.open;
        //}
        if (parameters.openCloseButton.onOpen !== undefined
            && parameters.openCloseButton.onOpen !== null) {
          parameters.openCloseButton.onOpen(menuContent);
              //parameters.openCloseButton.userData);
        }
      } else { // open to close
        menuContent.style.display = 'none';
        //if (this.nodeName === 'DIV') { // if use unicode for image
        //  this.innerHTML = parameters.openCloseButton.close;
        //} else {
        this.src = parameters.openCloseButton.close;
        //}
        //onClose is never used/given in params!
        //if (parameters.openCloseButton.onClose !== undefined
        //    && parameters.openCloseButton.onClose !== null) {
        //  parameters.openCloseButton.onClose(menuContent,
        //      parameters.openCloseButton.userData);
        //}
      }
    };
    
    menuText.onclick = openCloseImage.onclick;
    menuText.style.cursor = 'pointer';
    menuText.style.display = 'inline';
  }

  if (parameters.hasOwnProperty('userButton')) {
    if (!parameters.userButton.hasOwnProperty('onClick')
        || !parameters.userButton.hasOwnProperty('userData')) {
      console.error('userButton must have onClick and userData');
    }

    userImage = document.createElement ('img');
    userImage.className = 'menubutton';
    userImage.title = parameters.userButton.title;
    userImage.src = parameters.userButton.imgSrc;
    if (parameters.userButton.hasOwnProperty('onCreate')) {
      parameters.userButton.onCreate(userImage, parameters.userButton.userData);
    }
    userImage.onclick = function() {
      parameters.userButton.onClick(userImage, parameters.userButton.userData);
    };
  }

  if (openCloseImage !== null) {
    //menuItem.appendChild(openCloseImage);
    menuItem.insertBefore(openCloseImage, menuText);
  }
  if (userImage !== null) {
    //menuItem.appendChild(userImage);
    menuItem.insertBefore(userImage, menuText);
  }
  if (menuContent !== null) {
    //parent.appendChild(menuContent);
    menuBigDiv.appendChild(menuContent);
  }

  // really should be menuBigDiv
  return menuContent;
};






/*
 * adds the entries in the Cell Selector Dialog
 * celltype = Neurons or Muscles
 * called by CellSelectorDialog, i.e. when click on 'Select neuron'
 * each cell is in one div, with class 'cellDiv',
 * when click, adds class 'cellDivSelected';
 * we used this in CellSelectorDialog to get selected cells
 *
 * html structure (for celltype='neuron'):
 *  <div> // bigDiv
 *    <button> // header
 *      Neurons
 *    </button>
 *    <div> // panel
 *      cells
 *    </div>
 *  </div>
 */
ImporterApp.prototype.AddSelectPanel = function(celltype) {
  const bigDiv = document.createElement('div');

  // large button, click to expand/collapse list
  const panelHeader = document.createElement('button');
  panelHeader.classList.add('panel-header');
  //panelHeader.setAttribute('type','button');
  //panelHeader.setAttribute('data-toggle','collapse');
  //panelHeader.setAttribute('data-target','#'+celltype);
  panelHeader.innerHTML = celltype === 'neuron' ? 'Neurons' : 'Muscles';
  // add onclick attribute after panel

  // div containing the cell entries
  const panel = document.createElement('div');
  panel.style.display = 'none';
  //panel.classList.add('collapse');
  // add cell entries to panel div
  for (const cell of this.cellsInSlctdSrs[celltype]){
    const cellDiv = document.createElement('div');
    cellDiv.classList.add('cellDiv');
    //cellDiv.id = cell;
    cellDiv.value = cell;
    cellDiv.innerHTML = cell;
    panel.appendChild(cellDiv);

    // highlight if previously selected/loaded this cell
    if ( this.viewer.maps.hasOwnProperty(cell) ) {
      cellDiv.classList.add('cellDivSelected');
    }

    // toggle selectedness
    cellDiv.onclick = () => {
      cellDiv.classList.toggle('cellDivSelected');
    };
  };

  panelHeader.onclick = () => {
    const disp = panel.style.display;
    panel.style.display = (disp === 'none') ? 'block' : 'none';
  };

  bigDiv.appendChild(panelHeader);
  bigDiv.appendChild(panel);

  return bigDiv;
};

ImporterApp.prototype.SetDB = function(_db)
{
    this.db = _db;
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

  let headerNav = document.getElementById ('header-nav');
  let headerNavCollapse = document.getElementById ('collapse-header-nav');

  // now both of these are under headerNav
  //var headerimage = document.getElementById ('headerimage');
  //var nav = document.getElementById ('nav');

  let top = document.getElementById ('top'); // 'Help' etc
  let left = document.getElementById ('left');
  let canvas = this.GetCanvasElem();

  let height = window.innerHeight - top.offsetHeight - headerNav.offsetHeight - headerNavCollapse.offsetHeight - 10;
 
  //var height = window.innerHeight - top.offsetHeight - headerimage.offsetHeight - nav.offsetHeight - 10;

  SetHeight(canvas, 0);
  //SetWidth (canvas, 0); ??

  SetHeight(left, height);

  SetHeight(canvas, height);
  SetWidth(canvas, document.body.clientWidth - left.offsetWidth);
  
  this.dialog.Resize();
  this.viewer.resizeDisplayGL();
};

/*
 * Generates the menu to the left of the viewer
 * the menu is structured into several items(divs),
 * each created and returned by AddDefaultGroup
 *
 * all the action happens at the end of the function
 *
 * takes the place of GenerateMenu in importerapp.js
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


  // menu item that displays synapse info when mouse hovers over synapse
  // this is achieved by emitting an event
  // (using THREEx.DomEvents library)
  // elems here have id which the callback uses to identify and update
  // (see MapViewer.addOneSynapse)
  function AddSynapseInfo(parent){
    var synElems = {
      cellname: 'Cell: ',
      syntype: 'Synapse type: ',
      synsource: 'Source: ',
      syntarget: 'Target: ',
      synweight: '# EM sections: ',
      synsection: 'Sections: ',
      syncontin: 'Synapse Id/Contin number: ',
      synposition: 'Coordinates: ',
    };
    for (var i in synElems){
      var left = document.createElement('div');
      var right = document.createElement('div');
      left.classList.add('synLeft');
      right.classList.add('synRight');
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
      const a = document.createElement('a');
      a.target = '_blank';
      a.href = url;
      a.click();
      // note url is relative to floatingdialog.js...
      //self.OpenInfoDialog(url,'Synapse viewer');
    };
    parent.appendChild(synViewerBtn);

    // YH adding button to center view on synapse
    const synCenterViewBtn = document.createElement('button');
    synCenterViewBtn.innerHTML = 'Center View on Synapse';
    synCenterViewBtn.onclick = () => {
      const cellname = self.synapseClicked.cellname;
      const contin = self.synapseClicked.contin;
      if (contin === null) return;
      const obj = self.viewer.SynapseContinToObj(cellname, contin);
      const pos = self.viewer.GetObjCoordActual(cellname, obj);
      self.viewer.SetCameraTarget(pos);
    };
    parent.appendChild(synCenterViewBtn);
  };



  // callback expect boolean argument,
  // which corresponds to on/off state (on = true)
  // (usage: application of viewer.toggleRemarks or toggleAxes)
  // isOn determines default on/offText
  function AddToggleButton(parent,onText,offText,isOn,callback){
    var remarkBtn = document.createElement('button');
    remarkBtn.innerHTML = isOn ? onText : offText;
    remarkBtn.value = isOn ? '1' : '0'; // HTML turns to string
    remarkBtn.classList.add('filterbutton');
    //remarkBtn.id = 'remarkBtn';
    remarkBtn.onclick = function() {
      console.log('remarkBtn before: ', remarkBtn.value);
      const curState = Boolean(parseInt(remarkBtn.value));
      const newState = !curState;
      remarkBtn.value = newState ? '1' : '0';
      remarkBtn.innerHTML = newState ? onText : offText;
      console.log('remarkBtn after: ', remarkBtn.value);
      callback(newState);
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
  AddMapTranslate(this.menuGroup['map-translate'],
    function(x,y,z){self.viewer.translateMapsTo(x,y,z);});

  this.menuGroup['comments'] =
      this.menuObj.AddDefaultGroup('Comments',visible=true);

  AddToggleButton(this.menuGroup['comments'],
    'Hide Grid', 'Show Grid', true,
    (state) => { self.viewer.toggleGrid(); });

  AddToggleButton(this.menuGroup['comments'],
    'Hide Axes', 'Show Axes', true, // used to be Axes ON, Axes OFF
    (state) => { self.viewer.toggleAxes(); });

  // see maps[..].remarks in MapViewer.loadMap
  AddToggleButton(this.menuGroup['comments'],
    'Hide All Remarks', 'Show All Remarks', false, // used to be Remarks ON/OFF
    (state) => { self.viewer.toggleAllRemarks(state); } );

  // YH
  AddToggleButton(this.menuGroup['comments'],
    'Hide Synapse Labels', 'Show Synapse Labels', false,
    (state) => {self.viewer.toggleAllSynapseLabels(state);});

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


/*==============================
 * old way of updating synapse info section
 */

/*
 * YH
 * update the synapse info section of menu
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
  document.getElementById('synposition').innerHTML =
    `x: ${info.synposition.x}, y: ${info.synposition.y}, z: ${info.synposition.z}`;
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
};

// reset synapse info to default
ImporterApp.prototype.ResetDefaultSynapseInfo = function() {
  Object.assign(this.synapseInfoClicked, this.defaultSynapseInfo); // copy
  this.UpdateSynapseInfo(this.defaultSynapseInfo);
};

ImporterApp.prototype.GetSynapseInfoContin = function() {
  return this.synapseInfoClicked.syncontin;
};


// end old way of updating synapse info section


/*============================================
 * YH new and improved way
 * we don't pass around the info object,
 * just need to give cellname and contin num of synapse
 * blazingly fast
 *
 * the synapse info section always shows the
 * synapse that mouse is hovering over,
 * but if mouse not hovering over any synapse,
 * returns it to the previously clicked synapse
 *
 * the methods below switch between four states:
 * -mouse hover synapse X, synapse Y clicked (possibly X=Y)
 * -mouse hover synapse X, no synapse clicked
 * -mouse not hovering over any synapse, synapse X clicked
 * -mouse not hovering over any synapse, no synapse clicked
 * /

/*
 * update the synapse info section of menu
 * but doesn't update the synapse clicked
 * so that synapse info will return to previous clicked synapse
 *
 * @param {String} cellname - cell on which synapse sits
 * @param {Number} contin - contin number of synapse
 */
ImporterApp.prototype.UpdateSynapseInfo2 = function(cellname,contin) {
  if (contin === null) {
    this.RestoreSynapseInfoToDefault2();
    return;
  }
  const synData = this.viewer.GetSynData(cellname,contin);
  const pos = this.viewer.GetObjCoordAbsolute(cellname,synData.obj);
  document.getElementById('cellname').innerHTML = cellname;
  document.getElementById('syntype').innerHTML = synData.type;
  document.getElementById('synsource').innerHTML = synData.pre;
  document.getElementById('syntarget').innerHTML = synData.post;
  document.getElementById('synweight').innerHTML = synData.zHigh - synData.zLow + 1;
  document.getElementById('synsection').innerHTML = `(${synData.zLow},${synData.zHigh})`;
  document.getElementById('syncontin').innerHTML = contin;
  document.getElementById('synposition').innerHTML =
    `x: ${pos.x}, y: ${pos.y}, z: ${pos.z}`;
};

/*
 * return synapse info to default values, all '---'
 * also sets synapse clicked to null
 */
ImporterApp.prototype.RestoreSynapseInfoToDefault2 = function() {
  this.synapseClicked.cellname = null;
  this.synapseClicked.contin = null;
  document.getElementById('cellname').innerHTML = '---';
  document.getElementById('syntype').innerHTML = '---';
  document.getElementById('synsource').innerHTML = '---';
  document.getElementById('syntarget').innerHTML = '---';
  document.getElementById('synweight').innerHTML = '---';
  document.getElementById('synsection').innerHTML = '---';
  document.getElementById('syncontin').innerHTML = '---';
  document.getElementById('synposition').innerHTML = '---';
};


/*
 * returns Synapse Info to last clicked synapse
 * does not update synapse clicked
 */
ImporterApp.prototype.RestoreSynapseInfo2 = function() {
  //const info = this.synapseInfoClicked;
  this.UpdateSynapseInfo2(this.synapseClicked.cellname, this.synapseClicked.contin);
};


// update both clicked synapse and the synapse info panel
ImporterApp.prototype.UpdateClickedSynapseInfo2 = function(cellname, contin) {
  this.synapseClicked.cellname = cellname;
  this.synapseClicked.contin = contin;
  this.UpdateSynapseInfo2(cellname,contin);
};

ImporterApp.prototype.GetSynapseInfoContin2 = function() {
  return this.synapseClicked.contin;
};



/*=====================================================
 * getters/setters
 */

ImporterApp.prototype.GetCanvasElem = function() {
  return document.getElementById('meshviewer');
};


// series/sex get/set from/to HTML
ImporterApp.prototype.GetSeriesElem = function() {
  return document.getElementById('series-selector');
};
ImporterApp.prototype.GetSeriesFromHTML = function() {
  const dbEl = this.GetSeriesElem();
  return dbEl.value;
};
ImporterApp.prototype.SetSeriesToHTML = function(db) {
  const dbEl = this.GetSeriesElem();
  dbEl.value = db;
};
// set series for the class
ImporterApp.prototype.SetSeriesInternal = function(db) {
  this.db = db;
  this.cellsInSlctdSrs = celllistByDbType[db];
};

// maps section (the div with class sectionContent)
ImporterApp.prototype.GetMapsContentDiv = function() {
  return document.getElementById('mapsContentDiv');
};
