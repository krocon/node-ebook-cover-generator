(function () {

    'use strict';

    var unpackAll = require('unpack-all');

    var log = require('npmlog');
    var fs = require('fs-extra');
    var path = require('path');
    var glob = require("glob");
    var async = require("async");
    var Promise = require('es6-promise').Promise;


    module.exports = ecomic.extractCover = ecomic;

    var imgFilePattern = /\.jpg$|\.JPG$|\.jpeg$|\.JPEG$|\.png$|\.PNG$|\.gif$|\.GIF$/g;

    var getSeparatorCount = function getSeparatorCount(s) {
        if (!s) return 0;

        var chars = s.split('');
        var ret = 0;
        for (var i=0; i< chars.length; i++) {
            if (chars[i] === '/' || chars[i] === '\\') ret++;
        }
        return ret;
    };

    var compareEntries = function compareEntries(a, b) {
        if (a.indexOf('cover.') >-1) return -1;
        if (b.indexOf('cover.') >-1) return 1;
        var ca = getSeparatorCount(a);
        var cb = getSeparatorCount(b);
        if (ca !== cb) return ca - cb;
        return a < b ? -1 : 1;
    };

    var getFirstImgEntry = function getFirstImgIndex(list){
        for (var i=0; i< list.length; i++) {
            if (list[i].match(imgFilePattern)) return list[i];
        }
        return null;
    };

    var getCoverIndex = function getCoverIndex(files){
        if (!files || files.length===0) return -1;

        var clone = files.slice(0);
        clone.sort(compareEntries);

        var jpgEntryName = getFirstImgEntry(clone);
        if (jpgEntryName===null) return -1;

        var ret = files.indexOf(jpgEntryName);
        return ret;
    };

    var defaultCallback = function defaultCallback(err, file, text) {
        if (err) {
            if (!file) return log.error(err);
            return log.info(err, file);
        }
        if (file) log.info('file', file, (text?text:''));
    };

    ecomic.extractCover = function extractCover(archive, options, callback) {

        var targetCover = path.join(
            path.dirname(archive),
            path.basename(archive, path.extname(archive)) + options.outputs[0].nameExtension + '.jpg');

        fs.stat(targetCover, function(err, stat) {
            if (!callback) callback = defaultCallback;
            if (!options) options = {};

            if (!options.overwrite && stat) return callback('Skipped. Cover already exists.', targetCover, null);

            // file does not exists or it will be overwritten:
            unpackAll.list(archive, options, function (err, files, text) {
                if (err) return callback(err, null, null);

                options.targetDir = options.tmpDir; // target dir for unpack (tmp dir), not target of resulting <cover>.jpg.
                if (!options.targetDir) options.targetDir = 'tmp';

                fs.ensureDir(options.targetDir, function(err){
                    if (err) log.error(err);
                    var coverIndex = getCoverIndex(files);
                    if (coverIndex==-1) return callback('Abort: Cannot find image file in ' + archive, null, null);

                    options.indexes =  [coverIndex];
                    if (files[0].indexOf(': Zip') > -1) options.indexes[0]--; // workaround
                    options.forceOverwrite = true;
                    options.noDirectory= true;
                    var coverName = files[coverIndex];

                    unpackAll.unpack(archive, options, function (err, files, text) {
                        if (err) return callback(err, null, null);

                        var sourceCover = path.join(options.targetDir, coverName);
                        fs.copy(sourceCover, targetCover, function (err) {
                            if (err) return callback(err, null, null);

                            fs.emptyDir(options.targetDir, function (err) {
                                if (err) log.warn(err); // doesn't matter
                                // tmpDir (targetDir) is now cleaned. targetCover is copied.

                                // let's convert targetcover (original size) to serveral image dimensions:
                                ecomic.convertCover(targetCover, options, function(err, files){
                                    callback(null, files, 'created');
                                });
                            });
                        });
                    }); // unpack
                });
            }); // list
        }); // stat
    };

    ecomic.convertCover = function convertCover(imgSource, options, callbackConvertCover) {
        // imgSource must be copied already  from tmp directory to target folder!

        if (!options || !options.outputs|| !options.outputs.length) return callbackConvertCover(null, [imgSource]);

        var gm = require('gm');

        var imgTemp = path.join(
            path.dirname(imgSource),
            path.basename(imgSource, path.extname(imgSource)) + '_.jpg');

        // outputs:[
        //     {nameExtension: "", dimension: [200, 300]}, // abc.cbr -> abc.jpg
        //     {nameExtension: "_xl", dimension: [800, 1200]}, // abc.cbr -> abc_xl.jpg
        //     {nameExtension: "_o", dimension: null} // original size. abc.cbr -> abc_o.jpg
        // ]

        fs.rename(imgSource, imgTemp, function (err) {
            if (err) return callbackConvertCover(err, null);

            var newfiles = [];

            // Waterfall:
            var todos = [];
            for (var i = 0; i < options.outputs.length; i++) {
                todos.push(
                    (function(output){
                        return function go(callbackWaterfall) {
                            var ext = output.nameExtension;
                            if (!ext) ext = '';

                            var relDir = (options.outputDir) ? options.outputDir : '';

                            if (relDir.length>0) {
                                // TODO  anlegen:   path.join(path.dirname(imgSource), relDir)
                            }

                            var targetFile = path.join(
                                path.dirname(imgSource),
                                relDir, // TODO testen
                                path.basename(imgSource, path.extname(imgSource)) + ext + '.jpg');

                            if (!output.dimension || !output.dimension.length) {
                                // just copy
                                fs.copy(imgTemp, targetFile, function (err) {
                                    if (err) return callbackConvertCover(err, null);
                                    callbackWaterfall();
                                });

                            } else {
                                gm(imgTemp)
                                    .resize(output.dimension[0], output.dimension[1])
                                    .noProfile()
                                    .write(targetFile, function (err) {
                                        if (err) {
                                            log.error('Error:', err);
                                        } else {
                                            log.info('File saved.', targetFile);
                                        }
                                        newfiles.push(targetFile);
                                        callbackWaterfall();
                                    });
                            }
                        }; // go
                    })(options.outputs[i])
                );
            } // for

            // Delete imgTemp file:
            todos.push(
                function go(callbackWaterfall) {
                    fs.unlink(imgTemp, function(err){
                        callbackWaterfall();
                    });
                }
            );

            // Start:
            async.waterfall(todos, function(err, result) {
                log.info('Outputs created:', todos.length);
                callbackConvertCover(err, newfiles);
            });
        }); // rename
    };

    ecomic.extractCoverPromise = function extractCoverPromise(archive, options){
        return new Promise(function(resolve, reject) {
            ecomic.extractCover(archive, options, function(err, file) {
                if (err) return reject(err);
                resolve(file);
            });
        });
    };

    ecomic.extractCoverGlob = function extractCoverGlob(pattern, options, callback) {
        if (!pattern) return log.error("Error: pattern missing.", null, null);

        if (!callback) callback = defaultCallback;
        if (!options) options = {};

        glob(pattern, {}, function (err, files) {
            if (err) return callback(err, null, null);

            log.info('Glob: ' + files.length + ' files found.');

            var newfiles = [];

            // Waterfall:
            var todos = [];
            for (var i = 0; i < files.length; i++) {
                todos.push((function(f){
                    function go(_callback) {
                        ecomic.extractCover(f, options,
                            function (err, file, text) {
                                if (!err && file) newfiles.push(file);
                                if (err) {
                                    if (!file) {
                                        log.error(err);
                                    } else {
                                        if (!options.quite) log.info(err, file);
                                    }
                                } else if (file && !options.quite) log.info('file', file, (text ? text : ''));
                                _callback();
                            });
                    }
                    return go;
                })(files[i]));
            } // for

            // Start:
            async.waterfall(todos, function(err, result){
                log.info('done all.');
                callback(err, newfiles);
            });
        });
    };

    ecomic();

    function ecomic() {
    }

})();