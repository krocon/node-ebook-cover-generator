import {extractCoverGlob} from "./index.mjs";

// let filename = 'f:\\ebooks\\_deu\\Das grosse illustrierte Ehapa Comic Lexikon (1920).cbr';
//
// let options = {
//   gmExecutable: 'c:\\Program Files\\GraphicsMagick-1.3.34-Q16\\gm.exe',
//   forceOverwrite: true,
//   outputDir: null,
//   outputs: [
//     // {nameExtension: "", dimension: [300, 450]},     // abc.cbr -> abc.jpg
//     {nameExtension: "", dimension: [200, 300]},     // abc.cbr -> abc.jpg
//     // {nameExtension: "_xl", dimension: [800, 1200]}, // abc.cbr -> abc_xl.jpg
//     // {nameExtension: "_o", dimension: null}          // abc.cbr -> abc_o.jpg, original size.
//   ]
// };
// extractCover(filename, options);

extractCoverGlob(
  'f:/ebooks/_deu/**/*.*',
  {
    gmExecutable: 'c:\\Program Files\\GraphicsMagick-1.3.34-Q16\\gm.exe',
    forceOverwrite: true,
    quite: true,
    outputs: [{nameExtension: "", dimension: [200, 300]}]
  });
