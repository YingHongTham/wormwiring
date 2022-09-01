/*
 * apps/neuronMaps/include/importerapp.js
 * Initialization of stuff begins here
 *
 * can pass params via query string in url
 * in order to automatically load one cell
 * (used by, say, Synapse List, to show the skeleton of that cell)
 * 
 * if want to load cell this way, query string needs:
 * -db: N2U, JSE, N2W, JSH, n2y, n930 (case insensitive)
 * -cell or neuron: name of cell to load (case sensitive)
 * -sex: no longer required (we infer from db)
 *
 *  TODO also pass in view options
 */

window.onload = function(){
	//get url query string
	//can specify cell that you want
	//var parameters = location.search.substring(1).split("&");
	//var params = {}
	//for (var tmp in parameters){
	//	var temp = parameters[tmp].split("=");
	//	params[temp[0]] = temp[1]
	//};
	//console.log(params);


	const params = {};
  const urlParams = new URLSearchParams(document.location.search);
  for (const pair of urlParams.entries()) {
    params[pair[0]] = pair[1];
  }

  // pass value of neuron to cell (old version uses 'neuron'
  // to indicate the cell name, misleading since it could be muscle)
  if (!params.hasOwnProperty('cell') && params.hasOwnProperty('neuron')) {
    params.cell = params.neuron;
  }

  // fix db case; if db bad, delete from params
  if (params.hasOwnProperty('db')) {
    params.db = params.db.toUpperCase();
    if (!['N2U','JSE','N2W','JSH','N2Y','N930'].includes(params.db)) {
      delete params.db;
    }
    else if (['N2Y','N930'].includes(params.db)) {
      params.db = params.db.toLowerCase();
    }
  }

  // used to be 'mousemove', seems a bit excessive
  window.addEventListener('mousedown', () => {
    window.dispatchEvent(new Event('resize'));
  });

  // 'preload' cells from here
	const importerApp = new ImporterApp();
  if (params.hasOwnProperty('db')
    && params.hasOwnProperty('cell')) {
    setTimeout(() => {
      // need to wait for everything to initialize properly
      importerApp.LoadDbCell(params.db, params.cell);
    },0);
  }

  // access importerApp in the console
	window.importerApp = importerApp;
};

