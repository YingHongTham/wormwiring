window.onload = function()
{
	const params = {};
  const urlParams = new URLSearchParams(document.location.search);
  for (const pair of urlParams.entries()) {
    params[pair[0]] = pair[1];
  }

  let db = params.db;
  let cell = params.cell;

  // check if db, cell actually passed
  // quit if either is not provided
  if (!params.hasOwnProperty('db')) {
    // backward compatibility
    db = params.series;
    if (!params.hasOwnProperty('series')) {
      console.error('Database (db) not given');
      return;
    }
  }
  if (!params.hasOwnProperty('cell')) {
    // backward compatibility
    cell = params.continName;
    if (!params.hasOwnProperty('continName')) {
      console.error('Cell name (cell) not given');
      return;
    }
  }

  // set links to Partner List app
  // (by default it's set to partnerList with no url params)
  const urlPartnerList = '../partnerList/'
    + `?db=${db}`
    + `&cell=${cell}`;
  const pnava = document.getElementById('nav-partner-list');
  pnava.href = urlPartnerList;
  
  // set Cell Name in the HTML
  const cellElem = document.getElementById('cell-name');
  cellElem.innerHTML = `Cell Name: ${cell}`;

  // url to php which makes the MySQL queries
  const url = '../php/getSynapseList.php/'
    + `?series=${db}`
    + `&continName=${cell}`;
  const xhttp = new XMLHttpRequest();    
  xhttp.onreadystatechange = function() {
	  if (this.readyState == 4 && this.status == 200) {
	    const data = JSON.parse(this.responseText);
	    const syntypes = ['gap','pre','post'];
	    for (let type of syntypes) {
    	  const tbl = document.getElementById('table-'+type);

        if (type==='gap') {
          type = 'elec';
        }

		    //visible list element
		    for (var i in data[type].list) {
		      var tbody1 = document.createElement('tbody');
		      //tbody.className = 'labels';
		      var tr = document.createElement('tr');
		      tr.className = 'labels';
		      for (var j  in data[type].list[i]) {
			      var td = document.createElement('td');
			      if (j == 0){
			        td.colSpan = 4;
			        td.class = 'rcol';
			        var label = document.createElement('label');
			        label.setAttribute('for',data[type].list[i][j]);
			        label.innerHTML = data[type].list[i][j];
			        var input = document.createElement('input');
			        input.name = data[type].list[i][j];
			        input.type = 'checkbox';
			        input.id = data[type].list[i][j];
			        input.setAttribute('data-toggle','toggle');
			        input.onclick = function(){
				        $(this).parents().next('.hide').toggle();
			        };
			      td.appendChild(label);
			      td.appendChild(input);
			      } else {
			        td.colsSpan = 1;
			        td.class = 'lcol';
			        td.innerHTML = data[type].list[i][j];
			      };
			      tr.appendChild(td);
		      };
		      tbody1.appendChild(tr)
		      tbl.appendChild(tbody1);

		      //hidden list element
		      var tbody2 = document.createElement('tbody');
		      tbody2.className = 'hide';
		      tbody2.setAttribute('style','display:none;');
		      for (var j in data[type].synList[i]) {
			      var tr = document.createElement('tr');
			      var td = document.createElement('td');
			      td.className = 'rcol'
			      tr.appendChild(td);
			      var td = document.createElement('td');
			      td.className = 'lcol'
			      td.innerHTML = data[type].synList[i][j][1];
			      tr.appendChild(td);
			      var td = document.createElement('td');
			      td.className = 'lcol'
			      //td.innerHTML = data[type].synList[i][j][3];
			      var a = document.createElement('a');
			      var href = '../synapseViewer/?neuron=' + 
			        self.synapses.continName + '&db=' + 
			        data[type].synList[i][j][1] + '&continNum=' +
			        data[type].synList[i][j][3] + '&series=' +
			        self.synapses.series;
			      a.href = href;
			      a.innerHTML = data[type].synList[i][j][3];
			      td.appendChild(a);
			      tr.appendChild(td);			
			      var td = document.createElement('td');
			      td.className = 'lcol'
			      td.innerHTML = data[type].synList[i][j][4];
			      tr.appendChild(td);			
			      var td = document.createElement('td');
			      td.className = 'lcol'
			      tr.appendChild(td);
			      var td = document.createElement('td');
			      td.className = 'lcol'
			      td.innerHTML = data[type].synList[i][j][2];
			      tr.appendChild(td);
			      tbody2.appendChild(tr)
			      tbl.appendChild(tbody2);
		      }
		    }
	    }
	  }
  };
  xhttp.open("GET",url,true);
  xhttp.send();

}
