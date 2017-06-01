var parse = require('csv-parse');
var fs = require('fs');
var sink = require('through2-sink');
var through2 = require('through2');
var map = require('through2-map');
var filter = require('through2-filter');
var sep = require('path').sep;

var parents = {};
var regions = {};

var options = {
  delimiter: ',',
  columns: true
};

function formatPath(id) {
  return [
    id.substr(0, 3),
    id.substr(3, 3),
    id.substr(6),
    id + '.geojson'].join(sep);
}

function hasBorough(hierarchy) {
  return hierarchy.hasOwnProperty('borough_id') && hierarchy.borough_id !== -1;
}

function hasLocality(hierarchy) {
  return hierarchy.hasOwnProperty('locality_id') && hierarchy.locality_id !== -1;
}

function hasRegion(hierarchy) {
  return hierarchy.hasOwnProperty('region_id') && hierarchy.region_id !== -1;
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

var root = '/Users/stephenhess/git/whosonfirst/whosonfirst-data/';

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
  .pipe(filter.obj(function(o) {
    return o.properties['mz:tier_locality'] !== undefined;
  }))
  .pipe(through2.obj(function(o, enc, next) {
    var hierarchy = o.properties['wof:hierarchy'][0];

    var locality = getParent(hierarchy.borough_id, hierarchy.locality_id);
    var region = getRegion(hierarchy.region_id);

    var neighbourhood = {
      id: o.id,
      name: o.properties['wof:name'],
      tier_locality: o.properties['mz:tier_locality'],
      parent: {
        id: locality.id,
        name: locality.properties['wof:name'],
      },
      region: {
        id: region.id,
        name: region.properties['wof:name']
      }
    };

    return next(null, neighbourhood);

  }))
  .pipe(filter.obj(function(neighbourhood) {
    return neighbourhood.tier_locality === 1;
  }))
  .pipe(sink.obj(function(neighbourhood) {
    console.log([neighbourhood.name, neighbourhood.parent.name, neighbourhood.region.name].join('|'));
    // console.log(neighbourhood.tier_locality);
  }))
