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
    
  // set links to Synapse List app
  // (by default it's set to partnerList with no url params)
  const urlSynapseList = '../synapseList/'
    + `?db=${db}`
    + `&cell=${cell}`;
  const pnava = document.getElementById('nav-synapse-list');
  pnava.href = urlSynapseList;
  const pnava2 = document.getElementById('nav-synapse-list-alt');
  pnava2.href = urlSynapseList;

  // set Cell Name in the HTML
  const cellElem = document.getElementById('cell-name');
  cellElem.innerHTML = `Cell Name: ${cell}`;

  // url to php which makes the MySQL queries
  const url = '../php/getPartnerList-alt.php/'
    + `?db=${db}`
    + `&cell=${cell}`;
  const xhttp = new XMLHttpRequest();    
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      const data = JSON.parse(this.responseText);
        
      const syntypes = ['gap','pre','post']; // 'gap' was 'elec'
      for (let type of syntypes) {
    	  const tbl = document.getElementById('table-'+type);

        // one row for each partner
    	  for (const partner in data[type]){
          // row container
    	    const tr = document.createElement('tr');
          // three column entries for row
    		  const tdPartner = document.createElement('td');
    		  const tdCount = document.createElement('td');
    		  const tdSections = document.createElement('td');
          tbl.appendChild(tr);
          tr.appendChild(tdPartner);
          tr.appendChild(tdCount);
          tr.appendChild(tdSections);
    		  
          tdPartner.colSpan = 3; // width of column
    		  tdPartner.classList.add('rcol');
    		  tdPartner.innerHTML = partner;
    		  
          tdCount.colSpan = 1;
    		  tdCount.classList.add('lcol');
          tdCount.innerHTML = data[type][partner]['count'];
    		  
          tdSections.colSpan = 1;
    		  tdSections.classList.add('lcol');
          tdSections.innerHTML = data[type][partner]['sections'];
    	  }
      }
    }
  };
  xhttp.open("GET",url,true);
  xhttp.send();
};
