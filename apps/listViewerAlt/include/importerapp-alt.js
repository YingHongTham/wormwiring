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

  this.dialog = null; // floating window for cell selector
  this.dbDivForm = null; // cell selector forms
  this.prepareCellSelectorDialog();

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
  const dbDivForm = {}; // name of form for db
  this.dbDivForm = dbDivForm;

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
    form.name = dbDivID[db] + '-form';

    // type = 'neuron' or 'muscle'
    for (const type in celllistByDbType[db]) {
      console.log(db, type);
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
        input.name = dbDivForm[db].name;
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

ImporterApp.prototype.LoadCell = function(db, cell) {
  console.log(db, cell);
};

ImporterApp.prototype.LoadSelectedCells = function() {
  for (const db in this.dbDivForm) {
    const form = this.dbDivForm[db];
    const formName = form.name;
    const checkedBoxes = document.querySelectorAll(`input[name=${formName}]:checked`);
    for (const node of checkedBoxes) {
      this.LoadCell(db, node.value);
    }
  }
};
