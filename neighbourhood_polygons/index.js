var parse = require('csv-parse');
var Polygon = require('polygon');
var fs = require('fs');
var sink = require('through2-sink');
var through2 = require('through2');
var map = require('through2-map');
var filter = require('through2-filter');
var sep = require('path').sep;

var options = {
  delimiter: ',',
  columns: true
};

var parents = {};
var regions = {};

function formatPath(id) {
  return [
    id.substr(0, 3),
    id.substr(3, 3),
    id.substr(6),
    id + '.geojson'].join(sep);
}

function getArea(geometry) {
  if (geometry.type === 'Polygon') {
    return getPolygonArea(geometry.coordinates[0], geometry.coordinates.slice(1));

  } else if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.reduce(function(totalArea, polygon) {
      return totalArea + getPolygonArea(polygon[0], polygon.slice(1));
    }, 0.0);

  }

}

function getPolygonArea(polygon, holes) {
  // iterate the holes, subtracting the area of each hole from the main polygon area
  return holes.reduce(function(totalArea, hole) {
    return totalArea - new Polygon(hole).area();
  }, new Polygon(polygon).area());

}

function getParent(borough_id, locality_id) {
  var id = borough_id ? borough_id : locality_id;

  if (parents.hasOwnProperty(id)) {
    return parents[id];
  }

  var parent = JSON.parse(fs.readFileSync(root + '/data/' + formatPath(id.toString())));

  parents[id] = parent;
  return parent;

}

function getRegion(id) {
  if (regions.hasOwnProperty(id)) {
    return regions[id];
  }

  var region = JSON.parse(fs.readFileSync(root + '/data/' + formatPath(id.toString())));

  regions[id] = region;
  return region;

}

// find all neighbourhoods with a locality as a parent

var root = '/Users/stephenhess/git/whosonfirst/whosonfirst-data/';

var neighbourhoods = [];

function hasBorough(hierarchy) {
  return hierarchy.hasOwnProperty('borough_id') && hierarchy.borough_id !== -1;
}

function hasLocality(hierarchy) {
  return hierarchy.hasOwnProperty('locality_id') && hierarchy.locality_id !== -1;
}

function hasRegion(hierarchy) {
  return hierarchy.hasOwnProperty('region_id') && hierarchy.region_id !== -1;
}

fs.createReadStream(root + '/meta/wof-neighbourhood-latest.csv')
  .pipe(parse(options))
  .pipe(filter.obj(function(record) {
    return record.iso === 'US' || record.iso === 'CA'
  }))
  .pipe(map.obj(function(record) {
    return JSON.parse(fs.readFileSync(root + '/data/' + record.path));
  }))
  .pipe(filter.obj(function(o) {
    var hierarchy = o.properties['wof:hierarchy'];

    return hierarchy && hierarchy.length > 0 &&
            (hasBorough(hierarchy[0]) || hasLocality(hierarchy[0])) &&
            hasRegion(hierarchy[0]);
  }))
  .pipe(through2.obj(function(o, enc, next) {
    var hierarchy = o.properties['wof:hierarchy'][0];

    var locality = getParent(hierarchy.borough_id, hierarchy.locality_id);
    var region = getRegion(hierarchy.region_id);

    var neighbourhood = {
      id: o.id,
      name: o.properties['wof:name'],
      area: getArea(o.geometry),
      parent: {
        id: locality.id,
        name: locality.properties['wof:name'],
        area: getArea(locality.geometry)
      },
      region: {
        id: region.id,
        name: region.properties['wof:name']
      }
    };

    var area_percentage = neighbourhood.area / neighbourhood.parent.area;

    if (area_percentage > 0.001 && area_percentage < 0.11) {
      this.push(neighbourhood);
    }

    return next();

  }))
  .pipe(sink.obj(function(neighbourhood) {
    console.log([
      neighbourhood.name,
      neighbourhood.id,
      neighbourhood.parent.name,
      neighbourhood.parent.id,
      neighbourhood.region.name,
      neighbourhood.area,
      neighbourhood.parent.area,
      neighbourhood.area / neighbourhood.parent.area
    ].join(','));

  }))
