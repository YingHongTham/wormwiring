
ImporterBanner = function(_elemId,_image)
{
    var img = document.createElement("img");
    img.src = _image;
    document.getElementById(_elemId).appendChild(img);

}

ImporterNavBar = function(_parent)
{
    this.parent = _parent;
}


ImporterNavBar.prototype.AddLink = function(_label,_href,parent=this.parent)
{
    var a = document.createElement("a");
    a.href = _href;
    a.innerHTML = _label;
    parent.appendChild(a);
}

ImporterNavBar.prototype.AddDropDown = function(_classNames,_id,_label,_content)
{
    var dropDiv = document.createElement("div");
    var dropBtn = document.createElement("button");
    var dropContent = document.createElement("div");
    dropDiv.classList.add(_classNames.div);
    dropBtn.classList.add(_classNames.button);
    dropBtn.innerHTML = _label;
    dropBtn.addEventListener("click",function(){
	document.getElementById(id).classList.toggle("show");
	},false);

    dropContent.classList.add(_classNames.content);
    dropContent.id = _id;
    for (var c in _content){
	this.AddLink(c,_content[c],dropContent);	
    };
    dropDiv.append(dropContent);
    dropDiv.appendChild(dropBtn);
    this.parent.appendChild(dropDiv);
}


ImporterButtons = function (parent)
{
	this.parent = parent;
};

ImporterButtons.prototype.AddLogo = function (title, onClick)
{
	var logoDiv = document.createElement ('div');
	logoDiv.id = 'logo';
	logoDiv.innerHTML = title;
	logoDiv.onclick = onClick;
	this.parent.appendChild (logoDiv);
};

ImporterButtons.prototype.AddButton = function (image, title, onClick)
{
	var buttonImage = document.createElement ('img');
	buttonImage.className = 'topbutton';
	buttonImage.src = image;
	buttonImage.title = title;
	buttonImage.onclick = onClick;
	this.parent.appendChild (buttonImage);
};

ImporterProgressBar = function (parent)
{
	this.parent = parent;
	while (this.parent.lastChild) {
		this.parent.removeChild (this.parent.lastChild);
	}
	this.borderDiv = null;
	this.contentDiv = null;
	this.maxCount = null;
	this.maxWidth = null;
};

ImporterProgressBar.prototype.Init = function (maxCount)
{
	this.borderDiv = document.createElement ('div');
	this.borderDiv.className = 'progressbarborder';

	this.contentDiv = document.createElement ('div');
	this.contentDiv.className = 'progressbarcontent';

	this.borderDiv.appendChild (this.contentDiv);
	this.parent.appendChild (this.borderDiv);
	
	this.maxCount = maxCount;
	this.maxWidth = this.borderDiv.offsetWidth;
	this.Step (0);
};

ImporterProgressBar.prototype.Step = function (count)
{
	var step = this.maxWidth / this.maxCount;
	var width = count * step;
	if (count == this.maxCount) {
		width = this.maxWidth - 2;
	}
	this.contentDiv.style.width = width + 'px';
};

InfoTable = function (parent)
{
	this.table = document.createElement ('table');
	this.table.className = 'infotable';

	while (parent.lastChild) {
		parent.removeChild (parent.lastChild);
	}
	parent.appendChild (this.table);
};

InfoTable.prototype.AddRow = function (name, value)
{
	var tableRow = document.createElement ('tr');
	
	var nameColumn = document.createElement ('td');
	nameColumn.innerHTML = name;
	tableRow.appendChild (nameColumn);

	var valueColumn = document.createElement ('td');
	valueColumn.innerHTML = value;
	tableRow.appendChild (valueColumn);

	this.table.appendChild (tableRow);
};

InfoTable.prototype.AddColorRow = function (name, color)
{
	var tableRow = document.createElement ('tr');
	
	var nameColumn = document.createElement ('td');
	nameColumn.innerHTML = name;
	tableRow.appendChild (nameColumn);

	var valueColumn = document.createElement ('td');
	tableRow.appendChild (valueColumn);
	
	var colorDiv = document.createElement ('div');
	colorDiv.className = 'colorbutton';
	colorDiv.title = '(' + color[0] + ', ' + color[1] + ', ' + color[2] + ')';
	var hexColor = JSM.RGBComponentsToHexColor (color[0] * 255.0, color[1] * 255.0, color[2] * 255.0);
	var colorString = hexColor.toString (16);
	while (colorString.length < 6) {
		colorString = '0' + colorString;
	}
	colorDiv.style.background = '#' + colorString;
	valueColumn.appendChild (colorDiv);
	
	this.table.appendChild (tableRow);
};


//ImporterMenu constructor
//the js behind the left menu
//constructor clears parent node (expected id='menu')
ImporterMenu = function (parent)
{
	this.parent = parent;
	while (this.parent.lastChild) {
		this.parent.removeChild(this.parent.lastChild);
	}
  // refer to stuff added by AddDefaultGroup
  //  mainItems['Synapse info'] = {
  //    bigDiv: div elem contains title and content,
  //    content: div elem, stored in menuGroup in ImporterApp
  //  }
  this.mainItems = {};
};

/*
 * AddSubItem: work horse of this class
 *
 * general structure of resulting html:
 * YH new version: each item has one div
 *  <parent>
 *    // first item
 *    <div> -- menuBigDiv
 *      <div> -- menuItem
 *        <div> -- menuText
 *          ${name}
 *        </div>
 *        <img> -- openCloseImage
 *        <img> -- userImage
 *      </div>
 *      <div> -- menuContent
 *      </div>
 *    </div>
 *    // second item
 *    <div> -- menuBigDiv
 *      ...
 *    </div>
 *  </parent>
 *
 *  old version: BAD, menuItem, menuContent from diff items are siblings
 *  <parent>
 *    // first item
 *    <div> -- menuItem
 *      <img> -- openCloseImage
 *      <img> -- userImage
 *      <div> -- menuText
 *        ${name}
 *      </div>
 *    </div>
 *    <div> -- menuContent
 *    </div>
 *    // second item
 *    <div></div> -- menuItem
 *    <div></div> -- menuContent
 *    ...
 *  </parent>
 *
 * returns the menuContent div..
 *
 * @param {HTMLElement} parent - only function is to contain results
 * @param {String} name - text that heads the item (the 'menuText' div)
 * @param {Object} parameters - (all keys required unless specified 'optional')
 *  {
 *    // for open/close state, e.g. menu item expand/collapse, info button
 *    // defines the openCloseImage img elem
 *    openCloseButton: {
 *      visible: boolean, // default state, true = open
 *      title: help text,
 *      open: image filepath/single unicode character,
 *      close: image filepath/single unicode character,
 *      onOpen: callback(content) what to do when button is in open state,
 *      // content is HTML element menuContent
 *      // there is no onClose, but maybe good to have
 *    },
 *    // for the visibility button (don't see why they look different)
 *    // defines the userImage img elem
 *    userButton: {
 *      //visible: boolean, // YH not used but in practice is provided..
 *      title: help text,
 *      imgSrc: image source for button // YH added
 *      userData: in practice is always name of cell
 *      onClick: callback(imgElem, cellname)
 *      onCreate: callback (optional) // YH only used to add image.. :/
 *    },
 *  }
 *
 * YH TODO future change: I think better to return the big div
 * containing both the menuItem and menuContent divs
 * and leave it to the user to append the returned div
 */
ImporterMenu.prototype.AddSubItem = function(parent, name, parameters)
{
  // just for cutting displaying width
  function GetTruncatedName (name) {
		var maxLength = 20;
		if (name.length > maxLength) {
			return name.substr (0, maxLength) + '...';
		}
		return name;
	}

  // one big div containing the menuItem and menuContent divs
  const menuBigDiv = document.createElement('div');
  menuBigDiv.className = 'menuBigDiv';
  parent.appendChild(menuBigDiv);

  // div that will hold the buttons and menuText
	const menuItem = document.createElement ('div');
	menuItem.className = 'menuitem';
  menuBigDiv.appendChild(menuItem);

	const menuText = document.createElement ('div');
	menuText.className = 'menuitem';
	menuText.innerHTML = GetTruncatedName (name);
	menuText.title = name;
	menuItem.appendChild(menuText);

	var menuContent = null;
	var openCloseImage = null;
	var userImage = null;
		
	if (parameters === undefined || parameters === null) {
    // really should be menuBigDiv
    return menuContent;
  }

  if (parameters.hasOwnProperty('openCloseButton')) {
		menuContent = document.createElement ('div');
		menuContent.className = 'menugroup';
		menuContent.style.display = parameters.openCloseButton.visible ?
        'block' : 'none';

    // set button image/character
    // currently not in use to avoid browser support issues
    //if (parameters.openCloseButton.open.length <= 1) {
    //  // unicode character as image (typically arrow)
    //  // also asssumes that if using this option (i.e. no image)
    //  // then both open and close are like that
    //  openCloseImage = document.createElement('div');
    //  openCloseImage.style.display = 'inline';
    //  openCloseImage.innerHTML = parameters.openCloseButton.visible ?
    //      parameters.openCloseButton.open : parameters.openCloseButton.close;
    //}
    //else {
		openCloseImage = document.createElement('img');
		openCloseImage.className = 'menubutton';
		openCloseImage.title = parameters.openCloseButton.title;
		openCloseImage.src = parameters.openCloseButton.visible ?
        parameters.openCloseButton.open : parameters.openCloseButton.close;
    //}
		openCloseImage.onclick = function () {
      // close to open
			if (menuContent.style.display == 'none') {
				menuContent.style.display = 'block';
        //if (this.nodeName === 'DIV') { // if use unicode for image
        //  this.innerHTML = parameters.openCloseButton.open;
        //} else {
        this.src = parameters.openCloseButton.open;
        //}
				if (parameters.openCloseButton.onOpen !== undefined
            && parameters.openCloseButton.onOpen !== null) {
					parameters.openCloseButton.onOpen(menuContent);
              //parameters.openCloseButton.userData);
				}
			} else { // open to close
				menuContent.style.display = 'none';
        //if (this.nodeName === 'DIV') { // if use unicode for image
        //  this.innerHTML = parameters.openCloseButton.close;
        //} else {
        this.src = parameters.openCloseButton.close;
        //}
        //onClose is never used/given in params!
				//if (parameters.openCloseButton.onClose !== undefined
        //    && parameters.openCloseButton.onClose !== null) {
				//	parameters.openCloseButton.onClose(menuContent,
        //      parameters.openCloseButton.userData);
				//}
			}
		};
		
		menuText.onclick = openCloseImage.onclick;
		menuText.style.cursor = 'pointer';
    menuText.style.display = 'inline';
	}

  if (parameters.hasOwnProperty('userButton')) {
    if (!parameters.userButton.hasOwnProperty('onClick')
        || !parameters.userButton.hasOwnProperty('userData')) {
      console.error('userButton must have onClick and userData');
    }

		userImage = document.createElement ('img');
		userImage.className = 'menubutton';
		userImage.title = parameters.userButton.title;
    userImage.src = parameters.userButton.imgSrc;
    if (parameters.userButton.hasOwnProperty('onCreate')) {
			parameters.userButton.onCreate(userImage, parameters.userButton.userData);
		}
    userImage.onclick = function() {
			parameters.userButton.onClick(userImage, parameters.userButton.userData);
    };
	}

	if (openCloseImage !== null) {
		//menuItem.appendChild(openCloseImage);
    menuItem.insertBefore(openCloseImage, menuText);
	}
	if (userImage !== null) {
		//menuItem.appendChild(userImage);
    menuItem.insertBefore(userImage, menuText);
	}
	if (menuContent !== null) {
		//parent.appendChild(menuContent);
		menuBigDiv.appendChild(menuContent);
	}

  // really should be menuBigDiv
	return menuContent;
};



ImporterMenu.prototype.AddGroup = function(name, parameters) {
  return this.AddSubItem(this.parent, name, parameters);
};

/*
 * YH taken from GenerateMenu in importerapp for both neuronMaps/Volume
 */
ImporterMenu.prototype.AddDefaultGroup = function(name, visible=false) {
	const menuContent = this.AddGroup(name, {
	  openCloseButton : {
	    visible : visible,
	    open : 'images/opened.png',//'\u25b2', avoid support issue
	    close : 'images/closed.png',//'\u25bc',
	    title : 'Show/Hide ' + name
	  }
	});
  this.mainItems[name] = {
    bigDiv: menuContent.parentElement,
    content: menuContent,
  };
	return menuContent;
};

ImporterMenu.prototype.AddSelector = function(parent,name,parameters)
{
	var selectorItem = document.createElement ('div');
	selectorItem.className = 'submenuitem';
	selectorItem.innerHTML = name + ": ";
	if (parameters.options != undefined && parameters.options != null){
		var selector = document.createElement('select');
		selector.id = parameters.id;
		for (var i = 0; i < parameters.options.length; i++){
			var opt = document.createElement('option');
			opt.value = parameters.options[i].value;
			opt.innerHTML = parameters.options[i].text;
			selector.appendChild(opt)
		};
		if (parameters.onChange != undefined && parameters.onChange != null){
			selector.onchange = parameters.onChange;
		};
		selectorItem.appendChild(selector);
	};
	parent.appendChild(selectorItem);
};

