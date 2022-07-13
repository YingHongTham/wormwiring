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

  // reference to div's in menu (see LoadCell)
  this.menuDbSections = {};

  // reference to div's containing tables, by db and cell
  this.synapseTableDiv = {};
  this.partnerTableDiv = {};

  // div containing all the content
  this.content = document.getElementById('main-content');

  this.dialog = null; // floating window for cell selector
  this.dbDivForm = null; // cell selector forms (may be useless)
  this.dbDivFormNames = null; // just the names of those forms
  this.prepareCellSelectorDialog();

  this.content.appendChild(this.CreateHTMLSynapseListInfoSection());

  this.InitLinkFunctionalityWithHTML();
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


// adds menu item for cell/db and retrieves synapse data,
// and loads page
ImporterApp.prototype.LoadCell = function(db, cell) {
  console.log(db, cell);

  // already loaded
  if (this.selectedCells.hasOwnProperty(db)
      && this.selectedCells[db].includes(cell)) {
    return;
  }

  //===================================
  // add entry in menu

  const menuDiv = document.getElementById('cellsContentDiv');

  // first time adding cell from this db
  if (!this.selectedCells.hasOwnProperty(db)) {
    this.selectedCells[db] = [];

    const menuDbSection = document.createElement('div');
    menuDiv.appendChild(menuDbSection);
    this.menuDbSections[db] = menuDbSection;

    const titleDiv = document.createElement('div');
    menuDbSection.appendChild(titleDiv);

    titleDiv.innerHTML = db;
    titleDiv.style.fontWeight = 'bold';
    titleDiv.style.backgroundColor = 'rgba(0,0,0,0.4)';
  }

  this.selectedCells[db].push(cell);

  const cellDiv = document.createElement('div');
  this.menuDbSections[db].appendChild(cellDiv);

  cellDiv.innerHTML = cell;

  //================================================
  // initialize empty tables

  if (!this.synapseTableDiv.hasOwnProperty(db)) {
    this.synapseTableDiv[db] = {};
  }
  this.synapseTableDiv[db][cell] =
      this.InitHTMLSynapseListTables(db, cell);
  this.content.appendChild(this.synapseTableDiv[db][cell]);

  //======================================================
  // requesting for data
  // url to php which makes the MySQL queries
  const url = '../php/getSynapseList-alt.php/'
    + `?db=${db}`
    + `&cell=${cell}`;
  const xhttp = new XMLHttpRequest();    
  const self = this;
  xhttp.onreadystatechange = function() {
	  if (this.readyState == 4 && this.status == 200) {
	    const data = JSON.parse(this.responseText);
      self.PopulateSynapseListRows(db,cell,data);
      // TODO self.PopulatePartnerListRows(db,cell,data);
	  }
  };
  xhttp.open("GET",url,true);
  xhttp.send();
};

// data retreived from php
// based on build_synapseList_alt.js
ImporterApp.prototype.PopulateSynapseListRows = function(db,cell,data) {
	const syntypes = ['gap','pre','post'];
	for (let type of syntypes) {
    const tbl = document.getElementById(
        this.GetTableID(db,cell,type));

    tbl.colSpan = 6;

    // group by partner
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
      const tdPartner = document.createElement('td');
      const tdCount = document.createElement('td');
      const tdSections = document.createElement('td');
      
      tbl.appendChild(trSummary);
      trSummary.appendChild(tdPartner);
      trSummary.appendChild(tdCount);
      trSummary.appendChild(tdSections);

      trSummary.classList.add(groupClassName);
      trSummary.classList.add(
          this.GetSummaryTrClassName(db,cell));
      trSummary.classList.add('labels');
      // clicking this row toggles the class 'collapse'
      // among all elements matching 'data-target'
      // see also in index.html
      trSummary.setAttribute('data-toggle','collapse');
      // use id instead of class
      //trSummary.setAttribute('data-target',
      //    `.${groupClassName}.individual`);
      const tbodyID = `tbody-${db}-${cell}-${type}-${partner}`;
      trSummary.setAttribute('data-target', '#'+tbodyID);
      // need 'role' attribute because trSummary is not button
      trSummary.setAttribute('role', 'button');

      const summary = synByPartner[partner].summary;

      tdPartner.innerHTML = partner;
      tdPartner.colSpan = 4;
      tdCount.innerHTML = summary.count;
      tdCount.colSpan = 1;
      tdSections.innerHTML = summary.sections;
      tdSections.colSpan = 1;

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
        const trIndiv = document.createElement('tr');
        const tdPartner = document.createElement('td');
        const tdDatabase = document.createElement('td');
        const tdContin = document.createElement('td');
        const continA = document.createElement('a');
        const tdZ = document.createElement('td');
        const tdCount = document.createElement('td');
        const tdSections = document.createElement('td');

        tbody.appendChild(trIndiv);
        trIndiv.appendChild(tdPartner);
        trIndiv.appendChild(tdDatabase);
        trIndiv.appendChild(tdContin);
        trIndiv.appendChild(tdZ);
        trIndiv.appendChild(tdCount);
        trIndiv.appendChild(tdSections);
        tdContin.appendChild(continA);

        trIndiv.style.backgroundColor = 'white';
        trIndiv.classList.add(groupClassName);
        trIndiv.classList.add('individual');
        //trIndiv.classList.add('show'); messes things up

        tdPartner.innerHTML = partner;
        tdDatabase.innerHTML = db;
        continA.innerHTML = syn.contin;
        continA.href = `/apps/synapseViewer/?neuron=${cell}&db=${db}&continNum=${syn.contin}`;
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
  setTimeout(() => this.toggleAllIndividualRows(db,cell,true));
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

// basic template for synapse list (from apps/synapseList)
// 
// @param {HTMLDivElement} parent - where to put HTML stuff;
//  if parent=null, creates new div, returned
//ImporterApp.prototype.HTMLSynapseList = function(parent=null) {
ImporterApp.prototype.CreateHTMLSynapseListInfoSection = function(parent=null) {
  const mainDiv = parent === null ?
    document.createElement('div') : parent;

  const infoDiv = document.createElement('div');
  const titleDiv = document.createElement('div');
  const helpDiv = document.createElement('div');

  mainDiv.appendChild(infoDiv);
  infoDiv.appendChild(titleDiv);
  infoDiv.appendChild(helpDiv);

  titleDiv.append('Synapse List for ');
  titleDiv.appendChild(this.CreateCellNameSpan());
  titleDiv.append(' from ');
  titleDiv.appendChild(this.CreateDbNameSpan());
  
  // TODO some help stuff

  setTimeout(() => this.SetDbNameSpan('GARAGE'));
  setTimeout(() => this.SetCellNameSpan('BOOKS'));

  return mainDiv;
}

// creates 'empty' tables (and buttons) for db,cell
ImporterApp.prototype.InitHTMLSynapseListTables = function(db, cell) {
  const mainDiv = document.createElement('div');

  //===========================================
  // two buttons for toggling individual or summary rows

  const toggleIndivBtn = document.createElement('button');
  const toggleSummBtn = document.createElement('button');

  mainDiv.appendChild(toggleIndivBtn);
  mainDiv.appendChild(toggleSummBtn);

  toggleIndivBtn.id = `toggle-all-individual-${db}-${cell}`;
  toggleIndivBtn.value = 'on';
  toggleIndivBtn.style = 'margin: 10px; float:right';
  toggleIndivBtn.innerHTML = 'Hide All Individual Synapses';
  toggleSummBtn.id = 'toggle-all-summary';
  toggleSummBtn.value = 'on';
  toggleSummBtn.style = 'margin: 10px; float:right';
  toggleSummBtn.innerHTML = 'Hide All Summary Rows';

  toggleIndivBtn.onclick = () => {
    const expanded = toggleIndivBtn.value !== 'on';
    this.toggleAllIndividualRows(db, cell, expanded);
  }

  toggleSummBtn.onclick = () => {
    const expanded = toggleSummBtn.value !== 'on';
    this.toggleAllSummaryRows(db, cell, expanded);
  }

  //===========================================
  // tables

  for (const type of ['gap','pre','post']) {
    const table = document.createElement('table');
    const trTitle = document.createElement('tr');
    const thTitle = document.createElement('th');

    mainDiv.appendChild(table);
    table.appendChild(trTitle);
    trTitle.appendChild(thTitle);

    table.id = this.GetTableID(db, cell, type);

    thTitle.colSpan = 6;
    thTitle.style.fontWeight = 'bold';

    switch(type) {
      case 'gap':
        thTitle.append('Gap junction partners of ');
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
    if (elem.innerHTML !== '') return elem.innerHTML
  }
  return '';
};
ImporterApp.prototype.GetCellNameSpanValue = function() {
  const cellElems = document.querySelectorAll('.cellNameSpan');
  for (const elem of cellElems) {
    if (elem.innerHTML !== '') return elem.innerHTML;
  }
  return '';
};

// ID of table for given db, cell, synapse type
ImporterApp.prototype.GetTableID = function(db, cell, type) {
  return `table-${db}-${cell}-${type}`;
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
ImporterApp.prototype.toggleAllIndividualRows = function(db,cell,expanded) {
  console.log(db,cell,expanded);
  const btnIndv = document.getElementById(`toggle-all-individual-${db}-${cell}`);
  // set value, text accordingly
  btnIndv.value = expanded ? 'on' : 'off';
  btnIndv.innerHTML = expanded ?
      'Hide All Individual Synapses' :
      'Show All Individual Synapses';
  const tbodyList = document.querySelectorAll(
    '.' + this.GetIndivTBodyClassName(db,cell));
  console.log(this.GetIndivTBodyClassName(db,cell));
  console.log(tbodyList.length);
  tbodyList.forEach( tbody => {
    tbody.classList.toggle('in', expanded);
    tbody.setAttribute('aria-expanded', expanded);
  });
};

ImporterApp.prototype.toggleAllSummaryRows = function(db,cell,expanded) {
  const btnSumm = document.getElementById('toggle-all-summary');
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
