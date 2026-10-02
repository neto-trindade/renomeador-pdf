(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./core.js"));
  else root.RenomeadorArchive = factory(root.RenomeadorCore);
})(typeof globalThis !== "undefined" ? globalThis : this, function (core) {
  "use strict";
  async function createArchive(entries, JSZip, onProgress) {
    const zip = new JSZip();
    const report = ["arquivo_original,nome_final,situacao,observacao"];
    for (const entry of entries) {
      const result = entry.result;
      report.push([entry.file.name, result.name, result.status === "ready" ? "PRONTO" : "PENDENTE", result.reason].map(core.csvCell).join(","));
      if (result.status === "ready") zip.file(result.name, new Uint8Array(await entry.file.arrayBuffer()));
    }
    zip.file("relatorio.csv", "\uFEFF" + report.join("\r\n"));
    return zip.generateAsync({type: "uint8array", compression: "DEFLATE", compressionOptions: {level: 2}}, onProgress);
  }
  return {createArchive};
});
