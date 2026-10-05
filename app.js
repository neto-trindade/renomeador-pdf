"use strict";
const $ = (id) => document.getElementById(id),
  core = RenomeadorCore;
const PRESETS = {
  number: ["numero"],
  "num-company": ["numero", "empresa"],
  "company-num": ["empresa", "numero"],
  "num-date": ["numero", "data"],
  "company-num-date": ["empresa", "numero", "data"],
};
let model = core.modelFor(PRESETS["num-company"]),
  entries = [],
  saved = [],
  reading = false,
  packing = false,
  editing = -1,
  downloadUrl = null,
  extraLabels = {};
pdfjsLib.GlobalWorkerOptions.workerSrc = "vendor/pdf.worker.min.js";
function tell(text) {
  $("message").textContent = text;
  $("message").hidden = !text;
}
function stored(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
function persist(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
const loaded = stored(
  "renomeador_modelos_v3",
  stored("renomeador_modelos_v2", []),
);
saved = Array.isArray(loaded)
  ? loaded
      .filter(
        (x) => x && core.validModel(x.model) && typeof x.name === "string",
      )
      .slice(-30)
  : [];
const previous = stored(
  "renomeador_ultimo_modelo_v3",
  stored("renomeador_ultimo_modelo_v2", null),
);
if (core.validModel(previous))
  model = { version: 3, tokens: core.tokensOf(previous) };
function labelFor(key) {
  return (
    entries.map((e) => e.detected.labels?.[key]).find(Boolean) ||
    extraLabels[key] ||
    core.FIELD_NAMES[key] ||
    key.replace(/^extra_/, "").replace(/_/g, " ")
  );
}
function available() {
  const keys = new Set();
  for (const e of entries) {
    for (const [key, value] of Object.entries({
      ...e.detected.values,
      ...e.overrides,
    }))
      if (value || e.detected.ambiguous[key]) keys.add(key);
    for (const key of Object.keys(e.detected.candidates || {})) keys.add(key);
  }
  keys.add("arquivo_original");
  return [...keys];
}
function invalidateDownload() {
  if (downloadUrl) {
    URL.revokeObjectURL(downloadUrl);
    downloadUrl = null;
  }
  $("download").hidden = true;
  $("download").removeAttribute("href");
  $("prepare").hidden = false;
  $("downloadStatus").textContent = "";
}
function recalculate() {
  invalidateDownload();
  const results = core.uniqueResults(
    entries.map((e) => core.evaluateEntry(e, model)),
  );
  entries.forEach((e, i) => (e.result = results[i]));
  renderRows();
  renderExample();
}
function renderExample() {
  const current = JSON.stringify(model.tokens),
    preset = Object.entries(PRESETS).find(
      ([, keys]) => JSON.stringify(core.modelFor(keys).tokens) === current,
    )?.[0];
  document.querySelectorAll("[data-preset]").forEach((b) => {
    const selected = b.dataset.preset === preset;
    b.classList.toggle("active", selected);
    b.setAttribute("aria-pressed", String(selected));
  });
  const first = entries.find((e) => e.loaded && !e.ignored && !e.invalid),
    values = { ...first?.detected.values, ...first?.overrides };
  for (const key of core.partsUsed(model))
    if (!values[key]) values[key] = "[" + labelFor(key) + " não encontrado]";
  $("exampleName").textContent =
    (core.compose(values, model) || "Adicione um campo ao modelo") +
    (core.partsUsed(model).length ? ".pdf" : "");
}
function renderFields() {
  const selected = $("availableFields").value,
    fields = available();
  $("availableFields").replaceChildren(
    ...fields.map((key) => new Option(labelFor(key), key)),
  );
  if (fields.includes(selected)) $("availableFields").value = selected;
  $("fieldCount").textContent =
    `${fields.filter((k) => k !== "arquivo_original").length} campos encontrados neste lote. Eles também podem ser usados nos seus modelos.`;
}
function renderTokens() {
  const root = $("tokens");
  root.replaceChildren();
  model.tokens.forEach((token, i) => {
    const wrap = document.createElement("div");
    wrap.className = "token " + token.type;
    if (token.type === "field") {
      const text = document.createElement("span");
      text.textContent = labelFor(token.key);
      wrap.append(text);
    } else {
      const input = document.createElement("input");
      input.type = "text";
      input.maxLength = 80;
      input.value = token.value;
      input.setAttribute("aria-label", "Texto fixo " + (i + 1));
      input.oninput = () => {
        token.value = input.value;
        persist("renomeador_ultimo_modelo_v3", model);
        recalculate();
      };
      wrap.append(input);
    }
    for (const [title, text, action, disabled] of [
      [
        "Mover parte " + (i + 1) + " para a esquerda",
        "←",
        () => {
          [model.tokens[i - 1], model.tokens[i]] = [
            model.tokens[i],
            model.tokens[i - 1],
          ];
        },
        i === 0,
      ],
      [
        "Mover parte " + (i + 1) + " para a direita",
        "→",
        () => {
          [model.tokens[i + 1], model.tokens[i]] = [
            model.tokens[i],
            model.tokens[i + 1],
          ];
        },
        i === model.tokens.length - 1,
      ],
      ["Remover parte " + (i + 1), "×", () => model.tokens.splice(i, 1), false],
    ]) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = text;
      b.title = title;
      b.setAttribute("aria-label", title);
      b.disabled = disabled;
      b.onclick = () => {
        action();
        modelChanged();
      };
      wrap.append(b);
    }
    root.append(wrap);
  });
}
function modelChanged() {
  persist("renomeador_ultimo_modelo_v3", model);
  renderTokens();
  recalculate();
}
function fillSaved() {
  const selected = $("savedModels").value;
  $("savedModels").replaceChildren(
    new Option("Meus modelos salvos", ""),
    ...saved.map((x, i) => new Option(x.name, String(i))),
  );
  if (saved[Number(selected)] && selected !== "")
    $("savedModels").value = selected;
  $("deleteModel").hidden = $("savedModels").value === "";
}
function btn(text, fn, className = "row-button") {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = text;
  b.className = className;
  b.disabled = reading || packing;
  b.onclick = fn;
  return b;
}
function renderRows() {
  const ready = entries.filter((e) => e.result.status === "ready").length,
    pending = entries.filter((e) => e.result.status === "pending").length,
    ignored = entries.filter((e) => e.result.status === "ignored").length;
  $("modelSection").hidden = !entries.length;
  $("resultsSection").hidden = !entries.length;
  $("uploadCount").textContent = entries.length
    ? `${entries.length} PDFs adicionados`
    : "Seus documentos não são enviados para um servidor.";
  $("summary").textContent =
    `${entries.length} documentos · ${ready} prontos${pending ? " · " + pending + " para revisar" : ""}${ignored ? " · " + ignored + " ignorados" : ""}`;
  $("modelControls").disabled = reading || packing;
  $("choose").disabled = reading || packing;
  $("demo").disabled = reading || packing;
  $("clear").disabled = reading || packing;
  $("prepare").disabled = reading || packing || !ready;
  $("prepare").textContent = packing
    ? "Preparando download…"
    : "Renomear arquivos";
  $("pendingNote").hidden = !pending;
  $("pendingNote").textContent =
    `${pending} documento(s) ainda precisam de atenção e não entram no download. Você pode revisar, usar somente os campos encontrados, ignorar ou escolher outro modelo.`;
  $("exportNote").textContent = ready
    ? `${ready} PDF(s) pronto(s)${entries.length > 1 ? " + relatório CSV em um ZIP" : ""}. Os originais são preservados.`
    : "Escolha um modelo que use os campos encontrados para liberar o download.";
  const root = $("rows");
  root.replaceChildren();
  entries.forEach((e, i) => {
    const r = e.result,
      tr = document.createElement("tr"),
      source = document.createElement("td"),
      target = document.createElement("td"),
      status = document.createElement("td"),
      actions = document.createElement("td");
    source.className = "source";
    target.className = "target";
    const original = document.createElement("strong");
    original.textContent = e.file.name;
    source.append(original);
    if (e.loaded && !e.invalid) {
      const meta = document.createElement("div");
      meta.className = "meta";
      for (const text of [
        e.detected.type || "Documento",
        e.reading?.method === "ocr" ? "OCR" : "Texto",
      ]) {
        const s = document.createElement("span");
        s.textContent = text;
        meta.append(s);
      }
      source.append(meta);
      const values = { ...e.detected.values, ...e.overrides },
        keys = Object.keys(values).filter(
          (k) => k !== "arquivo_original" && values[k],
        );
      if (keys.length) {
        const details = document.createElement("details");
        details.className = "data-found";
        const summary = document.createElement("summary");
        summary.textContent = `Dados encontrados (${keys.length})`;
        details.append(summary);
        const dl = document.createElement("dl");
        for (const key of keys) {
          const dt = document.createElement("dt"),
            dd = document.createElement("dd");
          dt.textContent = labelFor(key);
          dd.textContent = values[key];
          dd.title = e.detected.sources?.[key]?.join("\n") || "";
          dl.append(dt, dd);
        }
        details.append(dl);
        source.append(details);
      }
    }
    target.textContent = r.name || "—";
    const reason = document.createElement("span");
    reason.className = "reason";
    reason.textContent = [r.reason, e.reading?.warnings?.[0]]
      .filter(Boolean)
      .join(" ");
    if (reason.textContent) target.append(reason);
    const pill = document.createElement("span");
    pill.className = "pill " + r.status;
    pill.textContent = {
      ready: "Pronto",
      pending: "Revisar",
      loading: "Analisando",
      ignored: "Ignorado",
    }[r.status];
    status.append(pill);
    const tools = document.createElement("div");
    tools.className = "row-actions";
    const review = btn(e.ignored ? "Reincluir" : "Revisar", () => {
      if (e.ignored) {
        e.ignored = false;
        recalculate();
      } else openEditor(i);
    });
    review.disabled = reading || packing || !e.loaded || e.invalid;
    const remove = btn(
      "×",
      () => {
        entries.splice(i, 1);
        renderFields();
        recalculate();
      },
      "remove",
    );
    remove.title = "Remover arquivo";
    remove.setAttribute("aria-label", "Remover " + e.file.name);
    tools.append(review, remove);
    actions.append(tools);
    if (r.status === "pending" && !e.invalid) {
      const options = document.createElement("details");
      options.className = "exception";
      const summary = document.createElement("summary");
      summary.textContent = "Outras opções";
      options.append(
        summary,
        btn("Usar campos encontrados", () => {
          e.useAvailable = true;
          recalculate();
        }),
        btn("Ignorar arquivo", () => {
          e.ignored = true;
          recalculate();
        }),
        btn("Analisar novamente", () => analyze([e])),
      );
      actions.append(options);
    }
    tr.append(source, target, status, actions);
    root.append(tr);
  });
}
function progress(percent, text) {
  $("progressArea").hidden = false;
  $("progressBar").style.width = Math.max(0, Math.min(100, percent)) + "%";
  $("progress").setAttribute("aria-valuenow", String(Math.round(percent)));
  $("progressText").textContent = text;
}
async function analyze(batch) {
  if (reading || packing) return;
  reading = true;
  RenomeadorOcr.resetIfFailed();
  tell("");
  recalculate();
  for (let i = 0; i < batch.length; i++) {
    const e = batch[i];
    e.loaded = false;
    e.error = "";
    e.invalid = false;
    e.reading = null;
    progress(
      (i / batch.length) * 100,
      `Analisando documento ${i + 1} de ${batch.length}…`,
    );
    try {
      e.reading = await RenomeadorPdf.readPdfDocument(
        await e.file.arrayBuffer(),
        pdfjsLib,
        {
          onProgress: (info) =>
            progress(
              ((i + (info.page - 1) / info.total) / batch.length) * 100,
              `${info.stage === "ocr" ? "Lendo imagem automaticamente" : "Analisando documento"} ${i + 1} de ${batch.length} · página ${info.page}/${info.total}`,
            ),
          recognizeImage: (canvas) =>
            RenomeadorOcr.recognizeImage(canvas, (m) => {
              if (m.status === "recognizing text")
                $("progressText").textContent =
                  `Lendo imagem automaticamente · documento ${i + 1}/${batch.length} · ${Math.round(m.progress * 100)}%`;
              else if (m.status === "loading language traineddata")
                $("progressText").textContent =
                  "Preparando a leitura de imagens para a primeira utilização…";
            }),
        },
      );
      e.detected = core.detect(e.reading, e.file.name);
      if (!e.reading.text.trim() && e.reading.warnings.length)
        e.error = e.reading.warnings[0];
    } catch (err) {
      const protectedFile = /PasswordException|password/i.test(
        String(err?.name) + String(err?.message),
      );
      e.error = protectedFile
        ? "PDF protegido por senha. Use um arquivo desbloqueado ou um nome para esta exceção."
        : "PDF inválido ou incompatível";
      e.invalid = !protectedFile;
      e.detected = { values: {}, ambiguous: {}, labels: {}, candidates: {} };
    }
    e.loaded = true;
    renderFields();
    recalculate();
  }
  reading = false;
  renderRows();
  renderFields();
  renderTokens();
  progress(
    100,
    `Análise concluída · ${batch.length} documento(s) lido(s). Escolha o modelo abaixo.`,
  );
}
async function addFiles(fileList) {
  if (reading || packing) return;
  const incoming = Array.from(fileList),
    files = incoming.filter((f) => /\.pdf$/i.test(f.name));
  if (!files.length) {
    tell("Selecione arquivos no formato PDF.");
    return;
  }
  if (files.length < incoming.length)
    tell("Arquivos de outros formatos foram ignorados.");
  const added = files.map((file) => ({
    file,
    loaded: false,
    invalid: false,
    error: "",
    reading: null,
    detected: { values: {}, ambiguous: {}, labels: {}, candidates: {} },
    overrides: {},
    manualName: "",
    ignored: false,
    useAvailable: false,
  }));
  entries.push(...added);
  await analyze(added);
}
function openEditor(i) {
  editing = i;
  const e = entries[i];
  $("editor").returnValue = "cancel";
  $("editTitle").textContent = e.file.name;
  $("editHelp").textContent =
    e.error ||
    e.reading?.warnings?.[0] ||
    "Dados extraídos automaticamente. Ajuste somente se necessário.";
  const root = $("editFields");
  root.replaceChildren();
  const values = { ...e.detected.values, ...e.overrides },
    keys = [
      ...new Set([
        ...core.partsUsed(model),
        ...Object.keys(values).filter((k) => values[k]),
      ]),
    ].filter((k) => k !== "arquivo_original");
  for (const key of keys) {
    const label = document.createElement("label");
    label.textContent = labelFor(key);
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 180;
    input.dataset.field = key;
    input.value = values[key] || "";
    input.placeholder = "Não identificado";
    label.append(input);
    if (e.detected.ambiguous[key]) {
      const hint = document.createElement("small");
      hint.textContent =
        "Valores encontrados: " +
        [
          ...new Set((e.detected.candidates?.[key] || []).map((c) => c.value)),
        ].join(" / ");
      label.append(hint);
    }
    root.append(label);
  }
  $("manualName").value = e.manualName;
  $("useAvailable").checked = e.useAvailable;
  $("editor").showModal();
}
async function prepareDownload() {
  if (reading || packing) return;
  recalculate();
  const ready = entries.filter((e) => e.result.status === "ready");
  if (!ready.length) return;
  const snapshot = entries.map((e) => ({
    ...e,
    overrides: { ...e.overrides },
    detected: { ...e.detected, values: { ...e.detected.values } },
    result: { ...e.result },
  }));
  packing = true;
  renderRows();
  progress(0, "Preparando seus arquivos…");
  try {
    const single = snapshot.length === 1 && ready.length === 1,
      bytes = single
        ? new Uint8Array(await ready[0].file.arrayBuffer())
        : await RenomeadorArchive.createArchive(snapshot, JSZip, (p) =>
            progress(
              p.percent,
              `Preparando download · ${Math.round(p.percent)}%`,
            ),
          );
    downloadUrl = URL.createObjectURL(
      new Blob([bytes], {
        type: single ? "application/pdf" : "application/zip",
      }),
    );
    $("download").href = downloadUrl;
    $("download").download = single
      ? ready[0].result.name
      : "PDFs_Renomeados.zip";
    $("download").textContent = single ? "Baixar PDF ↓" : "Baixar arquivos ↓";
    $("download").hidden = false;
    $("prepare").hidden = true;
    $("downloadStatus").textContent =
      "Download pronto. Clique no botão para salvar os arquivos.";
    progress(100, "Arquivos prontos para baixar.");
  } catch (err) {
    tell("Não foi possível preparar o download. Tente um lote menor.");
    progress(0, "O download não foi concluído.");
  } finally {
    packing = false;
    renderRows();
  }
}
$("choose").onclick = () => $("files").click();
$("files").onchange = (e) => {
  addFiles(e.target.files);
  e.target.value = "";
};
for (const type of ["dragenter", "dragover"])
  $("choose").addEventListener(type, (e) => {
    e.preventDefault();
    if (!reading && !packing) $("choose").classList.add("drag");
  });
for (const type of ["dragleave", "drop"])
  $("choose").addEventListener(type, (e) => {
    e.preventDefault();
    $("choose").classList.remove("drag");
  });
$("choose").addEventListener("drop", (e) => addFiles(e.dataTransfer.files));
// Stop accidental navigation if a file is dropped outside the upload area.
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", (e) => e.preventDefault());
$("demo").onclick = () => {
  if (reading || packing) return;
  addFiles(
    RenomeadorSamples.map(
      (s) =>
        new File(
          [Uint8Array.from(atob(s.base64), (c) => c.charCodeAt(0))],
          s.name,
          { type: "application/pdf" },
        ),
    ),
  );
};
$("clear").onclick = () => {
  entries = [];
  invalidateDownload();
  $("progressArea").hidden = true;
  renderFields();
  recalculate();
  tell("");
};
$("prepare").onclick = prepareDownload;
document.querySelectorAll("[data-preset]").forEach(
  (b) =>
    (b.onclick = () => {
      model = core.modelFor(PRESETS[b.dataset.preset]);
      $("savedModels").value = "";
      $("deleteModel").hidden = true;
      modelChanged();
    }),
);
$("toggleCustom").onclick = () => {
  const open = $("custom").hidden;
  $("custom").hidden = !open;
  $("toggleCustom").setAttribute("aria-expanded", String(open));
  $("toggleCustom").textContent = open
    ? "Fechar personalização −"
    : "Personalizar nome +";
  renderTokens();
};
$("addField").onclick = () => {
  const key = $("availableFields").value;
  if (!key) return;
  if (model.tokens.length > 21) {
    tell("Este modelo já tem muitas partes. Remova uma para continuar.");
    return;
  }
  if (model.tokens.at(-1)?.type === "field")
    model.tokens.push({ type: "text", value: " - " });
  model.tokens.push({ type: "field", key });
  modelChanged();
};
$("addText").onclick = () => {
  const value = $("fixedText").value;
  if (!value || model.tokens.length >= 24) return;
  model.tokens.push({ type: "text", value });
  modelChanged();
};
$("openSave").onclick = () => {
  if (!core.validModel(model)) {
    tell("Adicione pelo menos um campo antes de salvar.");
    return;
  }
  $("saveDialog").returnValue = "cancel";
  $("modelName").value = "";
  $("saveDialog").showModal();
};
$("saveDialog").addEventListener("close", () => {
  if ($("saveDialog").returnValue !== "save") return;
  const name = $("modelName").value.trim();
  if (!name) return;
  const item = {
    name,
    model: JSON.parse(JSON.stringify(model)),
    labels: Object.fromEntries(available().map((k) => [k, labelFor(k)])),
  };
  const index = saved.findIndex((x) => x.name === name);
  if (index >= 0) saved[index] = item;
  else saved.push(item);
  saved = saved.slice(-30);
  if (!persist("renomeador_modelos_v3", saved))
    tell(
      "O navegador não permitiu salvar o modelo. O lote continua disponível.",
    );
  else tell("Modelo salvo: " + name + ".");
  fillSaved();
  $("savedModels").value = String(saved.findIndex((x) => x.name === name));
  $("deleteModel").hidden = false;
});
$("savedModels").onchange = (e) => {
  const item = saved[Number(e.target.value)];
  $("deleteModel").hidden = e.target.value === "";
  if (e.target.value !== "" && item) {
    model = {
      version: 3,
      tokens: JSON.parse(JSON.stringify(core.tokensOf(item.model))),
    };
    extraLabels = item.labels || {};
    modelChanged();
  }
};
$("deleteModel").onclick = () => {
  const index = Number($("savedModels").value);
  if ($("savedModels").value === "") return;
  saved.splice(index, 1);
  persist("renomeador_modelos_v3", saved);
  $("savedModels").value = "";
  fillSaved();
  tell("Modelo excluído.");
};
$("editor").addEventListener("close", () => {
  if (editing < 0 || !entries[editing]) return;
  const e = entries[editing],
    action = $("editor").returnValue;
  editing = -1;
  if (action === "ignore") {
    e.ignored = true;
    recalculate();
    return;
  }
  if (action !== "apply") return;
  for (const input of $("editFields").querySelectorAll("[data-field]"))
    e.overrides[input.dataset.field] = input.value.trim();
  e.manualName = $("manualName").value.trim();
  e.useAvailable = $("useAvailable").checked;
  e.ignored = false;
  renderFields();
  recalculate();
});
fillSaved();
renderFields();
renderTokens();
recalculate();
