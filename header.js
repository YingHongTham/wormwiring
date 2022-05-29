/*
 * writes the header for every page
 * (the "Connectomics" and Home, Literature etc links)
 * (not to be confused with the head of HTML)
 *
 * use /css/homecss
 */

//end part of url to name of page
const urlToName = {
	'index.html' : 'HOME',
	'literature.html' : 'LIT',
	'software.html' : 'SOFT',
	'contact.html' : 'CONT'
};
//the string we should put in the html so that that tab is blue
//put empty string if that page is not displayed
const pageBlueAttr = {
	'HOME' : '',
	'LIT' : '',
	'SOFT' : '',
	'CONT' : ''
};

//string to add to html tag to make it blue
const blueString = " style='background-color: #3C7DB9'";

//get the url of the page, and which one of those pages we're on
const ind = window.location.href.lastIndexOf('/') + 1;
const url = window.location.href.substring(ind);

pageBlueAttr[urlToName[url]] = blueString;


//html for header
//useful to keep the html structure in tact for readability
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
"<div id='nav' style='font-size: 0px'>"+
"  <ul style='font-size: 16px'><b>"+
//"  <li><a href='/index.html' style='background-color: #3C7DB9'>HOME</a></li>"+
"  <li><a href='/index.html'"+pageBlueAttr['HOME']+">HOME</a></li>"+
"  <li><a href='/pages/literature.html'"+pageBlueAttr['LIT']+">LITERATURE</a></li>"+
"  <li><a href='/pages/software.html'"+pageBlueAttr['SOFT']+">SOFTWARE</a></li>"+
"  <li><a href='/pages/contact.html'"+pageBlueAttr['CONT']+">CONTACT</a></li>"+
"  </b></ul>"+
"</div>"
;

//TODO in old html, in the navigation bar,
//the link has blue background when on that page
//can do this easily with node
//but for now, just stick with static

//some js tutorial suggest removing unnecessary whitespaces
//but this seems to work fine
//headerhtml = headerhtml.replace('\n\t','');

document.write(headerhtml);
