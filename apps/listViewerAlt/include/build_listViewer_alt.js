window.onload = function ()
{
	const params = {};
  const urlParams = new URLSearchParams(document.location.search);
  for (const pair of urlParams.entries()) {
    params[pair[0]] = pair[1];
  }

  let db = params.db;
  let cell = params.cell;

  // make sure to change name in index.html too
  // (used in the buttons' onclick)
  const importerApp = new ImporterApp();

  // preload cell if given param in url
  // gotta wait in event loop
  // to make sure importerApp finish initializing
  setTimeout(() => {
    // which list to show first
    if (params.hasOwnProperty('listtype')) {
      if (params['listtype'].toLowerCase() === 'partner') {
        importerApp.SetStartingListType(true);
      }
      else if (params['listtype'].toLowerCase() === 'synapse') {
        importerApp.SetStartingListType(false);
      }
      // else: default is showing synapse list
    }

    // to ensure everything in importerApp is properly loaded
    if (params.hasOwnProperty('db')
      && params.hasOwnProperty('cell')) {
      importerApp.LoadCell(db, cell);
    }
  });

  // access importerApp in the console
	window.importerApp = importerApp;
};
