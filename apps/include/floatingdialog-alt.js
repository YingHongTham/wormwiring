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
 *    if null/not given, attach window as first child of body
 * @param {String} title
 * @param {Boolean} isHidden - default visibility
 */

FloatingDialog2 = function(parent=null, title='', isHidden=false) {
  this.parent = parent;

  // initialized in CreateHTML
  this.window = null; // the whole window div
  this.bar = null; // div containing title
  this.body = null; // just the content

  this.barHeight = 26;

  this.state = {
    isDragging: false,
    isHidden: isHidden,

    // position of top-left corner of floating window in page
    x: 50, // start at these default values
    y: 50,
    // essentially position of mouse relative to top-left corner
    // is recorded at mousedown event,
    // helps set new x,y after moving
    // (see EnableDragging)
    xDiff: 0,
    yDiff: 0,
  };

  this.CreateHTML(title);
  this.EnableDragging();
};


/*
 *  <div class="floating-window"> -- returned
 *    <div class="floating-window-bar">
 *      <div>Window Title</div>
 *      <span class="floating-window-close"> X </span>
 *    </div>
 *    <div class="floating-window-body">
 *      Window body/content
 *    </div>
 *  </div>
 */
FloatingDialog2.prototype.CreateHTML = function(title) {
  const windowDiv = document.createElement('div');
  const windowBar = document.createElement('div');
  const windowTitle = document.createElement('div');
  const spanClose = document.createElement('span');
  const windowBody = document.createElement('div');

  if (this.parent === null) {
    console.log('TODO continue here');
    console.log(document.body);
    document.body.insertBefore(windowDiv, document.body.firstChild);
  } else {
    this.parent.appendChild(windowDiv);
  }

  this.window = windowDiv;
  this.bar = windowBar;
  this.body = windowBody;

  windowDiv.appendChild(windowBar);
  windowDiv.appendChild(windowBody);
  windowBar.appendChild(windowTitle);
  windowBar.appendChild(spanClose);

  windowBar.style.height = this.barHeight+'px';

  windowTitle.innerHTML = title;
  windowTitle.style.display = 'inline-block';

  windowDiv.classList.add('floating-window');
  windowBar.classList.add('floating-window-bar');
  windowBody.classList.add('floating-window-body');

  spanClose.innerHTML = 'x';
  spanClose.padding = '3px';
  spanClose.style.float = 'right';
  spanClose.style.textAlign = 'center';
  spanClose.style.width = '20px';
  spanClose.style.backgroundColor = '#880000';

  const self = this;
  spanClose.onclick = () => { self.CloseWindow(); };

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

FloatingDialog2.prototype.SetWidthHeight = function(width, height) {
  setTimeout(() => {
    this.window.style.width = width+'px';
    this.window.style.height = height+'px';
    this.body.style.width = (width-2)+'px';
    this.body.style.height = (height-this.barHeight-2)+'px';
    console.log(this.body.style.height,height,this.bar.offsetHeight);
  }, 2000);
};

FloatingDialog2.prototype.SetPosition = function(x,y) {
  this.state.x = x;
  this.state.y = y;
};

FloatingDialog2.prototype.GetMainDiv = function() {
  return this.window;
};

// body = content
FloatingDialog2.prototype.GetBody = function() {
  return this.body;
};


FloatingDialog2.prototype.renderWindow = function() {
  if (this.state.isHidden) {
    this.window.style.display = 'none';
  } else {
    this.window.style.display = '';
  }

  this.window.style.transform = 'translate(' + this.state.x + 'px, ' + this.state.y + 'px)';
};

FloatingDialog2.prototype.OpenWindow = function() {
  this.state.isHidden = false;
  this.renderWindow();
};

FloatingDialog2.prototype.CloseWindow = function() {
  this.state.isHidden = true;
  this.renderWindow();
};
