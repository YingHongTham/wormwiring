ImporterApp = function() {
  // set up section selector/zoom level

  // selector of section of synapse
	const selector = document.getElementById('section');
  // zoom level
  const zoomform = document.getElementById('zoomForm');

  const self = this;
	selector.onchange = zoomform.onchange = function() {
    let zoom = self.GetZoomLevel();
    let objNum = self.GetSectionObjNum();
	  self.LoadImage(zoom,objNum);
  };
};

/*
 * params = { db: , cell: , contin: , },
 * representing a synapse
 */
ImporterApp.prototype.LoadSynapse = function(params) {
  this.db = params.db;
  this.cell = params.cell;
  this.contin = params.contin;

  const self = this;
  
  const url = `../php/getSynapse.php?db=${this.db}&contin=${this.contin}`;
  const xhttp = new XMLHttpRequest();    
  xhttp.onreadystatechange = function() {
	  if (this.readyState == 4 && this.status == 200) {
	    const data = JSON.parse(this.responseText);

      // set the info section (main-info)
	    document.getElementById('database').innerHTML = self.db;
	    document.getElementById('cell').innerHTML = self.cell;
	    document.getElementById('contin').innerHTML = self.contin;
	    document.getElementById('source').innerHTML = data.pre;
	    document.getElementById('target').innerHTML = data.post;
	    document.getElementById('sections').innerHTML = data.sections;

      // add options to selector, one for each section
      const selector = self.GetSectionSelector();
	    for (let objNum in data.image){
	      const opt = document.createElement('option')
	      opt.value = objNum;
	      opt.innerHTML =
          `${self.db}: ${data.image[objNum].imgNum}` +
          `ObjectID: ${objNum}`;
	      selector.appendChild(opt);
	    };

      // load the first section
	    let objNum = Object.keys(data.image)[0];
	    let zoom = GetZoomLevel();
	    self.LoadImage(zoom,objNum);
	    //var imgUrl = '../php/loadReducedEM
	  }
  };
  xhttp.open("GET",url,true);
  xhttp.send();

};


ImporterApp.prototype.LoadImage = function(_zoom,_objNum)
{
  var objNum = _objNum;
  var url = `../php/loadSynapseImage.php?contin=${this.contin}`
    + `&db=${this.db}&objNum=${objNum}&zoom=${_zoom}`;
  console.log('synapse viewer: ', url);

  const xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function(){
	  if (this.readyState == 4 && this.status == 200){
	    const data = JSON.parse(this.responseText);
	    const img_src = "data:image/jpeg;base64,"+data;
	    const canvas = document.getElementById('canvas');
	    const img = document.createElement('img');
	    img.src = img_src;
	    while (canvas.firstChild){
	  	  canvas.removeChild(canvas.firstChild);
	    };
	    canvas.appendChild(img);
	    console.log('Image loaded: ' + objNum);
	  };
  };
  xhttp.open("GET",url,true);
  xhttp.send();
}


ImporterApp.prototype.GetZoomLevel = function() {
	return document.getElementById('zoomForm').elements['zoomMode'].value;
};

ImporterApp.prototype.GetSectionSelector = function() {
	return document.getElementById('section');
};
ImporterApp.prototype.GetSectionObjNum = function() {
	return this.GetSectionSelector().value;
};
