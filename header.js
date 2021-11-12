//writes the header for every page
//(the "Connectomics" and Home, Literature etc links)
//(not to be confused with the head)

//html for header
//useful to keep the html structure in tact for readability
var headerhtml =
"<div class='headerimage' style='font-size: 0px; height: 80px'>"+
"  <a href='/index.html' style='color: white; text-decoration: none'>"+
"    <h1 style='font-size: 37px; color:white'><b>"+
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
"  <li><a href='/index.html'>HOME</a></li>"+
"  <li><a href='/pages/literature.html'>LITERATURE</a></li>"+
"  <li><a href='/pages/software.html'>SOFTWARE</a></li>"+
"  <li><a href='/pages/contact.html'>CONTACT</a></li>"+
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
