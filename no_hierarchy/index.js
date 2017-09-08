const fs = require('fs');
const sink = require('through2-sink');
const filter = require('through2-filter');
const path = require('path');
const whosonfirst = require('pelias-whosonfirst');
const config = require('pelias-config').generate();
const _ = require('lodash');

const placetypes = [
  'neighbourhood',
  'macrohood',
  'borough',
  'locality',
  'localadmin',
  'county',
  'macrocounty',
  'region',
  'macroregion',
  'dependency'
];

const datapath = config.imports.whosonfirst.datapath;

placetypes.forEach((placetype) => {
  fs.createReadStream(path.join(datapath, 'meta', `wof-${placetype}-latest.csv`))
    .pipe(whosonfirst.parseMetaFiles())
    .pipe(whosonfirst.isNotNullIslandRelated())
    .pipe(whosonfirst.recordHasName())
    .pipe(whosonfirst.loadJSON(datapath, false))
    .pipe(whosonfirst.recordHasIdAndProperties())
    .pipe(whosonfirst.isActiveRecord())
    .pipe(filter.obj(wofData => {
      return wofData.properties.hasOwnProperty('mz:hierarchy_label') &&
              wofData.properties['mz:hierarchy_label'] === 1;
    }))
    .pipe(filter.obj(wofData => {
      return wofData.geometry.hasOwnProperty('type') &&
             wofData.geometry.type !== 'Point';
    }))
    .pipe(filter.obj((o) => {
      return o.properties['wof:hierarchy'].length === 0;
    }))
    .pipe(sink.obj((o) => {
      console.log(`[${o.id}] [${placetype}] [${o.properties['wof:name']}](https://whosonfirst.mapzen.com/spelunker/id/${o.id}/)`);
    }));
});
