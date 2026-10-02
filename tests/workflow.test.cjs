"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const pdfjs = require("../vendor/pdf.min.js");
const JSZip = require("../vendor/jszip.min.js");
const core = require("../core.js");
const {readPdfText} = require("../pdf-reader.js");
const {createArchive} = require("../archive.js");
pdfjs.GlobalWorkerOptions.workerSrc = require.resolve("../vendor/pdf.worker.min.js");
const model = {parts:["numero","empresa",""],separator:" - ",prefix:""};
const root = path.resolve(__dirname, "..");
async function entry(relative) {
  const bytes = await fs.readFile(path.join(root, relative));
  const name = path.basename(relative);
  return {file:{name,arrayBuffer:async()=>bytes},loaded:true,invalid:false,error:"",manualName:"",overrides:{},detected:core.detect(await readPdfText(bytes,pdfjs),name)};
}

test("PDF real com texto: extrai os quatro campos e monta o nome", async () => {
  const e = await entry("examples/01-nota-ficticia.pdf");
  assert.deepEqual(e.detected.values, {arquivo_original:"01-nota-ficticia",numero:"59349",empresa:"EMPRESA DEMO LTDA",data:"01-10-2026",cnpj:"00000000000000"});
  assert.equal(core.evaluateEntry(e,model).name, "59349 - EMPRESA DEMO LTDA.pdf");
});

test("le todas as paginas antes de decidir o nome", async () => {
  const e = await entry("tests/fixtures/varias-paginas.pdf");
  assert.equal(core.evaluateEntry(e,model).name,"59349 - EMPRESA DEMO LTDA.pdf");
});

test("dois numeros diferentes ficam pendentes ate revisao", async () => {
  const e = await entry("examples/03-dados-ambiguos.pdf");
  assert.equal(e.detected.ambiguous.numero,true);
  assert.equal(core.evaluateEntry(e,model).status,"pending");
  e.overrides.numero="10001";
  assert.equal(core.evaluateEntry(e,model).name,"10001 - EMPRESA DEMO LTDA.pdf");
});

test("PDF somente com imagem exige preenchimento manual", async () => {
  const e = await entry("examples/04-apenas-imagem.pdf");
  assert.equal(e.detected.values.numero,"");
  assert.equal(core.evaluateEntry(e,model).status,"pending");
  e.overrides={numero:"70001",empresa:"EMPRESA DEMO LTDA"};
  assert.equal(core.evaluateEntry(e,model).name,"70001 - EMPRESA DEMO LTDA.pdf");
});

test("campo ausente fica pendente e pode receber um nome completo", async () => {
  const e = await entry("tests/fixtures/sem-empresa.pdf");
  assert.match(core.evaluateEntry(e,model).reason,/Falta Empresa/);
  e.manualName="nota conferida.pdf";
  assert.equal(core.evaluateEntry(e,model).name,"nota conferida.pdf");
});

test("arquivo falso e rejeitado e nao pode ser liberado por um nome manual", async () => {
  const bytes = await fs.readFile(path.join(root,"tests/fixtures/invalido.pdf"));
  await assert.rejects(readPdfText(bytes,pdfjs),/INVALID_HEADER/);
  const bad={loaded:true,invalid:true,manualName:"meu nome",detected:{values:{},ambiguous:{}},overrides:{}};
  assert.equal(core.evaluateEntry(bad,model).status,"pending");
});

test("PDF com senha nao e lido, mas pode ser renomeado sem alterar sua protecao", async () => {
  const bytes = await fs.readFile(path.join(root,"tests/fixtures/protegido.pdf"));
  await assert.rejects(readPdfText(bytes,pdfjs),e=>e.name==="PasswordException");
  const protectedFile={loaded:true,invalid:false,error:"PDF protegido por senha",manualName:"",detected:{values:{},ambiguous:{}},overrides:{}};
  assert.equal(core.evaluateEntry(protectedFile,model).status,"pending");
  protectedFile.manualName="protegido revisado";
  assert.equal(core.evaluateEntry(protectedFile,model).name,"protegido revisado.pdf");
});

test("colisoes nao sobrescrevem PDFs, inclusive com diferenca de caixa", () => {
  const results=core.uniqueResults(["nota.pdf","NOTA.pdf","nota (2).pdf","nota.pdf"].map(name=>({status:"ready",name,reason:""})));
  assert.deepEqual(results.map(r=>r.name),["nota.pdf","NOTA (2).pdf","nota (2) (2).pdf","nota (3).pdf"]);
});

test("formato personalizado combina prefixo, data e numero", async () => {
  const e=await entry("examples/01-nota-ficticia.pdf");
  const custom={parts:["data","numero",""],separator:"_",prefix:"NF"};
  assert.equal(core.evaluateEntry(e,custom).name,"NF 01-10-2026_59349.pdf");
});

test("nomes perigosos para Windows sao normalizados", () => {
  assert.equal(core.safeName(' ../CON: <arquivo>|? '),"CON arquivo");
  assert.equal(core.safeName("CON"),"_CON");
  assert.equal(core.safeName("a".repeat(250)).length,180);
  assert.equal(core.safeName("..."),"");
});

test("numero no nome original serve como alternativa; texto ambiguo impede essa alternativa", () => {
  assert.equal(core.detect("","NF-000123.pdf").values.numero,"123");
  const detected=core.detect("Numero da NF: 00123\nNumero da NF: 00456","NF-000999.pdf");
  assert.equal(detected.values.numero,"");
  assert.equal(detected.ambiguous.numero,true);
});

test("exportacao preserva os bytes, separa duplicados e registra pendencias no CSV", async () => {
  const entries=await Promise.all(["examples/01-nota-ficticia.pdf","examples/02-nome-repetido.pdf","examples/03-dados-ambiguos.pdf","examples/04-apenas-imagem.pdf"].map(entry));
  const results=core.uniqueResults(entries.map(e=>core.evaluateEntry(e,model)));
  entries.forEach((e,i)=>e.result=results[i]);
  const zip=await JSZip.loadAsync(await createArchive(entries,JSZip));
  assert.deepEqual(Object.keys(zip.files),["59349 - EMPRESA DEMO LTDA.pdf","59349 - EMPRESA DEMO LTDA (2).pdf","relatorio.csv"]);
  for(const e of entries.filter(e=>e.result.status==="ready")) {
    assert.deepEqual(Buffer.from(await zip.file(e.result.name).async("uint8array")),Buffer.from(await e.file.arrayBuffer()));
  }
  const csv=await zip.file("relatorio.csv").async("string");
  assert.equal((csv.match(/"PRONTO"/g)||[]).length,2);
  assert.equal((csv.match(/"PENDENTE"/g)||[]).length,2);
  assert.match(csv,/03-dados-ambiguos\.pdf/);
  assert.match(csv,/04-apenas-imagem\.pdf/);
});

test("CSV neutraliza formulas e escapa aspas", () => {
  assert.equal(core.csvCell('=HYPERLINK("url")'),'"\'=HYPERLINK(""url"")"');
  assert.equal(core.csvCell("  +1"),'"\'  +1"');
  assert.equal(core.csvCell('nome, "teste"'),'"nome, ""teste"""');
});

test("validacao rejeita modelos salvos desconhecidos", () => {
  assert.equal(!!core.validModel({...model,parts:["nao_existe","",""]}),false);
  assert.equal(!!core.validModel({...model,separator:"/"}),false);
  assert.equal(!!core.validModel(model),true);
});
