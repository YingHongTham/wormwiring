window.onload = function ()
{
    var parameters = location.search.substring(1).split("&");
    
    var params = {}
    for (var tmp in parameters){
	var temp = parameters[tmp].split("=");
	params[temp[0]] = temp[1]
    };

// banner and wwnavbar no longer used
//    new ImporterWW("banner","wwnavbar");
    var importerApp = new ImporterApp(params);
    importerApp.Init();

};
