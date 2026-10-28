import {workspace} from '../core/workspaces.js';
import {presetsForWorkspace,createBlueprintPreset} from '../core/blueprint-presets.js';
import {active,state,notify} from '../core/state.js';
import {sequenceEntries,newSequence,sequenceRuntime} from '../core/logic-sequences.js';
import {gameProject,captureGameScene,sceneDefinition} from '../core/game-project.js';
import {createBlueprintGameStarter} from '../core/blueprint-game-starter.js';
import {inspectBlueprintGame} from '../core/blueprint-validation.js';
import {createGraph,applyGraph,variableTypes,coerceVariable} from '../core/blueprint-graph.js';
import {labelFor} from '../core/blueprint-catalog.js';
import {record} from '../core/history.js';
import {saveProject} from '../core/project-hub.js';
import {renderSequenceEditor} from './logic-sequence-editor.js';
import {renderBlueprintGraph} from './blueprint-graph-editor.js';
import {element,button,field,select} from './blueprint-controls.js';
const ui={tab:'graph',sequenceKey:null,nodeId:null,zoom:.85,search:'',category:'Toutes',objectSearch:''};
export function initBlueprintWorkspace(){
 const open=document.getElementById('openBlueprint'),dialog=document.getElementById('blueprintDialog'),content=document.getElementById('blueprintContent');
 if(!open||!dialog||!content)return;
 dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.tabIndex=-1;
 const change=label=>{record('Blueprint : '+label);saveProject();notify()};
 const addSequence=(owner,sequence)=>{if(!owner.sequence){owner.sequence=sequence;ui.sequenceKey=owner.id}else{owner.sequences??=[];if(owner.sequences.length>=32)throw Error('32 comportements supplémentaires maximum.');owner.sequences.push(sequence);ui.sequenceKey=owner.id+':extra:'+(owner.sequences.length-1)}ui.nodeId=null;return sequence};
 const selected=owner=>{const entries=owner?sequenceEntries(owner):[];return entries.find(e=>e.key===ui.sequenceKey)||entries[0]||null};
 function render(){
  const owner=active(),entry=selected(owner),sequence=entry?.sequence;
  if(entry)ui.sequenceKey=entry.key;
  content.replaceChildren();content.className='blueprint-content bp-studio-body';
  document.getElementById('blueprintTarget').textContent=(workspace.mode==='3d'?'3D':'2D')+' / '+(owner?.name||'Projet');
  document.getElementById('blueprintAdd').textContent='＋ Comportement';document.getElementById('blueprintAdd').disabled=!owner||state.playing;
  const sidebar=element('aside','bp-sidebar'),main=element('div','bp-main');
  sidebar.append(element('div','bp-sidebar-title','SCÈNE & COMPORTEMENTS'));
  const search=element('input','bp-object-search');search.type='search';search.placeholder='Rechercher un objet…';search.value=ui.objectSearch;search.setAttribute('aria-label','Rechercher un objet');sidebar.append(search);
  const objects=element('div','bp-object-list');sidebar.append(objects);
  const drawObjects=()=>{objects.replaceChildren();for(const o of state.entities.filter(o=>o.name?.toLowerCase().includes(ui.objectSearch.toLowerCase()))){const b=button(objects,(o.sequence||o.sequences?.length?'⬡ ':'◇ ')+o.name,()=>{state.selected=[o.id];ui.sequenceKey=null;ui.nodeId=null;notify()},'bp-object-row');b.disabled=false;b.classList.toggle('is-active',o===owner);b.title='ID '+o.id}}
  search.oninput=()=>{ui.objectSearch=search.value;drawObjects()};drawObjects();
  if(owner){
   sidebar.append(element('div','bp-sidebar-title bp-behavior-title','COMPORTEMENTS DE L’OBJET'));
   for(const item of sequenceEntries(owner)){const s=item.sequence,b=button(sidebar,(s.enabled===false?'○ ':'● ')+(s.name||labelFor(s.event,'event')),()=>{ui.sequenceKey=item.key;ui.nodeId=null;render()},'bp-behavior-row');b.disabled=false;b.classList.toggle('is-active',item.key===entry?.key);b.append(element('small','',labelFor(s.event,'event')))}
   if(!sequence)sidebar.append(element('p','bp-hint','Ajoute un premier comportement ou choisis un modèle dans la bibliothèque.'));
   button(sidebar,'＋ Nouveau déclencheur',()=>{addSequence(owner,{...newSequence(),name:'Nouveau comportement'});ui.tab='instructions';change('Ajouter un comportement')},'bp-secondary');
  }
  const foot=element('div','bp-sidebar-foot');foot.append(element('strong','','Une idée → un jeu'),element('p','','Crée ta logique, teste-la, puis exporte ton jeu Web.'));button(foot,'Voir le parcours complet →',()=>{ui.tab='project';render()},'bp-text-button');sidebar.append(foot);
  const tabs=element('nav','bp-tabs');tabs.setAttribute('aria-label','Espaces Blueprint');
  for(const [id,label] of [['graph','⬡ Graphe'],['instructions','☷ Instructions'],['library','▦ Bibliothèque'],['project','◇ Projet & export'],['debug','⌁ Débogage']]){const b=button(tabs,label,()=>{ui.tab=id;render()},'bp-tab');b.disabled=false;b.classList.toggle('is-active',ui.tab===id);b.setAttribute('aria-current',ui.tab===id?'page':'false')}
  const page=element('div','bp-tab-content');main.append(tabs,page);content.append(sidebar,main);
  if(['graph','instructions'].includes(ui.tab)){
   if(!owner||!sequence){const empty=element('div','bp-empty-state');empty.append(element('span','bp-empty-icon','⬡'),element('h2','',owner?'Ton objet attend son premier comportement':'Choisis un objet pour commencer'),element('p','',owner?'Ajoute un déclencheur ou pars d’un modèle prêt à configurer.':'Les objets de ta scène apparaissent à gauche. Chaque objet peut porter plusieurs événements et actions.'));button(empty,'Explorer les modèles',()=>{ui.tab='library';render()},'bp-primary');page.append(empty);return}
   const meta=element('div','bp-sequence-meta');field(meta,{key:'name',label:'Nom du comportement',type:'text'},sequence,()=>change('Renommer'));
   field(meta,{key:'enabled',label:'Activé',type:'boolean',default:true},sequence,()=>change('Activation'));button(meta,'Dupliquer',()=>{const copy=structuredClone(sequence);copy.name=(sequence.name||labelFor(sequence.event,'event'))+' · copie';addSequence(owner,copy);change('Dupliquer le comportement')},'bp-text-button');button(meta,'Supprimer',()=>{if(entry.key===owner.id)delete owner.sequence;else owner.sequences.splice(Number(String(entry.key).split(':').at(-1)),1);ui.sequenceKey=null;ui.nodeId=null;change('Supprimer le comportement')},'bp-text-button bp-danger');page.append(meta);
   if(ui.tab==='graph'){
    renderBlueprintGraph(page,sequence,change,{selectedNodeId:ui.nodeId,zoom:ui.zoom,onSelect:id=>ui.nodeId=id,onZoom:value=>ui.zoom=value});
   }else renderSequenceEditor(page,owner,{sequence,expanded:true,onChange(next,label){if(next){if(entry.key===owner.id)owner.sequence=next;else owner.sequences[Number(String(entry.key).split(':').at(-1))]=next}else{if(entry.key===owner.id)delete owner.sequence;else owner.sequences.splice(Number(String(entry.key).split(':').at(-1)),1);ui.sequenceKey=null}change(label)}});
  }else if(ui.tab==='library')renderLibrary(page,owner,sequence);
  else if(ui.tab==='project')renderProject(page);
  else renderDebug(page);
 }
 function renderLibrary(page,owner,sequence){
  const heading=element('div','bp-page-heading');heading.append(element('span','bp-eyebrow','COMPOSER SANS CODER'),element('h2','','Une bibliothèque pour donner vie au jeu'),element('p','','Ajoute des comportements indépendants à l’objet sélectionné. Tes comportements existants sont conservés.'));page.append(heading);
  const controls=element('div','bp-library-controls'),search=element('input');search.type='search';search.placeholder='Rechercher une mécanique, un objectif, une IA…';search.value=ui.search;search.setAttribute('aria-label','Rechercher un modèle');controls.append(search);
  const available=presetsForWorkspace(workspace.mode);const category=select(controls,'Catégorie',ui.category,['Toutes',...new Set(available.map(p=>p.category))],v=>{ui.category=v;draw()});
  const grid=element('div','bp-template-grid');
  function draw(){grid.replaceChildren();const results=available.filter(p=>(ui.category==='Toutes'||p.category===ui.category)&&[p.label,p.description,p.category].join(' ').toLowerCase().includes(ui.search.toLowerCase()));
   for(const preset of results){const card=element('article','bp-template-card');card.append(element('span','bp-template-category',preset.category),element('h3','',preset.label),element('p','',preset.description));const add=button(card,'＋ Ajouter à cet objet',()=>{if(!owner)return;const s=createBlueprintPreset(preset.id,workspace.mode);s.name=preset.label;addSequence(owner,s);ui.tab='instructions';change('Ajouter '+preset.label)},'bp-secondary');add.disabled=state.playing||!owner;grid.append(card)}
   if(!results.length)grid.append(element('p','bp-hint','Aucun modèle ne correspond à cette recherche.'));
  }
  search.oninput=()=>{ui.search=search.value;draw()};page.append(controls,grid);draw();
  const files=element('div','bp-transfer-bar');
  button(files,'↓ Exporter le comportement',()=>{if(!sequence)return;const blob=new Blob([JSON.stringify({format:'warlike.blueprint.v1',sequence},null,2)],{type:'application/json'});download(blob,'warlike-blueprint.json')},'bp-text-button').disabled=!sequence;
  const input=element('input');input.type='file';input.accept='.json';input.hidden=true;input.onchange=async()=>{try{const file=input.files[0];if(!file)return;if(file.size>512*1024)throw Error('512 Ko maximum.');const data=JSON.parse(await file.text());if(data.format!=='warlike.blueprint.v1'||!data.sequence||typeof data.sequence!=='object'||Array.isArray(data.sequence))throw Error('Blueprint invalide.');if(data.sequence.graph)applyGraph(data.sequence);addSequence(owner,data.sequence);ui.tab='instructions';change('Importer un comportement')}catch(e){alert(e.message)}finally{input.value=''}};
  button(files,'↑ Importer un comportement',()=>input.click(),'bp-text-button').disabled=!owner||state.playing;files.append(input);page.append(files);
 }
 function renderProject(page){
  const heading=element('div','bp-project-hero');heading.append(element('span','bp-eyebrow','DE LA PREMIÈRE IDÉE AU JEU JOUABLE'),element('h2','','Construis ton jeu, étape par étape.'),element('p','','Un parcours concret : scène, comportements, objectifs, tests et export Web.'));page.append(heading);
  const steps=element('div','bp-journey');for(const [i,title] of ['Composer la scène','Créer les comportements','Définir la progression','Tester & déboguer','Exporter le jeu'].entries()){const item=element('div','bp-journey-step');item.append(element('span','',String(i+1).padStart(2,'0')),element('strong','',title));steps.append(item)}page.append(steps);
  const grid=element('div','bp-project-grid');
  const settings=element('section','bp-project-card');settings.append(element('h3','','01 · Paramètres du jeu'));field(settings,{key:'title',label:'Titre du jeu',type:'text'},gameProject,()=>change('Titre du jeu'));
  const sceneChoices=gameProject.scenes.map(s=>({value:s.id,label:s.name}));if(!sceneChoices.some(s=>s.value===gameProject.activeSceneId))sceneChoices.unshift({value:gameProject.activeSceneId,label:'Scène actuelle'});
  select(settings,'Scène de démarrage',gameProject.startupSceneId,sceneChoices,v=>{gameProject.startupSceneId=v;change('Scène de démarrage')});
  settings.append(element('p','bp-hint','L’exemple crée une nouvelle scène de mission. Ta scène actuelle est conservée dans le projet.'));
  button(settings,'Créer un exemple de jeu complet',()=>{
   captureGameScene(state.entities,state.camera);const sample=createBlueprintGameStarter(workspace.mode),id='mission-'+Date.now().toString(36);
   Object.assign(state,sample);captureGameScene(state.entities,state.camera,{id,name:'Mission · Trois lanternes'});gameProject.startupSceneId=id;ui.tab='graph';ui.sequenceKey=null;change('Créer la mission jouable');document.dispatchEvent(new Event('warlike:project'));
  },'bp-primary');grid.append(settings);
  const scenes=element('section','bp-project-card');scenes.append(element('h3','','02 · Scènes du projet'));
  button(scenes,'Capturer la scène actuelle',()=>{captureGameScene(state.entities,state.camera);change('Capturer la scène')},'bp-secondary');
  for(const scene of gameProject.scenes){const row=element('div','bp-scene-row');row.append(element('strong','',scene.name),element('code','',scene.id));button(row,scene.id===gameProject.activeSceneId?'Active':'Ouvrir',()=>{captureGameScene(state.entities,state.camera);state.entities=structuredClone(scene.entities);state.camera=structuredClone(scene.camera);state.selected=scene.entities[0]?[scene.entities[0].id]:[];state.nextId=Math.max(0,...state.entities.map(o=>o.id))+1;gameProject.activeSceneId=scene.id;ui.sequenceKey=null;change('Ouvrir la scène');document.dispatchEvent(new Event('warlike:project'))},'bp-text-button').disabled=state.playing||scene.id===gameProject.activeSceneId;scenes.append(row)}
  const newScene={name:''};field(scenes,{key:'name',label:'Nom d’une nouvelle scène',type:'text'},newScene,()=>{});
  button(scenes,'＋ Créer une scène vide',()=>{if(!newScene.name.trim())return;captureGameScene(state.entities,state.camera);const id='scene-'+Date.now().toString(36);state.entities=[];state.selected=[];state.nextId=1;captureGameScene([],state.camera,{id,name:newScene.name});change('Créer une scène')},'bp-text-button');grid.append(scenes);
  const variables=element('section','bp-project-card');variables.append(element('h3','','03 · Variables globales initiales'));
  for(const [i,v] of gameProject.variables.entries()){const row=element('div','bp-project-variable');field(row,{key:'name',label:'Nom',type:'text'},v,()=>change('Variable'));select(row,'Type',v.type,variableTypes,value=>{v.type=value;v.value=coerceVariable(value,v.value);change('Type de variable')});field(row,{key:'value',label:'Valeur initiale',type:'text'},v,()=>{v.value=coerceVariable(v.type,v.type.startsWith('vector')?String(v.value).split(','):v.value);change('Valeur initiale')});button(row,'×',()=>{gameProject.variables.splice(i,1);change('Retirer variable')},'bp-text-button');variables.append(row)}
  button(variables,'＋ Ajouter une variable',()=>{let i=1;while(gameProject.variables.some(v=>v.name==='variable'+i))i++;gameProject.variables.push({name:'variable'+i,type:'number',value:0});change('Ajouter variable')},'bp-secondary');grid.append(variables);
  const delivery=element('section','bp-project-card bp-export-card');delivery.append(element('h3','','04 · Tester, vérifier, exporter'));
  const issues=inspectBlueprintGame(state.entities),list=element('div','bp-issue-list');for(const issue of issues){const row=element('p','bp-issue is-'+issue.severity,(issue.severity==='error'?'● ':'◇ ')+issue.message);list.append(row)}if(!issues.length)list.append(element('p','bp-issue is-ok','✓ Cette scène est prête à tester.'));delivery.append(list);
  const status=element('p','bp-export-status');
  button(delivery,'▶ Tester dans l’éditeur',()=>{hide();document.getElementById('play').click()},'bp-secondary');
  const exportButton=button(delivery,'↓ Exporter le jeu Web (.zip)',async()=>{exportButton.disabled=true;try{const {exportGamePackage}=await import('../core/game-build.js');const result=await exportGamePackage({entities:state.entities,camera:state.camera,mode:workspace.mode},{onProgress:(done,total)=>status.textContent='Préparation du jeu… '+Math.round(done/total*100)+' %'});download(result.blob,result.filename);status.textContent='✓ Archive créée : '+result.files+' fichiers. Décompresse-la puis ouvre-la avec un serveur statique.'}catch(error){status.textContent='Export impossible : '+error.message}finally{exportButton.disabled=false}},'bp-primary');delivery.append(status,element('small','bp-hint','Build Web expérimental : runtime inclus, modèles distants accessibles avec Internet. Les scripts C#/.NET ne sont pas exécutés dans ce build.'));grid.append(delivery);page.append(grid);
 }
 function renderDebug(page){
  const heading=element('div','bp-page-heading');heading.append(element('span','bp-eyebrow','COMPRENDRE CE QUI SE PASSE'),element('h2','','Un débogueur lisible, au plus près du jeu.'),element('p','','Lance Play pour observer les variables, les instructions et les erreurs. Le dernier nœud exécuté est surligné dans le graphe.'));page.append(heading);
  const issues=inspectBlueprintGame(state.entities);for(const issue of issues)page.append(element('p','bp-issue is-'+issue.severity,issue.message));
  const grid=element('div','bp-debug-grid'),vars=element('section','bp-project-card'),trace=element('section','bp-project-card');vars.append(element('h3','','Variables en direct'));vars.id='bpDebugVariables';trace.append(element('h3','','Exécution récente'));trace.id='bpDebugTrace';grid.append(vars,trace);page.append(grid);updateDebug();
 }
 function updateDebug(){
  const vars=document.getElementById('bpDebugVariables'),trace=document.getElementById('bpDebugTrace');
  if(vars){vars.querySelectorAll('.bp-debug-row').forEach(el=>el.remove());for(const [key,value] of Object.entries(sequenceRuntime.globals)){const row=element('div','bp-debug-row');row.append(element('code','',key),element('strong','',JSON.stringify(value)));vars.append(row)}}
  if(trace){trace.querySelectorAll('.bp-trace-row').forEach(el=>el.remove());for(const item of sequenceRuntime.trace.slice(-50).reverse()){const row=element('div','bp-trace-row '+(item.status==='error'?'has-error':''));row.append(element('code','',item.time.toFixed(2)+' s'),element('strong','',labelFor(item.type)),element('span','','Objet #'+item.objectId+(item.message?' · '+item.message:'')));trace.append(row)}}
  const recent=sequenceRuntime.trace.at(-1),owner=active(),entry=selected(owner);const last=recent?.objectId===owner?.id&&recent?.sequenceKey===entry?.key?recent:null;dialog.querySelectorAll('.bp-node-v2').forEach(el=>{el.classList.toggle('was-executed',el.dataset.nodeId===last?.nodeId&&last.status==='ok');el.classList.toggle('has-runtime-error',el.dataset.nodeId===last?.nodeId&&last.status==='error')});
 }
 const show=()=>{render();dialog.hidden=false;open.setAttribute('aria-expanded','true');dialog.querySelector('.bp-tab.is-active')?.focus()};
 const hide=()=>{dialog.hidden=true;open.setAttribute('aria-expanded','false');open.focus()};
 function download(blob,name){const url=URL.createObjectURL(blob),a=element('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500)}
 open.addEventListener('click',()=>dialog.hidden?show():hide());document.getElementById('blueprintClose').addEventListener('click',hide);
 document.getElementById('blueprintAdd').addEventListener('click',()=>{const owner=active();if(owner&&!state.playing){addSequence(owner,{...newSequence(),name:'Nouveau comportement'});ui.tab='instructions';change('Ajouter comportement')}});
 document.addEventListener('warlike:change',()=>{if(!dialog.hidden)render()});document.addEventListener('warlike:workspace',()=>{if(!dialog.hidden)render()});
 dialog.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='Escape'){event.preventDefault();hide();return}if(event.key==='Tab'){const controls=[...dialog.querySelectorAll('button,input,select,textarea,a[href]')].filter(el=>!el.disabled&&el.getClientRects().length);if(!controls.length){event.preventDefault();dialog.focus();return}const first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}});
 setInterval(()=>{if(!dialog.hidden)updateDebug()},250);
 document.addEventListener('warlike:open-game-project',()=>{ui.tab='project';show()});
}
