/*
 * replaces selectorCells.php
 * (seems unnecessary to be so stingy about memory;
 * better send everything than have to request the cells
 * each time user changes database)
 *
 * provides the list of cells for each database and cell type
 * and the WormAtlas link
 *
 * celllistForSelector =
 *  {
 *    'N2U':
 *    {
 *      Neurons: {
 *        'ADAL': {
 *          value: 'ADAL',
 *          visible: 0,
 *          plotted: 0,
 *          walink: 'https://www.wormatlas.org/neurons/Individual%20Neurons/ADAmainframe.htm'
 *        },
 *        ...
 *      },
 *      Muscles:
 *      ...
 *    }
 *  }
 *
 * 'visible' - 0/1, 1 means the cell has been selected
 * 'plotted' - 0/1, 1 means cell has been loaded
 *
 * frankly, these shouldn't even be here,
 * they're used by importerapp.js to handle user selecting
 * the cell (which highlights it) in the NeuronSelectorDialog,
 * and this is checked against plotted,
 * so we don't load the cell again.
 * at some point this should be abandoned,
 * just have to check in mapViewer, which has the
 * 'maps' member, whether a cell is a key of 'maps'
 *
 */

// requires cellLists.js, wa_link.js

if (celllistByDbType === undefined) {
  console.error('expect cellLists.js');
}
if (cellnameWALinkDict === undefined) {
  console.error('expect wa_link.js');
}


const celllistForSelector = {};

for (const db in celllistByDbType) {
  celllistForSelector[db] = {
    'Neurons': {},
    'Muscles': {},
  }
  for (const cell of celllistByDbType[db].neuron) {
    celllistForSelector[db]['Neurons'][cell] = {
      value: cell,
      visible: 0,
      plotted: 0,
      walink: cellnameToWALink(cell),
    }
  }
  for (const cell of celllistByDbType[db].muscle) {
    celllistForSelector[db]['Muscles'][cell] = {
      value: cell,
      visible: 0,
      plotted: 0,
    }
  }
}
