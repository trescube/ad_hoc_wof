var parse = require('csv-parse');
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

function formatPath(id) {
  return [
    id.substr(0, 3),
    id.substr(3, 3),
    id.substr(6),
    id + '.geojson'].join(sep);
}

var root = '/Users/stephenhess/git/whosonfirst/whosonfirst-data/';

fs.createReadStream(root + '/meta/wof-neighbourhood-latest.csv')
  .pipe(parse(options))
  .pipe(map.obj(function(record) {
    return JSON.parse(fs.readFileSync(root + '/data/' + record.path));
  }))
  .pipe(filter.obj(function(o) {
    return o.properties['wof:superseded_by'].length > 0
  }))
  .pipe(filter.obj(function(o) {
    return !o.properties.hasOwnProperty('edtf:superseded')
  }))
  .pipe(sink.obj(function(o) {
    console.log(o.properties['wof:id'] + ': ' + o.properties['wof:name'] + ', ' + o.properties['wof:superseded_by'].length);
    // console.log(neighbourhood.tier_locality);
  }))
