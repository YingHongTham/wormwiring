// name is used as id for the div containing the item

const helpDialogText = `
<h4>Selecting Cells:</h4>
<p>
First select the series in the left menu,
then click the 'Select Cells' button in the top menu,
which opens a dialog window.
Click on the desired cells, and click load.
</p>
<p>
Viewer should focus on the cell that was loaded last.
</p>

<h4>Cell Options/More Data</h4>
<p>
The list of loaded cells is shown under the 'Maps' section
in the left menu.
Each cell entry has a hidden section containing
more options/data for each cell; click on cell
(away from the 'eye' icon)
to expand this section.
</p>
<p>
Here is a brief description of each entry:
<ul>
  <li>
  Color Selector: allows you to change the color of the skeleton of the cell (we are working on allowing change of volume).
  </li>
  <li>
  Center View: Focuses viewer on the cell.
  </li>
  <li>
  Show Remarks: some locations on the cell are marked with
  'remarks', typically saying why the tracing ends,
  e.g. 'enter left amphid commissure'
  </li>
  <li>
  WormAtlas: link to wormatlas entry on this cell
  </li>
  <li>
  Synapse List: opens an interactive list of synapses;
  click on an entry in the table to focus on that synapse
  </li>
  <li>
  Synapse By Partners: opens a dialog showing the list of synapses
  but grouped by the partner cell(s) (from the List Viewer app)
  </li>
  <li>
  Show/Hide Volume: toggle visibility of volumetric tracing
  </li>
</ul>
</p>

<h4>Clear Maps</h4>
<p>The 'Clear Maps' button in the top menu
clears all cells from viewer/left menu.
One may also simply refresh the page.
</p>

<h4>2D Viewer</h4>
<p>
The 2D Viewer shows a compressed skeleton diagram of
every loaded cell.
Each node corresponds to an "interesting" point
along the cell skeleton:
<ul>
  <li>synapse</li>
  <li>end point</li>
  <li>branch point</li>
  <li>point with remark</li>
</ul>
</p>
<p>
Clicking on a node corresponding to a synapse
will also make the (3D) viewer focus on that synapse.
</p>
<p>
Navigate 2D viewer:
<ul>
  <li>Move/translate everything: mouse left-click and drag background</li>
  <li>Zoom in/out: mouse scroll</li>
  <li>Move one node: mouse left-click and drag that node</li>
</ul>
</p>

<h4>On Navigating the Viewer</h4>
<p>
<ul>
  <li>Rotate view: mouse left-click and drag</li>
  <li>Move view target/focus: mouse right-click and drag</li>
  <li>Zoom in/out: mouse scroll</li>
</ul>
We use the THREE.js library to render the 3D viewer and data,
and for mouse controls, we use OrbitControls.
</p>
<p>
Other ways to navigate/move around:
<ul>
  <li>
  Use 'Center View' in Maps->Cell
  </li>
  <li>
  Use 'Synapse List' in Maps->Cell
  </li>
  <li>
  Click on a synapse, then click on 'Center View on Synapse'
  in the Synapse Info section
  </li>
</ul>
`;


helpDialogItems = [
  {
    title : 'Quick start',
    text : 'Cell skeletons are intially displayed in blue. This can be altered in the maps menu. Cell bodies are displayed as thicker red segements (this color cannot be changed).'
      + 'Presynapses are pink, postsynapses are purple and gap junctions are blue spheres. '
      + 'For presyanpses, the cell is the presynaptic partner. For the postsynapses, the cell is the postsynaptic partners. '
      + 'The size of the sphere reflects the size of the synapse. Mousing over displays the synapse info in the menu. '
      + 'Clicking on the synapse takes the user to the electron micrographs where the synapse was scored. '
      + 'Left mouse button rotates the mapse. Mouse wheel zooms in/out of the maps. Right mouse button pans the maps.',
    video: 'https://www.youtube.com/embed/hySW0Q57iL4',
    name : 'help-display'
  },
  {
    title : 'Cell selector',
    text : 'First select the sex and data series from the dropdown menus on the left. Then click on the Select Neuron button.',
    video: 'https://www.youtube.com/embed/l_oCC-3GdVQ',
    name : 'help-series'
  },
  {
    title : 'Synapse info',
    text :
    'Synapses are represented as spheres along the skeleton diagram. Click/hover over synapse to display info for that synapse in the left panel. Synapses come in three colors: gap junction = blue, chemical = pink/purple; pink if the cell on which the sphere appears is presynaptic, and purple if post. The Synapse info menu item shows the the cell on which the synapse sphere is located (Cell), the synapse type, the presynaptic source, the postsynaptic target(s), the estimated volume of the synapse (# of EM sections), the sections over which the synapse occurs, and numerical id of the synapse. The Details (EM Viewer) button opens a floating dialog that shows the electron micrographs containing the selected (clicked) synapse. (Video is a little outdated.)',
    video: 'https://www.youtube.com/embed/DDjFMjFSdO0',
    name : 'help-synapse-info'
  },
  {
    title : 'Synapse Viewer',
    text : 'Click on synapse sphere to view the synapse in the associated electron micrograph (EM). The synapse viewer '
      + 'has both a high and low magnification. Use the dropdown to to select the a different EM section in which the '
      + 'synapse was scored.',
    video: 'https://www.youtube.com/embed/Qiy6JO2YeDU',
    name : 'help-synapse-viewer'
  },
  {
    title : 'Synapse filter',
    text : 'Display only the selected synapses. Check presynaptic (Pre.), postsynaptic (Post.) or gap junction (Gap.).'
      + 'Then enter the partner cells to keep. Mulitple cells should be separated by a comma (e.g. AVAL,ASHL).'
      + 'You can also select synapses by synapse id number. '
      + 'Filter button will hide all but the selected synapses. Restore button makes all synapses visible.',
    video: 'https://www.youtube.com/embed/1vGvdg3cUlY',
    name : 'help-filter'
  },
  {
    title : 'Map translate',
    text : 'Translate the map along the x, y and z axes. Some maps may not be centered when selected. This can be used to manually center the maps.',
    video: 'https://www.youtube.com/embed/23dytw_7yRM',
    name : 'help-translate'
  },
  {
    title : 'Comments',
    text : 'Various global settings. Toggle visibility of grid, axes, cell remarks, synapse labels.',
    video: 'https://www.youtube.com/embed/D25joOnz1XE',
    name : 'help-comments'
  },
  {
    title : 'Maps',
    text : 'Displays info for each map. Visibility of each map can be toggled on/off with the eye icon. Clicking on the cell reveals map info. '
      + 'Map color can be changed. Map remarks toggled on/off. If a WormAtlas link exists it can be accessed. Synaptic partners and synapse partners '
      + 'can also be displayed.',
    video: 'https://www.youtube.com/embed/9aVMiiGVwYA',
    name : 'help-maps'
  },
  {
    title : 'Clear maps',
    text : 'Clears all maps. Maps can also be cleared with the browser refresh button.',
    video: 'https://www.youtube.com/embed/LT3PTMcnFAo',
    name : 'help-clear'
  }
];
