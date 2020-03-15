import {extractCoverPromise} from "./index.mjs";

async function demo3() {
  console.info('demo3...');

  const res = await extractCoverPromise(
    'f:/ebooks/_deu/a/aquaman-and-the-others/Aquaman and The Others 004.cbr',
    // 'f:/ebooks/_deu/__temp3/s/schwarzbart-der-pirat-bastei/Schwarzbart der Pirat (Bastei) - 11 - Grillfest fuer den Weissen Vater.cbr',
    // 'f:/ebooks/_deu/__temp3/s/schwarzbart-der-pirat-bastei/Schwarzbart der Pirat (Bastei) - 01 - Das Schiff der schlauen Schufte.cbr',
    {
      gmExecutable: 'c:\\Program Files\\GraphicsMagick-1.3.34-Q16\\gm.exe',
      forceOverwrite: false,
      quite: true,
      outputs: [{nameExtension: "", dimension: [200, 300]}]
    })
    .catch(
      console.error
    );

  console.info('demo3 end. res:', res);
}

demo3();


