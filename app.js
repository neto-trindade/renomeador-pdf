"use strict";

// PDFs are processed locally. Only naming preferences are saved in localStorage.
const $ = id => document.getElementById(id);
const {FIELD_NAMES, validModel, safeName, detect, evaluateEntry, uniqueResults, csvCell} = RenomeadorCore;
const EXAMPLES = {numero:"59349",empresa:"EMPRESA XYZ",data:"25-09-2026",cnpj:"12345678000190",arquivo_original:"arquivo_recebido"};
const PRESETS = {
  "num-company":["numero","empresa"],"company-num":["empresa","numero"],
  number:["numero"],original:["arquivo_original"]
};
let model = {parts:["numero","empresa",""],separator:" - ",prefix:""};
let entries = [];
let saved = loadSaved();
let reading = false, downloading = false, editing = -1;
pdfjsLib.GlobalWorkerOptions.workerSrc = "vendor/pdf.worker.min.js";

function loadSaved() {
  try { const list=JSON.parse(localStorage.getItem("renomeador_modelos_v2")||"[]");return Array.isArray(list)?list.filter(x=>validModel(x.model)&&typeof x.name==="string").slice(0,30):[]; }
  catch { return []; }
}
function savePreferences() { try {localStorage.setItem("renomeador_ultimo_modelo_v2",JSON.stringify(model));}catch{} }
function partsUsed() {return [...new Set(model.parts.filter(Boolean))];}
function compose(values) { return RenomeadorCore.compose(values, model); }
function refreshExample() {
  const name=compose(EXAMPLES);$("exampleName").textContent=(name||"Escolha pelo menos uma parte")+(name?".pdf":"");
  const preset=Object.entries(PRESETS).find(([,parts])=>!model.prefix&&model.separator===" - "&&model.parts.filter(Boolean).join("|")===parts.join("|"))?.[0];
  document.querySelectorAll("[data-preset]").forEach(b=>{b.classList.toggle("active",b.dataset.preset===preset);b.setAttribute("aria-pressed",String(b.dataset.preset===preset));});
}
function showModel() {
  model.parts.forEach((p,i)=>$("part"+i).value=p);$("separator").value=model.separator;$("prefix").value=model.prefix;
  refreshExample();savePreferences();recalculate();
}
function readControls() {model={parts:[0,1,2].map(i=>$("part"+i).value),separator:$("separator").value,prefix:$("prefix").value};refreshExample();savePreferences();recalculate();}
function fillSavedOptions() { const s=$("savedModels");s.replaceChildren(new Option("Meus modelos salvos",""));saved.forEach((x,i)=>s.add(new Option(x.name,String(i)))); }
function recalculate() {
  const results = uniqueResults(entries.map(e => evaluateEntry(e, model)));
  entries.forEach((entry, i) => { entry.result = results[i]; });
  renderRows();
}
function renderRows() {
  const root=$("rows");root.replaceChildren();
  if(!entries.length){const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=4;td.className="empty";td.textContent="Os nomes aparecerão aqui após adicionar PDFs.";tr.append(td);root.append(tr);}
  entries.forEach((e,i)=>{
    const r=e.result,tr=document.createElement("tr"),a=document.createElement("td"),b=document.createElement("td"),c=document.createElement("td"),d=document.createElement("td");
    a.className="source";a.textContent=e.file.name;b.className="target";b.textContent=r.name||"—";
    const pill=document.createElement("span");pill.className="pill "+(r.status==="ready"?"":r.status);pill.textContent={ready:"Pronto",pending:"Precisa corrigir",loading:"Lendo"}[r.status];c.append(pill);
    if(r.reason){const note=document.createElement("span");note.className="reason";note.textContent=r.reason;c.append(note);}
    const edit=document.createElement("button");edit.className="row-button";edit.type="button";edit.textContent="Corrigir";edit.disabled=reading||downloading||!e.loaded||e.invalid;edit.onclick=()=>openEditor(i);
    const remove=document.createElement("button");remove.className="remove";remove.type="button";remove.textContent="×";remove.title="Remover";remove.setAttribute("aria-label","Remover "+e.file.name);remove.disabled=reading||downloading;remove.onclick=()=>{entries.splice(i,1);recalculate();};
    d.append(edit,remove);tr.append(a,b,c,d);root.append(tr);
  });
  const ready=entries.filter(e=>e.result.status==="ready").length,pending=entries.filter(e=>e.result.status==="pending").length;
  $("summary").textContent=entries.length?`${entries.length} arquivo(s) · ${ready} pronto(s) · ${pending} para corrigir`:"Nenhum PDF adicionado ainda.";
  $("clear").disabled=reading||downloading||!entries.length;
  $("demo").disabled=reading||downloading;
  $("choose").disabled=reading||downloading;
  $("download").disabled=reading||downloading||!ready;
  $("download").textContent=ready?`Baixar ${ready} PDF(s) pronto(s)`:"Baixar PDFs prontos";
}
async function addFiles(fileList) {
  if(reading||downloading)return;
  const incoming=Array.from(fileList),files=incoming.filter(f=>/\.pdf$/i.test(f.name));
  if(incoming.length&&!files.length){alert("Selecione arquivos PDF.");return;}
  if(!files.length)return;
  reading=true;
  const added=files.map(file=>({file,loaded:false,invalid:false,error:"",text:"",detected:{values:{},ambiguous:{}},overrides:{},manualName:"",result:null}));
  entries.push(...added);recalculate();$("progress").hidden=false;
  for(let i=0;i<added.length;i++) {
    const e=added[i];$("progressText").textContent=`Lendo ${i+1} de ${added.length}: ${e.file.name}`;$("progressBar").style.width=(i/added.length*100)+"%";
    try {
      e.text=await RenomeadorPdf.readPdfText(await e.file.arrayBuffer(),pdfjsLib);
      e.detected=detect(e.text,e.file.name);
    }catch(err){
      const protectedFile=/PasswordException|password/i.test(String(err?.name)+String(err?.message));
      e.error=protectedFile?"PDF protegido por senha. Digite o nome manualmente.":"PDF inválido ou incompatível";
      e.invalid=!protectedFile;
    }
    e.loaded=true;recalculate();
  }
  reading=false;recalculate();$("progressBar").style.width="100%";$("progressText").textContent="Leitura concluída.";
  setTimeout(()=>{$("progress").hidden=true;},1300);
}
function openEditor(i) {
  editing=i;const e=entries[i];$("editTitle").textContent=e.file.name;
  $("editHelp").textContent=e.error||"Confira os dados abaixo. Corrija somente o que estiver faltando ou errado.";
  const root=$("editFields");root.replaceChildren();
  for(const key of partsUsed().filter(k=>k!=="arquivo_original")){
    const label=document.createElement("label");label.textContent=FIELD_NAMES[key];
    const input=document.createElement("input");input.type="text";input.dataset.field=key;input.value=e.overrides[key]??e.detected.values[key]??"";input.placeholder="Digite "+FIELD_NAMES[key].toLowerCase();
    label.append(input);root.append(label);
  }
  $("manualName").value=e.manualName;$("editor").showModal();
}
async function download() {
  if(reading||downloading)return;recalculate();
  const ready=entries.filter(e=>e.result.status==="ready");if(!ready.length)return;
  const batch=entries.map(e=>({...e,result:{...e.result}}));
  downloading=true;renderRows();$("progress").hidden=false;$("progressText").textContent="Preparando o ZIP...";
  try{
    const bytes=await RenomeadorArchive.createArchive(batch,JSZip,p=>{$("progressBar").style.width=p.percent.toFixed(0)+"%";});
    const url=URL.createObjectURL(new Blob([bytes],{type:"application/zip"})),a=document.createElement("a");
    a.href=url;a.download="PDFs_renomeados_"+new Date().toISOString().slice(0,10)+".zip";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
    $("progressText").textContent="ZIP pronto. Confira os downloads do navegador.";
  }catch(err){alert("Não foi possível criar o ZIP: "+(err?.message||err));$("progressText").textContent="Falha ao criar o ZIP.";}
  finally{downloading=false;renderRows();setTimeout(()=>{$("progress").hidden=true;},2400);}
}
for(let i=0;i<3;i++){
  const select=$("part"+i);
  for(const [value,label] of Object.entries({"":"Nenhuma parte",...FIELD_NAMES}))select.add(new Option(label,value));
  select.addEventListener("change",readControls);
}
$("separator").addEventListener("change",readControls);$("prefix").addEventListener("input",readControls);
document.querySelectorAll("[data-preset]").forEach(button=>button.onclick=()=>{model={parts:[...PRESETS[button.dataset.preset],"",""].slice(0,3),separator:" - ",prefix:""};showModel();});
$("toggleCustom").onclick=()=>{const open=$("custom").hidden;$("custom").hidden=!open;$("toggleCustom").textContent=open?"Fechar personalização ↑":"Personalizar formato ↓";$("toggleCustom").setAttribute("aria-expanded",String(open));};
$("saveModel").onclick=()=>{const name=$("modelName").value.trim();if(!name){alert("Digite um nome para guardar este modelo.");$("modelName").focus();return;}if(!partsUsed().length){alert("Escolha pelo menos uma parte.");return;}saved.push({name,model:JSON.parse(JSON.stringify(model))});saved=saved.slice(-30);try{localStorage.setItem("renomeador_modelos_v2",JSON.stringify(saved));}catch{alert("Não foi possível salvar no navegador.");}fillSavedOptions();$("modelName").value="";$("savedModels").value=String(saved.length-1);};
$("savedModels").onchange=e=>{if(e.target.value==="")return;const savedModel=saved[Number(e.target.value)];if(savedModel){model=JSON.parse(JSON.stringify(savedModel.model));showModel();}};
$("demo").onclick=()=>{
  if(reading||downloading)return;
  const files=RenomeadorSamples.map(sample=>{
    const bytes=Uint8Array.from(atob(sample.base64),c=>c.charCodeAt(0));
    return new File([bytes],sample.name,{type:"application/pdf"});
  });
  addFiles(files);
};
$("choose").onclick=e=>{e.stopPropagation();$("files").click();};
$("drop").onclick=e=>{if(e.target.id!=="choose")$("files").click();};
$("drop").onkeydown=e=>{if(e.target!==$("drop"))return;if(e.key==="Enter"||e.key===" "){e.preventDefault();$("files").click();}};
$("files").onchange=e=>{addFiles(e.target.files);e.target.value="";};
for(const type of ["dragenter","dragover"])$("drop").addEventListener(type,e=>{e.preventDefault();$("drop").classList.add("drag");});
for(const type of ["dragleave","drop"])$("drop").addEventListener(type,e=>{e.preventDefault();$("drop").classList.remove("drag");});
$("drop").addEventListener("drop",e=>addFiles(e.dataTransfer.files));
$("clear").onclick=()=>{entries=[];recalculate();$("progressText").textContent="";};
$("download").onclick=download;
$("editor").addEventListener("close",()=>{
  if($("editor").returnValue!=="apply"||editing<0||!entries[editing])return;
  const e=entries[editing];for(const input of $("editFields").querySelectorAll("[data-field]"))e.overrides[input.dataset.field]=input.value.trim();
  e.manualName=$("manualName").value.trim();editing=-1;recalculate();
});
fillSavedOptions();
try{const previous=JSON.parse(localStorage.getItem("renomeador_ultimo_modelo_v2")||"null");if(validModel(previous))model=previous;}catch{}
showModel();
