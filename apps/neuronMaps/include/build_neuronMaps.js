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

  // fix db case, and deduce sex from db
  // if db bad, delete from params
  // sex no longer needed
  if (params.hasOwnProperty('db')) {
    params.db = params.db.toUpperCase();
    if (['N2U','JSE','N2W','JSH'].includes(params.db)) {
      params.sex = 'herm';
    } else if (['N2Y','N930'].includes(params.db)) {
      params.sex = 'male';
      params.db = params.db.toLowerCase();
    }
    else {
      delete params.db;
    }
  }

  // used to be 'mousemove', seems a bit excessive
  window.addEventListener('mousedown', () => {
    window.dispatchEvent(new Event('resize'));
  });

  //// params, if url does have enough query data,
  //// will have keys db,sex,cell
  //// old behaviour (see importerapp.js)
  //
  // changed behaviour, 'preload' cells from here
	const importerApp = new ImporterApp();
  if (params.hasOwnProperty('db')
    && params.hasOwnProperty('cell')) {
    importerApp.LoadDbCell(params.db, params.cell);
  }

  // access importerApp in the console
	window.importerApp = importerApp;

  // experimenting with basic synapse list

  let nn = new FloatingDialog2();
  nn.SetWidthHeight(200, 500);
  let mytop = document.getElementById('top');
  mytop.appendChild(nn.window);

  // form table of synapses

  let table = document.createElement('table');
  table.classList.add('table','table-sm');
  table.innerHTML = `
    <thead>
      <tr>
        <th>z</th>
        <th>type</th>
        <th>cells</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Athlete</td>
        <td>Age</td>
        <td>Country</td>
      </tr>
    </tbody>
  `;

  nn.GetBody().appendChild(table);

  setTimeout( () => {
    let allSynList = [];
    let map = importerApp.viewer.maps['ADAL'];
    for (const contin in map.allSynData) {
      allSynList.push(map.allSynData[contin]);
    }
    allSynList.sort((obj1, obj2) => {
      const pos1 = map.objCoord[obj1.obj];
      const pos2 = map.objCoord[obj2.obj];
      return pos1.z - pos2.z;
    });

    const tbody = table.childNodes[1];
    for (const synData of allSynList) {
      const row = document.createElement('tr');
      const tdZ = document.createElement('td');
      const tdType = document.createElement('td');
      const tdCells = document.createElement('td');

      tbody.appendChild(row);
      row.appendChild(tdZ);
      row.appendChild(tdType);
      row.appendChild(tdCells);

      tdZ.innerHTML = map.objCoord[synData.obj].z;
      tdType.innerHTML = synData.type;
      tdCells.innerHTML = synData.pre + synData.post;
    }
  }, 2000);
};

