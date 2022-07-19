window.onload = function()
{
  //====================================================
  // do some HTML stuff before attempting to load

  // link Help button to the div
  const helpBtn = document.getElementById('helpBtn');
  helpBtn.onclick = () => {
    let helpIsShown = helpBtn.innerHTML === 'Hide Help';
    let newHelpVis = !helpIsShown;
    helpBtn.innerHTML = newHelpVis ? 'Hide Help' : 'Show Help';
    const helpDiv = document.getElementById('helpDiv');
    helpDiv.style.display = newHelpVis ? '' : 'none';
  };
  // hide help by default
  setTimeout(() => { helpBtn.click(); });

  // set the links to listViewerAlt and neuronMaps
  // note that we reset these to the specific cell
  // if the url does provide db and cell
  function SetLinks(db=null,cell=null) {
    console.log(db, cell);
    const listViewerLink = '//' + window.location.hostname +
      '/apps/listViewerAlt/' +
      ( cell === null ?
        'index.html' : `?db=${db}&cell=${cell}` );
    const neuronMapsLink = '//' + window.location.hostname +
      '/apps/neuronMaps/' +
      ( cell === null ?
        'index.html' : `?db=${db}&cell=${cell}` );

    const listViewerA = document.getElementById('listViewerA');
    listViewerA.href = listViewerLink;
    listViewerA.innerHTML = listViewerLink;

    const neuronMapsA = document.getElementById('neuronMapsA');
    neuronMapsA.href = neuronMapsLink;
    neuronMapsA.innerHTML = neuronMapsLink;
  }
  SetLinks();

  //=====================================================
	const params = {};
  const urlParams = new URLSearchParams(document.location.search);

  for (const pair of urlParams.entries()) {
    params[pair[0]] = pair[1];
  }

  let db = params.db;
  let cell = params.cell;
  let contin = params.contin;

  if (!params.hasOwnProperty('db')) {
    console.log('no db provided in url');
    return;
  }
  if (!params.hasOwnProperty('cell')) {
    console.log('no cell provided in url');
    return;
  }

  // reset the links to load the cells too
  SetLinks(db,cell);

  if (!params.hasOwnProperty('contin')) {
    console.log('no continNum provided in url');
    return;
  }

  const importerApp = new ImporterApp();
  importerApp.LoadSynapse(params);

}
