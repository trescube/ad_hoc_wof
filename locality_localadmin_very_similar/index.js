const sink = require('through2-sink');
const filter = require('through2-filter');
const whosonfirst = require('pelias-whosonfirst');
const config = require('pelias-config').generate();
const _ = require('lodash');
const sha1 = require('sha1');

const datapath = config.imports.whosonfirst.datapath;

const localadmins = {};

whosonfirst.metadataStream(datapath).create('localadmin')
  .pipe(whosonfirst.parseMetaFiles())
  .pipe(whosonfirst.isNotNullIslandRelated())
  .pipe(whosonfirst.recordHasName())
  .pipe(whosonfirst.loadJSON(datapath, false))
  .pipe(whosonfirst.recordHasIdAndProperties())
  .pipe(whosonfirst.isActiveRecord())
  .pipe(sink.obj((data) => {
    localadmins[data.id] = {
      localities: []
    }
  }))
  .on('finish', () => {
    whosonfirst.metadataStream(datapath).create('locality')
      .pipe(whosonfirst.parseMetaFiles())
      .pipe(whosonfirst.isNotNullIslandRelated())
      .pipe(whosonfirst.recordHasName())
      .pipe(whosonfirst.loadJSON(datapath, false))
      .pipe(whosonfirst.recordHasIdAndProperties())
      .pipe(whosonfirst.isActiveRecord())
      .pipe(whosonfirst.conformsTo({
        properties: (properties) => {
          return _.has(localadmins, _.get(properties, 'wof:hierarchy[0].localadmin_id'));
        }
      }))
      .pipe(sink.obj((data) => {
        const localadmin_id = data.properties['wof:hierarchy'][0].localadmin_id;

        localadmins[localadmin_id].localities.push(data.id);

      }))
      .on('finish', () => {
        Object.keys(localadmins)
          .filter((localadmin_id) => { return localadmins[localadmin_id].localities.length === 1; })
          .forEach((localadmin_id) => {
            console.log(`${localadmin_id}|${localadmins[localadmin_id].localities[0]}`);
          });

      });


  });
