/* Reusable local OCR worker. The CDN supplies assets, never receives PDFs. */
(function (root) {
  "use strict";
  let workerPromise = null,
    failed = false,
    report = () => {};
  function bounded(promise, milliseconds) {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("OCR_TIMEOUT")), milliseconds);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
  }
  async function create() {
    let rejectLoad;
    const errors = new Promise((_, reject) => {
      rejectLoad = reject;
    });
    const creation = Tesseract.createWorker("por", 1, {
      workerPath: "vendor/ocr-worker.min.js",
      corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0",
      langPath:
        "https://cdn.jsdelivr.net/npm/@tesseract.js-data/por@1.0.0/4.0.0_best_int",
      logger: (m) => report(m),
      errorHandler: (error) => rejectLoad(new Error(String(error))),
    });
    try {
      const w = await bounded(Promise.race([creation, errors]), 75000);
      await w.setParameters({
        preserve_interword_spaces: "1",
        user_defined_dpi: "180",
        tessedit_pageseg_mode: "3",
      });
      return w;
    } catch (error) {
      failed = true;
      creation.then((w) => w.terminate()).catch(() => {});
      throw error;
    }
  }
  root.RenomeadorOcr = {
    async recognizeImage(canvas, onProgress) {
      report = onProgress || (() => {});
      // An unavailable engine fails subsequent pages quickly instead of repeating downloads for an entire batch.
      workerPromise ??= create();
      const w = await workerPromise;
      try {
        const { data } = await bounded(w.recognize(canvas), 60000);
        return { text: data.text, confidence: data.confidence };
      } catch (error) {
        failed = true;
        await w.terminate();
        workerPromise = Promise.reject(error);
        workerPromise.catch(() => {});
        throw error;
      }
    },
    resetIfFailed() {
      if (failed) {
        failed = false;
        workerPromise = null;
      }
    },
    async terminate() {
      if (workerPromise) {
        const w = await workerPromise.catch(() => null);
        workerPromise = null;
        failed = false;
        await w?.terminate();
      }
    },
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
