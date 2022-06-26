/*
 * creates the header ("Connectomics", links etc)
 * at the top of each page
 *
 * makes the header-nav collapsible
 *
 * assumes header-alt.js has been 'applied' to id=header-nav
 */

// don't pollute namespace
{
  let headerNav = document.getElementById('header-nav');
  //let headerImage = headerNav.querySelector('#headerimage');
  //headerImage.style.height = '40px';

  function toggleHeaderNav() {
    let headerNav = document.getElementById('header-nav');

    // true if currently collapsed
    const collapsed = (headerNav.style.display === 'none');
    headerNav.style.display = collapsed ? 'block' : 'none';
  
    const btn = document.getElementById('btn-collapse-header-nav');
    btn.style.display = collapsed ? 'none' : 'block';
    window.dispatchEvent(new Event('resize'));
  };
  
  
  // tiny button on the right to hide
  let navbar = headerNav.querySelector('#nav');
  let span = document.createElement('span');
  navbar.appendChild(span);

  span.innerHTML = 'Hide X';
  span.classList.add('hide-nav'); // /css/home.ss
  span.onclick = toggleHeaderNav;
  
  
  // button that appears when header is collapsed
  // remains hidden when header is not collapsed
  // css in /css/home.css
  let btn = document.getElementById('btn-collapse-header-nav');
  btn.style.display = 'none';
  btn.style.textAlign = 'center'; // more in /css/home.css
  btn.onclick = toggleHeaderNav;

  let sp1 = document.createElement('span');
  let sp2 = document.createElement('span');
  btn.appendChild(sp1);
  btn.appendChild(sp2);

  sp1.innerHTML = '<b>WormWiring</b>';
  sp2.innerHTML = 'Show Navigation';
  sp2.style.float = 'right';
}

