const fs = require('fs');
const sink = require('through2-sink');
const filter = require('through2-filter');
const path = require('path');
const whosonfirst = require('pelias-whosonfirst');
const config = require('pelias-config').generate();
const _ = require('lodash');

const lowercase = require('lower-case');
const removeAccents = require('remove-accents');

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

function isRegularLetter(c) {
  return c.charCodeAt(0) >= 97 && c.charCodeAt(0) <= 122;
}

placetypes.forEach((placetype) => {
  const diacriticals = new Set();

  fs.createReadStream(path.join(datapath, 'meta', `wof-${placetype}-latest.csv`))
    .pipe(whosonfirst.parseMetaFiles())
    .pipe(sink.obj((o) => {
      const accentsRemovedFirst = lowercase(removeAccents(o.name));
      const deburredFirst = _.toLower(_.deburr(o.name));
      //
      // if (o.name.length !== accentsRemovedFirst.length) {
      //   console.log(o.name);
      // }


      const accentsRemovedSecond = removeAccents(lowercase(o.name));
      const deburredSecond = _.deburr(_.toLower(o.name));
      //
      if (accentsRemovedFirst !== accentsRemovedSecond) {
        console.log(`${o.name}|${accentsRemovedFirst}|${accentsRemovedSecond}`);
      }

      // if (accentsRemoved !== deburred && accentsRemoved.length !== deburred.length) {
      //   console.log(`${o.name}|${accentsRemoved}|${accentsRemoved.length}|${deburred}|${deburred.length}`);
      // }

      Array.from(o.name).forEach((c) => {
        diacriticals.add(c);
      });

      // console.log(Array.from(o.name));
    }))
    // .on('finish', () => {
    //   diacriticals.forEach((c) => {
    //     const accentsRemoved = lowercase(removeAccents(c));
    //     const deburred = _.toLower(_.deburr(c));
    //
    //     if (accentsRemoved !== deburred) {
    //       // accentsRemoved is better
    //       if (isRegularLetter(accentsRemoved)) {
    //         console.log(`|\`${c}\`|*\`${accentsRemoved}\`*|\`${deburred}\`|`);
    //
    //       } else if (isRegularLetter(deburred)) {
    //         console.log(`|\`${c}\`|\`${accentsRemoved}\`|*\`${deburred}\`*|`);
    //
    //       }
    //
    //     }
    //
    //   });
    // });

});
