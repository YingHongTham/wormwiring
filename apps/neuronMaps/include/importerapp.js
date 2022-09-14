/*
 * new version of ImporterApp,
 * where we expect index.html to have most of the elements,
 * and we just need to link functionality to those elements
 * (their values change, but the remain the same)
 * some HTML elements that are added here are:
 * -entries in the Maps section
 * -floating dialogs (in particular the cell selector)
 *
 * note confusing terminology:
 * series can refer to database N2U etc
 * or series may mean the regions of the worm, VC, NR etc..
 * we use database(db) to refer to the former,
 * but may sometimes still say series to refer to db
 * hopefully it's clear from context
 *
 * css used: /css/importer.css (mostly?)
 * class 'panel-group' is from bootstrap.css
 *
 * we organize into several sections (search *Section*)
 * -Initialization
 * -functionality for the top menu, e.g. Help, Select Cells..
 * -stuff when cell is loaded
 * -stuff handling window resize
 * -Synapse Info related things
 * -Filter Synapse
 * -Translate Maps related things
 * -getters/setters from/to HTML stuff
 * -Load/Save
 * -auxiliary stuff
 */


// required libraries/classes
if (celllistByDbType === undefined) {
  console.error('expect /apps/include/cellLists.js');
}
if (cellsWithVolumeModels === undefined) {
  console.error('expect /apps/include/cellModelList.js');
}
if (cellnameWALinkDict === undefined
    || cellnameToWALink === undefined) {
  console.error('expect /apps/include/wa_link.js');
}
if (helpDialogText === undefined) {
  console.error('expect ./helpDialogItems.js');
}
if (typeof(FloatingDialog) === undefined) {
  console.error('expect /apps/include/floatingdialog.js');
}
if (typeof(FloatingDialog2) === undefined) {
  console.error('expect /apps/include/floatingdialog-alt.js');
}

ImporterApp = function()
{
  // should agree with this.viewer.maps
  this.loadedCells = {};
  for (const db in celllistByDbType) {
    this.loadedCells[db] = [];
  }

  // these are set in InitCellSelectorDialog
  this.cellSelectorDialog = null;
  this.dbDivForm = null;
  this.dbDivFormNames = null;

  // set when 2D Viewer is opened;
  // reset to null when closed
  this.dialog2DViewer = null;

  // object dealing with the viewer inside canvas
  // it holds most of the data, like the skeleton maps,
  // synapses, volume objects etc.
  // initialized properly in InitViewerStuff()
  // for debugging purposes, useful to access in console
  // e.g. importerApp.viewer.dbMaps['N2U']['ADAL'].allSynData..
  this.viewer = null;

  // the small floating window in which
  // help/selector/2Dviewer/synapseviewer is shown
  this.dialog = new FloatingDialog();

  // FloatingDialog2 objects for each cell,
  // showing the list of synapses
  this.synapseListWindows = {};
  for (const db in celllistByDbType) {
    // key = cell, value = FloatingDialog2 object
    this.synapseListWindows[db] = {};
    // created when cell is loaded
  }

  // array of filters that have so far been imposed
  this.synapseFilters = [];

  // db sections (under maps section)
  // (set to refer to HTML divs in
  //  InitLinkFunctionalityWithHTML())
  this.dbSection = {};

  // more intialization; but no new member variables declared
  this.Init();
};

//======================================================
// *Section*: Initialization


/*
 * most of the HTML is already there
 * (unlike in the original importerapp.js)
 * Init() adds functionality to stuff
 */
ImporterApp.prototype.Init = function ()
{
  this.InitViewerStuff();
  this.InitLinkFunctionalityWithHTML();

  this.retrieveVolumetric('N2U','PARTIAL_REDUCED_COMBINED_REDUCED_25');
  this.retrieveVolumetric('JSH','PARTIAL_REDUCED_COMBINED_50_smoothed');
  this.retrieveVolumetric('n2y','PARTIAL_REDUCED_COMBINED_50');
};


ImporterApp.prototype.InitViewerStuff = function() {
  // need to resize canvas before init viewer
  // since initially canvas.width and height are 0
  this.ResizeOnlyCanvasLeft();

  const canvas = this.GetCanvasElem();
  
  this.viewer = new MapViewer(canvas, this);

  const self = this;
  let render = function() {
    requestAnimationFrame(render);
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

  this.InitHelpDialog();
  this.InitCellSelectorDialog();
  // 2D Viewer is created and loaded each time opened

  // set up the top menu, Help, cell selector etc.
  const topElem = document.getElementById ('top');
  const topItems = topElem.children;
  topItems[0].onclick = () => {
    this.helpDialog.OpenWindow(); };
  topItems[1].onclick = () => { 
    self.updateFormsInCellSelectorDialog();
    self.cellSelectorDialog.OpenWindow();
  };
  topItems[2].onclick = () => { this.Open2DViewer(); };
  topItems[3].onclick = () => { this.ClearMaps(); };

  //================================
  // link buttons in Synapse Info

  // left/right buttons for cycling through clicked synapses
  const clickedSynapsesLeft = document.getElementById('clickedSynapsesLeft');
  const clickedSynapsesRight = document.getElementById('clickedSynapsesRight');
  clickedSynapsesLeft.onclick = () => {
    self.viewer.CycleClickedSynapseLeft();
    self.RestoreSynapseInfoLastClicked();
  };
  clickedSynapsesRight.onclick = () => {
    self.viewer.CycleClickedSynapseRight();
    self.RestoreSynapseInfoLastClicked();
  };

  // button for opening Synapse Viewer in separate window
  const openSynapseEMViewer = document.getElementById('openSynapseEMViewer');
  openSynapseEMViewer.onclick = () => {
    const syn = this.viewer.LastClickedSynapse();
    if (syn === null) {
      this.RestoreSynapseInfoToDefault2();
      return;
    }
    const db = syn.db;
    const contin = syn.contin;
    if (contin === null) return;
    const url = `/apps/synapseViewer/?db=${db}&continNum=${contin}`;
    const a = document.createElement('a');
    a.target = '_blank';
    a.href = url;
    a.click();
  };
  
  // moves camera and targets camera at synapse
  const centerViewOnSynapse = document.getElementById('centerViewOnSynapse');
  centerViewOnSynapse.onclick = () => {
    const syn = this.viewer.LastClickedSynapse();
    if (syn === null) return;

    const db = syn.db;
    const cell = syn.cell;
    const contin = syn.contin;
    self.viewer.CenterViewOnSynapse(db,cell,contin);
  };

  //===============================
  // link synapse filter, add button functionality
  const synFilterBtnFilter = document.getElementById('synFilterBtnFilter');
  synFilterBtnFilter.onclick = () => {
    // get the values from HTML
    // set to null if not used
    const filters = {};

    // get types
    filters.types = self.GetSynFilterType();

    // get size range
    filters.sizeRange = self.GetSynFilterSizeRange();

    // get cells
    filters.cells = self.GetSynFilterCells();

    // get contins
    filters.contins = self.GetSynFilterContins();

    if (filters.types === null
      && filters.sizeRange === null
      && filters.cells === null
      && filters.contins === null) {
      // nothing to filter
      return;
    }

    // record the filter
    self.synapseFilters.push(filters);

    // viewer performs filtering
    self.viewer.FilterSynapses(filters);

    // add entry in the 'current filters'
    self.AddToCurrentFilters(filters);

    // filter synapse list (in the floating window)
    self.SynapseListFilterByVis();
  };

  // Restore
  const synFilterBtnRestore = document.getElementById('synFilterBtnRestore');
  synFilterBtnRestore.onclick = () => {
    self.synapseFilters = [];
    self.RestoreFilterSynapse();
    self.viewer.RestoreSynapses();
    self.SynapseListClearFilter();
  };

  //===============================
  // link Scale Synapses section

  const sliderSynScale = document.getElementById('slider-scale-synapses');
  const sliderSynScaleShowVal = document.getElementById('slider-scale-synapses-show-value');
  sliderSynScale.onchange = sliderSynScale.onmousemove = () => {
    let scale = parseFloat(sliderSynScale.value) / 4;
    if (scale >= 0) {
      scale += 1;
      self.viewer.ScaleSynapses(scale);
      sliderSynScaleShowVal.innerHTML = `x${scale}`;
    }
    else {
      scale = Math.abs(scale) + 1;
      self.viewer.ScaleSynapses(1.0 / scale);
      sliderSynScaleShowVal.innerHTML = `&#247;${scale}`;
    }
  };

  //===============================
  // link Translate Maps sliders and the select option

  // hide/show translation sliders based on selection
  const translateMapsDbSelector = document.getElementById('translate-maps-dbselector');
  translateMapsDbSelector.onchange = () => {
    // hide all divs for sliders
    for (const db in celllistByDbType) {
      const div = document.getElementById(`translateMaps-${db}`);
      div.style.display = 'none';
    }
    // don't forget the all one
    const allDiv = document.getElementById('translateMaps-All');
    allDiv.style.display = 'none';

    // now show selected sliders
    const val = translateMapsDbSelector.value;
    const div = document.getElementById(`translateMaps-${val}`);
    div.style.display = '';
  };
  translateMapsDbSelector.onchange();

  //=================================
  // now do translation sliders
  for (const i of ['x','y','z']) {
    const slider = document.getElementById(i+'-slider-All');
    slider.onmousemove = slider.onmouseup = () => {
      self.SetTranslationNumber(null,self.GetTranslationSlider());
      self.ApplyTranslateToViewer();
    };
    slider.onmousemove();
  }
  for (const db in celllistByDbType) {
    for (const i of ['x','y','z']) {
      const slider = document.getElementById(i+'-slider-'+db);
      slider.onmousemove = slider.onmouseup = () => {
        self.SetTranslationNumber(db,self.GetTranslationSlider(db));
        self.ApplyTranslateToViewer(db);
      };
      slider.onmousemove();
    }
  }
  //=================================
  // now do translation number input
  for (const i of ['x','y','z']) {
    const numInput = document.getElementById(i+'-number-All');
    numInput.onchange = () => {
      self.SetTranslationSlider(null,self.GetTranslationNumber());
      self.ApplyTranslateToViewer();
    };
    numInput.onchange();
  }
  for (const db in celllistByDbType) {
    for (const i of ['x','y','z']) {
      const numInput = document.getElementById(i+'-number-'+db);
      numInput.onchange = () => {
        self.SetTranslationSlider(db,self.GetTranslationNumber(db));
        self.ApplyTranslateToViewer(db);
      };
      numInput.onchange();
    }
  }


  //================================
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

  const btnToggleAggregateVolume = document.getElementById('btnToggleAggregateVolume');
  btnToggleAggregateVolume.onclick = () => {
    const on = btnToggleAggregateVolume.value === 'on';
    btnToggleAggregateVolume.value = !on ? 'on' : 'off';
    btnToggleAggregateVolume.innerHTML = !on ? 'Hide Aggregate Volume' : 'Show Aggregate Volume';
    console.log('on: ', on);
    self.viewer.ToggleAllAggregateVolume(!on);
  };

  //================================
  // link Load/Save

  const inputLoad = document.getElementById('LoadFromFileInput');
  inputLoad.onchange = () => this.LoadFromFile();
  const btnSave = document.getElementById('SaveToFileButton');
  btnSave.onclick = () => this.SaveToFile();

  //================================
  // link Camera Options section

  // first the camera target sphere
  const toggleCameraTargetSphere = 
    document.getElementById('toggleCameraTargetSphere');
  toggleCameraTargetSphere.onclick = () => {
    let vis = self.viewer.cameraTargetSphere.visible;
    vis = !vis;
    toggleCameraTargetSphere.innerHTML = vis ?
      'Hide Camera Target' : 'Show Camera Target';
    self.viewer.cameraTargetSphere.visible = vis;
  };

  // now each direction
  const magnitude = 100;
  const translateCameraUp =
    document.getElementById('translateCameraUp');
  translateCameraUp.onclick = () => {
    self.viewer.MoveCameraUp(magnitude);
  };

  const translateCameraDown =
    document.getElementById('translateCameraDown');
  translateCameraDown.onclick = () => {
    self.viewer.MoveCameraDown(magnitude);
  };

  const translateCameraLeft =
    document.getElementById('translateCameraLeft');
  translateCameraLeft.onclick = () => {
    self.viewer.MoveCameraLeft(magnitude);
  };

  const translateCameraRight =
    document.getElementById('translateCameraRight');
  translateCameraRight.onclick = () => {
    self.viewer.MoveCameraRight(magnitude);
  };

  const translateCameraBackward =
    document.getElementById('translateCameraBackward');
  translateCameraBackward.onclick = () => {
    self.viewer.MoveCameraBackward(magnitude);
  };

  const translateCameraForward =
    document.getElementById('translateCameraForward');
  translateCameraForward.onclick = () => {
    self.viewer.MoveCameraForward(magnitude);
  };

  const cameraOptionsZoomIn =
    document.getElementById('cameraOptionsZoomIn');
  cameraOptionsZoomIn .onclick = () => {
    self.viewer.CameraZoom(0.8);
  };

  const cameraOptionsZoomOut =
    document.getElementById('cameraOptionsZoomOut');
  cameraOptionsZoomOut.onclick = () => {
    self.viewer.CameraZoom(1.25);
  };
};


// used to be PreloadCells2
ImporterApp.prototype.LoadDbCell = function(db, cell)
{
  // update the series selector in menu
  this.SetSeriesToHTML(db);

  this.LoadMap(db,cell);
};



//=========================================================
// *Section*: functionality for the top menu
// Help, Select Cells, 2D Viewer, Clear Maps


ImporterApp.prototype.InitHelpDialog = function(cellname) {
  const dialog = new FloatingDialog2(
    parent=null,
    title='Help',
    isHidden=true,
    modal=false
  );
  this.helpDialog = dialog;

  dialog.SetWidthHeight(500,null);
  
  const contentDiv = dialog.GetContentDiv();
  contentDiv.innerHTML = helpDialogText;
};


/*
 * expected HTML:
 *  <div> -- contentDiv from FloatingDialog2
 *    <label> Choose a database/series: </label>
 *    <select> -- dbSelector
 *      <option> N2U etc </option>
 *    </select>
 *    <button> Load </button>
 *    <br/>
 *    <span>(Cells with volume are underlined)</span>
 *    <div id='cellListDiv-N2U'> -- dbDiv['N2U']
 *      <form name='cellListDiv-N2U-form'> -- dbDivForm['N2U']
 *        <span> neuron </span>
 *        <div> -- typeDiv
 *          <label>
 *            <input name='cellListDiv-N2U-form' value='ADAL' ..>
 *            <span> ADAL </span>
 *          </label>
 *          ...
 *        </div>
 *        <span> muscle </span>
 *        <div> -- typeDiv
 *          ...
 *        </div>
 *      </form>
 *    </div>
 *  </div>
 */
ImporterApp.prototype.InitCellSelectorDialog = function() {
  this.cellSelectorDialog = new FloatingDialog2(
    parent=null,
    title='Add Cells',
    isHidden=true,
    modal=true
  );

  this.cellSelectorDialog.SetWidthHeight(400, null);

  const contentDiv = this.cellSelectorDialog.GetContentDiv();

  const dbDiv = {}; // ref to each div
  const dbDivID = {}; // id of div containing cells in a db
  const dbDivForm = {}; // form for db
  const dbDivFormNames = {}; // names of form for db
  this.dbDivForm = dbDivForm;
  this.dbDivFormNames = dbDivFormNames;

  //======================================
  // selector for db

  const dbSelectorLabel = document.createElement('label');
  contentDiv.appendChild(dbSelectorLabel);
  dbSelectorLabel.innerHTML = 'Choose a database/series:';

  const dbSelector = document.createElement('select');
  contentDiv.appendChild(dbSelector);

  dbSelector.id = 'dbSelector';

  for (const db in celllistByDbType) {
    const option = document.createElement('option');
    option.innerHTML = db;
    option.value = db;
    dbSelector.appendChild(option);

    dbDivID[db] = `cellListDiv-${db}`;
  }


  //======================================
  // button for loading
  const loadButton = document.createElement('button');
  contentDiv.appendChild(loadButton);

  loadButton.innerHTML = 'Load';
  loadButton.style.float = 'right';
  const self = this;
  loadButton.onclick = () => {
    for (const db in self.dbDivFormNames) {
      const formName = self.dbDivFormNames[db];
      const checkedBoxes = document.querySelectorAll(
          `input[name=${formName}]:checked`);
      for (const node of checkedBoxes) {
        self.LoadMap(db, node.value);
      }
    }
    self.cellSelectorDialog.CloseWindow();
  };

  //======================
  // help text explaining volume cells are underlined

  const br = document.createElement('br');
  contentDiv.appendChild(br);

  const helpText = document.createElement('span');
  contentDiv.appendChild(helpText);
  helpText.innerHTML = '(Cells with volume are underlined)';

  //======================
  // divs for each db
  for (const db in celllistByDbType) {
    dbDiv[db] = document.createElement('div');
    dbDivID[db] = `cellListDiv-${db}`;
    dbDiv[db].id = dbDivID[db];
    contentDiv.appendChild(dbDiv[db]);
  }

  //======================
  // create form for each db,
  // and then one subdiv for each type (neuron/muscle)
  // and then populate form with cells
  for (const db in celllistByDbType) {
    const div = dbDiv[db];

    const form = document.createElement('form');
    div.appendChild(form);

    dbDivForm[db] = form;
    dbDivFormNames[db] = dbDivID[db] + '-form';
    form.name = dbDivFormNames[db];

    // type = 'neuron' or 'muscle'
    for (const type in celllistByDbType[db]) {
      const span = document.createElement('span');
      form.appendChild(span);

      span.innerHTML = type;
      span.style.display = 'inline-block';
      span.style.fontWeight = 'bold';
      //span.style.float = 'left';

      const typeDiv = document.createElement('div');
      form.appendChild(typeDiv);

      const celllist = celllistByDbType[db][type];

      for (const cell of celllist) {
        const input = document.createElement('input');
        const cellSpan = document.createElement('span');
        const label = document.createElement('label');

        typeDiv.appendChild(label);
        label.appendChild(input);
        label.appendChild(cellSpan);

        // input given css in ../css/listViewer-alt.css
        // makes cellSpan turn bold when clicked
        input.type = 'checkbox';
        input.name = dbDivFormNames[db];
        input.value = cell;

        if (cellsWithVolumeModels.hasOwnProperty(db)
          && cellsWithVolumeModels[db].includes(cell)) {
          cellSpan.innerHTML = `<u>${cell}</u>`;
        }
        else {
          cellSpan.innerHTML = cell;
        }

        label.style.width = '100px';
        label.style.display = 'inline-block';
        //label.style.float = 'left';
      }
    }
  }

  dbSelector.onchange = () => {
    // hide all forms except the one selected
    for (const db in dbDivID) {
      const div = document.getElementById(dbDivID[db]);
      div.style.display = 'none';
    }
    const div = document.getElementById(dbDivID[dbSelector.value]);
    div.style.display = '';
  };
  

  // the divs above were added as visible,
  // call 'onchange' manually
  setTimeout(() => {
    dbSelector.onchange();
  }, 0);
};

// called before cell selector dialog opens,
// make sure the form matches the loaded cells
// (form and loaded cells out of sync when:
// -preload cell from url
// -user clicks some cells in dialog, but doesn't load them)
ImporterApp.prototype.updateFormsInCellSelectorDialog = function() {
  for (const db in this.dbDivFormNames) {
    const formName = this.dbDivFormNames[db];
    const checkedBoxes = document.querySelectorAll(
        `input[name=${formName}]`);
    for (const node of checkedBoxes) {
      node.checked = this.loadedCells[db].includes(node.value);
    }
  }
};


/*
 * loads, creates 2D viewer in floating dialog
 * reference to dialog stored as this.dialog2DViewer
 * dialog is deleted when closed
 * (and this.dialog2DViewer is set to null when deleted,
 * helps prevent opening mulitple windows of 2D Viewer)
 */
ImporterApp.prototype.Open2DViewer = function() {
  if (this.dialog2DViewer !== null) {
    // means there is still an active 2D Viewer dialog open
    return;
  }
  const dialog = new FloatingDialog2(
    parent=null,
    title='2D Viewer',
    isHidden=true,
    modal=false
  );
  dialog.SetDeleteWhenCloseWindow();
  this.dialog2DViewer = dialog;

  const self = this;
  dialog.SetCallbackBeforeClose(() => {
    self.dialog2DViewer = null;
  });

  dialog.SetWidthHeight(500,null);
  
  const contentDiv = dialog.GetContentDiv();

  // unclear why this extra div is needed,
  // but it works! so don't get rid of this
  const innerDiv = document.createElement('div');
  innerDiv.id = 'innerDiv';
  const h = dialog.ComputeHeight() - dialog.barHeight;
  const w = 500 - 5;
  innerDiv.style = `height:${h}px;width:${w}px`;
  this.viewer.load2DViewer(innerDiv);
  contentDiv.appendChild(innerDiv);

  dialog.OpenWindow();
};

ImporterApp.prototype.ClearMaps = function() {
  for (const db in celllistByDbType) {
    const dbTitleDiv = this.GetDbTitleDiv(db);
    dbTitleDiv.style.display = 'none';

    const dbContentDiv = this.GetDbContentDiv(db);
    while(dbContentDiv.lastChild) {
      dbContentDiv.removeChild(dbContentDiv.lastChild);
    }
  }
  for (const db in celllistByDbType) {
    this.loadedCells[db] = [];
  }
  this.viewer.clearMaps();
};


//=======================================================
// *Section*: Stuff when cell is loaded

/*
 * calls retrieveSkeletonMaps.php
 * and passes data to viewer to load
 *
 * @param {String} db - name of database
 * @param {String} cell - name of cell
 * @param {Object} postParams - optional parameters for
 *                              after cell loaded:
 *                              color, cameraSettings
 */
ImporterApp.prototype.LoadMap = function(db,cell,postParams=null)
{
  // already loaded?
  if (this.loadedCells[db].includes(cell)) {
    return;
  }
  this.loadedCells[db].push(cell);

  console.log(db,cell,postParams);

  const self = this;
  const url = `../php/retrieveSkeletonMaps.php?db=${db}&cell=${cell}`;
  console.log('retrieving skeleton map via '+url);
  const xhttp = new XMLHttpRequest();    
  console.time(`Retrieve ${cell}`);
  xhttp.onreadystatechange = function(){
    if (this.readyState == 4 && this.status == 200){
      console.timeEnd(`Retrieve ${cell}`);
      console.time(`Load to viewer ${cell}`);

      let data = JSON.parse(this.responseText);
      self.viewer.loadMap(data);
      if (cellsWithVolumeModels.hasOwnProperty(db) && 
          cellsWithVolumeModels[db].includes(cell)) {
        self.LoadMapMenu(db,cell);
        self.retrieveVolumetric(db, cell); // async
      }
      else {
        console.log('volume not available');
        self.LoadMapMenu(db,cell);
      }
      console.timeEnd(`Load to viewer ${cell}`);
      
      // apply postParams

      if (postParams === null) {
        return;
      }

      if (postParams.hasOwnProperty('color')) {
        self.viewer.SetSkeletonColor(db,cell,postParams.color);
        self.SetColorToHTML(db,cell,postParams.color);
      }
      
      if (postParams.hasOwnProperty('cameraSettings')) {
        self.viewer.SetCameraFromJSON(postParams.cameraSettings);
      }

      if (postParams.hasOwnProperty('synapseFilters')) {
        this.synapseFilters = postParams.synapseFilters;
        for (const filters of postParams.synapseFilters) {
          console.log(filters);
          // viewer performs filtering
          self.viewer.FilterSynapses(filters);
          // we leave the adding of entry in 'current filters'
          // to the LoadFromFile function
          // (otherwise each call of LoadMap would
          // add a copy of these synapse filters)
          //self.AddToCurrentFilters(filters);
        }
        // filter synapse list (in the floating window)
        self.SynapseListFilterByVis();
      }

      //document.dispatchEvent(new CustomEvent('loadMapComplete', {
      //  detail: {
      //    db: db,
      //    cell: cell,
      //  }
      //}));
    }
  };
  xhttp.open("GET",url,true);
  xhttp.send();
};

/*
 * loads menu entry for cell in 'Maps'
 * assumes loadMap has been run
 * (mainly for the skeleton color;
 * if really want, can just get the default value
 * from viewer)
 *
 * @param {String} db - database/series
 * @param {String} cellname - name of cell
 *
 * each cell entry should be of the form:
 *  <div> // div
 *    <div>Cellname</div> // title
 *    <div> // content
 *      <ul>
 *        <li><span>Color Selector:<br></span>
 *            Skel.: <input type='color'>
 *            Vol.: <input type='color'>
 *        <li></div>
 *        <li><button>Synapse List</button>
 *        <li><button>Hide Cell</button>
 *        <li><button>Show Remarks</button>
 *        <li><button>Center View</button>
 *        <li><button>Hide Volume</button>
 *        <li><a>WormAtlas</a>
 *        <li><a>Synapse By Partners</a>
 *      </ul>
 *    </div>
 *  </div>
 *
 * adds to the section for db,
 * (creates section if first time)
 */
ImporterApp.prototype.LoadMapMenu = function(db,cellname) {
  console.log('in loadmapmenu', db, cellname);
  const self = this;
  const dbTitleDiv = this.GetDbTitleDiv(db);
  dbTitleDiv.style.display = '';

  const dbContentDiv = this.GetDbContentDiv(db);

  const div = document.createElement('div');
  const title = document.createElement('div');
  const content = document.createElement('div');

  dbContentDiv.appendChild(div);
  div.appendChild(title);
  div.appendChild(content);

  const image = document.createElement('img');
  title.appendChild(image);

  const ul = document.createElement('ul');
  ul.style.paddingLeft = '20px';

  const colorDiv = document.createElement('div');
  const colorSpan = document.createElement('span');
  const colorInput = document.createElement('input');
  const colorInputVol = document.createElement('input');
  const synapseListBtn = document.createElement('button');
  const cellBtn = document.createElement('button');
  const centerViewBtn = document.createElement('button');
  const remarksBtn = document.createElement('button');
  const volumeBtn = document.createElement('button');
  const walinkA = document.createElement('a');
  const synPartnerListA = document.createElement('a');

  content.appendChild(ul);
  colorDiv.appendChild(colorSpan);
  colorDiv.append('Skeleton:');
  colorDiv.appendChild(colorInput);
  colorDiv.appendChild(document.createElement('br'));
  colorDiv.append('Volume:');
  colorDiv.appendChild(colorInputVol);

  const listItems = [
    colorDiv,
    synapseListBtn,
    cellBtn,
    centerViewBtn,
    remarksBtn,
    volumeBtn,
    walinkA,
    synPartnerListA
  ];

  for (const elem of listItems) {
    const li = document.createElement('li');
    ul.appendChild(li);
    li.appendChild(elem);
  }

  //===============================
  // add accordion functionality
  div.classList.add('accordionSection');
  content.classList.add('sectionContent');

  content.classList.add('collapse');
  content.id = `${db}-${cellname}-mapMenuItem`;

  title.classList.add('sectionTitle');
  title.setAttribute('data-toggle','collapse');
  title.setAttribute('data-target','#'+content.id);
  title.setAttribute('role','button');
  title.setAttribute('aria-expanded','false');

  //===============================
  // structure done,
  // now we customize the text/buttons

  title.append(cellname);

  //===============================
  // eye image for visibility
  // also have entry because may not be obvious
	image.src = 'images/visible.png';
  cellBtn.innerHTML = 'Hide Cell';

  image.onclick = cellBtn.onclick = (e) => {
    e.stopPropagation(); // prevent title being clicked
    const vis = !self.viewer.mapIsVisible(db,cellname);
    self.viewer.toggleMaps(db,cellname,vis);
    image.src = vis ? 'images/visible.png' : 'images/hidden.png';
    cellBtn.innerHTML = vis ? 'Hide Cell' : 'Show Cell';
  };

  //===============================
  // Synapse List
  this.InitSynapseListWindow(db,cellname); // creates, hidden

  synapseListBtn.innerHTML = 'Synapse List';
  synapseListBtn.onclick = () => {
    self.synapseListWindows[db][cellname].OpenWindow();
  };

  //===============================
  // now do each item in content

  //===============================
  // color span/input
  colorSpan.innerHTML = 'Color Selector:<br>';
  colorInput.type = 'color';
  colorInput.style.height = '5px';
  colorInput.id = `color-selector-${db}-${cellname}`;

  colorInputVol.type = 'color';
  colorInputVol.style.height = '5px';
  colorInputVol.id = `color-selector-volume-${db}-${cellname}`;

  // get color of cell from viewer,
  // transform to appropriate format
  let color = this.viewer.GetSkeletonColor(db,cellname);
  this.SetColorToHTML(db,cellname,color);

  colorInput.addEventListener('change', (ev) => {
    const color = ev.target.value; // hex value
    self.viewer.SetSkeletonColorHex(db,cellname,color);
  }, false);

  // get color of volume from viewer,
  // transform to appropriate format
  // (done again at end of retrieveVolumetric;
  // seems that runs sooner than this sometimes)
  let colorVol = this.viewer.GetVolumeColor(db,cellname);
  this.SetColorVolumeToHTML(db,cellname,colorVol);

  colorInputVol.addEventListener('change', (ev) => {
    const color = ev.target.value; // hex value
    self.viewer.SetVolumeColorHex(db,cellname,color);
  }, false);


  //===============================
  // button for centering view on cell
  centerViewBtn.innerHTML = 'Center View';
  //centerViewBtn.classList.add('mapBtn');
  centerViewBtn.onclick = () => {
    self.viewer.CenterViewOnCell(db,cellname);
  };
  
  //===============================
  // show/hide remarks
  remarksBtn.innerHTML = 'Show Remarks';
  remarksBtn.onclick = () => {
    const remarkVis = self.viewer.isCellLoaded(db,cellname) ?
      self.viewer.GetRemarkVis(db,cellname) : false;
    remarksBtn.innerHTML = !remarkVis ? 'Hide Remarks' : 'Show Remarks';
    self.viewer.toggleRemarksByCell(db,cellname,!remarkVis);
  };

  //===============================
  // show/hide volumetric
  if (cellsWithVolumeModels.hasOwnProperty(db) && 
    cellsWithVolumeModels[db].includes(cellname)) {
    volumeBtn.innerHTML = 'Hide Volume';
    volumeBtn.onclick = () => {
      const volumeVis = self.viewer.GetVolumeVis(db,cellname);
      //if (volumeVis === null || volumeVis === undefined) {
      volumeBtn.innerHTML = !volumeVis ? 'Hide Volume' : 'Show Volume';
      self.viewer.ToggleVolumeByCell(db,cellname,!volumeVis);
    };
  }
  else {
    volumeBtn.innerHTML = 'Volume Unavailable';
  }

  //===============================
  // WormAtlas link
  walinkA.innerHTML = 'WormAtlas';
  walinkA.target = '_blank';
  const walinkUrl = cellnameToWALink(cellname);
  walinkA.href = walinkUrl;

  //===============================
  // Synapse By Partners
  synPartnerListA.innerHTML = 'Synapse By Partners';
  synPartnerListA.target = '_blank';
  const synParterListUrl = `../listViewer/?db=${db}&cell=${cellname}&listtype=partner`;
  synPartnerListA.href = synParterListUrl;
};

/*
 * assumes loadMap is done
 * (meant to be used in LoadMapMenu which is after loadMap
 *
 * initializes the floating dialog that houses
 * the Synapse List
 * populates the dialog with a single table
 */
ImporterApp.prototype.InitSynapseListWindow = function(db,cellname) {
  this.viewer.maps = this.viewer.dbMaps[db];

  const dialog = new FloatingDialog2(
    parent=null,
    title=`${db} ${cellname}`,
    isHidden=true,
    modal=false
  );
  this.synapseListWindows[db][cellname] = dialog;

  // form table of synapses

  let table = document.createElement('table');
  let thead = document.createElement('thead');
  let tbody = document.createElement('tbody');
  let tr = document.createElement('tr');

  dialog.GetContentDiv().appendChild(table);
  table.appendChild(thead);
  table.appendChild(tbody);
  thead.appendChild(tr);

  table.style.color = '#000000';

  // add entry for each column head in head row
  for (const col of ['z','type','id','cells']) {
    let th = document.createElement('th');
    th.innerHTML = col;
    tr.appendChild(th);
    
    // later add onclick, which sorts rows by that column
    th.onmouseover = () => {
      th.style.backgroundColor = 'rgba(0,0,0,0.5)';
    };
    th.onmouseout = () => {
      th.style.backgroundColor = '#FFFFFF';
    };
  }

  //==============================
  // prepare list of synapses

  let allSynList = []; // allSynData values, but need to sort
  let map = this.viewer.dbMaps[db][cellname];
  for (const contin in map.allSynData) {
    allSynList.push(map.allSynData[contin]);
  }
  allSynList.sort((synData1, synData2) => {
    const pos1 = synData1.coord;
    const pos2 = synData2.coord;
    return pos1.z - pos2.z;
  });

  //===============================
  // add rows
  for (const synData of allSynList) {
    const row = document.createElement('tr');
    const tdZ = document.createElement('td');
    const tdType = document.createElement('td');
    const tdContin = document.createElement('td');
    const tdCells = document.createElement('td');

    // order of appending is important,
    // as this will be used to identify synapse by
    // contin number when perform filter
    tbody.appendChild(row);
    row.appendChild(tdZ);
    row.appendChild(tdType);
    row.appendChild(tdContin);
    row.appendChild(tdCells);

    tdZ.innerHTML = synData.coord.z;
    tdType.innerHTML = synData.type;
    tdContin.innerHTML = synData.contin;
    tdCells.innerHTML = synData.partners;

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
      self.viewer.SynapseOnClick(db,synData.cellname, synData.contin);
      self.viewer.CenterViewOnSynapse(db,synData.cellname, synData.contin);
    };
    row.onmouseover = () => {
      row.style.backgroundColor = highlightColor;
      self.viewer.SynapseOnMouseOver(db,synData.cellname, synData.contin);
    };
    row.onmouseout = () => {
      row.style.backgroundColor = blankColor;
      self.viewer.SynapseOnMouseOut(db,synData.cellname, synData.contin);
    };
  }
  
  //===============================
  // add sorting functionality for each column
  let theadrow = thead.childNodes[0];

  // increasing or decreasing
  // order['z'] = 1 means sort by increasing z, -1 means dec
  // first time click set to 1
  let order = {};

  // each child repn one column
  theadrow.childNodes.forEach( (n, i) => {
    n.onclick = () => {
      let col = n.innerHTML;

      // determine inc or dec
      if (order.hasOwnProperty(col)) {
        order[col] = -order[col];
      } else {
        order[col] = 1;
      }

      let rows = [...tbody.children];
      rows.sort((tr1, tr2) => {
        // first sort by inc in col, later reverse if dec
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

  setTimeout(() => {
    dialog.FitWidthToContent();
  }, 0);
};


ImporterApp.prototype.retrieveVolumetric = function(db, cell) {
  const self = this;
  const urlBase =
    `/apps/neuronVolume/models/${db}/`;
  const urlMtl = urlBase + cell + '.mtl';
  const urlObj = urlBase + cell + '.obj';

  // see https://stackoverflow.com/questions/35380403/how-to-use-objloader-and-mtlloader-in-three-js-r74-and-later
  const mtlLoader = new THREE.MTLLoader();
  
  mtlLoader.load(urlMtl, function(materials) {
    materials.preload();
    const objLoader = new THREE.OBJLoader();
    objLoader.setMaterials(materials);
    objLoader.load(urlObj, function(object) {
      // sends object to viewer
      self.viewer.loadVolumetric(db,cell,object);

      // set color in map menu
      setTimeout(() => {
        let colorVol = self.viewer.GetVolumeColor(db,cell);
        self.SetColorVolumeToHTML(db,cell,colorVol);
      }, 0);
    });
  });
};



//===============================
// *Section*: Resize business

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



//===============================================
// *Section*: Synapse Info section
// shows info about synapse that mouse is hovering over,
// but if mouse not hovering over any synapse,
// returns it to info on synapse that was last shown here
// (or --- if synapses are unclicked)
// user can select multiple synapses,
// and go through them in the info section with arrows


// set synapse info section to before hover
ImporterApp.prototype.RestoreSynapseInfoLastClicked = function() {
  const syn = this.viewer.LastClickedSynapse();
  if (syn === null) {
    this.RestoreSynapseInfoToDefault2();
    return;
  }
  let db = syn.db;
  let cell = syn.cell;
  let contin = syn.contin;
  this.UpdateSynapseInfo(db,cell,contin);
};

/*
 * update the synapse info section of menu
 * used directly when user hovers
 *
 * gets data from viewer
 *
 * @param {String} db - database/series
 * @param {String} cellname - cell on which synapse sits
 * @param {Number} contin - contin number of synapse
 */
ImporterApp.prototype.UpdateSynapseInfo = function(db,cellname,contin) {
  if (contin === null) {
    // in our use cases this shouldn't happen
    this.RestoreSynapseInfoToDefault2();
    return;
  }
  console.log(db,cellname,contin);
  const synData = this.viewer.GetSynData(db,cellname,contin);
  const pos = synData.coord;
  document.getElementById('synInfoType').innerHTML
    = synData.type === 'gap' ? 'Electrical' : 'Chemical';
  document.getElementById('synInfoPartners').innerHTML
    = synData.partners;
  document.getElementById('synInfoWeight').innerHTML
    = synData.size;
  document.getElementById('synInfoSections').innerHTML
    = `(${synData.zLow},${synData.zHigh})`;
  document.getElementById('synInfoContin').innerHTML
    = contin;
  let x = Math.round(pos.x * 10) / 10;
  let y = Math.round(pos.y * 10) / 10;
  let z = Math.round(pos.z * 10) / 10;
  document.getElementById('synInfoPosition').innerHTML
    = `x: ${x}, y: ${y}, z: ${z}`;
};

/*
 * return synapse info to default values, all '---'
 * also sets synapse clicked to null
 */
ImporterApp.prototype.RestoreSynapseInfoToDefault2 = function() {
  document.getElementById('synInfoType').innerHTML = '---';
  document.getElementById('synInfoPartners').innerHTML = '---';
  document.getElementById('synInfoWeight').innerHTML = '---';
  document.getElementById('synInfoSections').innerHTML = '---';
  document.getElementById('synInfoContin').innerHTML = '---';
  document.getElementById('synInfoPosition').innerHTML = '---';
};

//=======================================================
// *Section*: Filter Synapse
// deals purely with HTML (except SynapseListFilterByVis)
// relation to viewer is set up in initialization
// (see InitLinkFunctionalityWithHTML,
// subsection on synapse filter)

// returns array of types or null if empty
ImporterApp.prototype.GetSynFilterType = function() {
  let typesSelected = [];
  const synFilterTypeNodes = document.querySelectorAll(`input[name='synFilterType']:checked`);
  synFilterTypeNodes.forEach( nn => {
    typesSelected.push(nn.value);
  });
  if (typesSelected.length === 0) {
    typesSelected = null;
  }
  return typesSelected;
};
// returns { min: , max: } or null if both not given
ImporterApp.prototype.GetSynFilterSizeRange = function() {
  const synFilterSizeMin = document.getElementById('synFilterSizeMin');
  const synFilterSizeMax = document.getElementById('synFilterSizeMax');

  let sizeRange = {};
  let minValue = parseInt(synFilterSizeMin.value);
  sizeRange.min = isNaN(minValue) ? null : minValue;
  let maxValue = parseInt(synFilterSizeMax.value);
  sizeRange.max = isNaN(maxValue) ? null : maxValue;
  if (sizeRange.min === null && sizeRange.max === null) {
    sizeRange = null;
  }
  return sizeRange;
};
// returns array or null if empty
ImporterApp.prototype.GetSynFilterCells = function() {
  const synFilterCells = document.getElementById('synFilterCells');
  return ( synFilterCells.value === '' ) ?
      null : synFilterCells.value.replace(' ','').split(',');
};
// returns array of contins or null if empty
ImporterApp.prototype.GetSynFilterContins = function() {
  const synFilterContins = document.getElementById('synFilterContins');
  let continsStr = synFilterContins.value.split(',');
  let contins = [];
  for (const cStr of continsStr) {
    let c = parseInt(cStr);
    if (!isNaN(c))
      contins.push(c);
  }
  if (contins.length === 0) contins = null;

  return contins;
};
ImporterApp.prototype.RestoreFilterSynapse = function() {
  const synFilterTypeNodes = document.querySelectorAll(`input[name='synFilterType']:checked`);
  synFilterTypeNodes.forEach( nn => {
    nn.checked = false;
  });

  const synFilterCells = document.getElementById('synFilterCells');
  synFilterCells.value = '';

  const synFilterContins = document.getElementById('synFilterContins');
  synFilterContins.value = '';

  // clear 'current filters'
  const currentFilters = document.getElementById('currentFilters');
  currentFilters.style.display = 'none';
  const currentFiltersUL = document.getElementById('currentFiltersUL');
  while (currentFiltersUL.lastChild) {
    currentFiltersUL.removeChild(currentFiltersUL.lastChild);
  }
};

ImporterApp.prototype.AddToCurrentFilters = function(filters) {
  // make current filters section visible
  const currentFilters = document.getElementById('currentFilters');
  currentFilters.style.display = '';

  // add a list item
  const currentFiltersUL = document.getElementById('currentFiltersUL');
  const liItem = document.createElement('li');
  currentFiltersUL.appendChild(liItem);

  // produce text for the list item
  let text = '';

  if (filters.types !== null) {
    text += filters.types.join(',');
    text += ';';
  }

  if (filters.sizeRange !== null) {
    let mn = filters.sizeRange.min === null ? '*' : filters.sizeRange.min;
    let mx = filters.sizeRange.max === null ? '*' : filters.sizeRange.max;
    text += `(${mn},${mx});`;
  }

  if (filters.cells !== null) {
    text += filters.cells.join(',');
    text += ';';
  }

  if (filters.contins !== null) {
    text += filters.contins.join(',');
    text += ';';
  }

  // finally set text to list item
  liItem.innerHTML = text;
};

// filter rows of synapse list table by looking at
// visibility of individual synapses in viewer
// (thus, one should apply the filtering to the viewer first)
ImporterApp.prototype.SynapseListFilterByVis = function() {
  for (const db in this.synapseListWindows) {
    for (const cell in this.synapseListWindows[db]) {
      if (!this.viewer.dbMaps.hasOwnProperty(db)
        || !this.viewer.dbMaps[db].hasOwnProperty(cell)) {
        continue;
      }
      const allSynData = this.viewer.dbMaps[db][cell].allSynData;

      const dialog = this.synapseListWindows[db][cell];
      const contentDiv = dialog.GetContentDiv();
      for (const tr of contentDiv.querySelectorAll('tr')) {
        const contin = parseInt(tr.childNodes[2].innerHTML);
        if (isNaN(contin)) continue;
        if (!allSynData.hasOwnProperty(contin)) {
          console.log(`weird, synapse ${contin} not found in allSynData of ${db},${cell}`);
          continue;
        }
        const vis = allSynData[contin].sphere.visible;
        tr.style.display = vis ? '' : 'none';
      }
    }
  }
};
ImporterApp.prototype.SynapseListClearFilter = function() {
  for (const db in this.synapseListWindows) {
    for (const cell in this.synapseListWindows[db]) {
      const dialog = this.synapseListWindows[db][cell];
      const contentDiv = dialog.GetContentDiv();
      for (const tr of contentDiv.querySelectorAll('tr')) {
        tr.style.display = '';
      }
    }
  }
};


//=======================================================
// *Section*: Translate Maps section

// read value of translate from sliders
// and tell viewer to apply the translation
ImporterApp.prototype.ApplyTranslateToViewer = function(db=null) {
  const pos = this.GetTranslationSlider(db);
  if (db === null || db === 'All') {
    this.viewer.translateMapsTo(pos.x,pos.y,pos.z);
  }
  else {
    this.viewer.translateMapsToDb(db,pos.x,pos.y,pos.z);
  }
};

//=================================
// subsection: get/set translation values to sliders
// (only related to HTML, not viewer)

// translation = {x: , y: , z: }
ImporterApp.prototype.SetTranslationSlider = function(db,translation) {
  if (db === null) {
    db = 'All';
  }
  const xEl = document.getElementById(`x-slider-${db}`);
  const yEl = document.getElementById(`y-slider-${db}`);
  const zEl = document.getElementById(`z-slider-${db}`);

  xEl.value = translation.x;
  yEl.value = translation.y;
  zEl.value = translation.z;
  
  this.ApplyTranslateToViewer(db);
  // trigger the usual function to update the viewer
  //xEl.onmousemove();
};
ImporterApp.prototype.SetAllTranlationSlider = function(allTranslations) {
  for (const db in allTranslations) {
    this.SetTranslationSlider(db,allTranslations[db]);
  }
};
// returns { x: , y: , z: } (not THREE.Vector3)
ImporterApp.prototype.GetTranslationSlider = function(db=null) {
  if (db === null) {
    db = 'All';
  }
  const xEl = document.getElementById(`x-slider-${db}`);
  const yEl = document.getElementById(`y-slider-${db}`);
  const zEl = document.getElementById(`z-slider-${db}`);

  return {
    x: parseInt(xEl.value),
    y: parseInt(yEl.value),
    z: parseInt(zEl.value),
  };
};

ImporterApp.prototype.GetAllTranslationSlider = function() {
  const trans = {};
  for (const db in celllistByDbType) {
    trans[db] = this.GetTranslationSlider(db);
  }
  trans['All'] = this.GetTranslationSlider('All');
  return trans;
}

//=======================
// translation HTML get/set but for the number input

// translation = {x: , y: , z: }
ImporterApp.prototype.SetTranslationNumber = function(db,translation) {
  if (db === null) {
    db = 'All';
  }
  const xEl = document.getElementById(`x-number-${db}`);
  const yEl = document.getElementById(`y-number-${db}`);
  const zEl = document.getElementById(`z-number-${db}`);

  xEl.value = translation.x;
  yEl.value = translation.y;
  zEl.value = translation.z;

  this.ApplyTranslateToViewer(db);
};
// returns { x: , y: , z: } (not THREE.Vector3)
ImporterApp.prototype.GetTranslationNumber = function(db=null) {
  if (db === null) {
    db = 'All';
  }
  const xEl = document.getElementById(`x-number-${db}`);
  const yEl = document.getElementById(`y-number-${db}`);
  const zEl = document.getElementById(`z-number-${db}`);

  return {
    x: parseInt(xEl.value),
    y: parseInt(yEl.value),
    z: parseInt(zEl.value),
  };
};

//=====================================================
// *Section*: getters/setters from/to HTML stuff
// (except translations, which gets its own section)

ImporterApp.prototype.GetCanvasElem = function() {
  return document.getElementById('meshviewer');
};


// database get/set from/to HTML
// modified to match floatingdialog2 version
ImporterApp.prototype.GetSeriesElem = function() {
  return document.getElementById('dbSelector');
};
ImporterApp.prototype.GetSeriesFromHTML = function() {
  const dbEl = this.GetSeriesElem();
  return dbEl.value;
};
ImporterApp.prototype.SetSeriesToHTML = function(db) {
  const dbEl = this.GetSeriesElem();
  dbEl.value = db;
  dbEl.onchange(); // shows/hides appropriate list of cells
};

// return value is color, values between 0 and 1
ImporterApp.prototype.GetColorFromHTML = function(db,cell) {
  let hex = this.GetHexColorFromHTML(db,cell);
  let rgb = this.hexToRGB(hex);
  if (rgb === null) {
    return null;
  }
  return {
    r: rgb.r * 1.0 / 255,
    g: rgb.g * 1.0 / 255,
    b: rgb.b * 1.0 / 255,
  };
};
// return is like #00FF00
ImporterApp.prototype.GetHexColorFromHTML = function(db,cell) {
  const colorInput = 
    document.getElementById(`color-selector-${db}-${cell}`);
  return colorInput.value;
};
// 0.0 <= color.r <= 1.0
ImporterApp.prototype.SetColorToHTML = function(db,cell,color) {
  // convert to RGB (integer values 0 to 255)
  let r = Math.round(255 * color.r);
  let b = Math.round(255 * color.b);
  let g = Math.round(255 * color.g);
  let rgb = b | (g << 8) | (r << 16);
  let hex = '#' + rgb.toString(16);

  const colorInput = 
    document.getElementById(`color-selector-${db}-${cell}`);
  colorInput.setAttribute('value',hex);
};
// 0.0 <= color.r <= 1.0
ImporterApp.prototype.SetColorVolumeToHTML = function(db,cell,color) {
  // convert to RGB (integer values 0 to 255)
  let r = Math.round(255 * color.r);
  let b = Math.round(255 * color.b);
  let g = Math.round(255 * color.g);
  let rgb = b | (g << 8) | (r << 16);
  let hex = '#' + rgb.toString(16);

  const colorInputVol = 
    document.getElementById(`color-selector-volume-${db}-${cell}`);
  if (colorInputVol === null) {
    return;
  }
  colorInputVol.setAttribute('value',hex);
};

// content of maps section
ImporterApp.prototype.GetMapsContentDiv = function() {
  return document.getElementById('mapsContentDiv');
};
// content of db section
ImporterApp.prototype.GetDbContentDiv = function(db) {
  return document.getElementById(`maps${db}ContentDiv`);
};
// title of db section
ImporterApp.prototype.GetDbTitleDiv = function(db) {
  return document.getElementById(`maps${db}TitleDiv`);
};

//=====================================================
// *Section*: Load/Save section

/*
 * load from file
 * file expected to be .json; see SaveToFile
 */
ImporterApp.prototype.LoadFromFile = function() {
  const input = document.getElementById('LoadFromFileInput');
  const file = new FileReader();

  const self = this;

  file.readAsText(input.files[0]);
  file.onloadend = function() {
    // read data is in this.result
    const data = JSON.parse(this.result);

    for (const db in data.mapsSettings) {
      self.SetSeriesToHTML(db);

      for (const cell in data.mapsSettings[db]) {
        self.LoadMap(db, cell, {
          color: {
            r: data.mapsSettings[db][cell].color.r,
            g: data.mapsSettings[db][cell].color.g,
            b: data.mapsSettings[db][cell].color.b,
          },
          cameraSettings: data.cameraSettings,
          synapseFilters: data.synapseFilters,
        });
      }
    }
    
    for (const filters of data.synapseFilters) {
      self.AddToCurrentFilters(filters);
    }

    setTimeout(() => {
      self.SetAllTranlationSlider(data.mapsTranslation);
      self.viewer.SetCameraFromJSON(data.cameraSettings);
    },0);
  };
};

ImporterApp.prototype.SaveToFile = function() {
  // object to hold data to save
  const data = {
    mapsSettings: this.viewer.dumpMapSettingsJSON(),
    cameraSettings: this.viewer.dumpCameraJSON(),
    mapsTranslation: this.GetAllTranslationSlider(),
    synapseFilters: this.synapseFilters,
  };

  const a = document.getElementById('forSaveToFileButton');
  a.href = URL.createObjectURL(new Blob(
    [JSON.stringify(data)],
    { type: 'application/json', }
  ));
  a.setAttribute('download', 'session.json');
  a.click();
};



//=======================================================
// *Section*: auxiliary stuff


// expect hexStr of form either:
// #05f2Dc
// #06d --> #0066dd
ImporterApp.prototype.hexToRGB = function(hexStr) {
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
