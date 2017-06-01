var parse = require('csv-parse');
var fs = require('fs');
var sink = require('through2-sink');
var through2 = require('through2');
var filter = require('through2-filter');
var request = require('request');

var options = {
  delimiter: ',',
  columns: true
};

fs.createReadStream('/Users/stephenhess/wof-county-latest.csv')
  .pipe(parse(options))
  .pipe(through2.obj(function(record, enc, next) {
    if (record.parent_id === '85688753') {
      this.push(record.name);
    }
    return next();

  }))
  .pipe(through2.obj(function(name, enc, next) {
    request.head(`http://mapsatbis.com/bisgis/rest/services/${name.replace(' ', '')}Web/MapServer`, (err, response) => {
      if (response.statusCode == 200) {
        next(null, name);
      } else {
        next();
      }
    });

  }))
  .pipe(filter.obj(function(name, enc, next) {
    // console.log(`checking for ${name.toLowerCase().replace(' ', '_')}.json`);
    return !fs.existsSync(`/Users/stephenhess/git/trescube/openaddresses/sources/us/tx/${name.toLowerCase().replace(' ', '_')}.json`);
  }))
  .pipe(sink.obj(function(name) {
    console.log(`http://mapsatbis.com/bisgis/rest/services/${name.replace(' ', '')}Web/MapServer`);
  }))
