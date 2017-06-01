const sink = require('through2-sink');
const filter = require('through2-filter');
const whosonfirst = require('pelias-whosonfirst');
const config = require('pelias-config').generate();
const _ = require('lodash');
const simplifyGeometry = require('./simplifyGeometry');
const PolygonLookup = require('polygon-lookup');

const datapath = config.imports.whosonfirst.datapath;

const placetypes = ['neighbourhood', 'macrohood', 'locality', 'localadmin',
  'borough', 'county', 'macrocounty', 'region', 'macroregion', 'dependency',
  'country', 'continent'];

const features = [];

function hasWikiLatLon(properties) {
  if (_.has(properties, 'wk:latitude') && _.has(properties, 'wk:longitude')) {
    return true;
  } else if (_.has(properties, 'wk:lat') && _.has(properties, 'wk:long')) {
    return true;
  }

  return false;

}

function getWikiLatLon(properties) {
  if (_.has(properties, 'wk:latitude') && _.has(properties, 'wk:longitude')) {
    return { lat: parseFloat(properties['wk:latitude']), lon: parseFloat(properties['wk:longitude']) };
  } else if (_.has(properties, 'wk:lat') && _.has(properties, 'wk:long')) {
    return { lat: parseFloat(properties['wk:lat']), lon: parseFloat(properties['wk:long']) };
  }
}

function doPlacetypes(lookup) {
  console.log('id|lat|lon|iso country|poly country|link');
  placetypes.forEach((placetype) => {
    whosonfirst.metadataStream(datapath).create(placetype)
      .pipe(whosonfirst.parseMetaFiles())
      .pipe(whosonfirst.isNotNullIslandRelated())
      .pipe(whosonfirst.recordHasName())
      .pipe(whosonfirst.loadJSON(datapath, false))
      .pipe(whosonfirst.recordHasIdAndProperties())
      .pipe(whosonfirst.isActiveRecord())
      .pipe(whosonfirst.conformsTo({
        properties: (p) => {
          return hasWikiLatLon(p) &&
                  p.hasOwnProperty('wk:population') &&
                  !_.has(p, 'mz:population');
        }
      }))
      .pipe(filter.obj((wofData) => {
        const wikiLatLon = getWikiLatLon(wofData.properties);
        const poly = lookup.search( wikiLatLon.lon, wikiLatLon.lat );

        if (poly && poly.properties['iso:country'] !== wofData.properties['iso:country']) {
          const id = wofData.id;
          const name = wofData.properties['wof:name'];
          const poly_country = poly.properties['iso:country'];
          const data_country = wofData.properties['iso:country'];

          console.log(`${id}|${placetype}|${name}|${wikiLatLon.lat}|${wikiLatLon.lon}|${data_country}|${poly_country}|https://whosonfirst.mapzen.com/spelunker/id/${id}/`);

        }

      }));

  });

}

whosonfirst.metadataStream(datapath).create('country')
  .pipe(whosonfirst.parseMetaFiles())
  .pipe(whosonfirst.isNotNullIslandRelated())
  .pipe(whosonfirst.recordHasName())
  .pipe(whosonfirst.loadJSON(datapath, false))
  .pipe(whosonfirst.recordHasIdAndProperties())
  .pipe(whosonfirst.isActiveRecord())
  .pipe(simplifyGeometry.create())
  .pipe(sink.obj((feature) => {
    features.push(feature);
  }))
  .on('finish', function() {
    doPlacetypes(new PolygonLookup( { features: features } ));
  });
