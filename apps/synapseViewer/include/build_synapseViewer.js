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

  //=====================================================
	const params = {};
  const urlParams = new URLSearchParams(document.location.search);

  for (const pair of urlParams.entries()) {
    params[pair[0]] = pair[1];
  }

  let db = params.db;
  let contin = params.continNum;

  if (!params.hasOwnProperty('db')) {
    console.log('no db provided in url');
    return;
  }

  if (!params.hasOwnProperty('continNum')) {
    console.log('no continNum provided in url');
    return;
  }

	document.getElementById('info-database').innerHTML = db;
	document.getElementById('info-contin').innerHTML = contin;

  const importerApp = new ImporterApp();
  importerApp.LoadSynapse(db, contin);
}
