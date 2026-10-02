/* Extract selectable text; no PDF rendering, OCR or embedded-script execution. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.RenomeadorPdf = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  async function readPdfText(bytes, pdfjs) {
    const data = new Uint8Array(bytes);
    if (!new TextDecoder("latin1").decode(data.slice(0, 1024)).includes("%PDF-")) {
      throw new Error("INVALID_HEADER");
    }
    // PDF.js 3's official workaround for CVE-2024-4367. No dynamic evaluation.
    const task = pdfjs.getDocument({data, useSystemFonts: true, isEvalSupported: false, disableFontFace: true});
    try {
      const doc = await task.promise;
      const lines = [];
      for (let page = 1; page <= doc.numPages; page++) {
        const p = await doc.getPage(page);
        const {items} = await p.getTextContent();
        let line = "";
        for (const item of items) {
          line += (item.str || "") + " ";
          if (item.hasEOL) { lines.push(line.trim()); line = ""; }
        }
        if (line.trim()) lines.push(line.trim());
        p.cleanup();
      }
      return lines.join("\n");
    } finally {
      await task.destroy();
    }
  }
  return {readPdfText};
});
