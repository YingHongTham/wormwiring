FloatingDialog = function ()
{
	this.dialogDiv = null;
	this.mouseClick = this.MouseClick.bind (this);
};

FloatingDialog.prototype.Open = function (parameters)
{
  window.dispatchEvent(new Event('resize'));
	function AddButton (dialog, parent, button)
	{
		var buttonDiv = document.createElement ('div');
		buttonDiv.className = 'dialogbutton';
		buttonDiv.innerHTML = button.text;
		buttonDiv.onclick = function () {
			button.callback (dialog);
		};
		parent.appendChild (buttonDiv);	
	}

	if (this.dialogDiv !== null) {
		this.dialogDiv.Close ();
	}

	this.dialogDiv = document.createElement ('div');
	this.dialogDiv.className = parameters.className;
	
	var titleDiv = document.createElement ('div');
	titleDiv.className = 'dialogtitle';
	titleDiv.innerHTML = parameters.title;
	this.dialogDiv.appendChild (titleDiv);
	
	var contentDiv = document.createElement ('div');
	contentDiv.className = 'dialogcontent';
	contentDiv.innerHTML = parameters.text;
	this.dialogDiv.appendChild (contentDiv);

	var buttonsDiv = document.createElement ('div');
	buttonsDiv.className = 'dialogbuttons';
	this.dialogDiv.appendChild (buttonsDiv);

	var i, button;
	for (i = 0; i < parameters.buttons.length; i++) {
		button = parameters.buttons[i];
		AddButton (this, buttonsDiv, button);
	}

  // YH
  //const canvas = document.getElementById ('meshviewer');
  const left = document.getElementById ('left');
  this.dialogDiv.style.width = (window.innerWidth - 200) + 'px';
  this.dialogDiv.style.height = (left.offsetHeight - 50) + 'px';
  this.dialogDiv.style.overflow = 'auto';
  contentDiv.style.width = (this.dialogDiv.offsetWidth - 200) + 'px';
  contentDiv.style.height = (this.dialogDiv.offsetHeight - 200) + 'px';
  contentDiv.style.overflow = 'auto';

	document.body.appendChild(this.dialogDiv);

	document.addEventListener ('click', this.mouseClick, true);
	this.Resize();
};

FloatingDialog.prototype.Close = function ()
{
	if (this.dialogDiv === null) {
		return;
	}
	
	document.body.removeChild (this.dialogDiv);
	document.removeEventListener ('click', this.mouseClick, true);
	this.dialogDiv = null;
};

// should this be called reposition??
FloatingDialog.prototype.Resize = function ()
{
	if (this.dialogDiv === null) {
		return;
	}
	
	//this.dialogDiv.style.left = ((document.body.clientWidth - this.dialogDiv.clientWidth) / 2.0) + 'px';
	//this.dialogDiv.style.top = ((document.body.clientHeight - this.dialogDiv.clientHeight) / 3.0) + 'px';
	this.dialogDiv.style.left = ((window.innerWidth - this.dialogDiv.offsetWidth) / 2.0) + 'px';
	this.dialogDiv.style.top = ((window.innerHeight - this.dialogDiv.offsetHeight) / 2.0) + 'px';
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
