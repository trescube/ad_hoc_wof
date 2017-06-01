var parse = require('csv-parse');
var fs = require('fs');
var sink = require('through2-sink');
var through2 = require('through2');
var filter = require('through2-filter');
var map = require('through2-map');
var request = require('request');
var _ = require('lodash');

var options = {
  delimiter: ',',
  columns: true
};

const wof_root = '/Users/stephenhess/data/whosonfirst';

fs.createReadStream(`${wof_root}/meta/wof-locality-latest.csv`)
  .pipe(parse(options))
  .pipe(filter.obj(function(record) {
    return record.wof_country === 'MX';
  }))
  .pipe(map.obj(function(record) {
    return JSON.parse(fs.readFileSync(`${wof_root}/data/${record.path}`));
  }))
  .pipe(filter.obj(function(record) {
    return record.properties['wof:name'] !== 'Mexico';
  }))
  .pipe(filter.obj(function(record) {
    return _.isArray(record.properties['name:spa_x_preferred']) && record.properties['name:spa_x_preferred'].indexOf('Mexico') !== -1;
  }))
  .pipe(sink.obj(function(record) {
    console.log(`[${record.properties['wof:name']}](https://whosonfirst.mapzen.com/spelunker/id/${record.id})`);
  }))
