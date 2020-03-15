'use strict';

import unpackAll from "unpack-all";

import log from "npmlog";
import fs from "fs-extra";
import path from "path";
import glob from "glob";
import rimraf from "rimraf";
import async from "async";
import {exec} from "child_process";


const imgFilePattern = /\.jpg$|\.JPG$|\.jpeg$|\.JPEG$|\.png$|\.PNG$|\.gif$|\.GIF$/g;

function getSeparatorCount(s) {
  if (!s) return 0;

  const chars = s.split('');
  let ret = 0;
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] === '/' || chars[i] === '\\') ret++;
  }
  return ret;
}

function compareEntries(a, b) {
  if (a.indexOf('cover.') > -1) return -1;
  if (b.indexOf('cover.') > -1) return 1;
  const ca = getSeparatorCount(a);
  const cb = getSeparatorCount(b);
  if (ca !== cb) return ca - cb;
  return a < b ? -1 : 1;
}

function getFirstImgIndex(list) {
  for (let i = 0; i < list.length; i++) {
    if (list[i].match(imgFilePattern)) return list[i];
  }
  return null;
}

function getCoverIndex(files) {
  if (!files || files.length === 0) return -1;

  const clone = files.slice(0);
  clone.sort(compareEntries);

  const jpgEntryName = getFirstImgIndex(clone);
  if (jpgEntryName === null) return -1;

  return files.indexOf(jpgEntryName);
}

function quiteCallback(err, file, text) {
}

function defaultCallback(err, file, text) {
  if (err) {
    if (!file) return log.error(err);
    return log.info(err, file);
  }
  if (file) log.info('file', file, (text ? text : ''));
}

function walkPromise(dir) {
  return new Promise((resolve, rejected) => {
    walk(dir, (err, results) => {
      if (err) {
        rejected(err);
      } else {
        resolve(results);
      }
    });
  });
}

async function walkAsync(dir) {
  const x = await walkPromise(dir);
  return x;
}

function walk(dir, done) {
  let results = [];
  fs.readdir(dir, (err, list) => {
    if (err) return done(err);
    let i = 0;

    (function next() {
      let file = list[i++];
      if (!file) return done(null, results);

      file = path.resolve(dir, file);
      fs.stat(file, (err, stat) => {
        if (stat && stat.isDirectory()) {
          walk(file, (err, res) => {
            results = results.concat(res);
            next();
          });
        } else {
          results.push(file);
          next();
        }
      });
    })();
  });
}

export function convertCover(imgSource, options, callbackConvertCover) {
  // imgSource must be copied already  from tmp directory to target folder!

  if (!options || !options.outputs || !options.outputs.length) return callbackConvertCover(null, [imgSource]);

  const imgTemp = path.join(
    path.dirname(imgSource),
    path.basename(imgSource, path.extname(imgSource)) + '_.jpg');

  // outputs:[
  //     {nameExtension: "", dimension: [200, 300]}, // abc.cbr -> abc.jpg
  //     {nameExtension: "_xl", dimension: [800, 1200]}, // abc.cbr -> abc_xl.jpg
  //     {nameExtension: "_o", dimension: null} // original size. abc.cbr -> abc_o.jpg
  // ]

  fs.rename(imgSource, imgTemp, err => {
    if (err) return callbackConvertCover(err, null);

    const newfiles = [];

    // Waterfall:
    const todos = [];
    for (let i = 0; i < options.outputs.length; i++) {
      todos.push(
        (output => {
          return callbackWaterfall => {
            let ext = output.nameExtension;
            if (!ext) ext = '';

            const relDir = (options.outputDir) ? options.outputDir : '';

            if (relDir.length > 0) {
              // TODO  anlegen:   path.join(path.dirname(imgSource), relDir)
            }

            const targetFile = path.join(
              path.dirname(imgSource),
              relDir, // TODO testen
              path.basename(imgSource, path.extname(imgSource)) + ext + '.jpg');

            if (!output.dimension || !output.dimension.length) {
              // just copy
              fs.copy(imgTemp, targetFile, err => {
                if (err) return callbackConvertCover(err, null);
                callbackWaterfall();
              });

            } else {
              if (!options.gmExecutable) options.gmExecutable = 'gm';
              const buf = [];
              buf.push('"');
              buf.push(options.gmExecutable);
              buf.push('" ');
              buf.push(' convert "');
              buf.push(imgTemp);
              buf.push('" -resize ');
              buf.push(output.dimension[0]);
              buf.push('x');
              buf.push(output.dimension[1]);
              buf.push(' "');
              buf.push(targetFile);
              buf.push('"');

              let command = buf.join('');
              // console.info('\n' + command + '\n\n');
              exec(command, (err, stdout, stderr) => {
                if (err) {
                  log.error('Error:', err);
                } else {
                  log.info('File saved.', targetFile);
                }
                newfiles.push(targetFile);
                callbackWaterfall();
              });

              // gm(imgTemp)
              //   .resize(output.dimension[0], output.dimension[1])
              //   // .noProfile()
              //   .write(targetFile, err => {
              //     if (err) {
              //       log.error('Error:', err);
              //     } else {
              //       log.info('File saved.', targetFile);
              //     }
              //     newfiles.push(targetFile);
              //     callbackWaterfall();
              //   });
            }
          }; // go
        })(options.outputs[i])
      );
    } // for

    // Delete imgTemp file:
    todos.push(
      callbackWaterfall => {
        fs.unlink(imgTemp, err => {
          callbackWaterfall();
        });
      }
    );

    // Start:
    async.waterfall(todos, (err, result) => {
      log.info('Outputs created:', todos.length);
      callbackConvertCover(err, newfiles);
    });
  }); // rename
}


export function extractCover(archive, options, callback) {

  if (options.silent || options.quite) {
    log.level = 'error';
  }

  const targetCover = path.join(
    path.dirname(archive),
    path.basename(archive, path.extname(archive)) + options.outputs[0].nameExtension + '.jpg');

  fs.stat(targetCover, (err, stat) => {
    if (!callback) callback = defaultCallback;
    if (!options) options = {};

    if (!options.forceOverwrite && stat) return callback('Skipped. Cover already exists.', targetCover, null);

    // file does not exists or it will be overwritten:
    unpackAll.list(archive, options, (err, files, text) => {
      if (err) return callback(err, null, null);

      options.targetDir = options.tmpDir; // target dir for unpack (tmp dir), not target of resulting <cover>.jpg.
      if (!options.targetDir) options.targetDir = 'tmp';
      options.targetDir = options.targetDir + '/t' + Date.now();

      fs.ensureDir(options.targetDir, err => {
        if (err) log.error(err);
        const coverIndex = getCoverIndex(files);
        if (coverIndex === -1) return callback('Abort: Cannot find image file in ' + archive, null, null);

        options.indexes = [coverIndex];
        if (files[0].indexOf(': Zip') > -1) options.indexes[0]--; // workaround

        const coverName = files[coverIndex];

        const unpackOptions = {...options, forceOverwrite: true, noDirectory: true};
        unpackAll.unpack(archive, unpackOptions, (err, files, text) => {
          if (err) return callback(err, null, null);

          walk(options.targetDir, (err, results) => {
            if (err) {
              return callback(err, null, null);
            } else {

              let sourceCover;
              if (results.length === 1) {
                sourceCover = results[0];
              } else {
                sourceCover = path.join(options.targetDir, coverName);
              }
              fs.copy(sourceCover, targetCover, err => {
                if (err) return callback(err, null, null);

                // console.info('deleting ', options.targetDir);
                rimraf.sync(options.targetDir);
                convertCover(targetCover, options, (err, files) => {
                  callback(null, files, 'created');
                });
              })


            }
          });


        }); // unpack
      });
    }); // list
  }); // stat
}


export function extractCoverGlob(pattern, options, callback) {
  if (!pattern) return log.error("Error: pattern missing.", null, null);

  if (!callback) {
    callback = options.quite ? quiteCallback : defaultCallback;
  }
  if (!options) options = {};

  glob(pattern, {}, (err, files) => {
    if (err) return callback(err, null, null);

    log.info('Glob: ' + files.length + ' files found.');

    const newfiles = [];

    // Waterfall:
    const todos = [];
    for (let i = 0; i < files.length; i++) {
      todos.push((f => {
        function go(_callback) {
          extractCover(f, options,
            (err, file, text) => {
              if (!err && file) newfiles.push(file);
              if (err) {
                if (!file) {
                  log.error(err);
                } else {
                  log.info(err, file);
                }
              } else if (file && !options.quite) log.info('file', file, (text ? text : ''));
              _callback();
            });
        }

        return go;
      })(files[i]));
    } // for

    // Start:
    async.waterfall(todos, (err, result) => {
      log.info('done all.');
      callback(err, newfiles);
    });
  });
}


export function convertCoverPromise(imgSource, options) {
  return new Promise((resolve, reject) => {
    convertCover(archive, options, (err, file) => {
      if (err) return reject(err);
      resolve(file);
    });
  });
}


export function extractCoverPromise(archive, options) {
  return new Promise((resolve, reject) => {
    extractCover(archive, options, (err, file) => {
      if (err) return reject(err);
      resolve(file);
    });
  });
}


export function extractCoverGlobPromise(pattern, options) {
  return new Promise((resolve, reject) => {
    extractCoverGlob(pattern, options, (err, res) => {
      if (err) return reject(err);
      resolve(res);
    });
  });
}


