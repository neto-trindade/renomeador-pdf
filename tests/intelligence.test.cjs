"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  path = require("node:path");
const c = require("../core"),
  reader = require("../pdf-reader"),
  pdfjs = require("../vendor/pdf.min"),
  JSZip = require("../vendor/jszip.min"),
  { createArchive } = require("../archive");
pdfjs.GlobalWorkerOptions.workerSrc = require.resolve(
  "../vendor/pdf.worker.min",
);
const model = c.modelFor(["numero", "empresa"]);
const make = (text) => ({
  loaded: true,
  invalid: false,
  error: "",
  manualName: "",
  overrides: {},
  detected: c.detect(text, "documento.pdf"),
});
function key(model = "57", n = "000346386") {
  let s = "292609" + "00000000000000" + model + "001" + n + "1" + "00042533",
    sum = 0,
    w = 2;
  for (let i = 42; i >= 0; i--) {
    sum += +s[i] * w;
    w = w === 9 ? 2 : w + 1;
  }
  const r = sum % 11;
  return s + (r < 2 ? 0 : 11 - r);
}
test("CTe usa o número do transporte, mantendo a NF referenciada em outro campo", () => {
  const d = c.detect(
    "DACTE\nNúmero do CTe: 346386\nEmitente: TRANSPORTADORA ALFA LTDA\nNúmero da NF: 12345",
  );
  assert.equal(d.type, "CTe");
  assert.equal(d.values.numero, "346386");
  assert.equal(d.values.numero_nf, "12345");
  assert.equal(d.values.empresa, "TRANSPORTADORA ALFA LTDA");
});
test("NF citada não substitui um número ausente no CTe", () => {
  const d = c.detect(
    "DACTE\nEmitente: TRANSPORTADORA ALFA\nNúmero da NF: 12345",
  );
  assert.equal(d.values.numero, "");
  assert.equal(
    c.evaluateEntry(make("DACTE\nNúmero da NF: 12345"), model).status,
    "pending",
  );
});
test("título DANFE prevalece sobre uma referência a CTe", () => {
  const d = c.detect("DANFE\nNúmero da NF: 45678\nNúmero do CTe: 12345");
  assert.equal(d.type, "NF");
  assert.equal(d.values.numero, "45678");
});
test("emitente, destinatário e seus CNPJs ficam separados", () => {
  const d = c.detect(
    "DANFE\nEMITENTE\nNome / Razão Social\nALFA LTDA\nCNPJ: 00.000.000/0000-00\nDESTINATÁRIO\nNome / Razão Social\nBETA LTDA\nCNPJ: 11.111.111/1111-11\nNúmero da NF: 000123",
  );
  assert.equal(d.values.empresa, "ALFA LTDA");
  assert.equal(d.values.cliente, "BETA LTDA");
  assert.equal(d.values.cnpj, "00000000000000");
  assert.equal(d.values.cnpj_cliente, "11111111111111");
});
test("PDF real em colunas identifica valores sob os rótulos", async () => {
  const bytes = await fs.readFile(
    path.join(__dirname, "../examples/05-cte-em-colunas.pdf"),
  );
  const d = c.detect(await reader.readPdfDocument(bytes, pdfjs));
  assert.equal(d.values.numero, "346386");
  assert.equal(d.values.empresa, "TRANSPORTADORA ALFA LTDA");
  assert.equal(d.values.cliente, "CLIENTE DEMO LTDA");
  assert.equal(d.values.data, "29-09-2026");
  assert.equal(d.values.valor, "5.320,00");
  assert.equal(d.values.estado, "BA");
});
test("posições relativas continuam funcionando quando o layout muda de lugar", () => {
  const line = (y, cells) => {
    let text = "";
    return {
      y,
      height: 10,
      segments: cells.map(([x, t]) => {
        if (text) text += " ";
        const start = text.length;
        text += t;
        return { x, text: t, start, end: text.length };
      }),
      get text() {
        return text;
      },
    };
  };
  for (const dx of [0, 180]) {
    const lines = [
      line(100, [
        [20 + dx, "Número da fatura"],
        [210 + dx, "Data de Emissão"],
      ]),
      line(80, [
        [20 + dx, "90001"],
        [210 + dx, "02/10/2026"],
      ]),
      line(50, [[20 + dx, "Fornecedor: ALFA LTDA"]]),
    ];
    const d = c.detect({
      text: lines.map((l) => l.text).join("\n"),
      pages: [{ lines }],
    });
    assert.equal(d.values.numero, "90001");
    assert.equal(d.values.data, "02-10-2026");
  }
});
test("novos campos rotulados ficam disponíveis em um modelo sem mudança de código", () => {
  const e = make(
    "Número do documento: 12345\nRazão social: ALFA LTDA\nCentro de custo: FIN-02",
  );
  assert.equal(e.detected.labels.extra_centro_de_custo, "Centro de custo");
  assert.equal(e.detected.values.extra_centro_de_custo, "FIN-02");
  assert.equal(
    c.evaluateEntry(e, c.modelFor(["extra_centro_de_custo", "numero"])).name,
    "FIN-02 - 12345.pdf",
  );
});
test("chave validada identifica CTe, sem inventar dia de emissão", () => {
  const d = c.detect("Chave de acesso: " + key());
  assert.equal(d.type, "CTe");
  assert.equal(d.values.numero, "346386");
  assert.equal(d.values.data, "");
  assert.equal(c.parseAccessKey(key().slice(0, -1) + "9"), null);
});
test("contradição entre número impresso e chave permanece pendente", () => {
  const d = c.detect("DACTE\nNúmero do CTe: 99999\nChave de acesso: " + key());
  assert.equal(d.ambiguous.numero, true);
  assert.equal(d.values.numero, "");
});
test("data impossível não é usada e campos sem rótulo não são adivinhados", () => {
  const d = c.detect("Data de emissão: 31/02/2026\nALFA LTDA\n12345");
  assert.equal(d.values.data, "");
  assert.equal(d.values.empresa, "");
  assert.equal(d.values.numero, "");
});
test("fatura, pedido e CE usam seu tipo e seu número", () => {
  for (const [text, type, n] of [
    ["Número da fatura: 90001", "Fatura", "90001"],
    ["Número do pedido: 60001", "Pedido", "60001"],
    ["Número da CE: 80001", "CE", "80001"],
  ]) {
    const d = c.detect(text);
    assert.equal(d.type, type);
    assert.equal(d.values.numero, n);
  }
});
test("textos fixos podem aparecer em qualquer ponto de um modelo", () => {
  const e = make("Número da NF: 12345\nRazão Social: ALFA LTDA");
  const m = {
    tokens: [
      { type: "text", value: "NF " },
      { type: "field", key: "numero" },
      { type: "text", value: " - " },
      { type: "field", key: "empresa" },
      { type: "text", value: " - Cliente X" },
    ],
  };
  assert.ok(c.validModel(m));
  assert.equal(
    c.evaluateEntry(e, m).name,
    "NF 12345 - ALFA LTDA - Cliente X.pdf",
  );
});
test("usar encontrados remove lacunas e separadores sem inventar empresa", () => {
  const e = make("Número da NF: 12345\nData de emissão: 01/10/2026");
  const m = c.modelFor(["numero", "empresa", "data"]);
  assert.equal(c.evaluateEntry(e, m).status, "pending");
  e.useAvailable = true;
  assert.equal(c.evaluateEntry(e, m).name, "12345 - 01-10-2026.pdf");
  assert.match(c.evaluateEntry(e, m).reason, /campos encontrados/);
});
test("ignorar um documento o exclui do ZIP e o registra no relatório", async () => {
  const e = make("Número da NF: 12345");
  e.ignored = true;
  e.file = {
    name: "ignorado.pdf",
    arrayBuffer: async () => new Uint8Array([1]),
  };
  e.result = c.evaluateEntry(e, model);
  const zip = await JSZip.loadAsync(await createArchive([e], JSZip));
  assert.deepEqual(Object.keys(zip.files), ["relatorio.csv"]);
  assert.match(await zip.file("relatorio.csv").async("string"), /IGNORADO/);
});
test("lote de 100 PDFs preserva todos os bytes e resolve todas as colisões", async () => {
  const bytes = await fs.readFile(
    path.join(__dirname, "../examples/01-nota-ficticia.pdf"),
  );
  const entries = [];
  for (let i = 0; i < 100; i++) {
    const document = await reader.readPdfDocument(bytes, pdfjs);
    entries.push({
      loaded: true,
      overrides: {},
      manualName: "",
      detected: c.detect(document, "scan" + i + ".pdf"),
      file: { name: "scan" + i + ".pdf", arrayBuffer: async () => bytes },
    });
  }
  const results = c.uniqueResults(
    entries.map((e) => c.evaluateEntry(e, model)),
  );
  entries.forEach((e, i) => (e.result = results[i]));
  assert.equal(results[99].name, "59349 - EMPRESA DEMO LTDA (100).pdf");
  const zip = await JSZip.loadAsync(await createArchive(entries, JSZip));
  assert.equal(
    Object.keys(zip.files).filter((n) => n.endsWith(".pdf")).length,
    100,
  );
  for (const e of entries)
    assert.deepEqual(
      Buffer.from(await zip.file(e.result.name).async("uint8array")),
      bytes,
    );
});
test("modelos salvos rejeitam chaves arbitrárias e tokens malformados", () => {
  assert.equal(
    c.validModel({ tokens: [{ type: "field", key: "__proto__" }] }),
    false,
  );
  assert.equal(
    c.validModel({ tokens: [{ type: "text", value: "SEM DADOS" }] }),
    false,
  );
  assert.equal(
    c.validModel({ tokens: [{ type: "field", key: "extra_centro_de_custo" }] }),
    true,
  );
});
test("leitor aciona OCR nas páginas de imagem e continua lendo páginas nativas", async () => {
  let ocrCalls = 0,
    destroyed = false;
  const fake = {
    OPS: { paintImageXObject: 1 },
    getDocument: () => ({
      promise: Promise.resolve({
        numPages: 2,
        getPage: async (n) => ({
          getTextContent: async () => ({
            items:
              n === 2
                ? [
                    {
                      str: "Número da NF: 70001",
                      transform: [1, 0, 0, 12, 0, 30],
                      height: 12,
                    },
                  ]
                : [],
          }),
          getViewport: () => ({ width: 200, height: 300 }),
          render: () => ({ promise: Promise.resolve() }),
          cleanup() {},
        }),
      }),
      destroy: async () => {
        destroyed = true;
      },
    }),
  };
  const d = await reader.readPdfDocument(
    new TextEncoder().encode("%PDF-test"),
    fake,
    {
      canvasFactory: () => ({ getContext: () => ({}) }),
      recognizeImage: async () => {
        ocrCalls++;
        return { text: "Razão Social: EMPRESA DEMO LTDA", confidence: 90 };
      },
    },
  );
  assert.equal(ocrCalls, 2);
  assert.equal(d.method, "ocr");
  assert.equal(d.pages.length, 2);
  assert.equal(c.detect(d).values.numero, "70001");
  assert.equal(c.detect(d).values.empresa, "EMPRESA DEMO LTDA");
  assert.equal(destroyed, true);
});

test("falha de idioma do OCR encerra a tentativa e não se repete em todo o lote", async () => {
  const vm = require("node:vm"),
    source = await fs.readFile(path.join(__dirname, "../ocr.js"), "utf8");
  let attempts = 0;
  const context = {
    setTimeout,
    clearTimeout,
    Tesseract: {
      createWorker: (_lang, _oem, options) => {
        attempts++;
        queueMicrotask(() => options.errorHandler("LANGUAGE_UNAVAILABLE"));
        return new Promise(() => {});
      },
    },
  };
  vm.runInNewContext(source, context);
  await assert.rejects(
    context.RenomeadorOcr.recognizeImage({}),
    /LANGUAGE_UNAVAILABLE/,
  );
  await assert.rejects(
    context.RenomeadorOcr.recognizeImage({}),
    /LANGUAGE_UNAVAILABLE/,
  );
  assert.equal(attempts, 1);
  context.RenomeadorOcr.resetIfFailed();
  await assert.rejects(
    context.RenomeadorOcr.recognizeImage({}),
    /LANGUAGE_UNAVAILABLE/,
  );
  assert.equal(attempts, 2);
});

test("empresa sob o cabeçalho emitente é encontrada sem uma posição fixa", () => {
  const d = c.detect(
    "DANFE\nIDENTIFICAÇÃO DO EMITENTE\nTRANSPORTADORA ALFA LTDA\nCNPJ: 00.000.000/0000-00\nNúmero da NF: 12345",
  );
  assert.equal(d.values.emitente, "TRANSPORTADORA ALFA LTDA");
  assert.equal(d.values.empresa, "TRANSPORTADORA ALFA LTDA");
  const missing = c.detect(
    "DANFE\nEMITENTE\nRua das Flores, 100\nNúmero da NF: 12345",
  );
  assert.equal(missing.values.empresa, "");
});
test("abreviações de número com pontuação são identificadas", () => {
  for (const label of ["NF-e Nº.", "N.º da NF:", "Número da NF:"]) {
    assert.equal(c.detect(label + " 00012345").values.numero, "12345");
  }
});

test("DANFE real fictício encontra razão social sem rótulo no cabeçalho", async () => {
  const bytes = await fs.readFile(
    path.join(__dirname, "../examples/07-danfe-cabecalho.pdf"),
  );
  const d = c.detect(await reader.readPdfDocument(bytes, pdfjs));
  assert.equal(d.type, "NF");
  assert.equal(d.values.numero, "13913");
  assert.equal(d.values.empresa, "COMERCIO DEMONSTRACAO LTDA");
  assert.equal(d.values.emitente, "COMERCIO DEMONSTRACAO LTDA");
  assert.equal(d.values.cliente, "CLIENTE FICTICIO LTDA");
  assert.equal(d.values.cnpj, "00000000000000");
  assert.equal(d.values.cnpj_cliente, "11111111111111");
  assert.equal(d.values.data, "05-10-2026");
  assert.equal(c.compose(d.values, model), "13913 - COMERCIO DEMONSTRACAO LTDA");
});

test("nome do emitente em recibo de DANFE é separado da frase fiscal", () => {
  const d = c.detect(
    "RECEBEMOS DE COMERCIO ALFA S.A. OS PRODUTOS E/OU SERVICOS CONSTANTES DA NOTA FISCAL\nDANFE\nNumero da NF: 13913\nDESTINATARIO / REMETENTE\nNome / Razao Social: CLIENTE BETA LTDA",
  );
  assert.equal(d.values.empresa, "COMERCIO ALFA S.A.");
  assert.equal(d.values.cliente, "CLIENTE BETA LTDA");
});

test("cabeçalho fiscal sem razão social não usa endereço nem destinatário", () => {
  const d = c.detect(
    "DANFE\nRua das Flores, 100\nSalvador - BA\nCNPJ: 00.000.000/0000-00\nDESTINATARIO / REMETENTE\nNome / Razao Social: CLIENTE BETA LTDA\nCNPJ: 11.111.111/1111-11\nNumero da NF: 13913",
  );
  assert.equal(d.values.empresa, "");
  assert.equal(d.values.cliente, "CLIENTE BETA LTDA");
});

test("dois nomes de emitente no cabeçalho permanecem ambíguos", () => {
  const d = c.detect(
    "DANFE\nEMPRESA ALFA LTDA\nEMPRESA BETA LTDA\nCNPJ: 00.000.000/0000-00\nNumero da NF: 13913",
  );
  assert.equal(d.values.empresa, "");
  assert.equal(d.ambiguous.empresa, true);
});

test("razão social explícita do emitente tem prioridade sobre o cabeçalho", () => {
  const d = c.detect(
    "DANFE\nMARCA COMERCIAL LTDA\nCNPJ: 00.000.000/0000-00\nRazao Social do Emitente: EMPRESA LEGAL LTDA\nDESTINATARIO / REMETENTE\nNome / Razao Social: CLIENTE BETA LTDA\nNumero da NF: 13913",
  );
  assert.equal(d.values.empresa, "EMPRESA LEGAL LTDA");
  assert.equal(d.values.cliente, "CLIENTE BETA LTDA");
});

test("cabeçalho sem evidência de emitente continua sem empresa", () => {
  const d = c.detect("DANFE\nEMPRESA ALFA LTDA\nNumero da NF: 13913");
  assert.equal(d.values.empresa, "");
});

test("destinatário não mistura endereço do recibo, transportadora nem email", () => {
  for (const address of ["FZ EXEMPLO, SN ZONA RURAL", "EST DO EXEMPLO, SN BAIRRO FICTICIO", "AV DEMONSTRACAO, SN CENTRO"]) {
    const d = c.detect(
      "RECEBEMOS DE EMITENTE FICTICIO LTDA OS PRODUTOS CONSTANTES DA NOTA FISCAL\nDANFE\nDESTINATARIO: CLIENTE FICTICIO LTDA - " + address + "\nDESTINATARIO / REMETENTE\nNOME / RAZAO SOCIAL\nCLIENTE FICTICIO LTDA\nTRANSPORTADOR / VOLUMES TRANSPORTADOS\nNOME / RAZAO SOCIAL\nTRANSPORTADORA FICTICIA LTDA\nDADOS ADICIONAIS\nEmail do Destinatario: cliente@example.invalid\nNumero da NF: 13913",
    );
    assert.equal(d.values.empresa, "EMITENTE FICTICIO LTDA");
    assert.equal(d.values.cliente, "CLIENTE FICTICIO LTDA");
    assert.equal(d.ambiguous.cliente, false);
    assert.equal(d.values.transportador, "TRANSPORTADORA FICTICIA LTDA");
  }
});

function documentInColumns(rows, dx = 0) {
  const lines = rows.map(([y, height, cells]) => {
    let text = "";
    const segments = cells.map(([x, value]) => {
      if (text) text += " ";
      const start = text.length;
      text += value;
      return { x: x + dx, text: value, width: value.length * height * 0.45, start, end: text.length };
    });
    return { text, y, height, segments };
  });
  return { text: lines.map((l) => l.text).join("\n"), pages: [{ lines }] };
}

test("colunas de CNPJ e data da emissão não são lidas como valores do cabeçalho", () => {
  for (const dx of [0, 100]) {
    const d = c.detect(documentInColumns([
      [220, 10, [[10, "DANFE"]]],
      [200, 7, [[10, "DESTINATARIO / REMETENTE"]]],
      [190, 6, [[10, "NOME / RAZAO SOCIAL"], [360, "CNPJ / CPF"], [495, "DATA DA EMISSAO"]]],
      [177.6, 10, [[10, "CLIENTE FICTICIO LTDA"], [385, "11.111.111/1111-11"], [515, "05/10/2026"]]],
    ], dx));
    assert.equal(d.values.cliente, "CLIENTE FICTICIO LTDA");
    assert.equal(d.values.cnpj_cliente, "11111111111111");
    assert.equal(d.values.data, "05-10-2026");
  }
});

test("nome da transportadora é encontrado mesmo quando o frete vem numa linha anterior", () => {
  const d = c.detect(documentInColumns([
    [130, 7, [[10, "TRANSPORTADOR / VOLUMES TRANSPORTADOS"]]],
    [120, 6, [[10, "NOME / RAZAO SOCIAL"], [176, "FRETE"], [264, "CODIGO ANTT"], [351, "PLACA DO VEICULO"], [439, "UF"], [461, "CNPJ / CPF"]]],
    [111, 10, [[176, "1-Por conta do Dest"]]],
    [107.6, 10, [[10, "TRANSPORTADORA FICTICIA LTDA"], [484, "22.222.222/2222-22"]]],
  ]));
  assert.equal(d.values.transportador, "TRANSPORTADORA FICTICIA LTDA");
  assert.equal(d.values.cnpj_transportador, "22222222222222");
  assert.equal(d.values.cliente || "", "");
  assert.equal(d.values.empresa, "");
});

test("dados de contato do destinatário não viram razão social", () => {
  for (const contact of ["Email do Destinatario: cliente@example.invalid", "Telefone do Cliente: 000000000", "Endereco do Destinatario: FAZENDA EXEMPLO, SN"]) {
    const d = c.detect(contact);
    assert.equal(d.values.cliente || "", "");
    assert.equal(d.values.empresa, "");
  }
});

test("cabeçalhos financeiros e de transporte não viram razão social", () => {
  for (const value of ["FRETE CODIGO ANTT PLACA DO VEICULO", "DATA DA EMISSAO", "FZ EXEMPLO, SN", "cliente@example.invalid"]) {
    assert.equal(c.detect("Razao Social: " + value).values.empresa, "");
  }
  assert.equal(c.detect("Razao Social: EMPRESA FICTICIA LTDA - EPP").values.empresa, "EMPRESA FICTICIA LTDA - EPP");
});
