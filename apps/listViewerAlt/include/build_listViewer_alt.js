/*
 * initliazes an instance of ImporterApp,
 * which does all the work;
 * main job here is to get url parameters
 * and preload appropriately
 */

window.onload = function ()
{
	const params = {};
  const urlParams = new URLSearchParams(document.location.search);
  for (const pair of urlParams.entries()) {
    params[pair[0]] = pair[1];
  }

  // for preloading the page with cell
  let db = params.hasOwnProperty('db') ?
    params.db : '';
  let cell = params.hasOwnProperty('cell') ?
    params.cell : '';
  // choice of which type of list, synapse/partner
  // to show by default (both are loaded);
  // default choice is synapse list
  let listtype = params.hasOwnProperty('listtype') ?
    params.listtype : 'synapse';

  // for backward compatibility
  if (!params.hasOwnProperty('db')) {
    db = params.hasOwnProperty('series') ?
      params.series : '';
  }

  if (!params.hasOwnProperty('cell')) {
    cell = params.hasOwnProperty('neuron') ?
      params.neruon : '';
  }

  //==================================================
  // initializing the app/preload

  // make sure to change name in index.html too
  // (used in the buttons' onclick)
  const importerApp = new ImporterApp();

  // preload cell if given param in url
  // gotta wait in event loop
  // to make sure importerApp finish initializing
  setTimeout(() => {
    // which list to show first
    if (listtype !== '') {
      if (listtype.toLowerCase() === 'partner') {
        importerApp.ToggleSynapseOrPartner(true);
        //importerApp.SetStartingListType(true);
      }
      else if (listtype.toLowerCase() === 'synapse') {
        importerApp.ToggleSynapseOrPartner(false);
        //importerApp.SetStartingListType(false);
      }
      // else: default is showing synapse list
    }

    if (db !== '' && cell !== '') {
      importerApp.LoadCell(db, cell);
    }
  });

  // access importerApp in the console
	window.importerApp = importerApp;
};
