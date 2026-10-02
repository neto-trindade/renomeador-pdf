/* Naming rules shared by the browser interface and automated tests. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.RenomeadorCore = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
"use strict";
const FIELD_NAMES = {numero:"Número",empresa:"Empresa",data:"Data",cnpj:"CNPJ",arquivo_original:"Nome atual"};
function validModel(x) { return x&&Array.isArray(x.parts)&&x.parts.length===3&&x.parts.every(p=>typeof p==="string"&&(p===""||Object.hasOwn(FIELD_NAMES,p)))&&[" - ","_"," "].includes(x.separator)&&typeof x.prefix==="string"; }
function safeName(value) {
  let name=String(value??"").replace(/[\x00-\x1f\x7f\\/:*?"<>|]/g," ").replace(/\s+/g," ").replace(/^[.\s]+|[.\s]+$/g,"").slice(0,180).replace(/[.\s]+$/g,"");
  if(/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(name))name="_"+name;
  return name;
}
function partsUsed(model) { return [...new Set(model.parts.filter(Boolean))]; }
function compose(values, model) {
  const used=model.parts.filter(Boolean);
  if(!used.length)return "";
  if(used.some(k=>!values[k]))return "";
  return safeName((model.prefix.trim()?model.prefix.trim()+" ":"")+used.map(k=>values[k]).join(model.separator));
}
function oneMatch(text,regex,clean=x=>x) {
  const values=[...text.matchAll(regex)].map(m=>clean(m[1]||"")).filter(Boolean);
  const distinct=[...new Set(values.map(v=>v.trim()))];
  return {value:distinct.length===1?distinct[0]:"",ambiguous:distinct.length>1};
}
function detect(text,filename) {
  const out={values:{},ambiguous:{}};
  const base=filename.replace(/\.pdf$/i,"");
  out.values.arquivo_original=base;
  const number=oneMatch(text,/(?:\bNF(?:-?e)?\s*(?:n[º°o.]?\s*)?|\bN[uú]mero\s+(?:da\s+)?(?:NF(?:-?e)?|Nota\s+Fiscal)\s*[:#-]?\s*|\bNota\s+Fiscal\s+(?:Eletr[oô]nica\s+)?n[º°o.]?\s*[:#-]?\s*)(\d{3,12})\b/gi,x=>x.replace(/^0+(?=\d)/,""));
  if(!number.value&&!number.ambiguous) { const name=base.match(/(?:^|\b)(?:NF|NFE|NOTA)[\s_.-]*(\d{3,12})(?:\b|$)/i);if(name)number.value=name[1].replace(/^0+(?=\d)/, ""); }
  out.values.numero=number.value;out.ambiguous.numero=number.ambiguous;
  const company=oneMatch(text,/(?:Nome\s*\/\s*)?Raz[aã]o\s+Social\s*[:#-]?\s*([^\r\n]{3,100})/gi,x=>x.replace(/\s+(?:CNPJ|CPF|Endere[cç]o|Inscri[cç][aã]o)\b.*$/i,"").trim());
  out.values.empresa=company.value;out.ambiguous.empresa=company.ambiguous;
  const date=oneMatch(text,/(?:Data\s+(?:de\s+)?Emiss[aã]o|Emiss[aã]o|Data\s+do\s+Documento)\s*[:#-]?\s*(\d{2}[\/.\-]\d{2}[\/.\-]\d{4})/gi,x=>x.replace(/[\/.]/g,"-"));
  out.values.data=date.value;out.ambiguous.data=date.ambiguous;
  const cnpj=oneMatch(text,/\bCNPJ\s*[:#-]?\s*(\d{2}\.\d{3}\.\d{3}[\/\-]?\d{4}-?\d{2}|\d{14})\b/gi,x=>x.replace(/\D/g,""));
  out.values.cnpj=cnpj.value;out.ambiguous.cnpj=cnpj.ambiguous;
  return out;
}
function evaluateEntry(e, model) {
  if(!e.loaded)return {status:"loading",name:"",reason:"Lendo PDF"};
  if(e.invalid)return {status:"pending",name:"",reason:"PDF inválido ou incompatível"};
  if(e.manualName.trim()) {
    const name=safeName(e.manualName.replace(/\.pdf$/i,""));
    return name?{status:"ready",name:name+".pdf",reason:"Nome ajustado manualmente"}:{status:"pending",name:"",reason:"Nome vazio"};
  }
  if(e.error)return {status:"pending",name:"",reason:e.error};
  const fields=partsUsed(model);
  if(!fields.length)return {status:"pending",name:"",reason:"Escolha pelo menos uma parte do nome"};
  const values={...e.detected.values,...e.overrides};
  const missing=fields.find(k=>!String(values[k]||"").trim());
  if(missing)return {status:"pending",name:"",reason:e.detected.ambiguous[missing]?`Mais de um valor para ${FIELD_NAMES[missing]}. Clique em Corrigir.`:`Falta ${FIELD_NAMES[missing]}. Clique em Corrigir.`};
  const name=compose(values, model);
  return name?{status:"ready",name:name+".pdf",reason:""}:{status:"pending",name:"",reason:"Não foi possível montar o nome"};
}
function uniqueResults(results) {
  const used = new Set();
  return results.map(result => {
    const next = {...result};
    if (next.status !== "ready") return next;
    const base = next.name;
    let proposed = base, n = 2;
    while (used.has(proposed.toLocaleLowerCase("pt-BR"))) {
      proposed = base.replace(/\.pdf$/i, ` (${n++}).pdf`);
    }
    if (proposed !== base) next.reason = "Nome repetido; número adicionado";
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
return {FIELD_NAMES, validModel, safeName, partsUsed, compose, detect, evaluateEntry, uniqueResults, csvCell};
});
