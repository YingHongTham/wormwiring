// for mapViewer to make plotParams
//
// the queries were made with:
//select max(x1), min(x1), min(y1), max(y1), min(z1), max(z1) from {DB}.display2;
// where DB is N2U, N2W, JSE, JSH, n2y, n930
// 
// we also apply *(-1) to the x's (so min and max flipped)
// because I dunno all over the place there are negatives
// in say dbaux.php
//
// xMin = xScaleMin in old version etc.

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
//|    |    |    
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
