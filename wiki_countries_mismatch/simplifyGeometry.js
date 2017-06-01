const map = require('through2-map');
const simplify = require('simplify-js');

module.exports.create = () => {
  // this function just simplifies the geometry
  return map.obj((feature) => {
    feature.geometry = simplifyGeometry(feature.geometry);

    return feature;

  });
};

function simplifyGeometry(geometry) {
  if( geometry ) {
    if ('Polygon' === geometry.type) {
      geometry.coordinates[0] = simplifyCoords(geometry.coordinates[0]);
    }
    else if ('MultiPolygon' === geometry.type) {
      const polygons = geometry.coordinates;
      polygons.forEach((coordinates, idx) => {
        polygons[idx][0] = simplifyCoords(coordinates[0]);
      });
    }
  }

  return geometry;

}

/**
 * @param {array} coords A 2D GeoJson-style points array.
 * @return {array} A slightly simplified version of `coords`.
 */
function simplifyCoords( coords ){
  const pts = coords.map( (pt) => {
    return { x: pt[ 0 ], y: pt[ 1 ] };
  });

  const simplificationRate = 0.0003;
  const simplified = simplify( pts, simplificationRate, true );

  return simplified.map( ( pt ) => {
    return [ pt.x, pt.y ];
  });
}
