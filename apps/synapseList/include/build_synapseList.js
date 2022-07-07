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


  //====================================
  // functionality of buttons

  function toggleAllIndividualRows(expanded) {
    const btnIndv = document.getElementById('toggle-all-individual');
    // set value, text accordingly
    btnIndv.value = expanded ? 'on' : 'off';
    btnIndv.innerHTML = expanded ?
        'Hide All Individual Synapses' :
        'Show All Individual Synapses';
    const synRows = document.querySelectorAll('.individual');
    synRows.forEach( row => {
      row.classList.toggle('in', expanded);
      row.setAttribute('aria-expanded', expanded);
    });
  }
  const btnIndv = document.getElementById('toggle-all-individual');
  btnIndv.onclick = () => {
    // new state, true if expanded, false if collapsed
    const expanded = btnIndv.value !== 'on';
    toggleAllIndividualRows(expanded);
  };
  btnIndv.click(); // so that expanded by default


  function toggleAllSummaryRows(expanded) {
    const btnSumm = document.getElementById('toggle-all-summary');
    // set value, text accordingly
    btnSumm.value = expanded ? 'on' : 'off';
    btnSumm.innerHTML = expanded ?
        'Hide All Summary Rows' :
        'Show All Summary Rows';
    const summRows = document.querySelectorAll('.summary');
    summRows.forEach( row => {
      row.classList.toggle('collapse', !expanded);
    });
  }

  const btnSumm = document.getElementById('toggle-all-summary');
  btnSumm.onclick = () => {
    // new state, true if expanded, false if collapsed
    const expanded = btnSumm.value !== 'on';
    toggleAllSummaryRows(expanded);
  };

  //=============================================
  // set links to Partner List app
  // (by default it's set to partnerList with no url params)
  const urlPartnerList = '../partnerList/'
    + `?db=${db}`
    + `&cell=${cell}`;
  const pnava = document.getElementById('nav-partner-list');
  pnava.href = urlPartnerList;
  
  //================================================
  // set Cell Name in the HTML
  const cellElem = document.getElementById('cell-name');
  cellElem.innerHTML = `Cell Name: ${cell}`;

  //======================================================
  // requesting for data
  // url to php which makes the MySQL queries
  const url = '../php/getSynapseList-alt.php/'
    + `?db=${db}`
    + `&cell=${cell}`;
  const xhttp = new XMLHttpRequest();    
  xhttp.onreadystatechange = function() {
	  if (this.readyState == 4 && this.status == 200) {
	    const data = JSON.parse(this.responseText);
	    const syntypes = ['gap','pre','post'];
	    for (let type of syntypes) {
    	  const tbl = document.getElementById('table-'+type);

        // group by partner
        const synByPartner = {};
        for (const syn of data[type]) {
          if (!synByPartner.hasOwnProperty(syn.partner)) {
            synByPartner[syn.partner] = {
              summary: {
                count: 0,
                sections: 0,
              },
              synList: [],
            };
          }
          synByPartner[syn.partner].summary.count += 1;
          synByPartner[syn.partner].summary.sections += syn.sections;
          synByPartner[syn.partner].synList.push(syn);
        }

        // there are two types of rows:
        // -summary of synapses with given partner
        // -individual synapse
        // kept track globally with addition of classes
        // 'summary' and 'individual'
        //
        // they are organized to have the summary row
        // followed by synapses with that partner
        // and they would have a class distinguishing them
        // from other partners/synapse type:
        // `group-${synType}-${partner}`
        //
        // so for example, if I want to target the rows
        // corresponding to individual synapses
        // which has the partner 'AVDR' of 'gap' type,
        // I would query for elements with classes
        // '.individual .group-gap-AVDR'
        //
        // in particular, we use bootstrap, data-toggle,
        // to target rows to collapse/show
        for (const partner in synByPartner) {
          const groupClassName = `group-${type}-${partner}`;

          // row showing summary for given partner
          const trSummary = document.createElement('tr');
          const tdPartner = document.createElement('td');
          const tdCount = document.createElement('td');
          const tdSections = document.createElement('td');
          
          tbl.appendChild(trSummary);
          trSummary.appendChild(tdPartner);
          trSummary.appendChild(tdCount);
          trSummary.appendChild(tdSections);

          trSummary.classList.add(groupClassName);
          trSummary.classList.add('summary');
          // clicking this row toggles the class 'collapse'
          // among all elements matching 'data-target'
          // see also in index.html
          trSummary.setAttribute('data-toggle','collapse');
          trSummary.setAttribute('data-target',
              `.${groupClassName}.individual`);
          // need 'role' attribute because trSummary is not button
          trSummary.setAttribute('role', 'button');

          const summary = synByPartner[partner].summary;

          tdPartner.innerHTML = partner;
          tdPartner.colSpan = 4;
          tdCount.innerHTML = summary.count;
          tdCount.colSpan = 1;
          tdSections.innerHTML = summary.sections;
          tdSections.colSpan = 1;

          // row for each individual synapse
          const synList = synByPartner[partner].synList;
          for (const syn of synList) {
            const trIndiv = document.createElement('tr');
            const tdPartner = document.createElement('td');
            const tdDatabase = document.createElement('td');
            const tdContin = document.createElement('td');
            const tdZ = document.createElement('td');
            const tdCount = document.createElement('td');
            const tdSections = document.createElement('td');

            tbl.appendChild(trIndiv);
            trIndiv.appendChild(tdPartner);
            trIndiv.appendChild(tdDatabase);
            trIndiv.appendChild(tdContin);
            trIndiv.appendChild(tdZ);
            trIndiv.appendChild(tdCount);
            trIndiv.appendChild(tdSections);

            trIndiv.classList.add(groupClassName);
            trIndiv.classList.add('individual');
            trIndiv.classList.add('collapse'); // data-toggle
            //trIndiv.classList.add('show'); messes things up

            tdPartner.innerHTML = partner;
            tdDatabase.innerHTML = db;
            tdContin.innerHTML = syn.contin;
            tdZ.innerHTML = syn.z;
            tdSections.innerHTML = syn.sections;
          }
        }
	    }

      toggleAllIndividualRows(true);
	  }
  };
  xhttp.open("GET",url,true);
  xhttp.send();
}
