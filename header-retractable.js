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
  btn.classList.toggle('collapsed-state', !collapsed);
  btn.innerHTML = collapsed ? 'Hide Navigation' : 'Show Navigation';
  document.dispatchEvent(new Event('resizeAll'));
};

const btn = document.getElementById('collapse-header-nav');
btn.innerHTML = 'Hide Navigation';
btn.onclick = toggleHeaderNav;

