const sink = require('through2-sink');
const filter = require('through2-filter');
const whosonfirst = require('pelias-whosonfirst');
const config = require('pelias-config').generate();
const _ = require('lodash');
const sha1 = require('sha1');

const datapath = config.imports.whosonfirst.datapath;

const localadmin_geometries = {};

whosonfirst.metadataStream(datapath).create('localadmin')
  .pipe(whosonfirst.parseMetaFiles())
  .pipe(whosonfirst.isNotNullIslandRelated())
  .pipe(whosonfirst.recordHasName())
  .pipe(whosonfirst.loadJSON(datapath, false))
  .pipe(whosonfirst.recordHasIdAndProperties())
  .pipe(whosonfirst.isActiveRecord())
  .pipe(sink.obj((data) => {
    localadmin_geometries[data.id] = {
      name: data.properties['wof:name'],
      geometry: sha1(JSON.stringify(data.geometry))
      // area: data.properties['geom:area']
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
          return _.has(localadmin_geometries, _.get(properties, 'wof:hierarchy[0].localadmin_id'));
        }
      }))
      .pipe(filter.obj((data) => {
        const localadmin_id = data.properties['wof:hierarchy'][0].localadmin_id;

        return data.properties['wof:name'] === localadmin_geometries[localadmin_id].name &&
                sha1(JSON.stringify(data.geometry)) === localadmin_geometries[localadmin_id].geometry;
                // data.properties['geom:area'] === localadmin_geometries[localadmin_id].area;

      }))
      .pipe(sink.obj((data) => {
        console.log(data.id + '|' + data.properties['wof:hierarchy'][0].localadmin_id);
      }))


  });
