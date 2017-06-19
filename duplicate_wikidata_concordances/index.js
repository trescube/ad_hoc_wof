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
  // 'localadmin',
  'county',
  'macrocounty',
  'region',
  'macroregion',
  'dependency',
  'country'
];

const finished_placetypes = [];

const datapath = config.imports.whosonfirst.datapath;

const wikidata_ids = {};

placetypes.forEach((placetype) => {
  whosonfirst.metadataStream(datapath).create(placetype)
    .pipe(whosonfirst.parseMetaFiles())
    .pipe(whosonfirst.isNotNullIslandRelated())
    .pipe(whosonfirst.recordHasName())
    .pipe(whosonfirst.loadJSON(datapath, false))
    .pipe(whosonfirst.recordHasIdAndProperties())
    .pipe(whosonfirst.isActiveRecord())
    .pipe(filter.obj((o) => {
      return !_.isEmpty(_.get(o.properties, 'wof:concordances.wd:id', ''));
    }))
    .pipe(sink.obj((o) => {
      if (!_.has(wikidata_ids, o.properties['wof:concordances']['wd:id'])) {
        wikidata_ids[o.properties['wof:concordances']['wd:id']] = [];
      }

      wikidata_ids[o.properties['wof:concordances']['wd:id']].push(o.id);

    }))
    .on('finish', () => {
      if (finished_placetypes.push(placetype) === placetypes.length) {
        const culled = _.pickBy(wikidata_ids, (ids) => { return ids.length >= 2; });

        fs.writeFileSync('duplicate_wikidata_ids.json', JSON.stringify(culled, null, 2));

      }
    });
});
