/*
//draw cube
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
const cube = new THREE.Mesh( geometry, material );
scene.add( cube );

camera.position.z = 5;

function animate() {
	requestAnimationFrame( animate );
	cube.rotation.x += 0.01;
	cube.rotation.y += 0.01;
	renderer.render( scene, camera );
}
animate();
*/

//draw lines
const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

const camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 500 );
camera.position.set( 0, 0, 100 );
camera.lookAt( 0, 0, 0 );

const scene = new THREE.Scene();

//data for line1
const material = new THREE.LineBasicMaterial( { color: 0x0000ff } );
const points = [];
points.push( new THREE.Vector3( - 10, 0, 0 ) );
points.push( new THREE.Vector3( 0, 10, 0 ) );
points.push( new THREE.Vector3( 0, 0, 0 ) );
points.push( new THREE.Vector3( 10, 0, 0 ) );

//data for line2
const material2 = new THREE.LineBasicMaterial( { color: 0x00ff00 } );
const points2 = [];
points2.push( new THREE.Vector3( - 10, 6, 0 ) );
points2.push( new THREE.Vector3( 6, 10, 0 ) );
points2.push( new THREE.Vector3( 6, 6, 0 ) );
points2.push( new THREE.Vector3( 10, 6, 0 ) );

const geometry = new THREE.BufferGeometry().setFromPoints( points );
const geometry2 = new THREE.BufferGeometry().setFromPoints( points2 );

const line = new THREE.Line( geometry, material );
const line2 = new THREE.Line( geometry2, material2 );

//can group objects together, easier to toggle visible etc
const group = new THREE.Group();
group.add(line);
group.add(line2);

//scene.add( line );
//scene.add( line2 );
scene.add(group);


renderer.render( scene, camera );

//updating the position
const positions = line.geometry.attributes.position.array;
//weird: vertex positions stored as single array
//x1, y1, z1, x2, y2, z2, ...
positions[3] = -5;
line.geometry.attributes.position.needsUpdate = true;

renderer.render( scene, camera );

positions[3] = 5;
//needsUpdate needs to be set again, very strange
line.geometry.attributes.position.needsUpdate = true;

//group.visible = false;
//line.visible = false; //can toggle visibility individually
line.name = 'line1';


//objects seem to get stolen by the new group
const group2 = new THREE.Group();
//group2.add(line);
group2.add(line2);
//group2.visible = false;
//have to add the new group to see line2
scene.add(group2);

renderer.render( scene, camera );

//toggliing visibility; just set false; need to render afterwards
//line.visible = false; //can toggle visibility individually
