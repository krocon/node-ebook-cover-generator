import {extractCoverGlob} from "./index.mjs";

extractCoverGlob(
  // 'f:/ebooks/_deu/**/*.*',
  'f:/ebooks/_deu/__temp3/**/*.*',
  // 'f:/ebooks/_deu/__temp3/s/schwarzbart-der-pirat-bastei/**/*.*',
  {
    gmExecutable: 'c:\\Program Files\\GraphicsMagick-1.3.34-Q16\\gm.exe',
    forceOverwrite: false,
    quite: true,
    outputs: [{nameExtension: "", dimension: [200, 300]}]
  });
