// obsolete, put everything into build_partnerList.js

ImporterApp = function (_partners) {
  this.partners = _partners;
};


ImporterApp.prototype.Init = function()
{
  // link to synapse list
  const urlSynapseList = '../synapseList/'
    + `?series=${this.partners.db}`
    + `&continName=${this.partners.cell}`;
  const pnava = document.getElementById('nav-synapse-list');
  pnava.href = urlSynapseList;
  const pnava2 = document.getElementById('nav-synapse-list-alt');
  pnava2.href = urlSynapseList;

  const cellElem = document.getElementById('cell-name');
  cellElem.innerHTML = `Cell Name: ${this.partners.cell}`;

  //const url = '../php/getPartnerList.php/'
  //  + `?series=${this.partners.series}`
  //  + `&continName=${this.partners.continName}`;
  const url = '../php/getPartnerList-alt.php/'
    + `?db=${this.partners.db}`
    + `&cell=${this.partners.cell}`;
  const xhttp = new XMLHttpRequest();    
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      const data = JSON.parse(this.responseText);
        
      const syntypes = ['gap','pre','post']; // 'gap' was 'elec'
      for (let type of syntypes) {
    	  const tbl = document.getElementById(type);

        // one row for each partner
    	  for (const partner in data[type]){
    	    const tr = document.createElement('tr');
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
