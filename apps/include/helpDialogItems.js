helpDialogItems = [
  {
    title : 'Quick start',
    text : 'Cell skeletons are intially displayed in blue. This can be altered in the maps menu. Cell bodies are displayed as thicker red segements. '
      + 'This color cannot be changed. Presynapses are pink, postsynapses are purple and gap junctions are blue spheres. '
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
