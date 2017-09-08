'use strict';

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
  'dependency',
  'country'
];

const finished_placetypes = [];

const datapath = config.imports.whosonfirst.datapath;

const wikidata_ids = {};

let point_count = 0;
let total_count = 0;

placetypes.forEach((placetype) => {
  whosonfirst.metadataStream(datapath).create(placetype)
    .pipe(whosonfirst.parseMetaFiles())
    .pipe(whosonfirst.isNotNullIslandRelated())
    .pipe(whosonfirst.recordHasName())
    .pipe(whosonfirst.loadJSON(datapath, false))
    .pipe(whosonfirst.recordHasIdAndProperties())
    .pipe(whosonfirst.isActiveRecord())
    .pipe(filter.obj((o) => {
      total_count++;
      return o.geometry.type === 'Point';
    }))
    .pipe(sink.obj((o) => {
      point_count++;
      // console.log(o.id + ': ' + o.properties['wof:name']);
    }))
    .on('finish', () => {
      if (finished_placetypes.push(placetype) === placetypes.length) {
        console.log(`total records: ${total_count}`);
        console.log(`total points:  ${point_count}`);
      }

    });
});
