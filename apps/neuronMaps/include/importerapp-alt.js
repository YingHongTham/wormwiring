/*
 * new version of ImporterApp,
 * where we expect index.html to have most of the elements,
 * and we just need to link functionality to those elements
 * TODO perhaps do the same to FloatingDialog to
 *
 * note confusing terminology:
 * series can refer to database N2U etc
 * or also the regions of the worm, VC, NR etc..
 * we try to use db for the former sense
 *
 * expect some libraries:
 * apps/include/floatingdialog.js - for FloatingDialog class
 *
 * css used: /css/importer.css (mostly?)
 * class 'panel-group' is from bootstrap.css
 *
 * finally changed selectedNeurons to cellsInSlctdSrs 
 * cellsInSlctdSrs is just two arrays
 * (leave the walink, visied, plotted stuff to elsewhere)
 */


// requires /apps/include/cellLists.js, wa_link.js, etc.
if (celllistByDbType === undefined) {
  console.error('expect /apps/include/cellLists.js');
}
if (cellnameWALinkDict === undefined
    || cellnameToWALink === undefined) {
  console.error('expect /apps/include/wa_link.js');
}
if (helpDialogItems === undefined) {
  console.error('expect ./helpDialogItems.js');
}
if (typeof(FloatingDialog) === undefined) {
  console.error('expect /apps/include/floatingdialog.js');
}

ImporterApp = function()
{
  this.db = this.GetSeriesFromHTML();

  // cellsInSlctdSrs are cells in selected db/series
  // appear in the cell selector dialog
  // { neuron: [...], muscle: [...] }
  this.cellsInSlctdSrs = celllistByDbType[this.db];

  // actually user selected cells, unlike before
  this.selectedCells = new Set();

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

  // object dealing with the viewer inside canvas
  this.viewer = null; // initialized properly in Init()

  // the small floating window in which
  // help/selector/2Dviewer/synapseviewer is shown
  this.dialog = new FloatingDialog();

  // FloatingDialog2 objects for each cell,
  // showing the list of synapses
  this.synapseListWindows = {};

  // more intialization; but no new member variables declared
  this.Init();
};


/*
 * most of the HTML is already there
 * (unlike in the original importerapp.js)
 * Init() adds functionality to stuff
 */
ImporterApp.prototype.Init = function ()
{
  this.InitLinkFunctionalityWithHTML();
  this.InitViewerStuff();
};


ImporterApp.prototype.InitViewerStuff = function() {
  // need to resize canvas before init viewer
  // since initially canvas.width and height are 0
  this.ResizeOnlyCanvasLeft();

  const self = this;

  //if (!Detector.webgl) {
  //  var warning = Detector.getWebGLErrorMessage();
  //  console.log(warning);
  //  alert('WebGL failed to load, viewer may not work');
  //};

  const canvas = this.GetCanvasElem();
  
  this.viewer = new MapViewer(canvas, this);

  let render = function() {
    requestAnimationFrame(render);
    // TODO make animating/pausing part of MapViewer class
    self.viewer.render();
  };
  render();
  
  window.addEventListener('resize', () => {
    self.Resize();
  },false);
};

/*
 * making the buttons and menu work
 */
ImporterApp.prototype.InitLinkFunctionalityWithHTML = function() {
  const self = this;

  // set up the top menu, Help, cell selector etc.
  const topElem = document.getElementById ('top');
  const topItems = topElem.children;
  topItems[0].onclick = () => { this.OpenHelpDialog(); };
  topItems[1].onclick = () => { this.CellSelectorDialog(); };
  topItems[2].onclick = () => { this.Open2DViewer(); };
  topItems[3].onclick = () => { this.ClearMaps(); };

  // no longer needed, found that bootstrap can handle it
  //// create menu items' accordion behaviour
  //const menuSections = Array.from(
  //  document.getElementsByClassName('accordionSection')
  //);
  //menuSections.forEach( el => {
  //  // expect exactly two children - with classes
  //  // sectionTitle, sectionContent - in that order
  //  // state of open/close stored in presence/absence
  //  // of class active/inactive in title
  //  const title = el.children[0];
  //  const content = el.children[1];
  //  title.onclick = () => {
  //    const active = title.classList.contains('active')
  //                || !title.classList.contains('inactive');
  //    content.style.display = active ? 'none' : 'block';
  //    title.classList.toggle('active', !active);
  //    title.classList.toggle('inactive', active);
  //  };
  //});

  //=================================================
  // link series-selector to this.db and this.cellsInSlctdSrs
  // make the HTML the source/"ground truth" for db value
  const seriesSelector = this.GetSeriesElem();
  this.SetSeriesInternal(seriesSelector.value);
  seriesSelector.onchange = () => {
    const newDb = self.GetSeriesFromHTML();
    self.SetSeriesInternal(newDb);
  };

  //=================================================
  // link buttons in Synapse Info
  const openSynapseEMViewer = document.getElementById('openSynapseEMViewer');
  openSynapseEMViewer.onclick = () => {
    const cellname = self.synapseClicked.cellname;
    const contin = self.synapseClicked.contin;
    if (contin === null) return;
    const db = self.db;
    const url = `/apps/synapseViewer/?neuron=${cellname}&db=${db}&continNum=${contin}`;
    const a = document.createElement('a');
    a.target = '_blank';
    a.href = url;
    a.click();
  };
  const centerViewOnSynapse = document.getElementById('centerViewOnSynapse');
  centerViewOnSynapse.onclick = () => {
    const cellname = self.synapseClicked.cellname;
    const contin = self.synapseClicked.contin;
    if (contin === null) return;
    self.viewer.CenterViewOnSynapse(cellname,contin);
  };

  //=================================================
  // link synapse filter, add button functionality
  const synFilterBtnFilter = document.getElementById('synFilterBtnFilter');
  synFilterBtnFilter.onclick = () => {
    const synFilterTypeNodes = document.querySelectorAll(`input[name='synFilterType']:checked`);
    let typesSelected = [];
    synFilterTypeNodes.forEach( nn => {
      typesSelected.push(nn.value);
    });

    const synFilterCells = document.getElementById('synFilterCells');
    let cells = synFilterCells.value.replace(' ','').split(',');

    const synFilterContins = document.getElementById('synFilterContins');
    let continsStr = synFilterContins.value.split(',');
    let contins = [];
    for (const cStr of continsStr) {
      let c = parseInt(cStr);
      if (!isNaN(c))
        contins.push(c);
    }

    self.viewer.FilterSynapses(typesSelected, cells, contins);
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

    self.viewer.RestoreSynapses();
  };


  //=================================================
  // link Translate Maps sliders

  // give all three sliders same response to change:
  // set the shown value and apply viewer.translateMapsTo
  function MapsTranslateSliderOnChange() {
    const pos = self.GetTranslationSliderValue();
    // need to update the number showing the value too
    for (const i of ['x','y','z']) {
      const span = document.getElementById(i+'-slider-show-value');
      span.innerHTML = pos[i];
    }
    self.viewer.translateMapsTo(pos.x,pos.y,pos.z);
  }
  for (const i of ['x','y','z']) {
    const slider = document.getElementById(i+'-slider');
    slider.onchange = MapsTranslateSliderOnChange;
    slider.oninput = slider.onchange;
  };

  //=================================================
  // link Global Viewer Options
  const btnToggleGrid = document.getElementById('btnToggleGrid');
  btnToggleGrid.onclick = () => {
    const on = btnToggleGrid.value === 'on';
    btnToggleGrid.value = !on ? 'on' : 'off';
    btnToggleGrid.innerHTML = !on ? 'Hide Grid' : 'Show Grid';
    self.viewer.toggleGrid(!on);
  };

  const btnToggleAxes = document.getElementById('btnToggleAxes');
  btnToggleAxes.onclick = () => {
    const on = btnToggleAxes.value === 'on';
    btnToggleAxes.value = !on ? 'on' : 'off';
    btnToggleAxes.innerHTML = !on ? 'Hide Axes' : 'Show Axes';
    self.viewer.toggleAxes(!on);
  };

  const btnToggleAllRmks = document.getElementById('btnToggleAllRmks');
  btnToggleAllRmks.onclick = () => {
    const on = btnToggleAllRmks.value === 'on';
    btnToggleAllRmks.value = !on ? 'on' : 'off';
    btnToggleAllRmks.innerHTML = !on ? 'Hide All Remarks' : 'Show All Remarks';
    self.viewer.toggleAllRemarks(!on);
  };

  const btnToggleAllSynLabels = document.getElementById('btnToggleAllSynLabels');
  btnToggleAllSynLabels.onclick = () => {
    const on = btnToggleAllSynLabels.value === 'on';
    btnToggleAllSynLabels.value = !on ? 'on' : 'off';
    btnToggleAllSynLabels.innerHTML = !on ? 'Hide All Synapse Labels' : 'Show All Synapse Labels';
    self.viewer.toggleAllSynapseLabels(!on);
  };

  const btnToggleAllVolume = document.getElementById('btnToggleAllVolume');
  btnToggleAllVolume.onclick = () => {
    const on = btnToggleAllVolume.value === 'on';
    btnToggleAllVolume.value = !on ? 'on' : 'off';
    btnToggleAllVolume.innerHTML = !on ? 'Hide All Volume' : 'Show All Volume';
    self.viewer.ToggleAllVolume(!on);
  };

  //=================================================
  // link Load/Save

  const inputLoad = document.getElementById('LoadFromFileInput');
  // annoying that width can't be controlled properly..
  inputLoad.style.width = document.getElementById('left').offsetWidth;
  inputLoad.size = document.getElementById('left').offsetWidth;
  inputLoad.onchange = () => this.LoadFromFile();
  const btnSave = document.getElementById('SaveToFileButton');
  btnSave.onclick = () => this.SaveToFile();
};

/*
 * load settings from file
 * file expected to be .json; see SaveToFile
 */
ImporterApp.prototype.LoadFromFile = function() {
  const input = document.getElementById('LoadFromFileInput');
  const file = new FileReader();

  const self = this;

  file.readAsText(input.files[0]);
  file.onloadend = function(ev) {
    // read data is in this.result
    const data = JSON.parse(this.result);

    self.SetSeriesToHTML(data.db);
    self.SetSeriesInternal(data.db);

    for (const cell in data.mapsSettings) {
      self.LoadMap2(data.db, cell);
      let color = data.mapsSettings[cell].color;
      document.addEventListener('loadMapComplete', () => {
        self.viewer.SetSkeletonColor(
          cell,
          color
        );
        // set camera again because LoadMap2 sets camera too
        self.viewer.SetCameraFromJSON(data.cameraSettings);
      });
    }

    setTimeout(() => {
      self.SetMapsTranslate(data.mapsTranslation);
      self.viewer.SetCameraFromJSON(data.cameraSettings);
    },0);
  };
};

ImporterApp.prototype.SaveToFile = function() {
  // object to hold data to save
  const data = {
    db: this.db,
    mapsSettings: this.viewer.dumpMapSettingsJSON(),
    cameraSettings: this.viewer.dumpCameraJSON(),
    mapsTranslation: this.GetMapsTranslate(),
  };

  console.log(data);

  const a = document.getElementById('forSaveToFileButton');
  a.href = URL.createObjectURL(new Blob(
    [JSON.stringify(data)],
    { type: 'application/json', }
  ));
  a.setAttribute('download', 'session.json');
  a.click();
};

// no longer needed, preloading triggered by build_neuronMaps.js
//// recall that the params here are a bit different from
//// those given in url;
//// see build_neuronMaps.js for how it was preprocessed
//ImporterApp.prototype.PreloadParamsLoaded = function() {
//  return 'cell' in this.params
//      && 'db' in this.params
//      && 'sex' in this.params;
//};

// used to be PreloadCells2
ImporterApp.prototype.LoadDbCell = function(db, cell)
{
  // update the series selector in menu
  this.SetSeriesToHTML(db);
  this.SetSeriesInternal(db);
  //this.cellsInSlctdSrs = celllistByDbType[db];

  this.LoadMap2(db,cell);
  //this.LoadMapMenu2(cell); // put into LoadMap2
};



//=========================================================
// functionality for the top menu
// Help, Select Cells, 2D Viewer, Clear Maps

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
  contentDiv.appendChild(panelGroup);

  panelGroup.classList.add('panel-group');
  // panel-group etc is from bootstrap.css
  for (const helpItem of helpDialogItems) {
    panelGroup.appendChild(this.CreateHelpPanel(helpItem));
  }
}

/*
 * returns help entry defined by params
 *
 * HTML:
 *  <div> // panel --> returned
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
 *
 * the CSS classes like panel-* and attributes data-*
 * are from bootstrap.css,
 * which is linked to bootstrap.js, which provides func'ty
 */
ImporterApp.prototype.CreateHelpPanel = function(params)
{
  const panel = document.createElement('div');
  panel.classList.add('panel','panel-default');

  const panelHeader = document.createElement('div');
  panelHeader.classList.add('panel-heading');
  panelHeader.classList.add('accordion-toggle');
  panelHeader.setAttribute('data-toggle','collapse');
  panelHeader.setAttribute('data-parent','#accordion');
  panelHeader.setAttribute('data-target','#'+params.name);

  const panelTitle = document.createElement('h4');
  panelTitle.classList.add('panel-title');

  const panelA = document.createElement('a');
  panelA.innerHTML = params.title;
  //panelA.classList.add('accordion-toggle');
  //panelA.setAttribute('data-toggle','collapse');
  //panelA.setAttribute('data-parent','#accordion');
  //panelA.href = '#' + params.name;

  panelTitle.appendChild(panelA);
  panelHeader.appendChild(panelTitle);
  panel.appendChild(panelHeader);

  // content
  const panelCollapse = document.createElement('div');
  // important to assign id! as this is how 
  // bootstrap.js finds and the right div to collapse
  panelCollapse.id = params.name;
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
  
  return panel;
};

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

  const contentDiv = this.dialog.GetContentDiv();

  const urlSpan = document.createElement('span');
  urlSpan.innerHTML = 'open in new tab: ';
  contentDiv.appendChild(urlSpan);
  const urlA = document.createElement('a');
  urlSpan.appendChild(urlA);
  urlA.href = url;
  urlA.target = '_blank';
  urlA.innerHTML = urlA.href;

  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.id = 'infoFrame';
  contentDiv.appendChild(iframe);
}


/*
 * loads, creates neuron selector dialog when click 'Select neuron'
 * for neurons that are selected, calls LoadMaps,
 * which sends request to php for the neuron data,
 * skeleton, synapses etc
 *
 * use adding cellDivSelected class to cellDiv's
 * as means of identifying selected cells
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
      // loads selected cells
      text : 'load',
      callback : function (dialog) {
        const series = self.GetSeriesFromHTML();
        const selectedCells = Array.from(
          document.getElementsByClassName('cellDiv cellDivSelected')
        );
        selectedCells.forEach( el => {
          const cell = el.value;
          if (self.selectedCells.has(cell)) {
            return;
          }
          self.selectedCells.add(cell);
          self.LoadMap2(series,cell);
          //self.LoadMapMenu2(cell); // putinto LoadMap2
        });
        self.dialog.Close();
      }
    }, {
      text : 'close',
      callback : function (dialog) {
        self.dialog.Close();
      }
    }],
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
  const mapsContentDiv = this.GetMapsContentDiv();
  while(mapsContentDiv.lastChild){
    mapsContentDiv.removeChild(mapsContentDiv.lastChild);
  };
  this.viewer.clearMaps();
};


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
  this.selectedCells.add(cell);
  const self = this;
  const url = `../php/retrieve_trace_coord_alt.php?db=${db}&cell=${cell}`;
  console.log('retrieving skeleton map via '+url);
  const xhttp = new XMLHttpRequest();    
  console.time(`Retrieve ${cell}`);
  xhttp.onreadystatechange = function(){
    if (this.readyState == 4 && this.status == 200){
      console.timeEnd(`Retrieve ${cell}`);
      console.time(`Load to viewer ${cell}`);

      let data = JSON.parse(this.responseText);
      self.viewer.loadMap2(data);
      self.retrieveVolumetric(db, cell); // async
      self.LoadMapMenu2(cell);

      console.timeEnd(`Load to viewer ${cell}`);

      document.dispatchEvent(new CustomEvent('loadMapComplete', {
        detail: {
          db: db,
          cell: cell,
        }
      }));
    }
  };
  xhttp.open("GET",url,true);
  xhttp.send();
};

/*
 * loads menu entry for cell in 'Maps'
 * assumes loadMap2 has been run
 *
 * @param {String} cellname - name of cell
 *
 * each cell entry should be of the form:
 *  <div> // div
 *    <div>Cellname</div> // title
 *    <div> // content
 *      <input type='color'>
 *      <button>Show Remarks</button>
 *      <button>WormAtlas</button>
 *      <button>Synapse By Partners</button>
 *      <button>Synaptic List</button>
 *      <button>Show Volume</button>
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

  const image = document.createElement('img');
  title.appendChild(image);

  //const colorBtn = document.createElement('button');
  //const colorDiv = document.createElement('div');
  const colorInput = document.createElement('Input');
  const centerViewBtn = document.createElement('button');
  const remarksBtn = document.createElement('button');
  const walinkBtn = document.createElement('button');
  const synPartnerListBtn = document.createElement('button');
  const synapseListBtn = document.createElement('button');
  const volumeBtn = document.createElement('button');

  //content.appendChild(colorBtn);
  //content.appendChild(colorDiv);
  content.appendChild(colorInput);
  content.appendChild(centerViewBtn);
  content.appendChild(remarksBtn);
  content.appendChild(walinkBtn);
  content.appendChild(synPartnerListBtn);
  content.appendChild(synapseListBtn);
  content.appendChild(volumeBtn);

  // structure done,
  // now we customize the stuff/buttons
  title.append(cellname);

	image.src = 'images/visible.png';

  //===============================================
  // add accordion functionality
  div.classList.add('accordionSection');
  content.classList.add('sectionContent');

  content.classList.add('collapse');
  content.id = cellname+'-mapMenuItem';

  title.classList.add('sectionTitle');
  title.setAttribute('data-toggle','collapse');
  title.setAttribute('data-target','#'+content.id);
  title.setAttribute('role','button');
  title.setAttribute('aria-expanded','false');

  // again, now using bootstrap
  //title.classList.add('inactive'); // default content hidden
  //content.style.display = 'none'; // default content hidden

  //title.onclick = () => {
  //  const active = title.classList.contains('active')
  //              || !title.classList.contains('inactive');
  //  content.style.display = active ? 'none' : 'block';
  //  title.classList.toggle('active', !active);
  //  title.classList.toggle('inactive', active);
  //};

  //===============================================
  // eye image for visibility
  image.onclick = (e) => {
    e.stopPropagation(); // prevent title being clicked
    const vis = self.viewer.mapIsVisible(cellname);
    self.viewer.toggleMaps(cellname, !vis);
    image.src = vis ? 'images/hidden.png' : 'images/visible.png';
  };

  //===============================================
  // now do each item in content
  // color input
  colorInput.type = 'color';

  // get color of cell, transform to appropriate format
  let {r, g, b} = self.viewer.GetSkeletonColor(cellname);
  r = Math.round(255*r);
  b = Math.round(255*b);
  g = Math.round(255*g);
  let rgb = b | (g << 8) | (r << 16);
  let hex = '#' + rgb.toString(16);

  colorInput.setAttribute('value',hex);
  colorInput.addEventListener('change', (ev) => {
    const color = ev.target.value;
    let {r, g, b} = hexToRGB(color);
    self.viewer.SetSkeletonColor(cellname,
      {r:r/255., g:g/255., b:b/255.});
  }, false);


  //===============================================
  // button for centering view on cell
  centerViewBtn.innerHTML = 'Center View';
  //centerViewBtn.classList.add('mapBtn');
  centerViewBtn.onclick = () => {
    self.viewer.CenterViewOnCell(cellname);
  };
  

  //===============================================
  // show/hide remarks
  //const remarkVis = this.viewer.isCellLoaded(cellname) ?
  //  this.viewer.GetRemarkVis(cellname) : false;
  //remarksBtn.innerHTML = !remarkVis ? 'Hide Remarks' : 'Show Remarks';
  remarksBtn.innerHTML = 'Show Remarks';
  remarksBtn.onclick = () => {
    const remarkVis = self.viewer.isCellLoaded(cellname) ?
      self.viewer.GetRemarkVis(cellname) : false;
    remarksBtn.innerHTML = !remarkVis ? 'Hide Remarks' : 'Show Remarks';
    self.viewer.toggleRemarksByCell(cellname, !remarkVis);
  };

  //===============================================
  // WormAtlas link
  walinkBtn.innerHTML = 'WormAtlas';
  walinkBtn.onclick = () => {
    const url = cellnameToWALink(cellname);
    self.OpenInfoDialog(url, 'WormAtlas');
  };

  //===============================================
  // Synapse By Partners
  synPartnerListBtn.innerHTML = 'Synapse By Partners';
  synPartnerListBtn.onclick = () => {
    const series = self.GetSeriesFromHTML();
    const url = `../synapseList/?continName=${cellname}&series=${series}`;
    self.OpenInfoDialog(url,'Synaptic Partners');
  };

  //===============================================
  // Synapse List
  this.InitSynapseListWindow(cellname);

  synapseListBtn.innerHTML = 'Synapse List';
  synapseListBtn.onclick = () => {
    self.synapseListWindows[cellname].OpenWindow();
  };

  //===============================================
  // show/hide volumetric
  volumeBtn.innerHTML = 'Show Volume';
  volumeBtn.onclick = () => {
    const volumeVis = self.viewer.GetVolumeVis(cellname);
    if (volumeVis === null || volumeVis === undefined) {
      volumeBtn.innerHTML = 'Volume Unavailable';
    } else {
      volumeBtn.innerHTML = !volumeVis ? 'Hide Volume' : 'Show Volume';
    }
    self.viewer.ToggleVolumeByCell(cellname, !volumeVis);
  };
};

/*
 * assumes loadMap2 is done
 * (meant to be used in loadMapMenu2 which is after loadMap2
 */
ImporterApp.prototype.InitSynapseListWindow = function(cellname) {
  const nn = new FloatingDialog2(null, cellname, isHidden=true);
  this.synapseListWindows[cellname] = nn;

  // form table of synapses

  let table = document.createElement('table');
  let thead = document.createElement('thead');
  let tbody = document.createElement('tbody');
  let tr = document.createElement('tr');
  table.appendChild(thead);
  table.appendChild(tbody);
  thead.appendChild(tr);
  for (const col of ['z','type','cells']) {
    let th = document.createElement('th');
    th.innerHTML = col;
    tr.appendChild(th);
    th.onmouseover = () => {
      th.style.backgroundColor = 'rgba(0,0,0,0.5)';
    };
    th.onmouseout = () => {
      th.style.backgroundColor = '#FFFFFF';
    };
  }
  table.style.color = '#000000';

  nn.GetContentDiv().appendChild(table);

  let allSynList = [];
  let map = this.viewer.maps[cellname];
  for (const contin in map.allSynData) {
    allSynList.push(map.allSynData[contin]);
  }
  allSynList.sort((obj1, obj2) => {
    const pos1 = map.objCoord[obj1.obj];
    const pos2 = map.objCoord[obj2.obj];
    return pos1.z - pos2.z;
  });

  // add rows
  for (const synData of allSynList) {
    const row = document.createElement('tr');
    const tdZ = document.createElement('td');
    const tdType = document.createElement('td');
    const tdCells = document.createElement('td');

    tbody.appendChild(row);
    row.appendChild(tdZ);
    row.appendChild(tdType);
    row.appendChild(tdCells);

    tdZ.innerHTML = map.objCoord[synData.obj].z;
    tdType.innerHTML = synData.type;
    if (synData.type === 'gap') {
      tdCells.innerHTML = cellname + '--' + synData.partner;
    } else {
      tdCells.innerHTML = synData.pre + '->' + synData.post;
    }

    // add color to type
    if (synData.type == 'gap') {
      tdType.style.backgroundColor = 'rgba(0,255,255,0.2)';
    }
    if (synData.type == 'pre') {
      tdType.style.backgroundColor = 'rgba(250,88,130,0.2)';
    }
    if (synData.type == 'post') {
      tdType.style.backgroundColor = 'rgba(191,0,255,0.2)';
    }

    // add event listeners, link with synpases
    const self = this;
    const highlightColor = 'rgba(0,0,0,0.5)';
    const blankColor = '#FFFFFF';
    row.onclick = () => {
      self.viewer.SynapseOnClick(synData.cellname, synData.contin);
      self.viewer.CenterViewOnSynapse(synData.cellname, synData.contin);
    };
    row.onmouseover = () => {
      row.style.backgroundColor = highlightColor;
      self.viewer.SynapseOnMouseOver(synData.cellname, synData.contin);
    };
    row.onmouseout = () => {
      row.style.backgroundColor = blankColor;
      self.viewer.SynapseOnMouseOut(synData.cellname, synData.contin);
    };
  }
  
  // add sorting functionality for each column
  let theadrow = thead.childNodes[0];

  // increasing or decreasing
  // order['z'] = 1 means sort by increasing z, -1 means dec
  // first time click set to 1
  let order = {};

  // each child repn one column
  theadrow.childNodes.forEach( (n, i) => {
    n.onclick = () => {
      // inc or dec?
      let col = n.innerHTML;
      if (order.hasOwnProperty(col)) {
        order[col] = -order[col];
      } else {
        order[col] = 1;
      }

      let rows = [...tbody.children];
      rows.sort((tr1, tr2) => {
        let v1 = tr1.children[i].innerHTML;
        let v2 = tr2.children[i].innerHTML;

        // check if number, parse
        // (else get '12' < '3' because lexico)
        let v1Num = parseInt(v1);
        if (!isNaN(v1Num)) {
          v1 = parseInt(v1);
          v2 = parseInt(v2);
        }
        if (v1 > v2) return 1;
        if (v1 < v2) return -1;
        return 0;
      });

      // reverse if dec
      if (order[col] === -1) {
        rows.reverse();
      }

      // remove all entries then add back in sorted order
      while (tbody.lastChild) {
        tbody.removeChild(tbody.lastChild);
      };
      for (const tr of rows) {
        tbody.appendChild(tr);
      }
    };
  });
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
 *
 * similar to AddHelpPanel,
 * the CSS classes are from bootstrap.css,
 * which is linked to bootstrap.js, which provides func'ty
 */
ImporterApp.prototype.AddSelectPanel = function(celltype) {
  const bigDiv = document.createElement('div');

  // large button, click to expand/collapse list
  const panelHeader = document.createElement('button');
  panelHeader.classList.add('panel-header'); // /css/importer.css
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


ImporterApp.prototype.ResizeOnlyCanvasLeft = function () {
  function SetWidth (elem, value) {
    elem.width = value;
    elem.style.width = value + 'px';
  }

  function SetHeight (elem, value) {
    elem.height = value;
    elem.style.height = value + 'px';
  }

  let headerNav = document.getElementById ('header-nav');
  let headerNavCollapse = document.getElementById ('btn-collapse-header-nav');

  let top = document.getElementById ('top'); // 'Help' etc
  let left = document.getElementById ('left');
  let canvas = this.GetCanvasElem();

  let height = window.innerHeight - top.offsetHeight - headerNav.offsetHeight - headerNavCollapse.offsetHeight - 10;


  SetHeight(left, height);

  SetHeight(canvas, height);
  SetWidth(canvas, document.body.clientWidth - left.offsetWidth);
};

ImporterApp.prototype.Resize = function () {
  this.ResizeOnlyCanvasLeft();
  this.dialog.Resize();
  this.viewer.resizeDisplayGL();
};


// translation = {x: .., y: .., z: ..}
ImporterApp.prototype.SetMapsTranslate = function(translation) {
  const xEl = document.getElementById('x-slider');
  const yEl = document.getElementById('y-slider');
  const zEl = document.getElementById('z-slider');

  xEl.value = translation.x;
  yEl.value = translation.y;
  zEl.value = translation.z;

  // trigger the usual function to update the viewer
  xEl.onchange();
  //yEl.onchange(); // all have same onchange()
  //zEl.onchange();
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


/*============================================
 * YH new and improved way of updating synapse info
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
 */

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
  document.getElementById('synInfoCellname').innerHTML
    = cellname;
  document.getElementById('synInfoType').innerHTML
    = synData.type;
  document.getElementById('synInfoSource').innerHTML
    = synData.pre;
  document.getElementById('synInfoTarget').innerHTML
    = synData.post;
  document.getElementById('synInfoWeight').innerHTML
    = synData.zHigh - synData.zLow + 1;
  document.getElementById('synInfoSections').innerHTML
    = `(${synData.zLow},${synData.zHigh})`;
  document.getElementById('synInfoContin').innerHTML
    = contin;
  document.getElementById('synInfoPosition').innerHTML
    = `x: ${pos.x}, y: ${pos.y}, z: ${pos.z}`;
};

/*
 * return synapse info to default values, all '---'
 * also sets synapse clicked to null
 */
ImporterApp.prototype.RestoreSynapseInfoToDefault2 = function() {
  this.synapseClicked.cellname = null;
  this.synapseClicked.contin = null;
  document.getElementById('synInfoCellname').innerHTML = '---';
  document.getElementById('synInfoType').innerHTML = '---';
  document.getElementById('synInfoSource').innerHTML = '---';
  document.getElementById('synInfoTarget').innerHTML = '---';
  document.getElementById('synInfoWeight').innerHTML = '---';
  document.getElementById('synInfoSections').innerHTML = '---';
  document.getElementById('synInfoContin').innerHTML = '---';
  document.getElementById('synInfoPosition').innerHTML = '---';
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

// content of maps section
ImporterApp.prototype.GetMapsContentDiv = function() {
  return document.getElementById('mapsContentDiv');
};

ImporterApp.prototype.GetTranslationSliderValue = function() {
  const pos = { x: 0, y: 0, z: 0 };
  for (const i of ['x','y','z']) {
    const slider = document.getElementById(i+'-slider');
    const val = parseInt(slider.value);
    pos[i] = val;
  }
  return pos;
};


//=====================================================
// Volumetric (testing phase)

ImporterApp.prototype.retrieveVolumetric = function(db, cell) {
  const self = this;
  const urlBase =
    `/apps/neuronVolume/models/${db}/`;
  const urlMtl = urlBase + cell + '.mtl';
  const urlObj = urlBase + cell + '.obj';

  // https://stackoverflow.com/questions/35380403/how-to-use-objloader-and-mtlloader-in-three-js-r74-and-later
  const mtlLoader = new THREE.MTLLoader();
  //mtlLoader.setPath(urlMtl);
  //mtlLoader.setResourcePath(urlBase); // MTLLoader.js says needs this
  mtlLoader.load(urlMtl, function(materials) {
    materials.preload();
    const objLoader = new THREE.OBJLoader();
    //objLoader.setPath(urlObj);
    objLoader.setMaterials(materials);
    objLoader.load(urlObj, function(object) {
      volumeObj = object; // for testing
      //const m = new THREE.Matrix4();
      //m.makeTranslation(-390,+276,0);
      //object.applyMatrix(m);
      //self.viewer.scene.add(object);

      // scales/translates appropriately
      self.viewer.loadVolumetric(db, cell, object);
    });
  });
};

// for testing
let volumeObj = null;


/*=======================================================
 * auxiliary stuff
 */

// expect hexStr of form either:
// #05f2Dc
// #06d --> #0066dd
function hexToRGB(hexStr) {
  const rgb = { r: 0, g: 0, b: 0};
  if (hexStr.length === 7) {
    rgb.r = parseInt(hexStr[1] + hexStr[2], 16);
    rgb.g = parseInt(hexStr[3] + hexStr[4], 16);
    rgb.b = parseInt(hexStr[5] + hexStr[6], 16);
  }
  else if (hexStr.length === 4) {
    rgb.r = parseInt(hexStr[1] + hexStr[1], 16);
    rgb.g = parseInt(hexStr[2] + hexStr[2], 16);
    rgb.b = parseInt(hexStr[3] + hexStr[3], 16);
  }
  else {
    rgb = null;
  }
  return rgb;
}
