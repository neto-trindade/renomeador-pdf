/* Reusable local OCR worker. The CDN supplies engine/language assets, never receives PDFs. */
(function (root) {
  "use strict";
  let workerPromise = null,
    report = () => {};
  async function worker() {
    if (!workerPromise) {
      workerPromise = Tesseract.createWorker("por", 1, {
        workerPath: "vendor/ocr-worker.min.js",
        corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0",
        langPath:
          "https://cdn.jsdelivr.net/npm/@tesseract.js-data/por@1.0.0/4.0.0_best_int",
        logger: (m) => report(m),
      })
        .then(async (w) => {
          await w.setParameters({
            preserve_interword_spaces: "1",
            user_defined_dpi: "180",
            tessedit_pageseg_mode: "3",
          });
          return w;
        })
        .catch((e) => {
          workerPromise = null;
          throw e;
        });
    }
    return workerPromise;
  }
  root.RenomeadorOcr = {
    async recognizeImage(canvas, onProgress) {
      report = onProgress || (() => {});
      const w = await worker();
      const { data } = await w.recognize(canvas);
      return { text: data.text, confidence: data.confidence };
    },
    async terminate() {
      if (workerPromise) {
        const w = await workerPromise.catch(() => null);
        workerPromise = null;
        await w?.terminate();
      }
    },
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
