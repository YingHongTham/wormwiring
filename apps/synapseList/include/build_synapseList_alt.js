/*
 * given some cell,
 * gets data on synapses of cell
 * from php/getSynapseList-alt.php,
 * which returns data of the form shown below.
 * for gap, pre always = cell
 * pre means chemical synapses where pre = cell
 * post means chemical synapses where cell is among post
 *
 * sections = number of EM sections that the synapse appears in
 * z = the section number (stand in for z-coordinate)
 *  (I think specifically the z-coordinate of midde of synapse)
 * contin = continNum = contin ID of synapse
 *
 *  data = {
 *    gap: [
 *      {
 *        contin: 6138,
 *        db: "N2U",
 *        post: "PVQL",
 *        pre: "ADAL",
 *        sections: 2,
 *        z: 286,
 *      },
 *      ...
 *    ],
 *    pre: [
 *      {
 *        contin: 556,
 *        db: "N2U",
 *        post: "AVBR,AVAR",
 *        pre: "ADAL",
 *        sections: 7,
 *        z: 153,
 *      },
 *      ...
 *    ],
 *    post: [
 *      {
 *        contin: 4521,
 *        db: "N2U",
 *        post: "ADAL,AVBL,URYDL",
 *        pre: "URBL",
 *        sections: 1,
 *        z: 88,
 *      },
 *      ...
 *    ],
 *  };
 */

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
    const tbodyList = document.querySelectorAll('.tbody-individual');
    tbodyList.forEach( tbody => {
      tbody.classList.toggle('in', expanded);
      tbody.setAttribute('aria-expanded', expanded);
    });
    //const synRows = document.querySelectorAll('.individual');
    //synRows.forEach( row => {
    //  row.classList.toggle('in', expanded);
    //  row.setAttribute('aria-expanded', expanded);
    //});
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
  const pnava2 = document.getElementById('nav-partner-list-2');
  pnava2.href = urlPartnerList;
  
  //================================================
  // set Cell Name in the HTML
  const cellElems = document.querySelectorAll('.cellnameSpan');
  for (const elem of cellElems) {
    elem.innerHTML = cell;
  }

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
          let partner = '';
          switch (type) {
            case 'gap':
            case 'pre':
              partner = syn.post;
              break;
            case 'post':
              partner = syn.pre+'->'+syn.post;
              break;
            default:
              console.error('bruh, type?');
          }
          if (!synByPartner.hasOwnProperty(partner)) {
            synByPartner[partner] = {
              summary: {
                count: 0,
                sections: 0,
              },
              synList: [],
            };
          }
          synByPartner[partner].summary.count += 1;
          synByPartner[partner].summary.sections += syn.sections;
          synByPartner[partner].synList.push(syn);
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
          trSummary.classList.add('labels');
          // clicking this row toggles the class 'collapse'
          // among all elements matching 'data-target'
          // see also in index.html
          trSummary.setAttribute('data-toggle','collapse');
          // use id instead of class
          //trSummary.setAttribute('data-target',
          //    `.${groupClassName}.individual`);
          const tbodyID = `tbody-${type}-${partner}`;
          trSummary.setAttribute('data-target', '#'+tbodyID);
          // need 'role' attribute because trSummary is not button
          trSummary.setAttribute('role', 'button');

          const summary = synByPartner[partner].summary;

          tdPartner.innerHTML = partner;
          tdPartner.colSpan = 4;
          tdCount.innerHTML = summary.count;
          tdCount.colSpan = 1;
          tdSections.innerHTML = summary.sections;
          tdSections.colSpan = 1;

          // tbody used to group individual synapse rows
          const tbody = document.createElement('tbody');
          tbl.appendChild(tbody);

          // make tbody collapsible, not individual rows
          tbody.classList.add(groupClassName);
          tbody.classList.add('tbody-individual');
          tbody.id = tbodyID;
          tbody.classList.add('collapse'); // data-toggle

          // row for each individual synapse
          const synList = synByPartner[partner].synList;
          for (const syn of synList) {
            const trIndiv = document.createElement('tr');
            const tdPartner = document.createElement('td');
            const tdDatabase = document.createElement('td');
            const tdContin = document.createElement('td');
            const continA = document.createElement('a');
            const tdZ = document.createElement('td');
            const tdCount = document.createElement('td');
            const tdSections = document.createElement('td');

            tbody.appendChild(trIndiv);
            trIndiv.appendChild(tdPartner);
            trIndiv.appendChild(tdDatabase);
            trIndiv.appendChild(tdContin);
            trIndiv.appendChild(tdZ);
            trIndiv.appendChild(tdCount);
            trIndiv.appendChild(tdSections);
            tdContin.appendChild(continA);

            trIndiv.style.backgroundColor = 'white';
            trIndiv.classList.add(groupClassName);
            trIndiv.classList.add('individual');
            //trIndiv.classList.add('collapse'); // data-toggle
            //trIndiv.classList.add('show'); messes things up

            tdPartner.innerHTML = partner;
            tdDatabase.innerHTML = db;
            continA.innerHTML = syn.contin;
            continA.href = `/apps/synapseViewer/?neuron=${cell}&db=${db}&continNum=${syn.contin}`;
            continA.target = '_blank';
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
