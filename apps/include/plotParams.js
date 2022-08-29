/*
 * plotTransform tells MapViewer how to transform
 * (translate and scale)
 * coordinates received from php (retrieve_trace_coord(_alt_2))
 * to viewer
 * so that data from different databases are compatible
 *
 * see MapViewer.pplyPlotTransform on how this is used
 *
 * see README on how we computed for N2U;
 * the others are hand-tuned relative to N2U
 *
 * note that there is a negative factor in the y component
 * unclear exactly why,
 * but this matches with the WormAtlas diagrams
 * (see AVKL/R for clear example:
 * https://www.wormatlas.org/neurons/Individual%20Neurons/AVKframeset.html)
 *
 * before transforming, the +/- of coordinates mean:
 * +x = right
 * +y = ventral
 * +z = posterior
 *
 **********************
 * below is obsolete
 * for plotMinMaxValues, for mapViewer to make plotParams
 * may be completely obsolete since I got rid of dependence
 * on plot params
 *
 * the queries were made manually for each database, with:
 *  select max(x1), min(x1), min(y1), max(y1), min(z1), max(z1) from {DB}.display2;
 * where DB is N2U, N2W, JSE, JSH, n2y, n930
 * 
 * we also apply *(-1) to the x's (so min and max flipped)
 * because for some reason all over the place there are negatives
 * in say dbaux.php
 *
 * xMin = xScaleMin in old version etc.
 */

const plotTransform = {
  N2U: {
    translate: {
      x: 0,
      y: 0,
      z: 0,
    },
    scale: {
      x: 0.13,
      y: -0.13,
      z: 1,
    },
  },
  N2W: {
    translate: {
      x: 0,
      y: 0,
      z: 0,
    },
    scale: {
      x: 0.13,
      y: -0.13,
      z: 1,
    },
  },
  JSE: {
    translate: {
      x: 0,
      y: 0,
      z: 0,
    },
    scale: {
      x: 0.13,
      y: -0.13,
      z: 1,
    },
  },
  JSH: {
    translate: {
      x: 0,
      y: 0,
      z: 0,
    },
    scale: {
      x: 0.13,
      y: -0.13,
      z: 1,
    },
    //// AIYR
    //translate: {
    //  x: -300,
    //  y: 50,
    //  z: 0,
    //},
    //scale: {
    //  x: 0.20,
    //  y: -0.17,
    //  z: 1,
    //},
    //// RMFL, RIAR
    //translate: {
    //  x: -100,
    //  y: 50,
    //  z: 0,
    //},
    //scale: {
    //  x: 0.17,
    //  y: -0.17,
    //  z: 1,
    //},
    //// URBR
    //translate: {
    //  x: -100,
    //  y: -100,
    //  z: 0,
    //},
    //scale: {
    //  x: 0.17,
    //  y: -0.17,
    //  z: 1,
    //},
  },
  n2y: {
    translate: {
      x: 0,
      y: 0,
      z: 0,
    },
    scale: {
      x: 0.13,
      y: -0.13,
      z: 1,
    },
  },
  n930: {
    translate: {
      x: 0,
      y: 0,
      z: 0,
    },
    scale: {
      x: 0.13,
      y: -0.13,
      z: 1,
    },
  },
};

console.log(plotTransform);


const plotMinMaxValues = {
  N2U: {
    xMin: -8907,
    xMax: -205,
    yMin: 45,
    yMax: 7023,
    zMin: 1,
    zMax: 2550,
  },
//select max(x1), min(x1), min(y1), max(y1), min(z1), max(z1) from N2W.display2;
  N2W: {
    xMin: -9372,
    xMax: -2401,
    yMin: 1643,
    yMax: 8595,
    zMin: 34,
    zMax: 1432,
  },
  JSE: {
    xMin: -7166,
    xMax: -58,
    yMin: 315,
    yMax: 4807,
    zMin: 1,
    zMax: 5463,
  },
  JSH: {
    xMin: -6380,
    xMax: -1929,
    yMin: 769,
    yMax: 5681,
    zMin: 1,
    zMax: 409,
  },
  n2y: {
    xMin: -7479,
    xMax: -47,
    yMin: 121,
    yMax: 6404,
    zMin: 1,
    zMax: 15773,
  },
  n930: {
    xMin: -5565,
    xMax: -1,
    yMin: 78,
    yMax: 6921,
    zMin: 1,
    zMax: 5127,
  },
};
