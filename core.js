/* Local document extraction and naming rules, shared with the tests. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.RenomeadorCore = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const FIELD_NAMES = Object.freeze({
    numero: "Número do documento",
    numero_nf: "Número NF",
    numero_cte: "Número CTe",
    numero_ce: "Número CE",
    numero_fatura: "Número da fatura",
    numero_pedido: "Número do pedido",
    empresa: "Empresa",
    emitente: "Emitente",
    cliente: "Cliente / destinatário",
    fornecedor: "Fornecedor",
    remetente: "Remetente",
    tomador: "Tomador",
    cnpj: "CNPJ",
    cpf: "CPF",
    cnpj_cliente: "CNPJ do cliente",
    cnpj_fornecedor: "CNPJ do fornecedor",
    data: "Data de emissão",
    vencimento: "Data de vencimento",
    valor: "Valor",
    cidade: "Cidade",
    estado: "Estado",
    descricao: "Descrição",
    codigo: "Código interno",
    chave: "Chave de acesso",
    arquivo_original: "Nome original",
  });
  const fold = (s) =>
    String(s ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const number = (s) =>
    (String(s).match(/^\s*(\d{1,12})(?!\d)/)?.[1] || "").replace(
      /^0+(?=\d)/,
      "",
    );
  const DEFINITIONS = [
    [
      "numero_nf",
      String.raw`(?:numero|n[º°o.]?)\s*(?:(?:da|de)\s*)?(?:nf-?e?|nota\s+fiscal)|(?:nf-?e?|nota\s+fiscal(?:\s+eletronica)?)\s*(?:n[º°o.]?|numero)?`,
      "number",
    ],
    [
      "numero_cte",
      String.raw`(?:numero|n[º°o.]?)\s*(?:(?:do|de)\s*)?ct-?e(?:-?os)?|ct-?e(?:-?os)?\s*(?:n[º°o.]?|numero)?`,
      "number",
    ],
    [
      "numero_ce",
      String.raw`(?:numero|n[º°o.]?)\s*(?:(?:da|do|de)\s*)?ce|ce\s*(?:n[º°o.]?|numero)`,
      "number",
    ],
    [
      "numero_fatura",
      String.raw`(?:numero|n[º°o.]?)\s*(?:(?:da|de)\s*)?fatura|fatura\s*(?:n[º°o.]?|numero)?`,
      "number",
    ],
    [
      "numero_pedido",
      String.raw`(?:numero|n[º°o.]?)\s*(?:(?:do|de)\s*)?pedido|pedido\s*(?:n[º°o.]?|numero)?`,
      "number",
    ],
    [
      "numero",
      String.raw`numero\s*(?:(?:do|de)\s*)?(?:documento|duplicata|recibo)|documento\s*(?:n[º°o.]?|numero)|n[º°]\s*(?:documento)?|numero`,
      "number",
    ],
    [
      "data",
      String.raw`data\s*(?:de\s*)?(?:emissao|do\s+documento)|emissao`,
      "date",
    ],
    ["vencimento", String.raw`data\s*(?:de\s*)?vencimento|vencimento`, "date"],
    [
      "valor",
      String.raw`valor\s+(?:total\s*(?:da\s+(?:nota|fatura)|do\s+(?:documento|servico))?|da\s+nota|do\s+documento|a\s+pagar)|total\s+(?:da\s+nota|da\s+fatura|a\s+pagar)|valor(?=\s*[:]|\s*R\$)`,
      "money",
    ],
    [
      "empresa",
      String.raw`(?:nome\s*[/]\s*)?razao\s+social|nome\s+(?:da\s+empresa|empresarial)|empresa(?=\s*:|\s*$)`,
      "company",
    ],
    [
      "emitente",
      String.raw`(?:nome\s*(?:[/]\s*razao\s+social)?\s*(?:do\s*)?)?emitente(?=\s*:|\s*$)`,
      "company",
    ],
    [
      "cliente",
      String.raw`(?:nome\s+(?:do\s+)?)?(?:cliente|destinatario)(?=\s*:|\s*$)`,
      "company",
    ],
    [
      "fornecedor",
      String.raw`(?:nome\s+(?:do\s+)?)?fornecedor(?=\s*:|\s*$)`,
      "company",
    ],
    [
      "remetente",
      String.raw`(?:nome\s+(?:do\s+)?)?remetente(?=\s*:|\s*$)`,
      "company",
    ],
    [
      "tomador",
      String.raw`(?:nome\s+(?:do\s+)?)?tomador(?:\s+do\s+servico)?(?=\s*:|\s*$)`,
      "company",
    ],
    [
      "cnpj_cliente",
      String.raw`cnpj\s*(?:do\s*)?(?:cliente|destinatario)`,
      "cnpj",
    ],
    ["cnpj_fornecedor", String.raw`cnpj\s*(?:do\s*)?fornecedor`, "cnpj"],
    ["cnpj", String.raw`cnpj(?:\s*[/]\s*cpf)?(?:\s+do\s+emitente)?`, "cnpj"],
    ["cpf", "cpf", "cpf"],
    [
      "cidade",
      String.raw`(?:cidade|municipio)(?:\s+(?:do|de)\s+(?:emitente|emissao))?`,
      "text",
    ],
    ["estado", "estado|uf", "state"],
    [
      "descricao",
      String.raw`descricao(?:\s+(?:do|de)\s+(?:documento|servico|produto))?`,
      "text",
    ],
    [
      "codigo",
      String.raw`codigo\s+(?:interno|do\s+documento)|referencia\s+interna`,
      "text",
    ],
    ["chave", String.raw`chave\s*(?:de\s*)?acesso`, "key"],
  ].map(([key, pattern, kind]) => ({
    key,
    kind,
    re: new RegExp("(^|[\\s|;])(" + pattern + ")(?=\\s|[:#=-]|$)", "gi"),
  }));
  function safeName(value) {
    let name = String(value ?? "")
      .replace(/[\x00-\x1f\x7f\\/:*?"<>|]/g, " ")
      .replace(/\s+/g, " ")
      .replace(/^[.\s]+|[.\s]+$/g, "")
      .slice(0, 180)
      .replace(/[.\s]+$/g, "");
    if (/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(name))
      name = "_" + name;
    return name;
  }
  function fieldKey(k) {
    return (
      typeof k === "string" &&
      (Object.hasOwn(FIELD_NAMES, k) || /^extra_[a-z0-9_]{1,60}$/.test(k))
    );
  }
  function validModel(x) {
    if (!x || typeof x !== "object") return false;
    if (Array.isArray(x.tokens))
      return (
        x.tokens.length > 0 &&
        x.tokens.length <= 24 &&
        x.tokens.every(
          (t) =>
            t &&
            ((t.type === "field" && fieldKey(t.key)) ||
              (t.type === "text" &&
                typeof t.value === "string" &&
                t.value.length <= 80)),
        ) &&
        x.tokens.some((t) => t.type === "field")
      );
    return (
      Array.isArray(x.parts) &&
      x.parts.length === 3 &&
      x.parts.every(
        (p) =>
          typeof p === "string" && (p === "" || Object.hasOwn(FIELD_NAMES, p)),
      ) &&
      [" - ", "_", " "].includes(x.separator) &&
      typeof x.prefix === "string" &&
      x.prefix.length <= 80
    );
  }
  function tokensOf(model) {
    if (Array.isArray(model?.tokens)) return model.tokens;
    const tokens = [],
      parts = (model?.parts || []).filter(Boolean);
    if (model?.prefix?.trim())
      tokens.push({ type: "text", value: model.prefix.trim() + " " });
    parts.forEach((key, i) => {
      if (i) tokens.push({ type: "text", value: model.separator ?? " - " });
      tokens.push({ type: "field", key });
    });
    return tokens;
  }
  function modelFor(keys) {
    return {
      version: 3,
      tokens: keys.flatMap((key, i) =>
        i
          ? [
              { type: "text", value: " - " },
              { type: "field", key },
            ]
          : [{ type: "field", key }],
      ),
    };
  }
  function partsUsed(model) {
    return [
      ...new Set(
        tokensOf(model)
          .filter((t) => t.type === "field")
          .map((t) => t.key),
      ),
    ];
  }
  function compose(values, model, useAvailable = false) {
    const tokens = tokensOf(model),
      fields = partsUsed(model);
    if (
      !fields.length ||
      (!useAvailable && fields.some((k) => !String(values[k] ?? "").trim()))
    )
      return "";
    if (useAvailable) {
      const present = tokens
        .map((t, i) =>
          t.type === "field" && String(values[t.key] ?? "").trim() ? i : -1,
        )
        .filter((i) => i >= 0);
      if (!present.length) return "";
      let s =
        tokens
          .slice(0, present[0])
          .filter((t) => t.type === "text" && /[\p{L}\p{N}]/u.test(t.value))
          .map((t) => t.value)
          .join("") + values[tokens[present[0]].key];
      for (let n = 1; n < present.length; n++) {
        const texts = tokens
          .slice(present[n - 1] + 1, present[n])
          .filter((t) => t.type === "text");
        s +=
          (texts.find((t) => !/[\p{L}\p{N}]/u.test(t.value))?.value ?? " - ") +
          texts
            .filter((t) => /[\p{L}\p{N}]/u.test(t.value))
            .map((t) => t.value)
            .join("") +
          values[tokens[present[n]].key];
      }
      s += tokens
        .slice(present.at(-1) + 1)
        .filter((t) => t.type === "text" && /[\p{L}\p{N}]/u.test(t.value))
        .map((t) => t.value)
        .join("");
      return safeName(s);
    }
    return safeName(
      tokens
        .map((t) => (t.type === "field" ? values[t.key] : t.value))
        .join(""),
    );
  }
  function dateValue(s) {
    let m = s.match(/^\s*(\d{2})[/.\-](\d{2})[/.\-](\d{4})\b/),
      y,
      mo,
      d;
    if (m) {
      d = +m[1];
      mo = +m[2];
      y = +m[3];
    } else {
      m = s.match(/^\s*(\d{4})-(\d{2})-(\d{2})\b/);
      if (!m) return "";
      y = +m[1];
      mo = +m[2];
      d = +m[3];
    }
    const dt = new Date(Date.UTC(y, mo - 1, d));
    return y >= 1900 &&
      y <= 2199 &&
      dt.getUTCFullYear() === y &&
      dt.getUTCMonth() === mo - 1 &&
      dt.getUTCDate() === d
      ? `${String(d).padStart(2, "0")}-${String(mo).padStart(2, "0")}-${y}`
      : "";
  }
  function parseAccessKey(raw) {
    const s = String(raw).replace(/\D/g, "");
    if (s.length !== 44) return null;
    let sum = 0,
      weight = 2;
    for (let i = 42; i >= 0; i--) {
      sum += Number(s[i]) * weight;
      weight = weight === 9 ? 2 : weight + 1;
    }
    const rest = sum % 11,
      dv = rest === 0 || rest === 1 ? 0 : 11 - rest;
    if (
      dv !== +s[43] ||
      ![
        "11",
        "12",
        "13",
        "14",
        "15",
        "16",
        "17",
        "21",
        "22",
        "23",
        "24",
        "25",
        "26",
        "27",
        "28",
        "29",
        "31",
        "32",
        "33",
        "35",
        "41",
        "42",
        "43",
        "50",
        "51",
        "52",
        "53",
      ].includes(s.slice(0, 2)) ||
      +s.slice(4, 6) < 1 ||
      +s.slice(4, 6) > 12 ||
      !["55", "57", "65", "67"].includes(s.slice(20, 22))
    )
      return null;
    return {
      key: s,
      cnpj: s.slice(6, 20),
      model: s.slice(20, 22),
      number: s.slice(25, 34).replace(/^0+(?=\d)/, ""),
    };
  }
  function clean(kind, raw) {
    const s = String(raw || "")
      .replace(/^[\s:#=]+/, "")
      .trim();
    if (kind === "number") return number(s.replace(/^[-]\s*/, ""));
    if (kind === "date") return dateValue(s);
    if (kind === "cnpj" || kind === "cpf") {
      const n = s.match(/^[\d.\-/\s]+/)?.[0]?.replace(/\D/g, "") || "";
      return n.length === (kind === "cnpj" ? 14 : 11) ? n : "";
    }
    if (kind === "key") return parseAccessKey(s)?.key || "";
    if (kind === "money")
      return (
        s.match(
          /^(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2}|\d+\.\d{2})(?!\d)/,
        )?.[1] || ""
      );
    if (kind === "state") return s.match(/^([A-Z]{2})\b/)?.[1] || "";
    if (kind === "company") {
      const v = s
        .replace(/\s+(?:CNPJ|CPF|Endere[cç]o|Inscri[cç][aã]o|DATA)\b.*$/i, "")
        .trim();
      if (
        v.length < 3 ||
        v.length > 160 ||
        !/[\p{L}]/u.test(v) ||
        /^(?:emitente|destinat[aá]rio|remetente|tomador|cliente|fornecedor|identifica[cç][aã]o|nome\s*[/]?\s*raz[aã]o\s+social)$/i.test(
          v,
        )
      )
        return "";
      return v;
    }
    return s.length > 0 && s.length <= 180 ? s : "";
  }
  function labels(line, segments) {
    const text = fold(line),
      found = [];
    if (segments)
      for (const cell of segments)
        for (const hit of labels(cell.text))
          found.push({
            ...hit,
            start: hit.start + cell.start,
            end: hit.end + cell.start,
          });
    for (const def of DEFINITIONS) {
      def.re.lastIndex = 0;
      for (const m of text.matchAll(def.re))
        found.push({
          def,
          start: m.index + m[1].length,
          end: m.index + m[0].length,
        });
    }
    found.sort(
      (a, b) => a.start - b.start || b.end - b.start - (a.end - a.start),
    );
    return found.filter(
      (a, i) =>
        !found.slice(0, i).some((b) => b.start <= a.start && b.end >= a.end),
    );
  }
  function roleHeading(text) {
    const s = fold(text)
      .replace(/[^a-z\s]/g, " ")
      .trim()
      .replace(/\s+/g, " ");
    if (/^(?:identificacao (?:do )?)?emitente$/.test(s)) return "emitente";
    if (/^(?:destinatario(?: remetente)?|cliente|dados do cliente)$/.test(s))
      return "cliente";
    if (s === "remetente") return "remetente";
    if (/^(?:tomador(?: do servico)?|dados do tomador)$/.test(s))
      return "tomador";
    if (s === "fornecedor") return "fornecedor";
    return "";
  }
  function inferType(text, values) {
    const s = fold(text),
      types = [
        ["CTe", /\bdacte\b|conhecimento\s+de\s+transporte/],
        ["NF", /\bdanfe\b|nota\s+fiscal\s+eletronica/],
        ["Fatura", /^\s*fatura\b/m],
        ["Pedido", /^\s*pedido\s+(?:de\s+compra|comercial)\b/m],
      ];
    const titles = types
      .map(([type, re]) => ({ type, index: s.search(re) }))
      .filter((t) => t.index >= 0)
      .sort((a, b) => a.index - b.index);
    if (titles.length) return titles[0].type;
    const labelsByType = [
      ["CTe", /\b(?:numero\s*(?:do\s*)?)?ct-?e(?:-?os)?\b/],
      ["NF", /\b(?:numero\s*(?:da\s*)?)?(?:nf-?e?|nota\s+fiscal)\b/],
      ["Fatura", /\bfatura\b/],
      ["Pedido", /\bpedido\b/],
      ["CE", /\bnumero\s*(?:(?:do|da)\s*)?ce\b/],
    ];
    return (
      labelsByType
        .map(([type, re]) => ({ type, index: s.search(re) }))
        .filter((t) => t.index >= 0)
        .sort((a, b) => a.index - b.index)[0]?.type ||
      (values.numero_ce ? "CE" : "Documento")
    );
  }
  function detect(input, filename = "documento.pdf") {
    const text = typeof input === "string" ? input : input?.text || "",
      pages =
        typeof input === "object" && input?.pages?.length
          ? input.pages
          : [{ lines: text.split(/\r?\n/).map((text) => ({ text })) }];
    const out = {
      values: {
        arquivo_original: filename.replace(/\.pdf$/i, ""),
        numero: "",
        empresa: "",
        data: "",
        cnpj: "",
      },
      ambiguous: {},
      labels: { ...FIELD_NAMES },
      candidates: {},
      sources: {},
      type: "Documento",
    };
    function add(key, value, source, score = 2, label) {
      if (!value) return;
      (out.candidates[key] ??= []).push({ value, source, score });
      if (label) out.labels[key] = label;
    }
    for (let pi = 0; pi < pages.length; pi++) {
      const lines = pages[pi].lines || [];
      let role = "";
      for (let li = 0; li < lines.length; li++) {
        const line = lines[li],
          s = line.text || "",
          heading = roleHeading(s);
        if (heading) role = heading;
        if (
          /^(?:dados (?:dos produtos|adicionais)|itens|observacoes|notas fiscais transportadas|documentos originarios)\b/.test(
            fold(s),
          )
        )
          role = "";
        const hits = labels(s, line.segments);
        hits.forEach((hit, hi) => {
          let raw = s.slice(hit.end, hits[hi + 1]?.start ?? s.length),
            source = `Página ${pi + 1}: ${s.slice(0, 200)}`,
            value = clean(hit.def.kind, raw);
          if (!value && /^[\s:#=-]*$/.test(raw) && !heading) {
            const next = lines[li + 1];
            if (next) {
              if (line.segments?.length && next.segments?.length) {
                const cell =
                    line.segments.find(
                      (c) => hit.start >= c.start && hit.start < c.end,
                    ) || line.segments[0],
                  following = hits[hi + 1]
                    ? line.segments.find(
                        (c) =>
                          hits[hi + 1].start >= c.start &&
                          hits[hi + 1].start < c.end,
                      )
                    : null,
                  gap = Math.abs(next.y - line.y),
                  height = line.height || 12;
                raw =
                  gap <= height * 3.2
                    ? next.segments
                        .filter(
                          (c) =>
                            c.x >= cell.x - height &&
                            (!following || c.x < following.x - height),
                        )
                        .map((c) => c.text)
                        .join(" ")
                    : "";
              } else raw = next.text || "";
              if (!labels(raw).length) {
                value = clean(hit.def.kind, raw);
                source += ` → ${raw.slice(0, 180)}`;
              }
            }
          }
          let key = hit.def.key,
            score = 2;
          if (key === "empresa" && role) {
            key = role;
            score = 4;
          }
          if (key === "cnpj" && ["cliente", "fornecedor"].includes(role))
            key = "cnpj_" + role;
          if (
            [
              "emitente",
              "cliente",
              "fornecedor",
              "remetente",
              "tomador",
            ].includes(key)
          )
            score = 4;
          add(key, value, source, score);
        });
        const extra = s.match(
          /^\s*([\p{L}][\p{L}\p{N} _/().-]{1,43}):\s*(.{1,160})\s*$/u,
        );
        if (
          extra &&
          !hits.length &&
          !/^(?:pagina|exemplo|observacao|aviso)$/i.test(fold(extra[1]))
        ) {
          const slug = fold(extra[1])
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_|_$/g, "")
            .slice(0, 60);
          if (slug)
            add(
              "extra_" + slug,
              extra[2].trim(),
              `Página ${pi + 1}: ${s}`,
              2,
              extra[1].trim(),
            );
        }
      }
    }
    function settle(key) {
      const list = out.candidates[key] || [];
      if (!list.length) return;
      const max = Math.max(...list.map((v) => v.score)),
        best = list.filter((v) => v.score === max),
        distinct = [
          ...new Map(best.map((v) => [fold(v.value).trim(), v])).values(),
        ];
      out.values[key] = distinct.length === 1 ? distinct[0].value : "";
      out.ambiguous[key] = distinct.length > 1;
      out.sources[key] = distinct.map((v) => v.source);
    }
    Object.keys(out.candidates).forEach(settle);
    out.type = inferType(text, out.values);
    let primary = {
      NF: "numero_nf",
      CTe: "numero_cte",
      Fatura: "numero_fatura",
      Pedido: "numero_pedido",
      CE: "numero_ce",
    }[out.type];
    for (const c of out.candidates.chave || []) {
      const key = parseAccessKey(c.value),
        type = ["57", "67"].includes(key.model) ? "CTe" : "NF";
      if (out.type === "Documento") out.type = type;
      if (out.type !== type) continue;
      const k = type === "CTe" ? "numero_cte" : "numero_nf";
      add(k, key.number, c.source, 2);
      add("cnpj", key.cnpj, c.source, 1);
      settle(k);
      settle("cnpj");
    }
    primary ||= { CTe: "numero_cte", NF: "numero_nf" }[out.type];
    if (primary && out.candidates[primary]?.length) {
      out.values.numero = out.values[primary] || "";
      out.ambiguous.numero = !!out.ambiguous[primary];
      out.candidates.numero = out.candidates[primary];
      out.sources.numero = out.sources[primary];
    } else if (!primary && !out.candidates.numero?.length) {
      const known = [
        "numero_nf",
        "numero_cte",
        "numero_ce",
        "numero_fatura",
        "numero_pedido",
      ].filter((k) => out.candidates[k]?.length);
      if (known.length === 1) {
        const k = known[0];
        out.values.numero = out.values[k] || "";
        out.ambiguous.numero = !!out.ambiguous[k];
        out.candidates.numero = out.candidates[k];
        out.sources.numero = out.sources[k];
      }
    }
    const enterprise = ["emitente", "fornecedor", "empresa"].find(
      (k) => out.candidates[k]?.length,
    );
    if (enterprise) {
      out.values.empresa = out.values[enterprise] || "";
      out.ambiguous.empresa = !!out.ambiguous[enterprise];
      out.sources.empresa = out.sources[enterprise];
    }
    if (!out.values.numero && !out.ambiguous.numero) {
      const base = out.values.arquivo_original,
        key = parseAccessKey(base),
        m = base.match(/(?:^|\b)(?:NF|NFE|NOTA)[\s_.-]*(\d{3,12})(?:\b|$)/i);
      if (key) {
        out.values.numero = key.number;
        out.values.chave = key.key;
        out.values.cnpj ||= key.cnpj;
        out.type = ["57", "67"].includes(key.model) ? "CTe" : "NF";
        out.values[out.type === "CTe" ? "numero_cte" : "numero_nf"] =
          key.number;
        out.sources.numero = ["Chave de acesso validada no nome original"];
      } else if (m) {
        out.values.numero = number(m[1]);
        out.sources.numero = ["Número explícito no nome original"];
      }
    }
    return out;
  }
  function evaluateEntry(e, model) {
    if (e.ignored)
      return {
        status: "ignored",
        name: "",
        reason: "Arquivo ignorado; não será exportado",
      };
    if (!e.loaded)
      return { status: "loading", name: "", reason: "Analisando documento…" };
    if (e.invalid)
      return {
        status: "pending",
        name: "",
        reason: "PDF inválido ou incompatível",
      };
    if ((e.manualName || "").trim()) {
      const name = safeName(e.manualName.replace(/\.pdf$/i, ""));
      return name
        ? {
            status: "ready",
            name: name + ".pdf",
            reason: "Nome corrigido manualmente",
          }
        : { status: "pending", name: "", reason: "Nome vazio" };
    }
    if (e.error) return { status: "pending", name: "", reason: e.error };
    const fields = partsUsed(model),
      values = { ...e.detected.values, ...e.overrides };
    if (!fields.length)
      return {
        status: "pending",
        name: "",
        reason: "Escolha pelo menos um campo para o nome",
      };
    const missing = fields.filter((k) => !String(values[k] ?? "").trim());
    if (missing.length && !e.useAvailable) {
      const k = missing[0],
        label = e.detected.labels?.[k] || FIELD_NAMES[k] || k;
      return {
        status: "pending",
        name: "",
        missing,
        reason: e.detected.ambiguous[k]
          ? `Mais de um valor para ${label}. Revise este documento.`
          : `${label}: informação não identificada neste documento.`,
      };
    }
    const name = compose(values, model, !!e.useAvailable);
    return name
      ? {
          status: "ready",
          name: name + ".pdf",
          missing,
          reason: missing.length
            ? "Usando somente os campos encontrados"
            : e.reading?.method === "ocr"
              ? "Identificado por OCR; revisão opcional"
              : "",
        }
      : {
          status: "pending",
          name: "",
          missing,
          reason: "Nenhum campo do modelo foi encontrado",
        };
  }
  function uniqueResults(results) {
    const used = new Set();
    return results.map((result) => {
      const next = { ...result };
      if (next.status !== "ready") return next;
      const base = next.name;
      let proposed = base,
        n = 2;
      while (used.has(proposed.toLocaleLowerCase("pt-BR")))
        proposed = base.replace(/\.pdf$/i, ` (${n++}).pdf`);
      if (proposed !== base) {
        next.reason = "Nome repetido; número adicionado";
        next.duplicate = true;
      }
      next.name = proposed;
      used.add(proposed.toLocaleLowerCase("pt-BR"));
      return next;
    });
  }
  function csvCell(value) {
    let s = String(value ?? "");
    if (/^\s*[=+\-@]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return {
    FIELD_NAMES,
    validModel,
    safeName,
    tokensOf,
    modelFor,
    partsUsed,
    compose,
    detect,
    evaluateEntry,
    uniqueResults,
    csvCell,
    parseAccessKey,
  };
});
