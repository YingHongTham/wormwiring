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

  this.dialog = null;
  this.prepareCellSelectorDialog();

  this.InitLinkFunctionalityWithHTML();
};


ImporterApp.prototype.prepareCellSelectorDialog = function() {
  this.dialog = new FloatingDialog2(
    parent=null,
    title='Add Cells',
    isHidden=true,
    modal=false
  );

  const contentDiv = this.dialog.GetContentDiv();

  const dbSelector = document.createElement('select');
  for (const db of Object.keys(celllistByDbType)) {
    const option = document.createElement('option');
    option.innerHTML = db;
    option.value = db;
    dbSelector.appendChild(option);
  }

  contentDiv.appendChild(dbSelector);

  dbSelector.onchange = () => {
    console.log(dbSelector.value);
  };
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
};
