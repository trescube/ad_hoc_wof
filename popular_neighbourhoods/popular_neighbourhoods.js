const sink = require('through2-sink');
const filter = require('through2-filter');
const whosonfirst = require('pelias-whosonfirst');
const config = require('pelias-config').generate();
const _ = require('lodash');

const datapath = config.imports.whosonfirst.datapath;

whosonfirst.metadataStream(datapath).create('neighbourhood')
  .pipe(whosonfirst.parseMetaFiles())
  .pipe(whosonfirst.isNotNullIslandRelated())
  .pipe(whosonfirst.recordHasName())
  .pipe(whosonfirst.loadJSON(datapath, false))
  .pipe(whosonfirst.recordHasIdAndProperties())
  .pipe(whosonfirst.isActiveRecord())
  .pipe(whosonfirst.conformsTo({
    properties: (p) => {
      return p['iso:country'] === 'US' &&
        p['misc:photo_sum'] > 40000;
    }
  }))
  .pipe(sink.obj((o) => {
    console.log(`[${o.id}] [${o.properties['misc:photo_sum']}] [${o.properties['wof:name']}](https://whosonfirst.mapzen.com/spelunker/id/${o.id}/)`);
  }));
