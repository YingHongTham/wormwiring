//class representing a single neuron
//contains the skeleton diagram data,
//synapse objects etc
Neuron = function(database, neuron_name)
{
	//some default parameters

	this.name = neuron_name;
	this.db = database;

	this.skeleton = [];
	//skeleton is stored in several sections,
	//each section is a broken line, and belongs
	//to a single region (Ventral Cord, Nerve Ring etc)
	//this.skeleton[i] = {
	//	'region' : 'VC',
	//	'continNum' : 4398,
	//	'trace' : THREE.Line object
	//	//'cb' ?? still not sure what this does in original
	//}
	//pt0 is THREE.Vector3

	this.synapses = {
		'pre' : [],
		'post' : [],
		'gap' : []
	};
}

const node_address = 'localhost:2000';

//get skeleton trace from php (later maybe from node on server)
Neuron.prototype.retrieveSkeleton = function() {
	//need to hold 'this', because 'this' is used in xhttp
	const neuron_this = this;
	//var url = `retrieve_neuron_skeleton.php?neuron=${this.name}&db=${this.db}`;
	var url = `${node_address}/retrieve_neuron_skeleton?db=${this.db}&cell=${this.name}`;
	console.log(`retrieving skeleton map via ${url}`);
	var xhttp = new XMLHttpRequest();    
	xhttp.onreadystatechange = function(){
		console.log(this.readyState, this.status);
		if (this.readyState == 4 && this.status == 200){
			neuron_this.skeleton = JSON.parse(this.responseText);
			console.log('neuron: ');
			console.log(neuron_this.skeleton);
		}
	};
	xhttp.open("GET",url,true);
	xhttp.send();
};
