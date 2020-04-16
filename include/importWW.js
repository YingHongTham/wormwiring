var BANNER_IMG = "/art1/oldheadercolor.jpg";
var HOME = '/';
var WIRING_PROJECTS = "/series/"
var APPS = {
    "Skeleton maps":"/apps/neuronMaps ",
    "Volumetric viewer":"/apps/neuronVolume"
};

var CODE = {
    "Elegance":"https://github.com/Emmonslab/Elegance"
}

var CONTACT = "/pages/contact.htm";

var NAVBAR_CLASSES = {
    div: "dropdown",
    button: "dropbtn",
    content: "dropdown-content"
}

ImporterWW = function(_banner,_navbar)
{
    new ImporterBanner(_banner,BANNER_IMG);
    var navbar = document.getElementsByClassName(_navbar)[0];
    var menu = new ImporterNavBar(navbar);
    menu.AddLink('Home',HOME);
    menu.AddLink('Wiring Projects',WIRING_PROJECTS)
    menu.AddDropDown(NAVBAR_CLASSES,"apps",'Apps',APPS);
    menu.AddDropDown(NAVBAR_CLASSES,"code","Code",CODE)
    menu.AddLink('Contact',CONTACT);
};




