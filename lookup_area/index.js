var Polygon = require('polygon');
var fs = require('fs');
var sep = require('path').sep;

var root = '/Users/stephenhess/git/whosonfirst/whosonfirst-data/';

function getArea(geometry) {
  if (geometry.type === 'Polygon') {
    return getPolygonArea(geometry.coordinates.shift(), geometry.coordinates);

  } else if (geometry.type === 'MultiPolygon') {
    var polygons = geometry.coordinates;

    return polygons.reduce(function(totalArea, polygon) {
      return totalArea + getPolygonArea(polygon.shift(), polygon);
    }, 0.0);

  }

}

function getPolygonArea(polygon, holes) {
  // iterate the holes, subtracting the area of each hole from the main polygon area
  return holes.reduce(function(totalArea, hole) {
    return totalArea - new Polygon(hole).area();
  }, new Polygon(polygon).area());

}

function formatPath(id) {
  return [
    id.substr(0, 3),
    id.substr(3, 3),
    id.substr(6),
    id + '.geojson'].join(sep);
}

var parent_id = process.argv[2];

while (parent_id && parseInt(parent_id) > 0) {
  var o = JSON.parse(fs.readFileSync(root + '/data/' + formatPath(parent_id)));

  var name = o.properties['wof:name'];
  var placetype = o.properties['wof:placetype'];

  console.log(name + ' (' + placetype + '), area: ' + getArea(o.geometry));

  parent_id = o.properties['wof:parent_id'].toString();

}
