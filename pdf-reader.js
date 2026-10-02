/* PDF.js adapter. Text reconstruction uses relative lines and columns, never fixed document coordinates. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.RenomeadorPdf = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function nativeLines(items) {
    const rows = [];
    for (const item of items) {
      if (!item.str?.trim()) continue;
      const x = item.transform[4],
        y = item.transform[5],
        height = Math.abs(item.height) || Math.abs(item.transform[3]) || 12;
      let row = rows.find(
        (r) =>
          Math.abs(r.y - y) <= Math.max(2, Math.min(r.height, height) * 0.28),
      );
      if (!row) {
        row = { y, height, cells: [] };
        rows.push(row);
      }
      row.height = Math.max(row.height, height);
      row.cells.push({ text: item.str.trim(), x, width: item.width || 0 });
    }
    return rows
      .sort((a, b) => b.y - a.y)
      .map((row) => {
        let text = "";
        const segments = row.cells
          .sort((a, b) => a.x - b.x)
          .map((cell) => {
            if (text) text += " ";
            const start = text.length;
            text += cell.text;
            return { ...cell, start, end: text.length };
          });
        return { text, y: row.y, height: row.height, segments };
      });
  }
  async function readPdfDocument(bytes, pdfjs, options = {}) {
    const data = new Uint8Array(bytes);
    if (
      !new TextDecoder("latin1").decode(data.slice(0, 1024)).includes("%PDF-")
    )
      throw new Error("INVALID_HEADER");
    // Official PDF.js 3 workaround for CVE-2024-4367. No dynamic evaluation or PDF scripting.
    const task = pdfjs.getDocument({
      data,
      useSystemFonts: true,
      isEvalSupported: false,
      disableFontFace: !options.recognizeImage,
      password: options.password,
    });
    try {
      const doc = await task.promise,
        pages = [],
        warnings = [];
      let ocrPages = 0;
      for (let n = 1; n <= doc.numPages; n++) {
        options.onProgress?.({ page: n, total: doc.numPages, stage: "text" });
        const page = await doc.getPage(n),
          { items } = await page.getTextContent();
        let lines = nativeLines(items),
          text = lines.map((l) => l.text).join("\n"),
          method = "text",
          confidence = null;
        let imagePage = text.replace(/\s/g, "").length < 80;
        if (!imagePage && text.length < 250 && options.recognizeImage) {
          const operators = await page.getOperatorList();
          imagePage = operators.fnArray.some((op) =>
            [
              pdfjs.OPS.paintImageXObject,
              pdfjs.OPS.paintInlineImageXObject,
              pdfjs.OPS.paintImageXObjectRepeat,
              pdfjs.OPS.paintImageMaskXObject,
            ].includes(op),
          );
        }
        if (imagePage && options.recognizeImage) {
          let canvas;
          try {
            options.onProgress?.({
              page: n,
              total: doc.numPages,
              stage: "ocr",
            });
            const initial = page.getViewport({ scale: 1 }),
              scale = Math.min(
                2.5,
                3000 / Math.max(initial.width, initial.height),
                Math.sqrt(10000000 / (initial.width * initial.height)),
              ),
              viewport = page.getViewport({ scale });
            canvas = options.canvasFactory
              ? options.canvasFactory(
                  Math.ceil(viewport.width),
                  Math.ceil(viewport.height),
                )
              : document.createElement("canvas");
            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);
            await page.render({
              canvasContext: canvas.getContext("2d", {
                willReadFrequently: true,
              }),
              viewport,
            }).promise;
            const result = await options.recognizeImage(canvas);
            const recognized = result.text?.trim() || "";
            confidence = result.confidence ?? null;
            if (recognized) {
              text = [text, recognized].filter(Boolean).join("\n");
              lines = text.split(/\r?\n/).map((text) => ({ text }));
              method = "ocr";
              ocrPages++;
              if (confidence !== null && confidence < 60)
                warnings.push(
                  `Página ${n}: imagem com baixa legibilidade. Confira os dados encontrados.`,
                );
            } else
              warnings.push(`Página ${n}: nenhum texto legível na imagem.`);
          } catch (error) {
            warnings.push(
              `Página ${n}: não foi possível concluir o OCR. Verifique a conexão e tente analisar novamente.`,
            );
          } finally {
            if (canvas) {
              canvas.width = 0;
              canvas.height = 0;
            }
          }
        }
        pages.push({ number: n, text, lines, method, confidence });
        page.cleanup();
      }
      return {
        text: pages.map((p) => p.text).join("\n"),
        pages,
        pageCount: doc.numPages,
        method: ocrPages ? "ocr" : "text",
        ocrPages,
        warnings,
      };
    } finally {
      await task.destroy();
    }
  }
  async function readPdfText(bytes, pdfjs) {
    return (await readPdfDocument(bytes, pdfjs)).text;
  }
  return { readPdfText, readPdfDocument, nativeLines };
});
