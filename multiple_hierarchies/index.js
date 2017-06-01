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
    .pipe(filter.obj((o) => {
      return o.properties['wof:hierarchy'].length > 1;
    }))
    .pipe(filter.obj((o) => {
      const placeTypesIntersection = _.union.apply(null, o.properties['wof:hierarchy'].map((lineage) => {
        return Object.keys(lineage);
      }));
      return !(o.properties['wof:hierarchy'].every((h) => { return _.isEmpty(_.difference(placeTypesIntersection, Object.keys(h))); } ));
    }))
    .pipe(sink.obj((o) => {
      console.log(`[${o.id}] [${placetype}] [${o.properties['wof:name']}](https://whosonfirst.mapzen.com/spelunker/id/${o.id}/)`);
    }));
});
