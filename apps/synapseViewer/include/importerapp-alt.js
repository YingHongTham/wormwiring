/*
 * old version requests/loads image each time a different section/zoom level is selected;
 *
 * here we load all, and just hide when we select different
 *
 * note that the section selector has the object number as value
 * and not section number
 *
 * for my local testing, I only have N2U/NR/0(61,62,63).tif
 * so test on synapse with CON_Number = 3321
 */

const ZOOM_LOW = 0;
const ZOOM_HIGH = 1;

ImporterApp = function() {
  // set up section selector/zoom level

  // selector of section of synapse
	const selector = this.GetSectionSelector();
  // zoom level
  const zoomform = this.GetHTMLZoomForm();

  const self = this;
	selector.onchange = zoomform.onchange = function() {
	  self.ShowImageSelectedInHTML();
  };

  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  // references to the image elements
  // this.imgElems[objNum][zoomLevel] = image element
  // initialized as empty image element in LoadSynapse,
  // image elements populated with image in LoadImage
  this.imgElems = {};
  // object numbers(sections) ordered by inc z-coord
  this.objsOrdered = [];
};

/*
 * old: params = { db: , cell: , contin: , },
 * representing a synapse
 *
 * retrieves synapse sections, corresponding image file names,
 * then calls LoadImage for each section
 */
ImporterApp.prototype.LoadSynapse = function(db, contin) {
  this.db = db;
  //this.cell = params.cell;
  this.contin = contin;

  const self = this;
  
  const url = `../php/getSynapse-alt.php?db=${this.db}&contin=${this.contin}`;
  const xhttp = new XMLHttpRequest();    
  xhttp.onreadystatechange = function() {
	  if (this.readyState == 4 && this.status == 200) {
      // expect an array, each entry is a row of query result
      // (in the form of dictionary)
	    const data = JSON.parse(this.responseText);

      if (data.length === 0) {
        // no synapse found?
        document.getElementById('info-error').innerHTML =
          `<i style='color:red'>No such synapse found</i>`;
        return;
      }

      console.log(data);

      // set the info section (main-info)
	    document.getElementById('info-source').innerHTML =
        data[0].pre;
	    document.getElementById('info-target').innerHTML =
        data[0].post;
	    document.getElementById('info-sections').innerHTML =
        data[0].sections;
      // data[0].sections should be same as data.length

      // add options to selector, one for each section
      // note that the value of an option
      // is the object number and not section number
      const selector = self.GetSectionSelector();
      for (let sect of data) {
	      const opt = document.createElement('option');
	      opt.value = sect.objNum;
	      opt.innerHTML =
          `${self.db}: ${sect.imgNum}, ObjectID: ${sect.objNum}`;
	      selector.appendChild(opt);
	    };
	    //for (let objNum in data.image){
      //  const imageNum = data.image[objNum].imgNum;
	    //  const opt = document.createElement('option');
	    //  opt.value = objNum;
	    //  opt.innerHTML =
      //    `${self.db}: ${imageNum}, ObjectID: ${objNum}`;
	    //  selector.appendChild(opt);
	    //};
      
      // add img elements to imageDiv,
      // one for each section and zoom level,
      // in anticipation of LoadImage
      const imageDiv = document.getElementById('imageDiv');
      for (let sect of data) {
        const objNum = sect.objNum;
        self.imgElems[objNum] = {};
        for (let zoom of [ZOOM_LOW,ZOOM_HIGH]) {
          const img = document.createElement('img');
          self.imgElems[objNum][zoom] = img;
          img.id = `img-${objNum}-zoom-${zoom}`;
          imageDiv.appendChild(img);
        }
      }
      //for (let objNum in data.image) {
      //  self.imgElems[objNum] = {};
      //  for (let zoom of [ZOOM_LOW,ZOOM_HIGH]) {
      //    const img = document.createElement('img');
      //    self.imgElems[objNum][zoom] = img;
      //    img.id = `img-${objNum}-zoom-${zoom}`;
      //    imageDiv.appendChild(img);
      //  }
      //}

      self.ShowImageSelectedInHTML();

      // retrieve/load the images
      for (let obj in self.imgElems) {
        for (let zoom in self.imgElems[obj]) {
          self.LoadImage(obj, zoom);
        }
      }
	  }
  };
  xhttp.open("GET",url,true);
  xhttp.send();
};


ImporterApp.prototype.LoadImage = function(objNum,zoom)
{
  const url = `../php/loadSynapseImage.php?` +
    `contin=${this.contin}&db=${this.db}&` +
    `objNum=${objNum}&zoom=${zoom}`;
  console.log('synapse viewer: ', url);

  const self = this;
  const xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function(){
	  if (this.readyState == 4 && this.status == 200){
	    const data = JSON.parse(this.responseText);
	    const img = self.imgElems[objNum][zoom]
      img.src = "data:image/jpeg;base64,"+data;
	  };
  };
  xhttp.open("GET",url,true);
  xhttp.send();
}


ImporterApp.prototype.GetHTMLZoomForm = function() {
	return document.getElementById('zoomForm');
};
ImporterApp.prototype.GetHTMLZoomLevel = function() {
	return this.GetHTMLZoomForm().elements['zoomMode'].value;
};

ImporterApp.prototype.GetSectionSelector = function() {
	return document.getElementById('section');
};
ImporterApp.prototype.GetHTMLObjNum = function() {
	return this.GetSectionSelector().value;
};

ImporterApp.prototype.ShowImage = function(objNum, zoomLevel) {
  for (let obj in this.imgElems) {
    for (let zoom in this.imgElems[obj]) {
      this.imgElems[obj][zoom].style.display = 'none';
    }
  }

  this.imgElems[objNum][zoomLevel].style.display = '';
};

ImporterApp.prototype.ShowImageSelectedInHTML = function() {
  let obj = this.GetHTMLObjNum();
  let zoom = this.GetHTMLZoomLevel();
  this.ShowImage(obj, zoom);
};
