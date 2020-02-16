import {extractCoverGlob} from "./index.mjs";

extractCoverGlob(
  'f:/ebooks/_deu/**/*.*',
  {
    gmExecutable: 'c:\\Program Files\\GraphicsMagick-1.3.34-Q16\\gm.exe',
    forceOverwrite: true,
    quite: true,
    outputs: [{nameExtension: "", dimension: [200, 300]}]
  });
