/*
 * class representing a floating dialog,
 * meant to eventually replace FloatingDialog.js
 * improvements:
 * -draggable
 * -option to be not modal
 *
 * largely stolen from https://www.columbia.edu/~njn2118/journal/2019/4/26.html
 */

FloatingDialog2 = function() {
  // initialized in CreateHTML
  this.window = null; // the whole window div
  this.bar = null; // div containing title
  this.body = null; // just the content

  this.state = {
    isDragging: false,
    isHidden: false,

    // position of top-left corner of floating window in page
    x: 0,
    y: 0,
    // essentially position of mouse relative to top-left corner
    // is recorded at mousedown event,
    // helps set new x,y after moving
    xDiff: 0,
    yDiff: 0,
  };

  this.CreateHTML();
  this.EnableDragging();
};


/*
 *  <div class="window"> -- returned
 *    <div class="window-bar">
 *      <div>Window Title</div>
 *      <span class="window-close"> X </span>
 *    </div>
 *    <div class="window-body">
 *      Window body
 *    </div>
 *  </div>
 */
FloatingDialog2.prototype.CreateHTML = function() {
  const windowDiv = document.createElement('div');
  const windowBar = document.createElement('div');
  const windowTitle = document.createElement('div');
  const windowBody = document.createElement('div');

  windowDiv.appendChild(windowBar);
  windowDiv.appendChild(windowBody);
  windowBar.appendChild(windowTitle);

  windowTitle.innerHTML = 'garage';

  windowDiv.classList.add('floating-window');
  windowBar.classList.add('floating-window-bar');
  windowBody.classList.add('floating-window-body');

  this.window = windowDiv;
  this.bar = windowBar;
  this.body = windowBody;
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
  this.window.style.width = width+'px';
  this.window.style.height = height+'px';
};

FloatingDialog2.prototype.SetPosition = function(x,y) {
  this.state.x = x;
  this.state.y = y;
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
