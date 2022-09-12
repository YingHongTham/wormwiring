/*
 * plotTransform tells MapViewer how to transform
 * (translate and scale)
 * coordinates (objcoord) received from retrieveSkeletonMaps.php
 * to viewer,
 * attempt to match actual scale of worms
 *
 * see README on how we computed for N2U;
 * the others are hand-tuned relative to N2U
 *
 * plotTransformVol is the same but for the volumes
 * this was hand tuned to fit with the skeleton data
 *
 * plotTransformDisplay2 is for skeleton coordinates
 * that come from display2 table (objCoordDisplay)
 *
 * see MapViewer methods
 * (ApplyPlotTransform and loadVolumetric)
 * how this is used
 * (basically, scale is applied, then translate)
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
 */

const plotTransform = {
  N2U: {
    translate: {
      x: 0,
      y: 1000,
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
      x: -1500,
      y: 1200,
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
      x: 1444,
      y: 667,
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
      x: 1000,
      y: 875,
      z: 0,
    },
    scale: {
      x: 0.13,
      y: -0.13,
      z: 1,
    },
  },
  n2y: {
    translate: {
      x: 170,
      y: 850,
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
      x: -3000,
      y: 3000,
      z: 0,
    },
    scale: {
      x: 0.13,
      y: -0.13,
      z: 1,
    },
  },
};

const plotTransformDisplay2 = {
  N2U: {
    translate: {
      x: 20,
      y: 1015,
      z: 0,
    },
    scale: {
      x: 0.43,
      y: -0.43,
      z: 1,
    },
  },
  N2W: {
    translate: {
      x: -1500,
      y: 1200,
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
      x: 1444,
      y: 667,
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
      x: 1000,
      y: 875,
      z: 0,
    },
    scale: {
      x: 0.13,
      y: -0.13,
      z: 1,
    },
  },
  n2y: {
    translate: {
      x: 170,
      y: 850,
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
      x: -3000,
      y: 3000,
      z: 0,
    },
    scale: {
      x: 0.13,
      y: -0.13,
      z: 1,
    },
  },
};

const plotTransformVol = {
  N2U: {
    // tuned with AIBR, ADFR
    translate: {
      x: -435,
      y: 1140,
      z: -5,
    },
    scale: {
      x: 39,
      y: -39,
      z: 6.5,
    },
  },
  JSH: {
    // tuned with AINL, refined with AVKL
    translate: {
      x: 1000,
      y: 875,
      z: 0,
    },
    scale: {
      x: 39,
      y: -39,
      z: 6.1,
    },
  },
  n2y: {
    // tuned using AS10, AVDL
    translate: {
      x: -526 + 170,
      y: 1214 - 150,
      z: 13675,
    },
    scale: {
      x: 0.133,
      y: -0.133,
      z: 0.0199,
    },
  },
};
