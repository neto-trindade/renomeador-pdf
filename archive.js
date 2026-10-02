(function (root, factory) {
  if (typeof module === "object" && module.exports)
    module.exports = factory(require("./core.js"));
  else root.RenomeadorArchive = factory(root.RenomeadorCore);
})(typeof globalThis !== "undefined" ? globalThis : this, function (core) {
  "use strict";
  async function createArchive(entries, JSZip, onProgress) {
    const zip = new JSZip(),
      fields = [
        ...new Set(
          entries.flatMap((e) =>
            Object.keys(e.detected?.values || {}).filter(
              (k) => k !== "arquivo_original",
            ),
          ),
        ),
      ];
    const report = [
      [
        "arquivo_original",
        "nome_final",
        "situacao",
        "observacao",
        "tipo_documento",
        "leitura",
        ...fields,
      ]
        .map(core.csvCell)
        .join(","),
    ];
    const used = new Set();
    for (const entry of entries) {
      const result = entry.result,
        values = { ...entry.detected?.values, ...entry.overrides };
      report.push(
        [
          entry.file.name,
          result.name,
          {
            ready: "PRONTO",
            pending: "PENDENTE",
            ignored: "IGNORADO",
            loading: "PENDENTE",
          }[result.status],
          result.reason,
          entry.detected?.type,
          entry.reading?.method,
          ...fields.map((k) => values[k]),
        ]
          .map(core.csvCell)
          .join(","),
      );
      if (result.status === "ready") {
        if (used.has(result.name.toLocaleLowerCase("pt-BR")))
          throw new Error(
            "Nomes repetidos: atualize a prévia antes de exportar.",
          );
        used.add(result.name.toLocaleLowerCase("pt-BR"));
        zip.file(result.name, new Uint8Array(await entry.file.arrayBuffer()));
      }
    }
    zip.file("relatorio.csv", "\uFEFF" + report.join("\r\n"));
    return zip.generateAsync(
      {
        type: "uint8array",
        compression: "DEFLATE",
        compressionOptions: { level: 2 },
      },
      onProgress,
    );
  }
  return { createArchive };
});
