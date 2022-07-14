window.onload = function ()
{
	const params = {};
  const urlParams = new URLSearchParams(document.location.search);
  for (const pair of urlParams.entries()) {
    params[pair[0]] = pair[1];
  }

  let db = params.db;
  let cell = params.cell;

  const importerApp = new ImporterApp();

  // preload cell if given param in url
  setTimeout(() => {
    // to ensure everything in importerApp is properly loaded
    if (params.hasOwnProperty('db')
      && params.hasOwnProperty('cell')) {
      importerApp.LoadCell(db, cell);
    }
  });

  // access importerApp in the console
	window.importerApp = importerApp;
};
