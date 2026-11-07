import {compileWarScript} from './warscript.js';
import {runWarScriptPreview} from './warscript-preview.js';
import {ScriptDocument,MAX_SOURCE,newId,languageFor,templates,templateFor,readLinkedFile,saveLinkedFile} from './core.js';

const $=id=>document.getElementById(id),params=new URLSearchParams(location.search),embedded=params.get('embedded')==='1',session=params.get('session');
document.body.classList.toggle('is-embedded',embedded);
$('engineLink').hidden=!session;
const scope=params.get('project')||'standalone',storageKey='warlike.script-studio.v1.'+scope+':'+(params.get('mode')||'files');
const docs=new Map(),models=new Map(),viewStates=new Map(),origin=location.origin;
let activeId=null,editor=null,monaco=null,updating=false,connected=false,host=null,binding=null,polling=false,editorFont=13,checkingProblems=false;
const channel=session&&typeof BroadcastChannel!=='undefined'?new BroadcastChannel('warlike.script-studio.'+session):null;
const current=()=>docs.get(activeId),safePost=message=>{const data={...message,session};if(channel)channel.postMessage(data);if(embedded)parent.postMessage(data,origin)};
function status(message,error=false){$('status').textContent=message;document.querySelector('.statusbar').classList.toggle('error',error)}
function log(message){const row=document.createElement('div');row.textContent=new Date().toLocaleTimeString()+'  '+message;$('output').prepend(row);while($('output').children.length>60)$('output').lastChild.remove()}
function persist(){
 const records=[...docs.values()].map(d=>({...d.record(),text:d.text,baseText:d.baseText}));
 localStorage.setItem(storageKey,JSON.stringify({activeId,docs:records}));
}
function preserve(){try{persist()}catch{status('Brouillon en mémoire · stockage navigateur plein ou indisponible.',true)}}
function labelName(d){return (d.dirty?'● ':'')+d.name}
function tabs(){
 $('tabs').replaceChildren();$('fileList').replaceChildren();
 for(const d of docs.values()){
  const row=document.createElement('button');row.className='file-row'+(d.id===activeId?' active':'');row.title=d.name;row.onclick=()=>activate(d.id);
  const icon=document.createElement('span');icon.className='file-icon '+d.language;icon.textContent={javascript:'JS',typescript:'TS',csharp:'C#',warscript:'W#',python:'PY',cpp:'C++',json:'{}'}[d.language]||'▤';
  const name=document.createElement('span');name.className='file-name';name.textContent=d.name;row.append(icon,name);if(d.dirty){const dot=document.createElement('span');dot.className='dirty-dot';dot.textContent='●';row.append(dot)}$('fileList').append(row);
  const tab=document.createElement('button');tab.className='tab'+(d.id===activeId?' active':'');tab.title=d.name;tab.onclick=()=>activate(d.id);tab.append(icon.cloneNode(true),document.createTextNode(labelName(d)));
  const close=document.createElement('span');close.className='close-tab';close.textContent='×';close.setAttribute('role','button');close.tabIndex=0;close.setAttribute('aria-label','Fermer '+d.name);const action=e=>{e.stopPropagation();closeDocument(d)};close.onclick=action;close.onkeydown=e=>{if(e.key==='Enter')action(e)};tab.append(close);$('tabs').append(tab);
 }
 const d=current();$('saveFile').disabled=!d||d.saving;$('saveAs').disabled=!d;$('downloadFile').disabled=!d;$('refreshFile').disabled=!d?.handle;
 $('breadcrumb').textContent='Scripts  ›  '+(d?.name||'');$('language').value=d?.language||'plaintext';
 $('executionHint').textContent=d?.language==='warscript'?'WarScript · exécution dans Play et l’export Web':d?.language==='csharp'?'C# natif · compilation .NET locale':d?.language==='typescript'?'TypeScript → JavaScript · Play et export Web':d?.language==='javascript'?'JavaScript natif · Play et export Web':'Fichier source · exécution selon son runtime';
 $('conflict').hidden=d?.external===null||!d;
 $('fileLinkState').textContent=d?.handle?d.handle.name+' · suivi des sauvegardes externes actif':d?'Source conservée dans cet espace. « Enregistrer sous » permet de lier un fichier sur ton PC.':'Ouvre un fichier pour suivre ses sauvegardes externes.';
 document.title=(d?.dirty?'● ':'')+(d?.name||'Scripts')+' — WarLike Script Studio';
}
function fallbackUpdate(){if(editor)return;const d=current(),text=d?.text||'';$('lineNumbers').textContent=Array.from({length:text.split('\n').length},(_,i)=>i+1).join('\n');const pos=$('source').selectionStart,before=text.slice(0,pos),line=before.split('\n').length,col=pos-(before.lastIndexOf('\n')+1)+1;$('cursorPosition').textContent='Ln '+line+', Col '+col}
function changed(text){if(updating||!current())return;try{current().edit(text);delete current().nativeDiagnostics;tabs();fallbackUpdate();updateProblems();preserve()}catch(error){status(error.message,true)}}
function ensureModel(doc){
 if(!monaco)return null;
 const editorLanguage=doc.language==='warscript'?'csharp':doc.language;let model=models.get(doc.id);if(!model){model=monaco.editor.createModel(doc.text,editorLanguage,monaco.Uri.parse('file:///warlike/'+encodeURIComponent(doc.id)+'/'+encodeURIComponent(doc.name)));model.onDidChangeContent(()=>{if(current()?.id===doc.id)changed(model.getValue());else{doc.edit(model.getValue());preserve();tabs()}});models.set(doc.id,model)}
 if(model.getLanguageId()!==editorLanguage)monaco.editor.setModelLanguage(model,editorLanguage);
 return model;
}
function showText(){const d=current();updating=true;try{if(editor&&d){const model=ensureModel(d);if(model.getValue()!==d.text)model.setValue(d.text);editor.setModel(model);if(viewStates.has(d.id))editor.restoreViewState(viewStates.get(d.id))}else $('source').value=d?.text||''}finally{updating=false}tabs();fallbackUpdate();updateProblems()}
function activate(id){if(!docs.has(id))return;if(editor&&activeId)viewStates.set(activeId,editor.saveViewState());activeId=id;showText();preserve()}
function addRecord(record){const d=new ScriptDocument(record);docs.set(d.id,d);activate(d.id);return d}
function closeDocument(d){if(d.dirty){status('Sauvegarde '+d.name+' avant de fermer son onglet.',true);return}models.get(d.id)?.dispose();models.delete(d.id);docs.delete(d.id);if(d.id===activeId)activeId=docs.keys().next().value||null;if(!activeId)createDefault();else activate(activeId);tabs();preserve()}
function createDefault(){return addRecord({id:newId(),name:'Rotation.wls',source:templates.warscript,revision:0})}
function ready(){safePost({type:'ready'})}
function applyIncoming(script){
 let d=docs.get(script.id);if(!d){d=new ScriptDocument(script);docs.set(d.id,d)}
 else{if(script.revision<d.revision)return d;const result=d.externalSave(script.source);if(result!=='conflict'){d.compiledFrom=script.compiledFrom;d.compiledSource=script.compiledSource;}if(result==='conflict')d.pendingRevision=script.revision;else d.revision=script.revision;d.name=script.name;d.language=script.language||languageFor(script.name)}
 return d;
}
const pendingSaves=new Map();
function publishSave(d,text){
 if(!connected){if(!session)d.revision++;preserve();if(session)status('Source conservée localement : connexion au moteur non établie. Réenregistre après connexion.',true);return}
 const requestId=newId();pendingSaves.set(requestId,d.id);safePost({type:'save',requestId,binding,baseRevision:d.revision,script:{...d.record(),source:text}});setTimeout(()=>{if(pendingSaves.has(requestId)){pendingSaves.delete(requestId);status('Source sauvegardée · moteur sans réponse. Rouvre le script depuis le moteur pour reconnecter.',true)}},8000);status('Fichier sauvegardé · synchronisation avec le moteur…');
}
function receive(message){
 if(!message||message.session!==session)return;
 if(message.type==='init'){
  connected=true;host=message;binding=message.binding;$('connectionState').textContent='◉ Moteur connecté';$('workspaceName').textContent=message.title||'Projet WarLike';$('folderName').textContent=(message.title||'PROJET').toUpperCase();
  for(const r of message.scripts||[])try{applyIncoming(r)}catch(error){log(error.message)}
  if(message.activeScriptId&&docs.has(message.activeScriptId))activate(message.activeScriptId);else if(!activeId&&docs.size)activate(docs.keys().next().value);else showText();
  status('Sources du projet chargées.');return;
 }
 if(message.type==='ack'){
  const id=pendingSaves.get(message.requestId);pendingSaves.delete(message.requestId);const d=docs.get(id);if(!d)return;
  if(message.ok){d.revision=message.script.revision;status('✓ Enregistré et actualisé dans le moteur');log('Source synchronisée : '+d.name);preserve();tabs()}
  else if(message.script){d.external=message.script.source;d.pendingRevision=message.script.revision;tabs();status('Conflit avec la version du moteur : choisis quelle version conserver.',true)}
  else status(message.error||'Le moteur n’est plus sur ce projet. Rouvre le script depuis le moteur.',true);
 }
 if(message.type==='saved'&&message.script){const d=applyIncoming(message.script);if(d.id===activeId)showText();preserve();if(d.external!==null)status('Le script a aussi changé dans une autre fenêtre.',true)}
}
channel?.addEventListener('message',e=>receive(e.data));
window.addEventListener('message',e=>{if(e.origin!==origin||!embedded||e.source!==parent)return;receive(e.data)});
function restoreDrafts(){try{const data=JSON.parse(localStorage.getItem(storageKey)||'null');for(const r of data?.docs||[]){const d=new ScriptDocument(r);if(typeof r.baseText==='string')d.baseText=r.baseText;if(typeof r.text==='string')d.edit(r.text);docs.set(d.id,d)}activeId=docs.has(data?.activeId)?data.activeId:null}catch(error){log('Brouillon invalide ignoré : '+error.message)}}
restoreDrafts();if(!activeId&&docs.size)activeId=docs.keys().next().value;if(!activeId&&!session)createDefault();else showText();ready();

async function save(){
 const d=current();if(!d||d.saving)return;
 try{if(d.language==='typescript')await compileTypeScript(d);const oldBase=d.baseText,oldSource=d.source;const text=await saveLinkedFile(d);try{persist()}catch(error){d.baseText=oldBase;d.source=oldSource;throw Error('Le navigateur n’a pas pu conserver la source : '+error.message)}publishSave(d,text);log('Enregistré : '+d.name);if(!connected)status(d.handle?'✓ Fichier sauvegardé':'✓ Source enregistrée dans le navigateur');tabs();return true}
 catch(error){tabs();status(error.message,true);log(error.message);return false}
}
async function openFile(){
 try{
  if(typeof window.showOpenFilePicker!=='function'){ $('fileImport').click();return }
  const [handle]=await window.showOpenFilePicker({multiple:false,types:[{description:'Scripts et code source',accept:{'text/plain':['.cs','.js','.ts','.py','.cpp','.c','.h','.json','.html','.css','.md','.txt']}}]});
  for(const d of docs.values())if(d.handle&&await d.handle.isSameEntry(handle)){activate(d.id);await refresh(d);return}
  const file=await handle.getFile();if(file.size>MAX_SOURCE*4)throw Error('Fichier limité à 1 Mo de texte.');
  const d=addRecord({id:newId(),name:file.name,source:await file.text(),revision:0});d.handle=handle;tabs();publishSave(d,d.text);status('Fichier lié · les sauvegardes externes seront relues automatiquement.');
 }catch(error){if(error.name!=='AbortError')status(error.message,true)}
}
async function saveAs(){
 const d=current();if(!d)return;
 try{if(typeof window.showSaveFilePicker!=='function'){download();return}
  const handle=await window.showSaveFilePicker({suggestedName:d.name});
  const file=await handle.getFile(),existing=await file.text();
  // Selection in Save As explicitly authorizes replacing that chosen file.
  const before={handle:d.handle,base:d.baseText,source:d.source,name:d.name,language:d.language};d.handle=handle;d.baseText=existing;d.name=handle.name;d.language=languageFor(d.name);
  if(!await save()){d.handle=before.handle;d.baseText=before.base;d.source=before.source;d.name=before.name;d.language=before.language;d.external=null}showText();
 }catch(error){if(error.name!=='AbortError')status(error.message,true)}
}
function download(){const d=current();if(!d)return;const url=URL.createObjectURL(new Blob([d.text],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=d.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);status('Copie téléchargée · le fichier original reste indépendant.')}
async function refresh(d=current()){
 if(!d?.handle||d.saving)return;
 try{const result=await readLinkedFile(d);if(result==='reloaded'){if(current()?.id===d.id)showText();publishSave(d,d.text);log('Sauvegarde externe relue : '+d.name);status('↻ Sauvegarde externe actualisée dans l’éditeur')}
  else if(result==='conflict'){tabs();status('Le fichier a changé ailleurs ; tes modifications sont préservées.',true)}
 }catch(error){status('Lecture du fichier : '+error.message,true)}
}
setInterval(async()=>{if(polling||document.hidden||!$('watchFile').checked)return;polling=true;try{for(const d of docs.values())if(d.handle)await refresh(d)}finally{polling=false}},1200);
window.addEventListener('focus',()=>{if($('watchFile').checked)refresh()});
$('fileImport').addEventListener('change',async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>MAX_SOURCE*4)throw Error('Fichier trop volumineux.');const d=addRecord({id:newId(),name:file.name,source:await file.text(),revision:0});publishSave(d,d.text);status('Fichier importé · relie-le avec « Enregistrer sous » pour suivre ses modifications.')}catch(error){status(error.message,true)}finally{e.target.value=''}});
$('newFile').onclick=$('newFileSmall').onclick=()=>{$('newDialog').returnValue='cancel';$('newDialog').showModal();$('newName').focus();$('newName').select()};
$('newDialog').addEventListener('close',()=>{if($('newDialog').returnValue!=='create')return;try{const name=$('newName').value.trim(),source=templateFor(name);const d=addRecord({id:newId(),name,source,revision:0});d.baseText='';tabs();preserve()}catch(error){status(error.message,true)}});
$('openFile').onclick=openFile;$('saveFile').onclick=save;$('saveAs').onclick=saveAs;$('downloadFile').onclick=download;$('refreshFile').onclick=()=>refresh();
for(const [id,choice] of [['keepLocal','keep'],['loadExternal','reload']])$(id).onclick=()=>{const d=current();if(!d)return;d.resolve(choice);if(d.pendingRevision!==undefined){d.revision=d.pendingRevision;delete d.pendingRevision}showText();preserve();status(choice==='keep'?'Modifications conservées · Ctrl S pour les enregistrer.':'Version du fichier chargée.')};
$('source').addEventListener('input',()=>changed($('source').value));$('source').addEventListener('scroll',()=>{$('lineNumbers').scrollTop=$('source').scrollTop});$('source').addEventListener('keyup',fallbackUpdate);$('source').addEventListener('click',fallbackUpdate);
$('source').addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();const area=e.target;area.setRangeText('    ',area.selectionStart,area.selectionEnd,'end');changed(area.value)}});
$('language').onchange=()=>{const d=current();if(!d)return;d.language=$('language').value;if(monaco&&models.has(d.id))monaco.editor.setModelLanguage(models.get(d.id),d.language==='warscript'?'csharp':d.language);updateProblems();status('Coloration : '+d.language+' · l’extension du fichier détermine son exécution')};
$('wordWrap').onchange=()=>{editor?.updateOptions({wordWrap:$('wordWrap').checked?'on':'off'});$('source').wrap=$('wordWrap').checked?'soft':'off'};
$('minimap').onchange=()=>editor?.updateOptions({minimap:{enabled:$('minimap').checked}});
$('explorerButton').onclick=()=>document.body.classList.toggle('sidebar-hidden');$('settingsButton').onclick=()=>{editorFont=editorFont===13?16:13;editor?.updateOptions({fontSize:editorFont});$('source').style.fontSize=editorFont+'px'};
function findPanel(replace=false){$('findPanel').hidden=false;$('findInput').focus();if(replace)$('replaceInput').focus()}
$('findButton').onclick=$('searchActivity').onclick=()=>findPanel();$('closeFind').onclick=()=>{$('findPanel').hidden=true;editor?.focus()};
function findNext(){const d=current(),query=$('findInput').value;if(!d||!query)return null;const start=editor?editor.getModel().getOffsetAt(editor.getSelection().getEndPosition()):$('source').selectionEnd;let offset=d.text.indexOf(query,start);if(offset<0)offset=d.text.indexOf(query);if(offset<0){$('findResult').textContent='Aucun résultat';return null}if(editor){const m=editor.getModel(),a=m.getPositionAt(offset),b=m.getPositionAt(offset+query.length);editor.setSelection(new monaco.Range(a.lineNumber,a.column,b.lineNumber,b.column));editor.revealLineInCenter(a.lineNumber)}else{$('source').focus();$('source').setSelectionRange(offset,offset+query.length)}$('findResult').textContent='Résultat trouvé';return offset}
$('findNext').onclick=findNext;$('findInput').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();findNext()}};
$('replaceOne').onclick=()=>{const d=current(),query=$('findInput').value;if(!d||!query)return;const range=editor?.getSelection(),start=editor?editor.getModel().getOffsetAt(range.getStartPosition()):$('source').selectionStart,end=editor?editor.getModel().getOffsetAt(range.getEndPosition()):$('source').selectionEnd,offset=d.text.slice(start,end)===query?start:findNext();if(offset===null)return;const value=d.text.slice(0,offset)+$('replaceInput').value+d.text.slice(offset+query.length);d.edit(value);showText();preserve()};
$('replaceAll').onclick=()=>{const d=current(),q=$('findInput').value;if(!d||!q)return;const count=d.text.split(q).length-1;d.edit(d.text.split(q).join($('replaceInput').value));showText();preserve();$('findResult').textContent=count+' remplacement(s)'};
$('problemsTab').onclick=()=>{$('problems').hidden=false;$('output').hidden=true;$('problemsTab').classList.add('active');$('outputTab').classList.remove('active')};$('outputTab').onclick=()=>{$('problems').hidden=true;$('output').hidden=false;$('outputTab').classList.add('active');$('problemsTab').classList.remove('active')};
$('popout').onclick=()=>{const url=new URL(location.href);url.searchParams.delete('embedded');window.open(url.href,'warlike-script-'+(session||'standalone'));};
window.addEventListener('keydown',e=>{if(!(e.ctrlKey||e.metaKey))return;const key=e.key.toLowerCase();if(key==='s'){e.preventDefault();if(e.shiftKey)saveAs();else save()}if(key==='o'){e.preventDefault();openFile()}if(key==='f'){e.preventDefault();findPanel()}if(key==='h'){e.preventDefault();findPanel(true)}if(key==='b'){e.preventDefault();document.body.classList.toggle('sidebar-hidden')}});
window.addEventListener('beforeunload',e=>{preserve();if([...docs.values()].some(d=>d.dirty)){e.preventDefault();e.returnValue=''}});
function updateProblems(){
 if(checkingProblems||!current())return;checkingProblems=true;
 try{const d=current(),model=models.get(activeId),program=d.language==='warscript'?compileWarScript(d.text):null;
 if(monaco&&model)monaco.editor.setModelMarkers(model,'warscript',(program?.diagnostics||d.nativeDiagnostics||[]).map(m=>({severity:m.severity==='warning'?monaco.MarkerSeverity.Warning:monaco.MarkerSeverity.Error,startLineNumber:m.line,startColumn:m.column,endLineNumber:m.line,endColumn:m.column+1,message:m.message})));
 const markers=d.language==='csharp'&&d.nativeDiagnostics?d.nativeDiagnostics.map(m=>({startLineNumber:m.line,startColumn:m.column,message:m.message})):program?program.diagnostics.map(m=>({startLineNumber:m.line,startColumn:m.column,message:m.message})):monaco&&model?monaco.editor.getModelMarkers({resource:model.uri}).filter(m=>m.severity>=monaco.MarkerSeverity.Warning):[];
 $('problemCount').textContent=markers.length;$('problems').replaceChildren();if(!markers.length)$('problems').textContent=d.language==='csharp'&&d.nativeDiagnostics?'✓ Compilation C# native réussie · exécuté dans le bridge .NET local.':program?'✓ WarScript valide · '+program.fields.filter(f=>f.public).length+' champ(s) exposé(s) · exécution dans Play et le jeu exporté.':['javascript','typescript','json','css','html'].includes(d.language)?'Aucun problème détecté.':'Coloration disponible · compilation de ce langage dans son environnement dédié.';
 for(const m of markers.slice(0,60)){const row=document.createElement('button');row.className='problem-row';row.textContent=d.name+':'+m.startLineNumber+':'+m.startColumn+'  '+m.message;row.onclick=()=>{if(editor){editor.setPosition({lineNumber:m.startLineNumber,column:m.startColumn});editor.revealLineInCenter(m.startLineNumber);editor.focus()}else{$('source').focus();const offset=d.text.split('\n').slice(0,m.startLineNumber-1).reduce((sum,line)=>sum+line.length+1,0)+m.startColumn-1;$('source').setSelectionRange(offset,offset+1)}};$('problems').append(row)}
 }finally{checkingProblems=false}
}
$('runWarScript').onclick=()=>{
 const d=current();if(!d)return;
 if(d.language!=='warscript')return status('Ouvre un script .wls pour utiliser cet aperçu. Pour C#, utilise Vérifier / compiler puis Play C# natif.',true);
 const result=runWarScriptPreview(d.text,{frames:60,fps:60});
 $('outputTab').click();
 if(!result.ok){
  d.nativeDiagnostics=result.diagnostics;
  for(const diag of result.diagnostics)log('WarScript '+diag.line+':'+diag.column+' · '+diag.message);
  updateProblems();status('Aperçu WarScript interrompu : '+result.diagnostics[0]?.message,true);
  return;
 }
 delete d.nativeDiagnostics;
 log('▶ Aperçu isolé WarScript · '+result.frames+' frames simulées à 60 FPS · aucune scène modifiée');
 for(const message of result.logs){
  const args=message.args.map(v=>typeof v==='string'?v:JSON.stringify(v)).join(', ');
  log('['+message.frame+'] '+message.method+'('+args+')');
 }
 log('Position simulée : '+JSON.stringify(result.state.position)+' · rotation : '+JSON.stringify(result.state.rotation));
 log('Champs : '+JSON.stringify(result.fields));
 if(result.overflow)log('Limite de logs atteinte, affichage tronqué.');
 status('✓ WarScript exécuté en simulation. Pour tester les collisions, l’Animator et la scène réelle, attache le script à un GameObject puis lance Play.');
};
$('checkScript').onclick=async()=>{
 const d=current();if(!d)return;
 if(d.language==='typescript'){try{const ok=await compileTypeScript(d);$('problemsTab').click();status(ok?'✓ TypeScript compilé en JavaScript · Ctrl+S pour actualiser le moteur.':'Corrige les erreurs TypeScript avant Play.',!ok)}catch(error){status(error.message,true)}return}
 if(d.language==='javascript'){updateProblems();status('JavaScript exécuté comme module natif au lancement de Play.');return}
 if(d.language==='warscript'){updateProblems();$('problemsTab').click();status('Vérification WarScript terminée.');return}
 if(d.language!=='csharp'){status('Choisis .wls pour WarScript ou .cs pour C# natif.');return}
 $('checkScript').disabled=true;status('Compilation C# dans le bridge .NET local…');
 try{const scripts=[...docs.values()].filter(doc=>doc.language==='csharp').map(doc=>({name:doc.name.replace(/\.cs$/i,''),source:doc.text}));
 const response=await fetch('http://127.0.0.1:8765/scripts/compile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scripts}),signal:AbortSignal.timeout(10000)}),result=await response.json();
 for(const doc of docs.values())if(doc.language==='csharp')doc.nativeDiagnostics=(result.diagnostics||[]).filter(m=>m.file===doc.name);
 if(!result.ok&&!result.diagnostics?.length)d.nativeDiagnostics=[{line:1,column:1,message:result.error||'Compilation refusée.'}];
 updateProblems();$('problemsTab').click();status(result.ok?'✓ C# natif compilé · Ctrl+S puis Play C# local pour exécuter.':result.error||'Erreur de compilation C#.',!result.ok);
 }catch(error){status('Démarre start-warlike-csharp.cmd avec le SDK .NET 8, puis réessaie. '+error.message,true)}finally{$('checkScript').disabled=false}
};
async function compileTypeScript(d){
 if(!monaco?.languages?.typescript)throw Error('Le compilateur TypeScript de Monaco doit être chargé. Réessaie une fois Monaco disponible.');
 const model=ensureModel(d),source=d.text;if(model.getValue()!==source)model.setValue(source);
 const factory=await monaco.languages.typescript.getTypeScriptWorker(),worker=await factory(model.uri),uri=model.uri.toString();
 const diagnostics=[...await worker.getSyntacticDiagnostics(uri),...await worker.getSemanticDiagnostics(uri)].filter(d=>d.category===1);
 delete d.compiledSource;delete d.compiledFrom;
 if(diagnostics.length){updateProblems();return false}
 const output=await worker.getEmitOutput(uri),file=output.outputFiles.find(file=>file.name.endsWith('.js'));
 if(output.emitSkipped||!file)throw Error('TypeScript n’a pas produit de module JavaScript.');
 if(d.text!==source)throw Error('Le code a changé pendant la compilation. Compile à nouveau.');
 d.compiledSource=file.text;d.compiledFrom=source;log('TypeScript compilé : '+d.name+' → JavaScript');return true;
}
async function loadMonaco(){
 const base='https://cdn.jsdelivr.net/npm/monaco-editor@0.57.0/min/';
 try{
  await new Promise((resolve,reject)=>{const loader=document.createElement('script');loader.src=base+'vs/loader.js';loader.onload=resolve;loader.onerror=()=>reject(Error('Monaco indisponible'));document.head.append(loader)});
  const workerCode='self.MonacoEnvironment={baseUrl:'+JSON.stringify(base)+'};importScripts('+JSON.stringify(base+'vs/base/worker/workerMain.js')+');';
  const workerUrl=URL.createObjectURL(new Blob([workerCode],{type:'text/javascript'}));
  window.MonacoEnvironment={getWorkerUrl:()=>workerUrl};window.require.config({paths:{vs:base+'vs'}});
  await new Promise((resolve,reject)=>window.require(['vs/editor/editor.main'],resolve,reject));monaco=window.monaco;
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({target:monaco.languages.typescript.ScriptTarget.ES2022,module:monaco.languages.typescript.ModuleKind.ESNext,strict:true,noEmitOnError:true,allowNonTsExtensions:true});
  editor=monaco.editor.create($('monaco'),{theme:'vs-dark',automaticLayout:true,fontFamily:'Consolas, monospace',fontSize:13,lineHeight:21,padding:{top:18},minimap:{enabled:true},scrollBeyondLastLine:false,renderWhitespace:'selection',tabSize:4,insertSpaces:true,bracketPairColorization:{enabled:true},smoothScrolling:true,accessibilitySupport:'on',editContext:false,ariaLabel:'Code du script',readOnly:false});
  editor.onDidChangeCursorPosition(e=>{$('cursorPosition').textContent='Ln '+e.position.lineNumber+', Col '+e.position.column});
  monaco.editor.onDidChangeMarkers(updateProblems);editor.addCommand(monaco.KeyMod.CtrlCmd|monaco.KeyCode.KeyS,save);
  $('fallback').hidden=true;$('editorEngine').textContent='Monaco Editor · VS Code';showText();
 }catch(error){$('editorEngine').textContent='Éditeur texte · Monaco hors connexion';log('Éditeur texte disponible : '+error.message);status('Éditeur texte disponible. Monaco nécessite l’accès à son CDN.')}
}
loadMonaco();
