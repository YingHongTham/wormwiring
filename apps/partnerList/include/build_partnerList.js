window.onload = function()
{
	const params = {};
  const urlParams = new URLSearchParams(document.location.search);
  for (const pair of urlParams.entries()) {
    params[pair[0]] = pair[1];
  }
    
  const importerApp = new ImporterApp(params);
  importerApp.Init();
}
