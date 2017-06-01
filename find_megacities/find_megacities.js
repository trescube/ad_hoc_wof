const sink = require('through2-sink');
const filter = require('through2-filter');
const whosonfirst = require('pelias-whosonfirst');
const config = require('pelias-config').generate();
const _ = require('lodash');

function getPopulation( wof ) {
       if( wof['mz:population'] ){          return wof['mz:population']; }
  else if( wof['wof:population'] ){         return wof['wof:population']; }
  else if( wof['wk:population'] ){          return wof['wk:population']; }
  else if( wof['gn:population'] ){          return wof['gn:population']; }
  else if( wof['gn:pop'] ){                 return wof['gn:pop']; }
  else if( wof['qs:pop'] ){                 return wof['qs:pop']; }
  else if( wof['qs:gn_pop'] ){              return wof['qs:gn_pop']; }
  else if( wof['zs:pop10'] ){               return wof['zs:pop10']; }
  else if( wof['meso:pop'] ){               return wof['meso:pop']; }
  else if( wof['statoids:population'] ){    return wof['statoids:population']; }
  else if( wof['ne:pop_est'] ){             return wof['ne:pop_est']; }
}

const datapath = config.imports.whosonfirst.datapath;

whosonfirst.metadataStream(datapath).create('locality')
  .pipe(whosonfirst.parseMetaFiles())
  .pipe(whosonfirst.loadJSON(datapath))
  .pipe(whosonfirst.isActiveRecord())
  .pipe(whosonfirst.isNotNullIslandRelated())
  .pipe(whosonfirst.recordHasIdAndProperties())
  // .pipe(sink.obj((record) => {
  //   console.log(record);
  // }))
  .pipe(filter.obj((record) => {
    // console.log(getPopulation(record.properties))
    return getPopulation(record.properties) > 4000000;
  }))
  .pipe(sink.obj((record) => {
    console.log(`[${record.properties['wof:name']}](https://whosonfirst.mapzen.com/spelunker/id/${record.id})`);
  }))
  ;
