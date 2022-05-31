/*
 * writes the header for every page
 * (the "Connectomics" and Home, Literature etc links)
 * (not to be confused with the head of HTML)
 *
 * same as header.js but here we write to the innerHTML
 * of a div already in the html with id = 'header-nav'
 *
 * also we use CSS trick instead of JS to implement
 * the highlighting of navigation item of current page
 * we add a class = `navitem-${page}` to the item for page
 * and in the html,
 * give corresponding class to the div with id='header-nav'
 * and in home.css, implemenet the background-color only
 * if both show up:
 *
 *  <div id='header-nav' class='nav-lit'></div>
 *
 *  .nav-home a.navitem-home,
 *  .nav-lit a.navitem-lit,
 *  ... {
 *    background-color: #3C7DB9;
 *  }
 *
 */

var headerhtml =
"<div id='headerimage' class='headerimage' style='font-size: 0px; height: 80px'>"+
"  <a href='/index.html' style='color: white; text-decoration: none'>"+
"    <h1 style='font-size: 37px; color:white; position:relative; top:-9px'><b>"+
"      WormWiring"+
"      <span style='font-size: 25px; color:white'>"+
"        Nematode Connectomics"+
"      </span>"+
"    </b></h1>"+
"  </a>"+
"</div>"+
""+
"<div id='nav' style='font-size:0px'>"+
"  <ul style='font-size: 16px'><b>"+
"  <li><a class='navitem-home' href='/index.html'>HOME</a></li>"+
"  <li><a class='navitem-lit' href='/pages/literature.html'>LITERATURE</a></li>"+
"  <li><a class='navitem-sftwr' href='/pages/software.html'>SOFTWARE</a></li>"+
"  <li><a class='navitem-ctct' href='/pages/contact.html'>CONTACT</a></li>"+
"  </b></ul>"+
"</div>"
;

// for some reason the font-size:0px is needed to make
// the 'nav' the right height


const headerNav = document.getElementById('header-nav');
headerNav.innerHTML = headerhtml;
