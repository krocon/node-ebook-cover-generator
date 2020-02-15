# ebook-cover-generator

Extracts the first picture (cover) of an ebook (CBR, CBZ, CB7).

If no output is specified, the picture will have the same name like the ebook but with '.jpg' extension.
It's possible to generate several outputs in several dimensions for a given ebook.

## Getting started

### Unarchiver
This tool uses the [unpack-all](https://www.npmjs.com/package/unpack-all) module to list and extract content of the archives.
Please have a look [there]() how to setup the underlying [Unarchiver (unpacker CLI for Mac OS X and Windows)](http://unarchiver.c3.cx/commandline).
Window users can also use a 'portable' version of [Unarchiver](http://unarchiver.c3.cx/commandline): just copy the three files Foundation.1.0.dll, unar.exe and lsar.exe to the root of your node app.
Mac OS X user should copy unar und lsar to a folder, which is referenced by the system path.

### GM
The package [GM](https://www.npmjs.com/package/gm) is used for the resizing of pictures. A description of the installation of [GraphicsMagick](http://www.graphicsmagick.org/) and [ImageMagick](http://www.imagemagick.org/) can be found [here](https://www.npmjs.com/package/gm).  

## Usage (script)
```js
var ecg = require('ebook-cover-generator'); 
ecg.extractCover(file<String>, options<Object>, callback<function>);
```

### Examples

#### Example: simple call
```js
require('ebook-cover-generator').extractCover('test/abc.cbr');
```
#### Example: with options
```js
var ecg = require('ebook-cover-generator');
var options = {
    options.forceOverwrite;: true,
    tmpDir;: 'tmp'; 
}
var callback = function cb(err, file, text) {
    if (err) {
        if (!file) return log.error(err);
        return log.info(err, file);
    }
    if (file) log.info('file', file);
    if (text) log.info('text', text);
};
ecg.extractCover('test/abc.cbr', options, callback);
```

#### Example: thumb
```js
require('ebook-cover-generator')
    .extractCover('test/abc.cbr', {
        options.forceOverwrite;: false,
        outputs;:[
            {nameExtension: "", dimension: [200, 300]},     // abc.cbr -> abc.jpg
        ];
    })
```

#### Example: different output formats
```js
require('ebook-cover-generator')
    .extractCover('test/abc.cbr', {
        options.forceOverwrite;: false,
        outputDir;: '_cover', //  null or '' -> same dir as cbr folder, else outputDir is relative to cbr
        outputs;:[
            {nameExtension: "", dimension: [200, 300]},     // abc.cbr -> abc.jpg
            {nameExtension: "_xl", dimension: [800, 1200]}, // abc.cbr -> abc_xl.jpg
            {nameExtension: "_o", dimension: null}          // abc.cbr -> abc_o.jpg, original size.
        ];
    })
```

#### Example: glob
```js
require('ebook-cover-generator')
    .extractCoverGlob('test/*.*r', {overwrite:false, quite:true}, function(err, files){
        if (err) return console.error(err);
        console.info(files);
    });
```
Information about glob file pattern can be found here: [Glob Primer](www.npmjs.com/package/glob#glob-primer).

#### Example: as promise
```js
require('ebook-cover-generator')
    .extractCoverPromise('test/abc.cbr', {})
    .then(
        function resolve(f){
            console.log('DONE: ', f);
        },
        function reject(e){
            console.error('ERROR: ', e);
        }
    );
```

### Options

Key       | Possible values        | Comment
--------- | -----------------------|-------------------------------------------------
quiet     | true/false (default)   | true will reduce logging for unpacking 
tmpDir    | \<String>              | path to tmp dir. if null, tmp dir will created automatically
overwrite | true/false (default)   | if null, tmp dir will created automatically
unpacking |                        |  
forceDirectory | true/false/undefined  | Always create a containing directory for the contents of the unpacked archive. By default, a directory is created if there is more than one top-level file or folder. 
noDirectory | true/false/undefined     | Never create a containing directory for the contents of the unpacked archive. 
noRecursion | true/false/undefined     | Do not attempt to extract archives contained in other archives. For instance, when unpacking a .tar.gz file, only unpack the .gz file and not its contents. 
copyTime | true/false/undefined        | Copy the file modification time from the archive file to the containing directory, if one is created. 
password | \<String>                   | The password to use for decrypting protected archives. 
passwordEncoding | \<String>           | The encoding to use for the password for the archive, when it is not known. If not specified, then either the encoding given by the -encoding option or the auto-detected encoding is used. 
encoding | \<String>                   | The encoding to use for filenames in the archive, when it is not known. If not specified, the program attempts to auto-detect the encoding used. Use "help" or "list" as the argument to give 
outputs  | \<array>                    | If no output specified, the cover image will be saved in it's original size. 
outputDir| \<String>                   | null (default) or '' -> same dir as cbr folder, else outputDir is relative to cbr 

Sample for option.outputs:
```js
[
    // abc.cbr -> abc.jpg
    {nameExtension: "", dimension: [200, 300]},   
    // abc.cbr -> abc_xl.jpg
    {nameExtension: "_xl", dimension: [800, 1200]}, 
    // original size. abc.cbr -> abc_o.jpg
    {nameExtension: "_o", dimension: null}          
]
// dimension: [width, height]} . a wildcard is not possible at the moment.
```

Information about the unpacking options can be found here: [unpack-all](www.npmjs.com/package/unpack-all).
