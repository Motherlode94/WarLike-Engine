import {validateFunctionDefinitions} from '../core/blueprint-data.js';
import {objectBlueprintVariables,addBlueprintVariable} from '../core/blueprint-variables.js';
import {renderBlueprintVariableDetails,blueprintTypeLabels} from './blueprint-variable-details.js';
import {blueprintDebugger,pauseBlueprint,resumeBlueprint,stepBlueprint} from '../core/blueprint-debugger.js';
import {workspace} from '../core/workspaces.js';
import {presetsForWorkspace,createBlueprintPreset} from '../core/blueprint-presets.js';
import {active,state,notify} from '../core/state.js';
import {sequenceEntries,newSequence,sequenceRuntime} from '../core/logic-sequences.js';
import {gameProject,captureGameScene,sceneDefinition} from '../core/game-project.js';
import {createBlueprintGameStarter} from '../core/blueprint-game-starter.js';
import {inspectBlueprintGame} from '../core/blueprint-validation.js';
import {createGraph,applyGraph,inspectGraphDetailed,variableTypes,coerceVariable} from '../core/blueprint-graph.js';
import {labelFor} from '../core/blueprint-catalog.js';
import {record} from '../core/history.js';
import {saveProject} from '../core/project-hub.js';
import {renderSequenceEditor} from './logic-sequence-editor.js';
import {renderBlueprintGraph} from './blueprint-graph-editor.js';
import {element,button,field,select,editActions,editTypedValue} from './blueprint-controls.js';
const ui={tab:'graph',sequenceKey:null,nodeId:null,zoom:.85,search:'',category:'Toutes',objectSearch:'',functionId:null,variableName:null,memberSearch:'',compileMessages:[],compiled:false};
export function initBlueprintWorkspace(){
 const open=document.getElementById('openBlueprint'),dialog=document.getElementById('blueprintDialog'),content=document.getElementById('blueprintContent');
 if(!open||!dialog||!content)return;
 dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.tabIndex=-1;
 const change=label=>{ui.compiled=false;record('Blueprint : '+label);saveProject();notify()};
 const addSequence=(owner,sequence)=>{sequence.graph??=createGraph(sequence);if(!owner.sequence){owner.sequence=sequence;ui.sequenceKey=owner.id}else{owner.sequences??=[];if(owner.sequences.length>=32)throw Error('32 comportements supplémentaires maximum.');owner.sequences.push(sequence);ui.sequenceKey=owner.id+':extra:'+(owner.sequences.length-1)}ui.nodeId=null;return sequence};
 const selected=owner=>{const entries=owner?sequenceEntries(owner):[];return entries.find(e=>e.key===ui.sequenceKey)||entries[0]||null};
 function render(){
  const owner=active(),entry=selected(owner),sequence=entry?.sequence;
  if(entry)ui.sequenceKey=entry.key;
  content.replaceChildren();content.className='blueprint-content bp-studio-body';
  document.getElementById('blueprintTarget').textContent=(workspace.mode==='3d'?'3D':'2D')+' / '+(owner?.name||'Projet');
  document.getElementById('blueprintAdd').textContent='＋ Comportement';document.getElementById('blueprintAdd').disabled=!owner||state.playing;
  const sidebar=element('aside','bp-sidebar'),main=element('div','bp-main');
  sidebar.append(element('div','bp-sidebar-title','OBJET DU BLUEPRINT'));
  const search=element('input','bp-object-search');search.type='search';search.placeholder='Rechercher un objet…';search.value=ui.objectSearch;search.setAttribute('aria-label','Rechercher un objet');sidebar.append(search);
  const objects=element('div','bp-object-list');sidebar.append(objects);
  const drawObjects=()=>{objects.replaceChildren();for(const o of state.entities.filter(o=>o.name?.toLowerCase().includes(ui.objectSearch.toLowerCase()))){const b=button(objects,(o.sequence||o.sequences?.length?'⬡ ':'◇ ')+o.name,()=>{state.selected=[o.id];ui.sequenceKey=null;ui.nodeId=null;notify()},'bp-object-row');b.disabled=false;b.classList.toggle('is-active',o===owner);b.title='ID '+o.id}}
  search.oninput=()=>{ui.objectSearch=search.value;drawObjects()};drawObjects();
  if(owner){
   const memberSearch=element('input','bp-member-search');memberSearch.type='search';memberSearch.placeholder='Rechercher dans Mon Blueprint…';memberSearch.value=ui.memberSearch;memberSearch.setAttribute('aria-label','Rechercher dans Mon Blueprint');memberSearch.oninput=()=>{ui.memberSearch=memberSearch.value;for(const row of sidebar.querySelectorAll('.bp-member-row,.bp-behavior-row'))row.hidden=!row.textContent.toLocaleLowerCase('fr').includes(ui.memberSearch.toLocaleLowerCase('fr'))};sidebar.append(element('h2','bp-my-title','Mon Blueprint'),memberSearch,element('div','bp-sidebar-title bp-behavior-title','GRAPHES D’ÉVÉNEMENTS'));
   for(const item of sequenceEntries(owner)){const s=item.sequence,b=button(sidebar,(s.enabled===false?'○ ':'● ')+(s.name||labelFor(s.event,'event')),()=>{ui.sequenceKey=item.key;ui.nodeId=null;ui.tab='graph';render()},'bp-behavior-row');b.disabled=false;b.classList.toggle('is-active',item.key===entry?.key);b.append(element('small','',labelFor(s.event,'event')))}
   if(!sequence)sidebar.append(element('p','bp-hint','Ajoute un premier comportement ou choisis un modèle dans la bibliothèque.'));
   button(sidebar,'＋ Nouveau déclencheur',()=>{addSequence(owner,{...newSequence(),name:'Nouveau comportement'});ui.tab='graph';change('Ajouter un comportement')},'bp-secondary');
  }
  sidebar.append(element('div','bp-sidebar-title','FONCTIONS DU PROJET'));
  for(const f of gameProject.functions||[]){const b=button(sidebar,'ƒ '+(f.name||f.id),()=>{ui.functionId=f.id;ui.nodeId=null;ui.tab='functions';render()},'bp-member-row');b.disabled=false;b.classList.toggle('is-active',ui.tab==='functions'&&ui.functionId===f.id)}
  button(sidebar,'＋ Fonction',newFunction,'bp-text-button');
  sidebar.append(element('div','bp-sidebar-title','VARIABLES DE L’OBJET'));
  for(const v of objectBlueprintVariables(owner)){const b=button(sidebar,(v.exposed?'◉ ':'● ')+v.name,()=>{ui.variableName=v.name;ui.tab='variables';render()},'bp-member-row');b.disabled=false;b.dataset.variableType=v.type;b.append(element('small','',blueprintTypeLabels[v.type]));b.classList.toggle('is-active',ui.tab==='variables'&&ui.variableName===v.name)}
  button(sidebar,'＋ Variable',()=>{if(!owner)return;ui.variableName=addBlueprintVariable(owner).name;ui.tab='variables';change('Créer une variable')},'bp-text-button').disabled=!owner||state.playing;
  sidebar.append(element('div','bp-sidebar-title','VARIABLES GLOBALES'));
  for(const v of gameProject.variables){const b=button(sidebar,'◈ '+v.name,()=>{ui.tab='project';render();content.querySelector('.bp-project-variable')?.scrollIntoView({block:'nearest'})},'bp-member-row');b.disabled=false;b.dataset.variableType=v.type}
  for(const row of sidebar.querySelectorAll('.bp-member-row,.bp-behavior-row'))row.hidden=!row.textContent.toLocaleLowerCase('fr').includes(ui.memberSearch.toLocaleLowerCase('fr'));
  const tabs=element('nav','bp-tabs');tabs.setAttribute('aria-label','Espaces Blueprint');
  for(const [id,label] of [['graph','⬡ Graphe'],['instructions','☷ Instructions'],['functions','ƒ Fonctions'],['variables','◉ Variables'],['library','▦ Bibliothèque'],['project','◇ Projet & export'],['debug','⌁ Débogage']]){const b=button(tabs,label,()=>{ui.tab=id;render()},'bp-tab');b.disabled=false;b.classList.toggle('is-active',ui.tab===id);b.setAttribute('aria-current',ui.tab===id?'page':'false')}
  const workbar=element('div','bp-workspace-toolbar');const identity=element('div','bp-workspace-identity');identity.append(element('strong','','⬡ '+(owner?.name||'Projet')),element('small','',ui.tab==='functions'?'Fonction du projet':ui.tab==='variables'?'Définition et valeurs par défaut':'Event Graph · '+(sequence?.name||'Événements')));workbar.append(identity);button(workbar,ui.compiled?'✓ Compilé':'⚙ Compiler',compileCurrent,'bp-compile-button');const save=button(workbar,'Enregistrer',()=>{ui.compileMessages=[saveProject()?'Projet enregistré.':'Crée un projet nommé dans le Hub pour l’enregistrer.'];render()},'bp-text-button');save.disabled=state.playing;button(workbar,'Valeurs par défaut',()=>{ui.tab='variables';render()},'bp-text-button').disabled=false;main.append(workbar);
  const debugBar=element('div','bp-debug-controls');for(const [label,fn] of [['Ⅱ Pause',pauseBlueprint],['▷ Pas à pas',stepBlueprint],['▶ Continuer',resumeBlueprint]]){const b=button(debugBar,label,()=>{state.keys.clear();state.keyPresses?.clear();document.exitPointerLock?.();fn();updateDebug()},'bp-secondary');b.disabled=!state.playing;b.dataset.debugAction=label}const status=element('span','bp-debug-status');status.id='bpDebugStatus';debugBar.append(status);main.append(debugBar);
  const page=element('div','bp-tab-content');main.append(tabs,page);content.append(sidebar,main);if(ui.compileMessages.length){const results=element('details','bp-compiler-results');results.open=true;results.append(element('summary','','Résultats du compilateur · '+ui.compileMessages.length));for(const message of ui.compileMessages)results.append(element('p','',message));main.append(results)}
  if(['graph','instructions'].includes(ui.tab)){
   if(!owner||!sequence){const empty=element('div','bp-empty-state');empty.append(element('span','bp-empty-icon','⬡'),element('h2','',owner?'Ton objet attend son premier comportement':'Choisis un objet pour commencer'),element('p','',owner?'Ajoute un déclencheur ou pars d’un modèle prêt à configurer.':'Les objets de ta scène apparaissent à gauche. Chaque objet peut porter plusieurs événements et actions.'));button(empty,'Explorer les modèles',()=>{ui.tab='library';render()},'bp-primary');page.append(empty);return}
   const meta=element('div','bp-sequence-meta');field(meta,{key:'name',label:'Nom du comportement',type:'text'},sequence,()=>change('Renommer'));
   field(meta,{key:'enabled',label:'Activé',type:'boolean',default:true},sequence,()=>change('Activation'));button(meta,'Dupliquer',()=>{const copy=structuredClone(sequence);copy.name=(sequence.name||labelFor(sequence.event,'event'))+' · copie';addSequence(owner,copy);change('Dupliquer le comportement')},'bp-text-button');button(meta,'Supprimer',()=>{if(entry.key===owner.id)delete owner.sequence;else owner.sequences.splice(Number(String(entry.key).split(':').at(-1)),1);ui.sequenceKey=null;ui.nodeId=null;change('Supprimer le comportement')},'bp-text-button bp-danger');page.append(meta);
   if(ui.tab==='graph'){
    renderBlueprintGraph(page,sequence,change,{selectedNodeId:ui.nodeId,zoom:ui.zoom,onSelect:id=>ui.nodeId=id,onZoom:value=>ui.zoom=value});
   }else renderSequenceEditor(page,owner,{sequence,expanded:true,onChange(next,label){if(next){if(entry.key===owner.id)owner.sequence=next;else owner.sequences[Number(String(entry.key).split(':').at(-1))]=next}else{if(entry.key===owner.id)delete owner.sequence;else owner.sequences.splice(Number(String(entry.key).split(':').at(-1)),1);ui.sequenceKey=null}change(label)}});
  }else if(ui.tab==='library')renderLibrary(page,owner,sequence);
  else if(ui.tab==='functions')renderFunctions(page);
  else if(ui.tab==='variables')renderVariables(page,owner);
  else if(ui.tab==='project')renderProject(page);
  else renderDebug(page);
 }
 function newFunction(){if((gameProject.functions||[]).length>=64)return;gameProject.functions??=[];const id='function-'+Date.now().toString(36);gameProject.functions.push({id,name:'Nouvelle fonction',parameters:[{name:'quantite',type:'number',value:1}],returnType:'number',instructions:[{type:'returnFunction',value:{$ref:'parameter',name:'quantite',type:'number'}}]});ui.functionId=id;ui.nodeId=null;ui.tab='functions';change('Créer une fonction')}
 function compileCurrent(){
  const messages=validateFunctionDefinitions(gameProject.functions||[]);const owner=active(),sources=[...sequenceEntries(owner||{}).map(e=>({label:e.sequence.name||e.sequence.event,sequence:e.sequence})),...(gameProject.functions||[]).map(f=>({label:f.name||f.id,sequence:f}))];
  for(const source of sources)if(source.sequence.graph){const errors=inspectGraphDetailed(source.sequence.graph);if(errors.length)messages.push(...errors.map(e=>source.label+' : '+e.message));else applyGraph(source.sequence)}
  for(const issue of inspectBlueprintGame(state.entities,{requirePlayer:false}))if(issue.entityId===owner?.id||issue.severity==='error'&&issue.entityId==null)if(!messages.includes(issue.message))messages.push(issue.message);
  ui.compiled=!messages.length;ui.compileMessages=messages.length?messages:['✓ Compilation réussie · '+sources.length+' graphe(s) / fonction(s) vérifiés.'];if(ui.compiled){record('Compiler le Blueprint');saveProject()}render();
 }
 function renderVariables(page,owner){
  if(!owner){page.append(element('p','bp-hint','Sélectionne un objet dans la liste.'));return}
  const layout=element('div','bp-variable-workbench'),defaults=element('section','bp-class-defaults'),details=element('aside','bp-variable-details');defaults.append(element('span','bp-eyebrow','VALEURS PAR DÉFAUT'),element('h2','',owner.name),element('p','bp-hint','Déclare les données de cet objet. Les variables exposées se règlent aussi dans l’Inspecteur de la scène.'));
  const variables=objectBlueprintVariables(owner),selectedVariable=variables.find(v=>v.name===ui.variableName)||variables[0];if(selectedVariable)ui.variableName=selectedVariable.name;
  button(defaults,'＋ Nouvelle variable',()=>{ui.variableName=addBlueprintVariable(owner).name;change('Créer une variable')},'bp-secondary');
  for(const category of new Set(variables.map(v=>v.category?.trim()||'Gameplay'))){defaults.append(element('h3','bp-variable-category',category));for(const v of variables.filter(v=>(v.category?.trim()||'Gameplay')===category)){const row=button(defaults,v.name,()=>{ui.variableName=v.name;render()},'bp-default-row');row.disabled=false;row.dataset.variableType=v.type;row.classList.toggle('is-active',v===selectedVariable);row.append(element('code','',JSON.stringify(v.value)),element('small','',v.exposed?'◉ Inspecteur':'Privée'))}}
  if(selectedVariable)renderBlueprintVariableDetails(details,owner,selectedVariable,(label,name)=>{ui.variableName=name;change(label)});else details.append(element('h2','','Détails'),element('p','bp-hint','Crée une variable pour choisir son type, sa catégorie et sa valeur.'));
  layout.append(defaults,details);page.append(layout);
 }
 function renderFunctions(page){
  const heading=element('div','bp-page-heading');heading.append(element('h2','','Fonctions réutilisables'),element('p','','Partage une fonction entre les objets et les scènes. Les paramètres sont isolés à chaque appel ; le résultat revient dans une variable locale.'));page.append(heading);
  gameProject.functions??=[];const bar=element('div','bp-function-selector');
  const browse=select(bar,'Fonction du projet',ui.functionId,[{value:'',label:'Choisir une fonction'},...gameProject.functions.map(f=>({value:f.id,label:f.name||f.id}))],id=>{ui.functionId=id;render()});browse.disabled=false;
  button(bar,'＋ Nouvelle fonction',newFunction,'bp-secondary');page.append(bar);
  const f=gameProject.functions.find(f=>f.id===ui.functionId);if(!f)return;
  const card=element('details','bp-project-card bp-function-signature');card.open=!f.graph;card.append(element('summary','','Signature · '+f.parameters.length+' paramètre(s) → '+f.returnType));field(card,{key:'name',label:'Nom de la fonction',type:'text'},f,()=>change('Renommer la fonction'));
  select(card,'Type de retour',f.returnType,['void',...variableTypes],v=>{f.returnType=v;change('Type de retour')});
  for(const [i,p] of f.parameters.entries()){
   const row=element('div','bp-function-parameter');field(row,{key:'name',label:'Paramètre '+(i+1),type:'text'},p,()=>change('Paramètre'));
   select(row,'Type de '+p.name,p.type,variableTypes,v=>{p.type=v;p.value=coerceVariable(v,p.value);change('Type du paramètre')});
   editTypedValue(row,'Valeur par défaut',p,'value',p.type,()=>change('Valeur par défaut'),{literalOnly:true});
   button(row,'Retirer le paramètre',()=>{f.parameters.splice(i,1);change('Retirer un paramètre')},'bp-text-button');card.append(row);
  }
  if(f.parameters.length<16)button(card,'＋ Paramètre',()=>{let i=1;while(f.parameters.some(p=>p.name==='param'+i))i++;f.parameters.push({name:'param'+i,type:'number',value:0});change('Ajouter un paramètre')},'bp-secondary');
  button(card,'Supprimer cette fonction',()=>{gameProject.functions=gameProject.functions.filter(other=>other!==f);ui.functionId=null;change('Supprimer la fonction')},'bp-text-button bp-danger');page.append(card);
  if(f.graph)renderBlueprintGraph(page,f,change,{parameters:f.parameters,returnType:f.returnType,selectedNodeId:ui.nodeId,onSelect:id=>ui.nodeId=id});
  else{const actions=element('section','bp-project-card');editActions(actions,f.instructions,()=>change('Instructions de fonction'),0,{parameters:f.parameters,returnType:f.returnType});button(actions,'⬡ Ouvrir en graphe',()=>{f.graph=createGraph({event:'start',instructions:f.instructions});change('Graphe de fonction')},'bp-secondary');page.append(actions)}
 }
 function renderLibrary(page,owner,sequence){
  const heading=element('div','bp-page-heading');heading.append(element('span','bp-eyebrow','COMPOSER SANS CODER'),element('h2','','Une bibliothèque pour donner vie au jeu'),element('p','','Ajoute des comportements indépendants à l’objet sélectionné. Tes comportements existants sont conservés.'));page.append(heading);
  const controls=element('div','bp-library-controls'),search=element('input');search.type='search';search.placeholder='Rechercher une mécanique, un objectif, une IA…';search.value=ui.search;search.setAttribute('aria-label','Rechercher un modèle');controls.append(search);
  const available=presetsForWorkspace(workspace.mode);const category=select(controls,'Catégorie',ui.category,['Toutes',...new Set(available.map(p=>p.category))],v=>{ui.category=v;draw()});
  const grid=element('div','bp-template-grid');
  function draw(){grid.replaceChildren();const results=available.filter(p=>(ui.category==='Toutes'||p.category===ui.category)&&[p.label,p.description,p.category].join(' ').toLowerCase().includes(ui.search.toLowerCase()));
   for(const preset of results){const card=element('article','bp-template-card');card.append(element('span','bp-template-category',preset.category),element('h3','',preset.label),element('p','',preset.description));const add=button(card,'＋ Ajouter à cet objet',()=>{if(!owner)return;const s=createBlueprintPreset(preset.id,workspace.mode);s.name=preset.label;addSequence(owner,s);ui.tab='graph';change('Ajouter '+preset.label)},'bp-secondary');add.disabled=state.playing||!owner;grid.append(card)}
   if(!results.length)grid.append(element('p','bp-hint','Aucun modèle ne correspond à cette recherche.'));
  }
  search.oninput=()=>{ui.search=search.value;draw()};page.append(controls,grid);draw();
  const files=element('div','bp-transfer-bar');
  button(files,'↓ Exporter le comportement',()=>{if(!sequence)return;const blob=new Blob([JSON.stringify({format:'warlike.blueprint.v1',sequence,functions:gameProject.functions||[]},null,2)],{type:'application/json'});download(blob,'warlike-blueprint.json')},'bp-text-button').disabled=!sequence;
  const input=element('input');input.type='file';input.accept='.json';input.hidden=true;input.onchange=async()=>{try{const file=input.files[0];if(!file)return;if(file.size>512*1024)throw Error('512 Ko maximum.');const data=JSON.parse(await file.text());if(data.format!=='warlike.blueprint.v1'||!data.sequence||typeof data.sequence!=='object'||Array.isArray(data.sequence))throw Error('Blueprint invalide.');if(data.sequence.graph)applyGraph(data.sequence);const imported=data.functions||[],errors=validateFunctionDefinitions(imported);if(errors.length)throw Error(errors[0]);for(const f of imported){const existing=gameProject.functions?.find(other=>other.id===f.id);if(existing&&JSON.stringify(existing)!==JSON.stringify(f))throw Error('Une fonction différente possède déjà cet identifiant : '+f.id)}const merged=[...(gameProject.functions||[]),...imported.filter(f=>!gameProject.functions?.some(other=>other.id===f.id))];if(merged.length>64)throw Error('64 fonctions maximum.');addSequence(owner,data.sequence);gameProject.functions=merged;ui.tab='instructions';change('Importer un comportement')}catch(e){alert(e.message)}finally{input.value=''}};
  button(files,'↑ Importer un comportement',()=>input.click(),'bp-text-button').disabled=!owner||state.playing;files.append(input);page.append(files);
 }
 function renderProject(page){
  const heading=element('div','bp-project-hero');heading.append(element('span','bp-eyebrow','DE LA PREMIÈRE IDÉE AU JEU JOUABLE'),element('h2','','Construis ton jeu, étape par étape.'),element('p','','Un parcours concret : scène, comportements, objectifs, tests et export Web.'));page.append(heading);
  const steps=element('div','bp-journey');for(const [i,title] of ['Composer la scène','Créer les comportements','Définir la progression','Tester & déboguer','Exporter le jeu'].entries()){const item=element('div','bp-journey-step');item.append(element('span','',String(i+1).padStart(2,'0')),element('strong','',title));steps.append(item)}page.append(steps);
  const grid=element('div','bp-project-grid');
  const settings=element('section','bp-project-card');settings.append(element('h3','','01 · Paramètres du jeu'));field(settings,{key:'title',label:'Titre du jeu',type:'text'},gameProject,()=>change('Titre du jeu'));
  const sceneChoices=gameProject.scenes.map(s=>({value:s.id,label:s.name}));if(!sceneChoices.some(s=>s.value===gameProject.activeSceneId))sceneChoices.unshift({value:gameProject.activeSceneId,label:'Scène actuelle'});
  select(settings,'Scène de démarrage',gameProject.startupSceneId,sceneChoices,v=>{gameProject.startupSceneId=v;change('Scène de démarrage')});
  if(workspace.mode==='3d'){select(settings,'Moteur physique 3D',gameProject.physics3d||'rapier',[{value:'rapier',label:'Rapier · capsules, pentes, articulations'},{value:'builtin',label:'Interne · collisions simples'}],value=>{gameProject.physics3d=value;change('Moteur physique')});settings.append(element('p','bp-hint','Rapier est chargé au démarrage de Play. Ce choix est conservé dans le projet et dans le jeu exporté.'))}
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
  const heading=element('div','bp-page-heading');heading.append(element('span','bp-eyebrow','COMPRENDRE CE QUI SE PASSE'),element('h2','','Un débogueur lisible, au plus près du jeu.'),element('p','','F8 : pause · F10 : une instruction · F6 : continuer. Lance Play pour observer les variables, les instructions et les erreurs. Le dernier nœud exécuté est surligné dans le graphe.'));page.append(heading);
  const issues=inspectBlueprintGame(state.entities);for(const issue of issues)page.append(element('p','bp-issue is-'+issue.severity,issue.message));
  const grid=element('div','bp-debug-grid'),vars=element('section','bp-project-card'),trace=element('section','bp-project-card');vars.append(element('h3','','Variables en direct'));vars.id='bpDebugVariables';trace.append(element('h3','','Exécution récente'));trace.id='bpDebugTrace';grid.append(vars,trace);page.append(grid);updateDebug();
 }
 function updateDebug(){
  const d=blueprintDebugger,status=document.getElementById('bpDebugStatus');if(status)status.textContent=!state.playing?'Hors Play':d.paused?'● '+d.reason+' · objet #'+(d.current?.objectId||'—')+' · '+(d.current?.functionId||d.current?.nodeId||d.current?.type||'en attente'):'Simulation en cours';
  dialog.querySelectorAll('[data-debug-action]').forEach(b=>b.disabled=!state.playing||b.dataset.debugAction.includes('Pas à pas')&&!d.paused);
  const vars=document.getElementById('bpDebugVariables'),trace=document.getElementById('bpDebugTrace');
  if(vars){vars.querySelectorAll('.bp-debug-row').forEach(el=>el.remove());for(const [key,value] of Object.entries(sequenceRuntime.globals)){const row=element('div','bp-debug-row');row.append(element('code','',key),element('strong','',JSON.stringify(value)));vars.append(row)}for(const [key,value] of Object.entries(d.current?.locals||{})){const row=element('div','bp-debug-row');row.append(element('code','','local.'+key),element('strong','',JSON.stringify(value)));vars.append(row)}for(const frame of d.current?.stack||[]){const row=element('div','bp-debug-row');row.append(element('code','','ƒ '+frame.id),element('strong','',JSON.stringify(frame.parameters)));vars.append(row)}}
  if(trace){trace.querySelectorAll('.bp-trace-row').forEach(el=>el.remove());for(const item of sequenceRuntime.trace.slice(-50).reverse()){const row=element('div','bp-trace-row '+(item.status==='error'?'has-error':''));row.append(element('code','',item.time.toFixed(2)+' s'),element('strong','',labelFor(item.type)),element('span','','Objet #'+item.objectId+(item.functionId?' · ƒ '+item.functionId:'')+(item.message?' · '+item.message:'')));trace.append(row)}}
  const recent=sequenceRuntime.trace.at(-1),owner=active(),entry=selected(owner);const last=recent?.objectId===owner?.id&&recent?.sequenceKey===entry?.key?recent:null;dialog.querySelectorAll('.bp-node-v2').forEach(el=>{el.classList.toggle('is-debug-current',d.paused&&el.dataset.nodeId===d.current?.nodeId&&(ui.tab==='functions'?ui.functionId===d.current?.functionId:owner?.id===d.current?.objectId&&entry?.key===d.current?.sequenceKey));el.classList.toggle('was-executed',el.dataset.nodeId===last?.nodeId&&last.status==='ok');el.classList.toggle('has-runtime-error',el.dataset.nodeId===last?.nodeId&&last.status==='error')});
 }
 const show=()=>{render();dialog.hidden=false;open.setAttribute('aria-expanded','true');dialog.querySelector('.bp-tab.is-active')?.focus()};
 const hide=()=>{dialog.hidden=true;open.setAttribute('aria-expanded','false');open.focus()};
 function download(blob,name){const url=URL.createObjectURL(blob),a=element('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500)}
 open.addEventListener('click',()=>dialog.hidden?show():hide());document.getElementById('blueprintClose').addEventListener('click',hide);
 document.getElementById('blueprintAdd').addEventListener('click',()=>{const owner=active();if(owner&&!state.playing){addSequence(owner,{...newSequence(),name:'Nouveau comportement'});ui.tab='instructions';change('Ajouter comportement')}});
 document.addEventListener('warlike:change',()=>{if(!dialog.hidden)render()});document.addEventListener('warlike:workspace',()=>{if(!dialog.hidden)render()});
 dialog.addEventListener('keydown',event=>{event.stopPropagation();if(state.playing&&['F6','F8','F10'].includes(event.key)){event.preventDefault();state.keys.clear();state.keyPresses?.clear();if(event.key==='F10')stepBlueprint();else if(event.key==='F6')resumeBlueprint();else pauseBlueprint();updateDebug();return}if(event.key==='Escape'){event.preventDefault();hide();return}if(event.key==='Tab'){const controls=[...dialog.querySelectorAll('button,input,select,textarea,a[href]')].filter(el=>!el.disabled&&el.getClientRects().length);if(!controls.length){event.preventDefault();dialog.focus();return}const first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}});
 let lastPauseRevision=0;setInterval(()=>{const d=blueprintDebugger;if(state.playing&&d.paused&&d.reason==='Point d’arrêt'&&d.revision!==lastPauseRevision){lastPauseRevision=d.revision;ui.tab='debug';show()}if(!dialog.hidden)updateDebug()},250);
 document.addEventListener('warlike:open-blueprint-defaults',event=>{const owner=state.entities.find(o=>o.id===event.detail?.ownerId);if(!owner)return;state.selected=[owner.id];ui.tab='variables';ui.variableName=null;show()});
 document.addEventListener('warlike:open-game-project',()=>{ui.tab='project';show()});
 document.addEventListener('warlike:open-behavior',event=>{const owner=state.entities.find(o=>o.id===event.detail?.ownerId);if(!owner)return;state.selected=[owner.id];ui.sequenceKey=event.detail.sequenceKey;ui.tab='graph';ui.nodeId=null;dialog.hidden=false;render();dialog.focus()});
}
