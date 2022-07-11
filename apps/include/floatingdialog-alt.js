/*
 * class representing a floating dialog,
 * meant to eventually replace FloatingDialog.js
 * improvements:
 * -draggable
 * -option to be not modal
 *
 * largely stolen from https://www.columbia.edu/~njn2118/journal/2019/4/26.html
 *
 * @param {HTMLElement} parent - to which the window is appended as child;
 *    if null/not given, attach window as first child of document.body
 * @param {String} title
 * @param {Boolean} isHidden - default visibility
 * @param {Boolean} modal - have modal background?
 */

FloatingDialog2 = function(parent=null, title='', isHidden=falsemodal=false) {
  this.parent = parent;

  // initialized in CreateHTML(); see comments
  // for overall HTML structure
  this.window = null; // the whole window div
  this.bar = null; // div containing title
  this.body = null; // div containing content
  this.content = null; // where stuff should go
  // ^ extra layer for measuring width of actual content

  // window-sized div that the floating window floats over
  // slightly opaque
  // when clicked, floating window should close
  // remains null if choose not to use modal background
  this.modalBackground = null;

  this.barHeight = 26;

  this.defaultWidth = 300;

  this.state = {
    isDragging: false,
    isHidden: isHidden,

    // position of top-left corner of floating window in page
    x: 25, // start at these default values
    y: 25,
    // essentially position of mouse relative to top-left corner
    // is recorded at mousedown event,
    // helps set new x,y after moving
    // (see EnableDragging)
    xDiff: 0,
    yDiff: 0,
  };

  this.CreateHTML(title, modal);
  this.EnableDragging();
};


/*
 *  <div></div> -- modalBackground, if applicable
 *  <div class="floating-window"> -- this.window
 *    <div class="floating-window-bar"> -- this.bar
 *      <div>Window Title</div>
 *      <span class="floating-window-close"> X </span>
 *    </div>
 *    <div class="floating-window-body"> -- this.body
 *      <div> -- this.content
 *        Window body/content
 *      </div>
 *    </div>
 *  </div>
 */
FloatingDialog2.prototype.CreateHTML = function(title,modal) {
  // floating window; add modal background last
  const windowDiv = document.createElement('div');
  const windowBar = document.createElement('div');
  const windowTitle = document.createElement('div');
  const spanClose = document.createElement('span');
  const windowBody = document.createElement('div');
  const windowContent = document.createElement('div');

  if (this.parent === null) {
    setTimeout(() => {
      document.body.insertBefore(windowDiv, document.body.firstChild);
    },0);
  } else {
    this.parent.appendChild(windowDiv);
  }

  this.window = windowDiv;
  this.bar = windowBar;
  this.body = windowBody;
  this.content = windowContent;

  windowDiv.appendChild(windowBar);
  windowDiv.appendChild(windowBody);
  windowBody.appendChild(windowContent);
  windowBar.appendChild(windowTitle);
  windowBar.appendChild(spanClose);

  windowBar.style.height = this.barHeight+'px';

  windowTitle.innerHTML = title;
  windowTitle.style.display = 'inline-block';

  windowDiv.classList.add('floating-window');
  windowBar.classList.add('floating-window-bar');
  windowBody.classList.add('floating-window-body');
  windowContent.style.width = 'fit-content';

  spanClose.innerHTML = 'x';
  spanClose.padding = '3px';
  spanClose.style.float = 'right';
  spanClose.style.textAlign = 'center';
  spanClose.style.width = '20px';
  spanClose.style.backgroundColor = '#880000';

  const self = this;
  spanClose.onclick = () => { self.CloseWindow(); };

  this.SetWidthHeight(this.defaultWidth, this.ComputeHeight());

  this.renderWindow(); // in particular sets visibility

  window.addEventListener('resize', () => {
    self.OnResize();
  },false);

  //=======================
  // modal background

  if (!modal) {
    return windowDiv;
  }

  const modalBackground = document.createElement('div');
  this.modalBackground = modalBackground;

  // see css/importer.css
  modalBackground.classList.add('modal-background');
  modalBackground.onclick = () => {
    self.CloseWindow();
  };

  if (this.parent === null) {
    setTimeout(() => {
      document.body.insertBefore(modalBackground, document.body.firstChild);
    },0);
  } else {
    this.parent.insertBefore(modalBackground, this.parent.firstChild);
  }


  this.renderWindow(); // in particular sets visibility

  return windowDiv;
};


FloatingDialog2.prototype.EnableDragging = function() {
  const self = this;

  this.bar.addEventListener('mousedown', (ev) => {
    self.state.isDragging = true;
    self.state.xDiff = ev.pageX - self.state.x;
    self.state.yDiff = ev.pageY - self.state.y;
  });
  document.addEventListener('mousemove', (ev) => {
    if (self.state.isDragging) {
      self.state.x = self.ClampX(ev.pageX - self.state.xDiff);
      self.state.y = self.ClampY(ev.pageY - self.state.yDiff);
    }

    self.renderWindow();
  });
  document.addEventListener('mouseup', (ev) => {
    self.state.isDragging = false;
  });
};

// limit position of top-left corner of window
FloatingDialog2.prototype.ClampX = function(x) {
  const minX = 0;
  const maxX = window.innerWidth - this.window.offsetWidth;
  if (x < minX) return minX;
  if (x > maxX) return maxX;
  return x;
};

// limit position of top-left corner of window
FloatingDialog2.prototype.ClampY = function(y) {
  const minY = 0;
  const maxY = window.innerHeight - this.window.offsetHeight;
  if (y < minY) return minY;
  if (y > maxY) return maxY;
  return y;
};

FloatingDialog2.prototype.SetWidthHeight = function(width=null, height=null) {
  if (width === null) {
    width = this.window.offsetWidth;
  }
  if (height === null) {
    height = this.window.offsetHeight;
  }
  this.window.style.width = width+'px';
  this.window.style.height = height+'px';
  this.body.style.width = (width-2)+'px';
  this.body.style.height = (height-this.barHeight-2)+'px';
  this.renderWindow();
};

FloatingDialog2.prototype.SetPosition = function(x,y) {
  this.state.x = x;
  this.state.y = y;
};

FloatingDialog2.prototype.GetMainDiv = function() {
  return this.window;
};

// for user to put stuff in window
FloatingDialog2.prototype.GetContentDiv = function() {
  return this.content;
};


FloatingDialog2.prototype.ComputeHeight = function() {
  return window.innerHeight - 50;
};

// is 0 if hidden
FloatingDialog2.prototype.GetContentWidth = function() {
  return this.GetContentDiv().offsetWidth;
};

// should do after window becomes visible
FloatingDialog2.prototype.FitWidthToContent = function() {
  this.SetWidthHeight(this.GetContentWidth()+2, null);
};

// when browser window resize
FloatingDialog2.prototype.OnResize = function() {
  this.SetWidthHeight(null, this.ComputeHeight());
};


// positions dialog to state.x/y relative to parent
FloatingDialog2.prototype.renderWindow = function() {
  if (this.state.isHidden) {
    this.window.style.display = 'none';
    if (this.modalBackground != null) {
      this.modalBackground.style.display = 'none';
    }
  } else {
    this.window.style.display = '';
    if (this.modalBackground != null) {
      this.modalBackground.style.display = '';
    }
  }

  this.window.style.transform = 'translate(' + this.state.x + 'px, ' + this.state.y + 'px)';
};

FloatingDialog2.prototype.OpenWindow = function() {
  this.state.isHidden = false;
  this.renderWindow();
  this.FitWidthToContent();
};

FloatingDialog2.prototype.CloseWindow = function() {
  this.state.isHidden = true;
  this.renderWindow();
};
