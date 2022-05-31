/*
 * creates the header ("Connectomics", links etc)
 * at the top of each page
 *
 * makes the header-nav collapsible
 *
 * assumes header-alt.js has been 'applied' to id=header-nav
 *
 * in header-alt.js:
 * const headerNav = document.getElementById('header-nav');
 */

function toggleHeaderNav() {
  // true if currently collapsed
  const collapsed = (headerNav.style.display === 'none');
  headerNav.style.display = collapsed ? 'block' : 'none';

  const btn = document.getElementById('collapse-header-nav');
  btn.style.display = collapsed ? 'none' : 'block';
  btn.classList.toggle('collapsed-state', !collapsed);
  btn.innerHTML = 'Show Navigation';
  setTimeout(() => document.dispatchEvent(new Event('resizeAll'))
    , 10);
};


// tiny button on the right to hide
const navbar = headerNav.querySelector('#nav');
let span = document.createElement('span');
span.onclick = toggleHeaderNav;
span.innerHTML = 'Hide X';
span.classList.add('hide-nav');
navbar.appendChild(span);


const btn = document.getElementById('collapse-header-nav');
btn.style.display = 'none';
btn.innerHTML = 'Show Navigation';
btn.onclick = toggleHeaderNav;

