/*
 * CSS in /css/floatingdialog.css, /css/importer.css
 * and maybe also /css/neuronMaps/css/neuronmaps.css
 */


FloatingDialog = function ()
{
  this.modalDiv = null; // blocks everything and closes div when clicked
	this.dialogDiv = null; // keep ref for resizing
  this.contentDiv = null; // keep ref for user to access and modify
	this.mouseClick = this.MouseClick.bind(this);
};

/*
 * the actual HTML and stuff is created on Open, and destroyed on Close
 *
 * structure of HTML of floating dialog:
 *  <div> // this.modalDiv
 *  </div>
 *  <div> // this.dialogDiv
 *    <div> // titleDiv
 *      Cell Selector
 *      <div>close</div> // button
 *      <div>load</div> // button
 *    </div>
 *    <div> // contentDiv
 *      <div> // panel
 *        Neurons
 *      </div>
 *        Muscles
 *      <div> // panel
 *      </div>
 *    </div>
 *    <!-- used to be buttonsDiv here -->
 *  </div>
 *
 * @param {Object} parameters - keys, all required:
 *  className: 'dialog',
 *  title : 'Help',
 *  text : dialogText,
 *  buttons : [
 *    {
 *      text : 'close',
 *      callback : function (dialog) {
 *        dialog.Close();
 *      }
 *    },
 *    ...
 *  ],
 */
FloatingDialog.prototype.Open = function(parameters)
{
  window.dispatchEvent(new Event('resize'));
	if (this.dialogDiv !== null) {
		this.dialogDiv.Close();
	}

  const main_this = this;

  // prepare and add modal background
  this.modalDiv = document.createElement('div');
  this.modalDiv.classList.add('modal-background'); // css/importer.css
  this.modalDiv.onclick = () => {
    main_this.Close();
  };
	document.body.appendChild(this.modalDiv);


	this.dialogDiv = document.createElement ('div');
	this.dialogDiv.classList.add(parameters.className);
	//this.dialogDiv.classList.add('modal-content');
	this.dialogDiv.classList.add('floatingDialog');
  console.log(this.dialogDiv);
	
	const titleDiv = document.createElement('div');
	titleDiv.classList.add('dialogtitle');
	this.dialogDiv.appendChild(titleDiv);

  const titleSpan = document.createElement('span');
	titleSpan.classList.add('dialogtitlespan');
	titleSpan.innerHTML = parameters.title;
  titleDiv.appendChild(titleSpan);

  // add buttons to other side of title bar
  for (const buttonParam of parameters.buttons) {
		const buttonDiv = document.createElement('div');
		buttonDiv.classList.add('dialogbutton');
		buttonDiv.innerHTML = buttonParam.text;
		buttonDiv.onclick = function () {
			buttonParam.callback(main_this);
		};
		//buttonsDiv.appendChild(buttonDiv);
		titleDiv.appendChild(buttonDiv);
	}


  const contentDiv = document.createElement ('div');
	this.contentDiv = contentDiv;
	contentDiv.classList.add('dialogcontent');
  if (parameters.hasOwnProperty('text')) {
    contentDiv.innerHTML = parameters.text; // keeping this for backward comp
  }
	this.dialogDiv.appendChild(contentDiv);

	//const buttonsDiv = document.createElement('div');
	//buttonsDiv.classList.add('dialogbuttons');
	//this.dialogDiv.appendChild(buttonsDiv);

	document.body.appendChild(this.dialogDiv);

	this.Resize();
};

FloatingDialog.prototype.Close = function ()
{
	//if (this.dialogDiv === null) {
	if (this.modalDiv === null) {
		return;
	}
	
	document.body.removeChild(this.dialogDiv);
	document.body.removeChild(this.modalDiv);
	document.removeEventListener('click', this.mouseClick, true);
	this.modalDiv = null;
	this.dialogDiv = null;
  this.contentDiv = null;
};

// should this be called reposition??
FloatingDialog.prototype.Resize = function ()
{
	if (this.dialogDiv === null) {
		return;
	}

  const titleDiv = this.dialogDiv.querySelector('.dialogtitle');

  this.contentDiv.style.height = 
    (this.dialogDiv.clientHeight 
    - titleDiv.clientHeight) + 'px';
};

FloatingDialog.prototype.GetContentDiv = function() {
  return this.contentDiv;
};

FloatingDialog.prototype.MouseClick = function (clickEvent)
{
	if (this.dialogDiv === null) {
		return;
	}

	var dialogClicked = false;
	var target = clickEvent.target;
	while (target !== null) {
		if (target === this.dialogDiv) {
			dialogClicked = true;
		}
		target = target.parentElement;
	}
	
	if (!dialogClicked) {
		this.Close ();
	}
};
