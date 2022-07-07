/*
 * essentially same as build_partnerList_alt,
 * but we get data from getSynapseList-alt.php
 * and not getPartnerList-alt.php
 * one step towards having combined list viewer
 * that is actually combined (not relying on iframe)
 *
 * getPartnerList.php did the grouping for us
 * we have to do the grouping here ourselves
 *
 * getSynapseList-alt.php returns an assoc array
 * with three keys, 'gap', 'pre', 'post'
 * and each has value which is an array of synapses,
 * each synapse being an assoc array of data regarding itself
 * (see /apps/synapseList/include/build_synapseList_alt.js
 * for details)
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
    
  //================================================
  // set links to Synapse List app
  // (by default it's set to partnerList with no url params)
  const urlSynapseList = '../synapseList/'
    + `?db=${db}`
    + `&cell=${cell}`;
  const pnava = document.getElementById('nav-synapse-list');
  pnava.href = urlSynapseList;
  const pnava2 = document.getElementById('nav-synapse-list-2');
  pnava2.href = urlSynapseList;


  //================================================
  // set Cell Name and Database in the HTML
  const cellElems = document.querySelectorAll('.cellnameSpan');
  for (const elem of cellElems) {
    elem.innerHTML = cell;
  }
  const dbElems = document.querySelectorAll('.databaseSpan');
  for (const elem of dbElems) {
    elem.innerHTML = db;
  }

  //================================================
  // url to php which makes the MySQL queries
  const url = '../php/getSynapseList-alt.php/'
    + `?db=${db}`
    + `&cell=${cell}`;
  const xhttp = new XMLHttpRequest();    
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      const data = JSON.parse(this.responseText);

      // group by type and partner
      const synByTypePartner = {
        'gap': {},
        'pre': {}, // post partners when cell is pre
        'post': {}, // pre partner when cell is post
        'post-post': {}, // post partners when cell is post also
      };
      // synByTypePartner[type][X] summarizes the synapses
      // with X as a partner of given type:
      //  synByTypePartner[type][X] = {
      //    count: #synapses
      //    sections: total # sections across synapses
      //  }
      // note that these groups are not mutually exclusive,
      // and may count synapses several times
      // (we choose to do so as it indicates "strength"
      // of the partner as a synaptic partner);
      // a synapse like X -> X,Y,X,X,
      // as a synapse of X (i.e. when given cell == X),
      // would be counted in the groups several times:
      // synByTypePartner['pre'][X] (counted 3 times)
      // synByTypePartner['pre'][Y] (counted 1 time)
      // synByTypePartner['post'][X] (counted 1 time)
      // synByTypePartner['post'][Y] (counted 1 time)
      // synByTypePartner['post-post'][X] (counted 2 times)
      // synByTypePartner['post-post'][Y] (counted 1 time)

      let synByPartner = synByTypePartner['gap'];
      for (const syn of data['gap']) {
        // syn.pre is guaranteed to be ==cell
        if (!synByPartner.hasOwnProperty(syn.post)) {
          synByPartner[syn.post] = {
            count: 0,
            sections: 0,
          };
        }
        synByPartner[syn.post].count += 1;
        synByPartner[syn.post].sections += syn.sections;
      }

      synByPartner = synByTypePartner['pre'];
      for (const syn of data['pre']) {
        // syn.pre is guaranteed to be ==cell
        // go through post, which is comma-sep list
        for (const post of syn.post.split(',')) {
          if (!synByPartner.hasOwnProperty(post)) {
            synByPartner[post] = {
              count: 0,
              sections: 0,
            };
          }
          synByPartner[post].count += 1;
          synByPartner[post].sections += syn.sections;
        }
      }

      // pre partner when cell is in post
      synByPartner = synByTypePartner['post'];
      for (const syn of data['post']) {
        if (!synByPartner.hasOwnProperty(syn.pre)) {
          synByPartner[syn.pre] = {
            count: 0,
            sections: 0,
          };
        }
        synByPartner[syn.pre].count += 1;
        synByPartner[syn.pre].sections += syn.sections;
      }

      // post partners when cell is in post
      synByPartner = synByTypePartner['post-post'];
      for (const syn of data['post']) {
        const postList = syn.post.split(',');

        // if cell appears once in post, we shouldn't count,
        // but if appears twice in post, count once, etc.
        // put simply, we remove cell exactly once
        // from the list of post partners
        if (postList.includes(cell)) {
          const ind = postList.indexOf(cell);
          postList.splice(ind, 1);
        }
        for (const post of postList) {
          if (!synByPartner.hasOwnProperty(post)) {
            synByPartner[post] = {
              count: 0,
              sections: 0,
            };
          }
          synByPartner[post].count += 1;
          synByPartner[post].sections += syn.sections;
        }
      }

      const syntypes = ['gap','pre','post','post-post'];
      for (let type of syntypes) {
    	  const tbl = document.getElementById('table-'+type);

        synByPartner = synByTypePartner[type];

        // one row for each partner
    	  for (const partner in synByPartner) {
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
          tdCount.innerHTML = synByPartner[partner]['count'];
    		  
          tdSections.colSpan = 1;
    		  tdSections.classList.add('lcol');
          tdSections.innerHTML = synByPartner[partner]['sections'];
    	  }
      }
    }
  };
  xhttp.open("GET",url,true);
  xhttp.send();
};
