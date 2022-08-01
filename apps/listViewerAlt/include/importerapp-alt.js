// requires /apps/include/cellLists.js, floatingdialog-alt.js
if (celllistByDbType === undefined) {
  console.error('expect /apps/include/cellLists-alt.js');
}
if (typeof(FloatingDialog2) === undefined) {
  console.error('expect /apps/include/floatingdialog-alt.js');
}

ImporterApp = function() {
  // cells that were selected by user/have been loaded
  // key = db, value = list of selected cells from that db
  this.selectedCells = {};

  this.currentDb = '';
  this.currentCell = '';
  this.showingPartnerList = false; // starting list type

  // reference to div's in menu (see LoadCell)
  this.menuDbSections = {};

  // reference to div's containing tables, by db and cell
  this.synapseTableDiv = {};
  this.partnerTableDiv = {};

  // div containing all the content
  this.content = document.getElementById('main-content');
  this.content.style.overflow = 'auto';

  this.dialog = null; // floating window for cell selector
  this.dbDivForm = null; // cell selector forms (may be useless)
  this.dbDivFormNames = null; // just the names of those forms
  this.prepareCellSelectorDialog();

  // info section (cell name, database),
  // and help items
  this.infoSectionSynapse = 
    document.getElementById('infoSectionSynapse');
  this.infoSectionPartner = 
    document.getElementById('infoSectionPartner');
  this.content.appendChild(this.infoSectionSynapse);
  this.content.appendChild(this.infoSectionPartner);

  // buttons
  this.InitLinkFunctionalityWithHTML();


  const self = this;
  window.addEventListener('resize', () => {
    self.Resize();
  },false);
  this.Resize();
};


/*
 *  <div> -- contentDiv from FloatingDialog2
 *    <label> Choose a database/series: </label>
 *    <select> -- dbSelector
 *      <option> N2U etc </option>
 *    </select>
 *    <button> Load </button>
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
ImporterApp.prototype.prepareCellSelectorDialog = function() {
  this.dialog = new FloatingDialog2(
    parent=null,
    title='Add Cells',
    isHidden=true,
    modal=true
  );

  this.dialog.SetWidthHeight(400, null);

  const contentDiv = this.dialog.GetContentDiv();

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
    self.LoadSelectedCells();
    self.dialog.CloseWindow();
  };

  for (const db in celllistByDbType) {
    dbDiv[db] = document.createElement('div');
    dbDivID[db] = `cellListDiv-${db}`;
    dbDiv[db].id = dbDivID[db];
    contentDiv.appendChild(dbDiv[db]);
  }


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
        cellSpan.innerHTML = cell;

        label.style.width = '100px';
        label.style.display = 'inline-block';
        //label.style.float = 'left';
      }
    }
  }

  dbSelector.onchange = () => {
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

// makes left/menu collapsible, 'Add cells' button
ImporterApp.prototype.InitLinkFunctionalityWithHTML = function() {
  const selectCellsBtn = document.getElementById('select-cells-btn');
  const self = this;
  selectCellsBtn.onclick = () => {
    self.dialog.OpenWindow();
  };
};

// resize the content div containing tables
// (it's set to fixed size so that table, being long,
// can scroll within it)
ImporterApp.prototype.Resize = function() {
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

  let left = document.getElementById ('left');
  let content = this.content;

  let height = window.innerHeight - headerNav.offsetHeight - headerNavCollapse.offsetHeight - 10;

  SetHeight(left, height);

  SetHeight(content, height);
  SetWidth(content, document.body.clientWidth - left.offsetWidth);
};


ImporterApp.prototype.SetDbInCellSelectorDialog = function(db) {
  const dbSelector = document.getElementById('dbSelector');
  dbSelector.value = db;
  dbSelector.onchange();
};

// ensure that cell selector dialog form is checked
ImporterApp.prototype.SetCellInCellSelectorDialog = function(db, cell) {
  const formName = this.dbDivFormNames[db];
  const inputBoxes = document.querySelectorAll(`input[name=${formName}]`);
  for (const node of inputBoxes) {
    if (node.value === cell) {
      if (!node.checked) {
        node.click();
      }
      break;
    }
  }
};



// adds menu item for cell/db and retrieves synapse data,
// and loads page
ImporterApp.prototype.LoadCell = function(db, cell) {
  setTimeout(() => {
    // ensure that HTML looks like we selected this db,cell last
    // (HTML would otherwise be out of sync if LoadCell called
    // directly and not via the HTML, e.g. when preload)
    this.SetDbInCellSelectorDialog(db);
    this.SetCellInCellSelectorDialog(db, cell);
  }, 0);

  // already loaded?
  if (this.selectedCells.hasOwnProperty(db)
      && this.selectedCells[db].includes(cell)) {
    return;
  }


  //=========================================
  // keep track of db,cell
  if (!this.selectedCells.hasOwnProperty(db)) {
    // first time adding a cell from this db
    this.selectedCells[db] = [];
  }
  this.selectedCells[db].push(cell);

  //===================================
  // add entry in menuDiv (on the left side)

  const menuDiv = document.getElementById('cellsContentDiv');

  if (!this.menuDbSections.hasOwnProperty(db)) {
    // first time adding a cell from this db

    // creates section div for db
    const menuDbSection = document.createElement('div');
    menuDiv.appendChild(menuDbSection);
    this.menuDbSections[db] = menuDbSection;

    // adds a section title div for this db
    const titleDiv = document.createElement('div');
    menuDbSection.appendChild(titleDiv);

    titleDiv.innerHTML = db;
    titleDiv.style.fontWeight = 'bold';
    titleDiv.style.backgroundColor = 'rgba(0,0,0,0.4)';
  }

  const cellDiv = document.createElement('div');
  this.menuDbSections[db].appendChild(cellDiv);

  cellDiv.innerHTML = cell;
  cellDiv.classList.add('menuCellDiv');
  cellDiv.onclick = () => {
    this.ShowTables(db, cell);
  };

  //================================================
  // initialize empty tables for Synapse List

  if (!this.synapseTableDiv.hasOwnProperty(db)) {
    this.synapseTableDiv[db] = {};
  }
  this.synapseTableDiv[db][cell] =
      this.InitHTMLSynapseListTables(db, cell);
  this.content.appendChild(this.synapseTableDiv[db][cell]);

  //================================================
  // initialize empty tables for Partner List

  if (!this.partnerTableDiv.hasOwnProperty(db)) {
    this.partnerTableDiv[db] = {};
  }
  this.partnerTableDiv[db][cell] =
      this.InitHTMLPartnerListTables(db, cell);
  this.content.appendChild(this.partnerTableDiv[db][cell]);

  //======================================================
  // requesting for data

  // url to php which makes the MySQL queries
  const url = '/apps/php/getSynapseList-alt.php/'
    + `?db=${db}&cell=${cell}`;
  console.log('retrieving synapses from ', url);
  const xhttp = new XMLHttpRequest();    
  const self = this;
  xhttp.onreadystatechange = function() {
	  if (this.readyState == 4 && this.status == 200) {
	    const data = JSON.parse(this.responseText);
      self.PopulateSynapseListRows(db,cell,data);
      self.PopulatePartnerListRows(db,cell,data);
      self.ShowTables(db,cell);
      self.ToggleSynapseOrPartner(self.showingPartnerList);
	  }
  };
  xhttp.open("GET",url,true);
  xhttp.send();
};

// data retreived from php
// based on build_synapseList_alt.js
//
// there are two types of rows,
// the 'summary' rows and 'individual' rows;
// see inside for more details
ImporterApp.prototype.PopulateSynapseListRows = function(db,cell,data) {
	const syntypes = ['gap','pre','post'];
	for (let type of syntypes) {
    const tbl = document.getElementById(
        this.GetSynapseTableID(db,cell,type));

    tbl.colSpan = 6;

    // group by partner, see below on summary rows
    const synByPartner = {};
    for (const syn of data[type]) {
      let partner = '';
      switch (type) {
        case 'gap':
        case 'pre':
          partner = syn.post;
          break;
        case 'post':
          partner = syn.pre+'->'+syn.post;
          break;
        default:
          console.error('bruh, type?');
      }
      if (!synByPartner.hasOwnProperty(partner)) {
        synByPartner[partner] = {
          summary: {
            count: 0,
            sections: 0,
          },
          synList: [],
        };
      }
      synByPartner[partner].summary.count += 1;
      synByPartner[partner].summary.sections += syn.sections;
      synByPartner[partner].synList.push(syn);
    }

    // there are two types of rows:
    // -summary of synapses with given partner
    // -individual synapse
    // kept track globally with addition of classes
    // 'summary' and 'individual'
    //
    // they are organized to have the summary row
    // followed by synapses with that partner
    // and they would have a class distinguishing them
    // from other partners/synapse type:
    // `group-${synType}-${partner}`
    //
    // so for example, if I want to target the rows
    // corresponding to individual synapses
    // which has the partner 'AVDR' of 'gap' type,
    // I would query for elements with classes
    // '.individual .group-gap-AVDR'
    //
    // in particular, we use bootstrap, data-toggle,
    // to target rows to collapse/show
    for (const partner in synByPartner) {
      const groupClassName = `group-${type}-${partner}`;

      // row showing summary for given partner
      const trSummary = document.createElement('tr');

      // elements for entries of summary row
      const tdPartner = document.createElement('td');
      const tdCount = document.createElement('td');
      const tdSections = document.createElement('td');

      // add row/entries to table
      tbl.appendChild(trSummary);
      trSummary.appendChild(tdPartner);
      trSummary.appendChild(tdCount);
      trSummary.appendChild(tdSections);

      trSummary.classList.add(groupClassName);
      trSummary.classList.add('summary');
      trSummary.classList.add(
          this.GetSummaryTrClassName(db,cell));
      trSummary.classList.add('labels');
      // clicking this row toggles the class 'collapse'
      // in the element(s) pointed to by data-target
      trSummary.setAttribute('data-toggle','collapse');
      // having comma in id is bad
      const partnerEdit = partner.replace(/[>,]/g, '-');
      const tbodyID = `tbody-${db}-${cell}-${type}-${partnerEdit}`;
      trSummary.setAttribute('data-target', '#'+tbodyID);
      // need 'role' attribute because trSummary is not button
      trSummary.setAttribute('role', 'button');

      const summary = synByPartner[partner].summary;

      // entries text
      tdPartner.innerHTML = partner;
      tdPartner.colSpan = 4;
      tdCount.innerHTML = summary.count;
      tdCount.colSpan = 1;
      tdSections.innerHTML = summary.sections;
      tdSections.colSpan = 1;

      //===================================
      // now add individual synapse rows

      // tbody used to group individual synapse rows
      const tbody = document.createElement('tbody');
      tbl.appendChild(tbody);

      // make tbody collapsible, not individual rows
      tbody.classList.add(groupClassName);
      tbody.classList.add(this.GetIndivTBodyClassName(db,cell));
      tbody.id = tbodyID;
      tbody.classList.add('collapse'); // data-toggle
      tbody.colSpan = 6;

      // row for each individual synapse
      const synList = synByPartner[partner].synList;
      for (const syn of synList) {
        // row element
        const trIndiv = document.createElement('tr');
        
        // entry elements for row
        const tdPartner = document.createElement('td');
        const tdDatabase = document.createElement('td');
        const tdContin = document.createElement('td');
        const continA = document.createElement('a');
        const tdZ = document.createElement('td');
        const tdCount = document.createElement('td');
        const tdSections = document.createElement('td');

        // add row/entries to table
        tbody.appendChild(trIndiv);
        trIndiv.appendChild(tdPartner);
        trIndiv.appendChild(tdDatabase);
        trIndiv.appendChild(tdContin);
        tdContin.appendChild(continA);
        trIndiv.appendChild(tdZ);
        trIndiv.appendChild(tdCount);
        trIndiv.appendChild(tdSections);

        trIndiv.style.backgroundColor = 'white';
        trIndiv.classList.add(groupClassName);
        trIndiv.classList.add('individual');
        //trIndiv.classList.add('show'); messes things up

        // entries text
        tdPartner.innerHTML = partner;
        tdDatabase.innerHTML = db;
        continA.innerHTML = syn.contin;
        continA.href = `/apps/synapseViewer/?db=${db}&continNum=${syn.contin}`;
        continA.target = '_blank';
        tdZ.innerHTML = syn.z;
        tdSections.innerHTML = syn.sections;

        for (const td of trIndiv.children) {
          td.colSpan = 1;
        }
      }
    }
	}

  // show individual rows by default
  setTimeout(() => this.ToggleAllIndividualRows(db,cell,true));
};

ImporterApp.prototype.PopulatePartnerListRows = function(db,cell,data) {
  // group by type and partner
  const synByTypePartner = {
    'gap': {},
    'pre': {}, // post partners when cell is pre
    'post': {}, // pre partner when cell is post
    'post-post': {}, // post partners when cell is post also
  };
  // synByTypePartner[type][X] summarizes the synapses
  // with X as a partner of given type:
  //  synByTypePartner[type][X] = {
  //    count: #synapses
  //    sections: total # sections across synapses
  //  }
  // note that these groups are not mutually exclusive,
  // and may count synapses several times
  // (we choose to do so as it indicates "strength"
  // of the partner as a synaptic partner);
  // a synapse like X -> X,Y,X,X,
  // as a synapse of X (i.e. when given cell == X),
  // would be counted in the groups several times:
  // synByTypePartner['pre'][X] (counted 3 times)
  // synByTypePartner['pre'][Y] (counted 1 time)
  // synByTypePartner['post'][X] (counted 1 time)
  // synByTypePartner['post'][Y] (counted 1 time)
  // synByTypePartner['post-post'][X] (counted 2 times)
  // synByTypePartner['post-post'][Y] (counted 1 time)

  //===========================================
  // grouping by partner
  // method is different for each type
  let synByPartner = synByTypePartner['gap'];
  for (const syn of data['gap']) {
    // syn.pre is guaranteed to be ==cell
    if (!synByPartner.hasOwnProperty(syn.post)) {
      synByPartner[syn.post] = {
        count: 0,
        sections: 0,
      };
    }
    synByPartner[syn.post].count += 1;
    synByPartner[syn.post].sections += syn.sections;
  }

  synByPartner = synByTypePartner['pre'];
  for (const syn of data['pre']) {
    // syn.pre is guaranteed to be ==cell
    // go through post, which is comma-sep list
    for (const post of syn.post.split(',')) {
      if (!synByPartner.hasOwnProperty(post)) {
        synByPartner[post] = {
          count: 0,
          sections: 0,
        };
      }
      synByPartner[post].count += 1;
      synByPartner[post].sections += syn.sections;
    }
  }

  // pre partner when cell is in post
  synByPartner = synByTypePartner['post'];
  for (const syn of data['post']) {
    if (!synByPartner.hasOwnProperty(syn.pre)) {
      synByPartner[syn.pre] = {
        count: 0,
        sections: 0,
      };
    }
    synByPartner[syn.pre].count += 1;
    synByPartner[syn.pre].sections += syn.sections;
  }

  // post partners when cell is in post
  synByPartner = synByTypePartner['post-post'];
  for (const syn of data['post']) {
    const postList = syn.post.split(',');

    // if cell appears once in post, we shouldn't count,
    // but if appears twice in post, count once, etc.
    // put simply, we remove cell exactly once
    // from the list of post partners
    if (postList.includes(cell)) {
      const ind = postList.indexOf(cell);
      postList.splice(ind, 1);
    }
    for (const post of postList) {
      if (!synByPartner.hasOwnProperty(post)) {
        synByPartner[post] = {
          count: 0,
          sections: 0,
        };
      }
      synByPartner[post].count += 1;
      synByPartner[post].sections += syn.sections;
    }
  }

  // grouping done
  //================================================
  // back to loading rows

  const syntypes = ['gap','pre','post','post-post'];
  for (let type of syntypes) {
    const tbl = document.getElementById(
        this.GetPartnerTableID(db, cell, type));

    synByPartner = synByTypePartner[type];

    // one row for each partner
    for (const partner in synByPartner) {
      // row element
      const tr = document.createElement('tr');

      // three column entries for row
  	  const tdPartner = document.createElement('td');
  	  const tdCount = document.createElement('td');
  	  const tdSections = document.createElement('td');

      // add row/entries to table
      tbl.appendChild(tr);
      tr.appendChild(tdPartner);
      tr.appendChild(tdCount);
      tr.appendChild(tdSections);
  	  
      tdPartner.colSpan = 3; // width of column
  	  tdPartner.classList.add('rcol');
  	  tdPartner.innerHTML = partner;
  	  
      tdCount.colSpan = 1;
  	  tdCount.classList.add('lcol');
      tdCount.innerHTML = synByPartner[partner]['count'];
  	  
      tdSections.colSpan = 1;
  	  tdSections.classList.add('lcol');
      tdSections.innerHTML = synByPartner[partner]['sections'];
    }
  }
};

ImporterApp.prototype.LoadSelectedCells = function() {
  for (const db in this.dbDivFormNames) {
    const formName = this.dbDivFormNames[db];
    const checkedBoxes = document.querySelectorAll(`input[name=${formName}]:checked`);
    for (const node of checkedBoxes) {
      this.LoadCell(db, node.value);
    }
  }
};

ImporterApp.prototype.ShowTables = function(db,cell) {
  for (const db in this.selectedCells) {
    for (const cell of this.selectedCells[db]) {
      this.synapseTableDiv[db][cell].style.display = 'none';
      this.partnerTableDiv[db][cell].style.display = 'none';
    }
  }

  if (this.showingPartnerList)
    this.partnerTableDiv[db][cell].style.display = '';
  else
    this.synapseTableDiv[db][cell].style.display = '';

  this.currentDb = db;
  this.currentCell = cell;

  this.SetDbNameSpan(db);
  this.SetCellNameSpan(cell);
};


/*
 * creates and returns a div with the tables for Synapse List
 * caller should recevie returned div and appendChild
 * (nothing is added to document yet)
 *
 * tables are initialized with title rows, no data yet
 * also buttons for showing/hiding individual/summary rows
 *
 * HTML form (for db=N2U, cell=ADAL)
 *  <div> -- mainDiv
 *    <button id='toggle-all-individual-N2U-ADAL' value='on'>
 *      Hide All Individual Synapses
 *    </button>
 *    <button id='toggle-all-summary-N2U-ADAL' value='on'>
 *      Hide ALl Summary Rows
 *    </button>
 *    <br style='clear:both'> -- gets rid of float
 *    <table id='table-synapse-N2U-ADAL-gap'></table>
 *    <br>
 *    <table id='table-synapse-N2U-ADAL-pre'></table>
 *    <br>
 *    <table id='table-synapse-N2U-ADAL-post'></table>
 *    <br>
 *  </div>
 *
 * (see inside for table form)
 */
ImporterApp.prototype.InitHTMLSynapseListTables = function(db, cell) {
  const mainDiv = document.createElement('div');

  //===========================================
  // two buttons for toggling individual or summary rows

  const toggleBtnsDiv = document.createElement('div');
  const toggleIndivBtn = document.createElement('button');
  const toggleSummBtn = document.createElement('button');

  mainDiv.appendChild(toggleBtnsDiv);
  toggleBtnsDiv.appendChild(toggleIndivBtn);
  toggleBtnsDiv.appendChild(toggleSummBtn);

  mainDiv.style.margin = '5px';

  toggleIndivBtn.id = `toggle-all-individual-${db}-${cell}`;
  toggleIndivBtn.value = 'on';
  toggleIndivBtn.style = 'margin: 10px; float:left';
  toggleIndivBtn.innerHTML = 'Hide All Individual Synapses';
  toggleSummBtn.id = `toggle-all-summary-${db}-${cell}`;
  toggleSummBtn.value = 'on';
  toggleSummBtn.style = 'margin: 10px; float:left';
  toggleSummBtn.innerHTML = 'Hide All Summary Rows';

  toggleIndivBtn.onclick = () => {
    const expanded = toggleIndivBtn.value !== 'on';
    this.ToggleAllIndividualRows(db, cell, expanded);
  }

  toggleSummBtn.onclick = () => {
    const expanded = toggleSummBtn.value !== 'on';
    this.ToggleAllSummaryRows(db, cell, expanded);
  }

  // new line; need style='clear:both' to clear the float
  const br = document.createElement('br');
  br.style.clear = 'both';
  mainDiv.appendChild(br);

  //===========================================
  // tables
  // initialize each table with two rows,
  // a title row and a column names row
  // see 

  for (const type of ['gap','pre','post']) {
    const table = document.createElement('table');
    const trTitle = document.createElement('tr');
    const thTitle = document.createElement('th');

    mainDiv.appendChild(table);
    table.appendChild(trTitle);
    trTitle.appendChild(thTitle);

    table.id = this.GetSynapseTableID(db, cell, type);

    //====================
    // add title row
    thTitle.colSpan = 6;
    thTitle.style.fontWeight = 'bold';

    switch(type) {
      case 'gap':
        thTitle.append('Gap junctions of ');
        thTitle.appendChild(this.CreateCellNameSpan());
        break;
      case 'pre':
        thTitle.append('Chemical synapses where ');
        thTitle.appendChild(this.CreateCellNameSpan());
        thTitle.append(' is presynaptic');
        break;
      case 'post':
        thTitle.append('Chemical synapses where ');
        thTitle.appendChild(this.CreateCellNameSpan());
        thTitle.append(' is postsynaptic');
        break;
    }

    //====================
    // second row showing column names
    const topRowEntries = [
      { class: 'rcol', innerHTML: 'Partner(s)' },
	    { class: 'lcol', innerHTML: 'Data series' },
	    { class: 'lcol', innerHTML: 'Synapse ID' },
	    { class: 'lcol', innerHTML: 'Section #' },
	    { class: 'lcol', innerHTML: '#Synapses' },
	    { class: 'lcol', innerHTML: '#Sections' }
    ];

    const tr = document.createElement('tr');
    table.appendChild(tr);
    for (const entry of topRowEntries) {
      const th = document.createElement('th');
      tr.appendChild(th);

      th.classList.add(entry.class);
      th.innerHTML = entry.innerHTML;
    }

    // add a new line
    mainDiv.appendChild(document.createElement('br'));
  }

  return mainDiv;
};


/*
 * creates and returns a div with the tables for Partner List
 * caller should recevie returned div and appendChild
 * (nothing is added to document yet)
 *
 * tables are initialized with title rows, no data yet
 */
ImporterApp.prototype.InitHTMLPartnerListTables = function(db, cell) {
  const mainDiv = document.createElement('div');

  mainDiv.style.margin = '5px';

  //===========================================
  // tables

  for (const type of ['gap','pre','post','post-post']) {
    const table = document.createElement('table');
    const trTitle = document.createElement('tr');
    const thTitle = document.createElement('th');

    mainDiv.appendChild(table);
    table.appendChild(trTitle);
    trTitle.appendChild(thTitle);

    table.id = this.GetPartnerTableID(db, cell, type);

    thTitle.colSpan = 5;
    thTitle.style.fontWeight = 'bold';

    switch(type) {
      case 'gap':
        thTitle.append('Gap junction partners of ');
        thTitle.appendChild(this.CreateCellNameSpan());
        break;
      case 'pre':
        thTitle.append('Chemical postsynaptic partners of ');
        thTitle.appendChild(this.CreateCellNameSpan());
        thTitle.append(' when it is presynaptic');
        break;
      case 'post':
        thTitle.append('Chemical presynaptic partners of ');
        thTitle.appendChild(this.CreateCellNameSpan());
        thTitle.append(' when it is postsynaptic');
        break;
      case 'post-post':
        thTitle.append('Chemical postsynaptic partners of ');
        thTitle.appendChild(this.CreateCellNameSpan());
        thTitle.append(' when it is also postsynaptic');
        break;
    }

    const topRowEntries = [
      { class: 'rcol', innerHTML: 'Partner', colSpan: 3},
      { class: 'lcol', innerHTML: 'Count', colSpan: 1 },
      { class: 'lcol', innerHTML: '#Sections', colSpan: 1 }
    ];

    const tr = document.createElement('tr');
    table.appendChild(tr);
    for (const entry of topRowEntries) {
      const th = document.createElement('th');
      tr.appendChild(th);

      th.classList.add(entry.class);
      th.innerHTML = entry.innerHTML;
      th.colSpan = entry.colSpan;
    }

    // add a new line
    mainDiv.appendChild(document.createElement('br'));
  }

  return mainDiv;
};

// creates span element with appropriate class
// so can update db/cell in the HTML
// by calling SetDbNameSpan/SetCellNameSpan
// if no argument is given,
// attempts to find the value by checking other spans
// (and if that fails, just set to empty string)
ImporterApp.prototype.CreateDbNameSpan = function(db=null) {
  const span = document.createElement('span');
  span.innerHTML = db === null ?
    this.GetDbNameSpanValue() : db;
  span.classList.add('dbNameSpan');
  return span;
};
ImporterApp.prototype.CreateCellNameSpan = function(cell=null) {
  const span = document.createElement('span');
  span.innerHTML = cell === null ?
    this.GetCellNameSpanValue() : cell;
  span.classList.add('cellNameSpan');
  return span;
};

ImporterApp.prototype.SetDbNameSpan = function(db) {
  const dbElems = document.querySelectorAll('.dbNameSpan');
  for (const elem of dbElems) {
    elem.innerHTML = db;
  }
};
ImporterApp.prototype.SetCellNameSpan = function(cell) {
  const cellElems = document.querySelectorAll('.cellNameSpan');
  for (const elem of cellElems) {
    elem.innerHTML = cell;
  }
};

ImporterApp.prototype.GetDbNameSpanValue = function() {
  const dbElems = document.querySelectorAll('.dbNameSpan');
  for (const elem of dbElems) {
    if (elem.innerHTML !== '' && elem.innerHTML !== '--')
      return elem.innerHTML;
  }
  return '--';
};
ImporterApp.prototype.GetCellNameSpanValue = function() {
  const cellElems = document.querySelectorAll('.cellNameSpan');
  for (const elem of cellElems) {
    if (elem.innerHTML !== '' && elem.innerHTML !== '--')
      return elem.innerHTML;
  }
  return '--';
};

// ID of synapse table for given db, cell, synapse type
ImporterApp.prototype.GetSynapseTableID = function(db, cell, type) {
  return `table-synapse-${db}-${cell}-${type}`;
};

// ID of partner table for given db, cell, synapse type
ImporterApp.prototype.GetPartnerTableID = function(db, cell, type) {
  return `table-partner-${db}-${cell}-${type}`;
};

// class name which identifies those tbody that contain
// 'individual' rows
ImporterApp.prototype.GetIndivTBodyClassName = function(db, cell) {
 return `tbody-individual-${db}-${cell}`;
}

// class name which identifies those tbody that contain
// 'individual' rows
ImporterApp.prototype.GetSummaryTrClassName = function(db, cell) {
 return `summary-${db}-${cell}`;
}


//====================================
// functionality of buttons

// 'All' refers to all for one db,cell
// reads current state from value of button
ImporterApp.prototype.ToggleAllIndividualRows = function(db,cell,expanded) {
  const btnIndv = document.getElementById(`toggle-all-individual-${db}-${cell}`);
  // set value, text accordingly
  btnIndv.value = expanded ? 'on' : 'off';
  btnIndv.innerHTML = expanded ?
      'Hide All Individual Synapses' :
      'Show All Individual Synapses';
  const tbodyList = document.querySelectorAll(
    '.' + this.GetIndivTBodyClassName(db,cell));
  tbodyList.forEach( tbody => {
    tbody.classList.toggle('in', expanded);
    tbody.setAttribute('aria-expanded', expanded);
  });
};

ImporterApp.prototype.ToggleAllSummaryRows = function(db,cell,expanded) {
  const btnSumm = document.getElementById(`toggle-all-summary-${db}-${cell}`);
  // set value, text accordingly
  btnSumm.value = expanded ? 'on' : 'off';
  btnSumm.innerHTML = expanded ?
      'Hide All Summary Rows' :
      'Show All Summary Rows';
  const summRows = document.querySelectorAll(
    '.' + this.GetSummaryTrClassName(db,cell));
  summRows.forEach( row => {
    row.classList.toggle('collapse', !expanded);
  });
};

ImporterApp.prototype.ToggleSynapseOrPartner = function(showingPartnerList=null) {
  if (typeof(showingPartnerList) === 'boolean')
    this.showingPartnerList = showingPartnerList;
  else
    this.showingPartnerList = !this.showingPartnerList;

  const db = this.currentDb;
  const cell = this.currentCell;

  if (this.showingPartnerList) {
    this.infoSectionSynapse.style.display = 'none';
    this.infoSectionPartner.style.display = '';
    if (db !== '' && cell !== '') {
      this.synapseTableDiv[db][cell].style.display = 'none';
      this.partnerTableDiv[db][cell].style.display = '';
    }
  }
  else {
    this.infoSectionSynapse.style.display = '';
    this.infoSectionPartner.style.display = 'none';
    if (db !== '' && cell !== '') {
      this.synapseTableDiv[db][cell].style.display = '';
      this.partnerTableDiv[db][cell].style.display = 'none';
    }
  }
};

// always use ToggleSynapseOrPartner unless want to set
// the default list type before loading cell
// (see build_listViewer_alt.js)
ImporterApp.prototype.SetStartingListType = function(showingPartnerList) {
  this.showingPartnerList = showingPartnerList;
};
