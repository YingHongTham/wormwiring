// apps/neuronMaps/include/importerapp.js
// Initialization of stuff begins here

window.onload = function(){
	//get url query string
	//can specify cell that you want
	var parameters = location.search.substring(1).split("&");
	var params = {}
	for (var tmp in parameters){
		var temp = parameters[tmp].split("=");
		params[temp[0]] = temp[1]
	};
	console.log(params);

	// banner and wwnavbar no longer used
	//    new ImporterWW("banner","wwnavbar");

  // the thing that holds all the stuff
  // but access in console via the variable aa (because window.aa)
	var importerApp = new ImporterApp(params);
	importerApp.Init();

  window.addEventListener('mousedown', () => {
    window.dispatchEvent(new Event('resize'));
  });
  //window.addEventListener('mousemove', () => {
  //  window.dispatchEvent(new Event('resize'));
  //});

	window.aa = importerApp;
};
