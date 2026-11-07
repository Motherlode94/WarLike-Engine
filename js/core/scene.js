import {deleteEntitySubtrees,duplicateEntitySubtrees,reparentEntities} from './scene-graph-v2.js';
import {encodeProjectAssets,restoreProjectAssets} from './portable-assets.js';
import {horror} from './horror-survival.js';
import {createAnimationDemo} from './animation-demo.js';
import {animationEditorPreview} from './animation-clips.js';
import {createTownDemo,createGarageDemo,createNatureDemo} from './authored-demo-scenes.js';
import {createBundledPhysicsScene2d} from './bundled-physics-scene.js';
import {inspectorMetadata} from './inspector-model.js';
import {canonicalScene,runtimeEntities} from './scene-contract.js';
import {startRuntimeSession,stopRuntimeSession} from './runtime-session.js';
import {inspectRuntimeCompatibility} from './runtime-capabilities.js';
import {gameProject,freshGameProject,restoreGameProject} from './game-project.js';
import {createGenreScene} from './genre-templates.js';
import {resetHeroRuntime} from './superhero-runtime.js';
import {inspectGraph,applyGraph} from './blueprint-graph.js';
import {inspectBlueprintGame} from './blueprint-validation.js';
import {resetEngineDiagnostics,stopEngineDiagnostics} from './engine-diagnostics.js';
import {startComponentRuntime,resetComponentRuntime} from './component-runtime.js';
import {resetSequences,sequenceEntries} from './logic-sequences.js';
import {prefab3d,get3dAsset} from '../assets/catalog-3d.js';
import {workspace,workspacePayload,restoreWorkspaces,captureWorkspace} from './workspaces.js';
import {lighting} from './lighting.js';
import {weaponStats,vehicleStats} from '../assets/armory-garage.js';
import {elementDefaults} from './game-elements.js';
import {modeDefaults} from './game-modes.js';
import {defaults as buildingDefaults} from '../assets/buildings.js';
import {humanoidClips} from '../assets/humanoid-rigs.js';
import {animationClips} from '../assets/catalog.js';
import {defaultLogic} from './visual-logic.js';
import {resetGame} from './gameplay.js';
import {getAsset} from '../assets/catalog.js';
import {state,notify} from './state.js';
import {record,renderHistory} from './history.js';
import {setCamera} from './camera.js';
export function addEntity(type='object'){if(state.playing)return;const id=state.nextId++;state.entities.push({id,name:(type==='player'?'Player ':type==='character'?'Character ':'Object ')+id,type,x:80+id*20,y:80+id*15,w:type==='character'?64:type==='player'?38:64,h:type==='character'?96:type==='player'?38:64,color:type==='player'?'#41cdb5':'#8195ef',...(type==='character'?{skin:'scout',animation:'idle'}:{})});state.selected=[id];record('Créer '+type);notify()}
export function addPrefab(assetId){if(state.playing)return;const prefab=getAsset(assetId);if(!prefab)return;const id=state.nextId++;const item={id,name:prefab.name+' '+id,type:'prefab',assetId:prefab.id,x:120+(id%10)*25,y:100+(id%7)*25,w:prefab.width,h:prefab.height,color:'#6f9eaf',animation:prefab.kind==='effect'?'loop':'idle',animationSpeed:1,animationPreview:false,hp:prefab.hp,behavior:'none',...(prefab.category==='Weapons'?{...weaponStats(prefab.id),weaponOwner:0}:{}),...(prefab.category==='Elements'?elementDefaults():{}),...(prefab.category==='Buildings'?buildingDefaults(prefab):{}),...(prefab.category==='Vehicles'?{maxSpeed:250,acceleration:210,brakeForce:310,turnRate:140,drag:1.4,collisionRadius:25,rotation:0,...vehicleStats(prefab.id)}:{})};state.entities.push(item);state.selected=[id];record('Ajouter '+prefab.name);notify()}
export function addLight(type='point'){
 if(state.playing)return;
 const id=state.nextId++;state.entities.push({id,name:type==='spot'?'Spot Light':'Point Light',type:'object',x:320,y:220,w:28,h:28,elevation3d:2.5,color:'#ffe5a3',
 lightType:type,lightEnabled:true,lightColor:type==='spot'?'#d7eaff':'#ffcd8a',lightIntensity:3,lightRange:13,lightAngle:45,rotation:0});
 state.selected=[id];record('Ajouter '+type+' light');notify();
}
export function addAudioEmitter(){
 if(state.playing)return;
 const id=state.nextId++;state.entities.push({id,name:'Audio Source',type:'object',x:410,y:260,w:28,h:28,elevation3d:1,color:'#84dcee',collision3d:false,visible:false,
 audioEnabled:true,audioClip:'vehicle',audioGain:.55,audioRange:18,audioInterval:3,audioLoop:true,audioSpatial:true});
 state.selected=[id];record('Ajouter Audio Source');notify();
}
export function deleteSelected(){
 if(state.playing||!state.selected.length)return;
 const result=deleteEntitySubtrees(state.entities,state.selected);
 if(!result.removed.size)return;
 state.entities=result.entities;
 state.selected=state.entities.length?[state.entities[0].id]:[];
 record('Supprimer '+result.removed.size+' objet(s) et enfants');notify();
}
export function reparentSelected(id,parentId){
 if(state.playing)throw Error('Impossible de déplacer la hiérarchie pendant Play');
 const current=state.entities.find(o=>o.id===id);
 if(!current)throw Error('GameObject absent');
 if((current.parentId??null)===(parentId??null))return false;
 state.entities=reparentEntities(state.entities,id,parentId);
 record('Changer le parent de '+current.name);
 notify();return true;
}
export function togglePlay(){
 const btn=document.querySelector('#play');
 if(state.playing){
  // Always restore the editor copy, even if a runtime cleanup reports an error.
  let error=null;
  try{resetHeroRuntime();stopEngineDiagnostics();resetSequences();stopRuntimeSession()}catch(e){error=e}
  finally{
   try{if(state.playBackup)state.entities=JSON.parse(state.playBackup)}catch(e){error??=e}
   state.nextId=state.playNextId??state.nextId;
   if(state.playHorrorBackup){Object.assign(horror,state.playHorrorBackup);state.playHorrorBackup=null}
   if(state.playCameraBackup)state.camera=structuredClone(state.playCameraBackup);state.playCameraBackup=null;state.playBackup=null;state.playNextId=null;state.playing=false;state.keys.clear();state.keyPresses?.clear();
   if(btn){btn.textContent='▶ Play';btn.classList.remove('active');btn.setAttribute('aria-pressed','false')}
   document.querySelector('#status')?.replaceChildren(document.createTextNode('Édition'));
   renderHistory();notify();
  }
  if(error)console.error('[WarLike Stop] Nettoyage incomplet :',error);
  return;
 }
 animationEditorPreview.stop();
 // Make a snapshot before any runtime mutation. Startup failures must not
 // leave Play active or damage the editable scene.
 const compatibility=inspectRuntimeCompatibility(state.entities,{target:gameProject.runtimeBackend==='native'?'native':'web',backend:gameProject.runtimeBackend,project:gameProject});
 if(compatibility.length)throw Error(compatibility[0].message);
 const blueprintErrors=inspectBlueprintGame(state.entities,{requirePlayer:false}).filter(issue=>issue.severity==='error');
 if(blueprintErrors.length)throw Error(blueprintErrors[0].message);
 for(const o of state.entities)for(const {sequence} of sequenceEntries(o))if(sequence.enabled!==false&&sequence.graph)applyGraph(sequence);
 const backup=JSON.stringify(state.entities),nextId=state.nextId;
 state.playBackup=backup;state.playCameraBackup=structuredClone(state.camera);state.playNextId=nextId;state.keyPresses?.clear();
 try{
  state.playing=true;
  const playable=state.entities.some(o=>o.playable3d===true||o.type==='player'||o.type==='character'||o.type==='prefab'&&getAsset(o.assetId)?.category==='Characters');
  if(!playable){
   const id=state.nextId++;
   state.entities.unshift({id,name:workspace.mode==='3d'?'3D Test Player':'2D Test Player',type:'character',skin:'scout',animation:'idle',x:100,y:100,w:45,h:78,color:'#41cdb5',elevation3d:0});
  }
  resetHeroRuntime();resetGame();resetSequences();resetEngineDiagnostics(workspace.mode);startRuntimeSession();
  const horrorActor=state.entities.find(o=>o.horrorSettings);if(horrorActor){state.playHorrorBackup=structuredClone(horror);Object.assign(horror,{...horrorActor.horrorSettings,battery:100,fear:0,threat:0,toggleHeld:false,jumpscare:0})}
  if(btn){btn.textContent='■ Stop';btn.classList.add('active');btn.setAttribute('aria-pressed','true')}
  document.querySelector('#status')?.replaceChildren(document.createTextNode('Play mode'));
  renderHistory();notify();
 }catch(error){
  try{stopEngineDiagnostics();stopRuntimeSession()}catch(cleanupError){console.error('[WarLike Play] rollback:',cleanupError)}
  state.entities=JSON.parse(backup);state.nextId=nextId;state.playing=false;
  if(state.playHorrorBackup){Object.assign(horror,state.playHorrorBackup);state.playHorrorBackup=null}
  state.keys.clear();if(state.playCameraBackup)state.camera=structuredClone(state.playCameraBackup);state.playCameraBackup=null;state.playBackup=null;state.playNextId=null;
  if(btn){btn.textContent='▶ Play';btn.classList.remove('active');btn.setAttribute('aria-pressed','false')}
  document.querySelector('#status')?.replaceChildren(document.createTextNode('Erreur Play'));
  renderHistory();notify();
  throw error;
 }
}
export async function exportScene(){if(state.playing)return;animationEditorPreview.stop();const payload={version:5,...workspacePayload(),entities:structuredClone(state.entities),scene:canonicalScene(state.entities,{id:gameProject.activeSceneId}),camera:structuredClone(state.camera),lighting:{hour:lighting.hour,speed:lighting.speed,dayNight:lighting.dayNight,sunEnabled:lighting.sunEnabled,sunIntensity:lighting.sunIntensity,ambient:lighting.ambient}};payload.importedAssets=await encodeProjectAssets(payload);const json=JSON.stringify(payload,null,2),url=URL.createObjectURL(new Blob([json],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='warlike-scene.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500)}
export async function importScene(file){if(state.playing)throw Error('Arrêter Play avant import');if(!file)throw Error('Aucun fichier');const data=JSON.parse(await file.text());if(data.schema==='warlike.scene.v2')data.entities=runtimeEntities(data);else if(!Array.isArray(data.entities)&&data.scene?.schema==='warlike.scene.v2')data.entities=runtimeEntities(data.scene);if(!Array.isArray(data.entities)||data.entities.length>10000)throw Error('Format de scène invalide');await restoreProjectAssets(data.importedAssets??data.importedModels);const ids=new Set();let next=1;const parsed=data.entities.map(o=>{if(!o||!['object','player','character','prefab','mesh3d'].includes(o.type)||typeof o.name!=='string'||typeof o.color!=='string'||!/^#[0-9a-f]{6}$/i.test(o.color)||!['x','y','w','h'].every(k=>Number.isFinite(o[k]))||o.w<=0||o.h<=0)throw Error('Objet invalide');let id=Number.isSafeInteger(o.id)&&o.id>0&&!ids.has(o.id)?o.id:next;while(ids.has(id))id++;ids.add(id);next=Math.max(next,id+1);return{...inspectorMetadata(o),id,name:o.name.slice(0,100),type:o.type,x:o.x,y:o.y,w:o.w,h:o.h,color:o.color,colorCustomized:o.colorCustomized===true,rotation:Number.isFinite(o.rotation)?o.rotation:0,...(typeof o.collision3d==='boolean'?{collision3d:o.collision3d}:{}),...(typeof o.solid3d==='boolean'?{solid3d:o.solid3d}:{}),...(Number.isFinite(o.depth3d)&&o.depth3d>0?{depth3d:o.depth3d}:{}),...(typeof o.spriteDataUrl==='string'&&o.spriteDataUrl.startsWith('data:image/png;base64,')&&o.spriteDataUrl.length<=1500000?{spriteDataUrl:o.spriteDataUrl}:{}),...(Number.isFinite(o.materialRoughness)?{materialRoughness:Number.isFinite(o.materialRoughness)?Math.max(.04,Math.min(1,o.materialRoughness)):.7}:{}),...(Number.isFinite(o.materialMetallic)?{materialMetallic:Number.isFinite(o.materialMetallic)?Math.max(0,Math.min(1,o.materialMetallic)):0}:{}),...Object.fromEntries(['blueprintOverrides','blueprintVariables','threatIntel','weaponSystem','cameraRig','fpsController','worldPoliceConfig','worldInfectedConfig','animationMap'].filter(key=>o[key]&&typeof o[key]==='object'&&!Array.isArray(o[key])).map(key=>[key,structuredClone(o[key])])),...(typeof o.aiFaction==='string'?{aiFaction:o.aiFaction.slice(0,40)}:{}),...(Number.isSafeInteger(o.aiTargetId)&&o.aiTargetId>0?{aiTargetId:o.aiTargetId}:{}),...(Array.isArray(o.tags)?{tags:o.tags.filter(tag=>typeof tag==='string').slice(0,128).map(tag=>tag.slice(0,60))}:{}),...(Number.isFinite(o.hp)?{hp:o.hp}:{}),...(o.stats&&typeof o.stats==='object'&&!Array.isArray(o.stats)?{stats:structuredClone(o.stats)}:{}),...(o.inventory&&typeof o.inventory==='object'&&!Array.isArray(o.inventory)?{inventory:structuredClone(o.inventory)}:{}),...(o.ai&&typeof o.ai==='object'&&!Array.isArray(o.ai)?{ai:structuredClone(o.ai)}:{}),...(o.controller3d&&typeof o.controller3d==='object'&&!Array.isArray(o.controller3d)?{controller3d:structuredClone(o.controller3d)}:{}),...Object.fromEntries(['lifeSim','lifeState','lifeNpc','lifePlace','company','companyUnit','companyBase','companyCover','battlefield','vehicleConfig','vehicleWeapon','collider3d','joint3d','adventure','adventureInteractable','survival','survivalState','survivalNode','survivalWorld','survivalThreat','animatorGraph','animationStudio','animationRig','animatorParameters','collider2d','rigidbody2d','controller2d','superhero','heroState','rpgProgression','fxEmitter','simulationNode','tacticalUnit','rtsOrder'].filter(k=>o[k]&&typeof o[k]==='object'&&!Array.isArray(o[k])).map(k=>[k,structuredClone(o[k])])),...(o.rigidbody3d&&typeof o.rigidbody3d==='object'&&!Array.isArray(o.rigidbody3d)?{rigidbody3d:structuredClone(o.rigidbody3d)}:{}),...(Array.isArray(o.csharpComponents)?{csharpComponents:structuredClone(o.csharpComponents.filter(c=>c&&typeof c.kind==='string').slice(0,64))}:{}),...(o.csharpScript&&typeof o.csharpScript.name==='string'&&typeof o.csharpScript.source==='string'?{csharpScript:{...(typeof o.csharpScript.enabled==='boolean'?{enabled:o.csharpScript.enabled}:{}),...(o.csharpScript.values&&typeof o.csharpScript.values==='object'?{values:structuredClone(o.csharpScript.values)}:{}),name:o.csharpScript.name.slice(0,64),source:o.csharpScript.source.slice(0,1048576),...(typeof o.csharpScript.scriptId==='string'?{scriptId:o.csharpScript.scriptId}:{})}}:{}),...(Array.isArray(o.webScripts)?{webScripts:structuredClone(o.webScripts.slice(0,8))}:{}),...(Array.isArray(o.warScripts)?{warScripts:structuredClone(o.warScripts.slice(0,8))}:{}),...(Array.isArray(o.scripts)?{scripts:o.scripts.filter(id=>typeof id==='string').slice(0,64)}:{}),...(Array.isArray(o.blueprintVariables)?{blueprintVariables:structuredClone(o.blueprintVariables)}:{}),...(typeof o.sceneObjectId==='string'?{sceneObjectId:o.sceneObjectId}:{}),...(Number.isSafeInteger(o.parentId)?{parentId:o.parentId}:{}),...(Array.isArray(o.sequences)?{sequences:structuredClone(o.sequences.slice(0,32))}:{}),...(o.sequence&&typeof o.sequence==='object'?{sequence:structuredClone(o.sequence)}:{}),elevation3d:Number.isFinite(o.elevation3d)?o.elevation3d:0,...(o.type==='mesh3d'?{assetId:get3dAsset(o.assetId)?.id||'primitive-cube',meshShape:get3dAsset(o.assetId)?.shape||'cube',depth3d:Number.isFinite(o.depth3d)?o.depth3d:64,collision3d:o.collision3d!==false,playable3d:o.playable3d===true,...(typeof o.model3dId==='string'&&get3dAsset(o.model3dId)?{model3dId:o.model3dId}:{}),rotation:Number.isFinite(o.rotation)?o.rotation:0}:{}),...Object.fromEntries(Object.entries(o).filter(([key,value])=>["rotationX3d","rotationZ3d","lightType","lightEnabled","lightColor","lightIntensity","lightRange","lightAngle","audioEnabled","audioClip","audioGain","audioRange","audioInterval","audioLoop","audioSpatial","audioFileName","visible","collision3d","solid2d","editorHidden","hideLabelInPlay","hierarchyGroup","animationAuto","animation3dClip","animationLoop","animationPreview","animationSpeed"].includes(key)&&['string','number','boolean'].includes(typeof value))),...(o.gameMode&&typeof o.gameMode==='object'?{gameMode:{...modeDefaults(),...o.gameMode}}:{}),...(Number.isInteger(o.team)?{team:o.team}:{}),...(o.logic&&typeof o.logic==='object'?{logic:structuredClone(o.logic)}:{}),...(o.dialogue&&typeof o.dialogue==='object'?{dialogue:structuredClone(o.dialogue)}:{}),...Object.fromEntries(['horrorAiConfig','horrorHideConfig','horrorFearConfig'].filter(k=>o[k]&&typeof o[k]==='object'&&!Array.isArray(o[k])).map(k=>[k,structuredClone(o[k])])),...(o.type==='character'?{skin:['scout','soldier'].includes(o.skin)?o.skin:'scout',animation:(animationClips.includes(o.animation)||humanoidClips(o.assetId||'').includes(o.animation))?o.animation:'idle',animationSpeed:Number.isFinite(o.animationSpeed)&&o.animationSpeed>0?o.animationSpeed:1,animationPreview:!!o.animationPreview}:{}),...(o.type==='prefab'?{assetId:getAsset(o.assetId)?.id||'crate',animation:(animationClips.includes(o.animation)||humanoidClips(o.assetId||'').includes(o.animation))?o.animation:'idle',animationSpeed:Number.isFinite(o.animationSpeed)&&o.animationSpeed>0?o.animationSpeed:1,animationPreview:!!o.animationPreview,hp:Number.isFinite(o.hp)?o.hp:100,aiSpeed:Number.isFinite(o.aiSpeed)&&o.aiSpeed>=0?o.aiSpeed:65,detectionRadius:Number.isFinite(o.detectionRadius)&&o.detectionRadius>=0?o.detectionRadius:650,behavior:['none','patrol','chase','guard','wander','flee','follow'].includes(o.behavior)?o.behavior:'none',...(getAsset(o.assetId)?.category==='Elements'?{...elementDefaults(),...Object.fromEntries(Object.entries(o).filter(([k])=>['elementEnabled','elementValue','elementDamage','elementRadius','elementTargetX','elementTargetY','elementKey'].includes(k)))}:{}),...(getAsset(o.assetId)?.category==='Buildings'?{...buildingDefaults(getAsset(o.assetId)),...Object.fromEntries(Object.entries(o).filter(([k])=>['buildState','constructionProgress','buildHp','buildMaxHp','buildLevel','buildTeam','buildPowered','buildCollision','buildProduction','buildTime','buildQueue','buildTimer','buildGrid','houseDoorOpen','houseDoorProgress','houseLightsOn'].includes(k)))}:{}),...(getAsset(o.assetId)?.category==='Weapons'?{...weaponStats(o.assetId),...Object.fromEntries(Object.entries(o).filter(([k])=>['weaponDamage','weaponInterval','weaponRange','weaponOwner'].includes(k)))}:{}),...(getAsset(o.assetId)?.category==='Vehicles'?{maxSpeed:Number.isFinite(o.maxSpeed)&&o.maxSpeed>0?o.maxSpeed:vehicleStats(o.assetId)?.maxSpeed||250,acceleration:Number.isFinite(o.acceleration)&&o.acceleration>0?o.acceleration:vehicleStats(o.assetId)?.acceleration||210,brakeForce:Number.isFinite(o.brakeForce)&&o.brakeForce>0?o.brakeForce:vehicleStats(o.assetId)?.brakeForce||310,turnRate:Number.isFinite(o.turnRate)&&o.turnRate>0?o.turnRate:vehicleStats(o.assetId)?.turnRate||140,drag:Number.isFinite(o.drag)&&o.drag>=0?o.drag:1.4,collisionRadius:Number.isFinite(o.collisionRadius)&&o.collisionRadius>0?o.collisionRadius:vehicleStats(o.assetId)?.collisionRadius||25}:{})}:{})}});if(data.lighting&&typeof data.lighting==='object'){
 for(const key of ['hour','speed','sunIntensity','ambient'])if(Number.isFinite(data.lighting[key]))lighting[key]=data.lighting[key];
 for(const key of ['dayNight','sunEnabled'])if(typeof data.lighting[key]==='boolean')lighting[key]=data.lighting[key];
 }
 state.entities=parsed;state.nextId=next;state.selected=parsed.length?[parsed[0].id]:[];setCamera(data.camera);if(data.workspaces)restoreWorkspaces(data,true);record('Importer scène');notify()}

export function duplicateSelected(){
 if(state.playing||!state.selected.length)return;
 const result=duplicateEntitySubtrees(state.entities,state.selected,state.nextId);
 if(!result.selected.length)return;
 state.entities=result.entities;state.selected=result.selected;state.nextId=result.nextId;
 record('Dupliquer '+result.selected.length+' objet(s) avec leurs enfants');
 notify();
}

export function loadCombatDemo(){if(state.playing)return;const entities=[],add=(name,type,assetId,x,y,w,h,other={})=>{entities.push({id:entities.length+1,name,type,assetId,x,y,w,h,color:'#579ca5',...other})};
add('Ranger','character',undefined,120,210,48,72,{skin:'scout',animation:'idle',hp:100});
for(const [x,y] of [[320,100],[590,290],[770,120],[470,430]])add('Zombie '+(entities.length+1),'prefab','zombie',x,y,54,76,{hp:100,behavior:'chase',animation:'idle'});
for(const [x,y] of [[780,390],[930,210]])add('Goblin '+(entities.length+1),'prefab','goblin',x,y,50,72,{hp:66,behavior:'chase',animation:'idle'});
for(const [x,y] of [[280,260],[520,125],[700,335],[975,380]])add('Crate '+(entities.length+1),'prefab','crate',x,y,68,62,{hp:100,behavior:'none'});
for(const [x,y] of [[190,430],[875,75]])add('Medkit '+(entities.length+1),'prefab','medkit',x,y,46,54,{hp:1,behavior:'none'});
add('Jeep','prefab','jeep',230,390,110,66,{hp:200,behavior:'none'});
add('Campfire','prefab','campfire',550,530,60,72,{hp:100,behavior:'none'});
state.entities=entities;state.nextId=entities.length+1;state.selected=[1];setCamera({x:65,y:40,zoom:.8});state.demoGuide='Combat 2D : ZQSD/WASD pour bouger, F ou clic pour tirer, H pour se soigner.';record('Charger Combat Sandbox');notify()}

export function loadDrivingDemo(){return loadAuthoredDemo('garage')}

export function addLogicHotspot(){if(state.playing)return;const id=state.nextId++;state.entities.push({id,name:'Hotspot '+id,type:'object',x:210+id*13,y:180+id*8,w:48,h:48,color:'#f2b65b',logic:defaultLogic()});state.selected=[id];record('Créer hotspot');notify()}
export function loadLogicDemo(){if(state.playing)return;const entities=[],add=(name,type,x,y,w,h,color,logic)=>entities.push({id:entities.length+1,name,type,x,y,w,h,color,...(type==='character'?{skin:'scout'}:{}),...(logic?{logic}:{})});
add('Player','character',100,190,48,72,'#36c9ad');
const chest=defaultLogic();chest.prompt='Ouvrir le coffre';chest.actions=[{type:'giveItem',key:'key',value:1},{type:'message',value:'Clé trouvée dans le coffre !'}];chest.once=true;
add('Coffre interactif','object',320,195,54,52,'#d2a04f',chest);
const door=defaultLogic();door.prompt='Ouvrir la porte';door.conditions=[{type:'hasItem',key:'key',value:1}];door.actions=[{type:'message',value:'Porte ouverte. Passage débloqué !'},{type:'destroy'}];door.once=true;
add('Porte verrouillée','object',620,177,35,95,'#91705a',door);
const greet=defaultLogic();greet.event='onEnter';greet.prompt='Accueil';greet.once=true;greet.actions=[{type:'message',value:'Explore la scène : récupère la clé puis ouvre la porte.'}];
add('Zone bienvenue','object',175,170,50,90,'#4b90ac',greet);
state.entities=entities;state.nextId=entities.length+1;state.selected=[2];setCamera({x:100,y:75,zoom:1});state.demoGuide='Logic 2D : approche le coffre, presse E pour la clé, puis ouvre la porte avec E.';record('Charger Visual Logic Demo');notify()}

export function loadRpgDemo(){return loadAuthoredDemo('town')}

export function loadNinjaZombieDemo(){
 if(state.playing)return;
 const all=[],add=(name,assetId,x,y,other={})=>{const prefab=getAsset(assetId);if(!prefab)return;all.push({id:all.length+1,name,type:'prefab',assetId,x,y,w:prefab.width,h:prefab.height,color:'#718a8d',hp:prefab.hp,behavior:'none',animation:'idle',animationSpeed:1,...other})};
 add('Shadow Ninja','ninja',135,245,{hp:100,animation:'idle'});
 for(const [id,x,y] of [['zombie',440,180],['zombie-runner',680,235],['zombie-crawler',500,420],['zombie-brute',830,355],['zombie',980,150]])add('Zombie '+(all.length+1),id,x,y,{behavior:'chase',hp:id==='zombie-brute'?200:75,aiSpeed:id==='zombie-runner'?110:id==='zombie-crawler'?36:62,animation:id==='zombie-crawler'?'crawl':'walk_zombie'});
 for(const [id,x,y] of [['crate',360,325],['crate',730,105],['sandbag',710,450],['rock',970,450],['pine',320,80],['pine',1010,275],['fire',605,460],['smoke',860,85]])add(id,id,x,y,{behavior:'none'});
 state.entities=all;state.nextId=all.length+1;state.selected=[1];setCamera({x:70,y:45,zoom:.85});state.demoGuide='Ninja 2D : ZQSD/WASD, K pour le katana, F pour attaquer à distance.';record('Charger Ninja vs Zombies');notify();
}

export function loadBuildingDemo(){
 if(state.playing)return;
 const entities=[],add=(assetId,x,y,props={})=>{
  const a=getAsset(assetId);if(!a)return;
  const obj={id:entities.length+1,name:a.name+' '+(entities.length+1),type:'prefab',assetId,x,y,w:a.width,h:a.height,color:'#7797a5',hp:a.hp,animation:'idle',...props};
  if(a.category==='Buildings')Object.assign(obj,{...buildingDefaults(a),...props});
  entities.push(obj)
 };
 add('scout',90,255,{name:'Commander',type:'character',skin:'scout',animation:'idle',hp:100});
 add('rts-hq',290,180,{buildTeam:1});
 add('rts-barracks',490,230,{buildTeam:1,buildProduction:'soldier',buildQueue:3,buildTime:6});
 add('rts-factory',745,240,{buildTeam:1,buildProduction:'jeep',buildQueue:2,buildTime:9});
 add('rts-power',515,70,{buildTeam:1});
 add('rts-turret',985,170,{buildTeam:1});
 add('city-house',290,410,{buildTeam:1});
 add('fantasy-castle',760,430,{buildTeam:2,buildState:'construction',constructionProgress:18});
 add('sports-stadium',1050,390,{buildTeam:0});
 state.entities=entities;state.nextId=entities.length+1;state.selected=[3];setCamera({x:25,y:55,zoom:.8});state.demoGuide='RTS 2D : lance Play et observe les unités produites par Barracks et Factory.';record('Charger Buildings RTS Demo');notify();
}

export function setGameModeOnScene(kind='deathmatch'){
 if(state.playing)return;
 const mode=modeDefaults();mode.kind=kind;
 let hero=state.entities.find(e=>e.gameMode)||state.entities.find(e=>e.type==='player'||e.type==='character'||getAsset(e.assetId)?.category==='Characters');
 if(!hero){addEntity('player');hero=state.entities.find(e=>e.id===state.selected.at(-1))}
 hero.gameMode={...mode,...(hero.gameMode||{}),kind};hero.team=1;
 state.selected=[hero.id];record('Game Mode: '+kind);notify();
}
export function loadGameModeDemo(kind='deathmatch'){
 if(state.playing)return;
 const m=modeDefaults();m.kind=kind;
 if(kind==='battleRoyale'){m.timeLimit=180;m.zoneRadius=640;m.zoneShrinkSeconds=100}
 if(kind==='frontline'){m.timeLimit=200;m.captureSeconds=8;m.scoreLimit=12}
 if(kind==='roleplay'){m.timeLimit=0}
 const result=[],insert=(name,type,id,x,y,extra={})=>{const asset=id?getAsset(id):null;result.push({id:result.length+1,name,type,assetId:id||undefined,x,y,w:asset?.width||48,h:asset?.height||66,color:extra.color||'#6f9eaf',hp:asset?.hp||100,animation:'idle',behavior:'none',...extra})};
 insert('Player','character',null,100,285,{skin:'scout',team:1,gameMode:m});
 const bots=kind==='roleplay'?3:kind==='frontline'?6:kind==='teamDeathmatch'?8:7;
 const ids=kind==='roleplay'?['soldier','medic','mechanic']:['zombie','goblin','zombie-runner','skeleton'];
 for(let i=0;i<bots;i++){const assetId=ids[i%ids.length];insert(kind==='roleplay'?['Police','Medic','Mechanic'][i]:'Bot '+(i+1),'prefab',assetId,350+(i%4)*170,120+Math.floor(i/4)*170,{team:kind==='teamDeathmatch'||kind==='frontline'?(i%2)+1:2,behavior:kind==='roleplay'?'patrol':'chase',aiSpeed:kind==='roleplay'?27:62,hp:100})}
 for(let i=0;i<8;i++){const assetId=i%3===0?'crate':i%3===1?'rock':'sandbag';insert('Cover '+(i+1),'prefab',assetId,220+(i%5)*185,95+Math.floor(i/5)*360)}
 if(kind==='roleplay'){insert('Police Station','prefab','city-police',850,380);insert('Hospital','prefab','city-hospital',580,390);insert('Shop','prefab','city-shop',240,450);insert('Maison RP','prefab','city-house',110,570);insert('Garage / Workshop','prefab','city-warehouse',1030,160);insert('Military HQ','prefab','rts-hq',1110,440)}
 if(kind==='frontline'){insert('Outpost','prefab','rts-bunker',780,180);insert('Command Post','prefab','rts-hq',1050,430)}
 if(['roleplay','battleRoyale','frontline','teamDeathmatch','deathmatch'].includes(kind)){insert('Jeep jouable','prefab','jeep',175,335,{maxSpeed:280,acceleration:245,brakeForce:320,turnRate:150,drag:1.4,collisionRadius:24});insert('Buggy jouable','prefab','buggy',865,555,{maxSpeed:330,acceleration:290,brakeForce:390,turnRate:170,drag:1.6,collisionRadius:22})}
 state.entities=result;state.nextId=result.length+1;state.selected=[1];setCamera({x:45,y:45,zoom:.85});state.demoGuide='Mode '+kind+' : ZQSD/WASD pour bouger, F pour tirer ; objectifs et scores en Play.';record('Démo '+kind);notify();
}

export function loadElementsDemo(){
 if(state.playing)return;
 const items=[];
 const add=(id,x,y,opts={})=>{const a=getAsset(id);if(!a)return;items.push({id:items.length+1,name:a.name,type:'prefab',assetId:id,x,y,w:a.width,h:a.height,color:'#78a4b9',hp:a.hp,animation:'idle',...elementDefaults(),...opts})};
 items.push({id:1,name:'Explorer',type:'character',skin:'scout',animation:'idle',x:100,y:245,w:48,h:76,color:'#57bea9',hp:100});
 const map=[['coin',220,150],['gem',310,150],['health-pickup',400,150],['ammo-pickup',490,150],['keycard',580,150],['locked-gate',750,150],['lever',660,150],['checkpoint',215,340],['spike-trap',330,340],['laser-trap',440,340],['boost-pad',540,340],['teleporter',660,340],['portal-pad',910,330],['finish-line',1080,370],['shield-pickup',850,150],['quest-scroll',980,150],['supply-crate',1100,150]];
 for(const [id,x,y] of map)add(id,x,y,id==='teleporter'?{elementTargetX:950,elementTargetY:290}:{});
 state.entities=items;state.nextId=items.length+1;state.selected=[1];setCamera({x:15,y:40,zoom:.9});state.demoGuide='Elements 2D : ramasse les bonus, E pour actionner le levier et ouvrir la porte.';record('Charger Elements Demo');notify();
}

// Each demo is a complete, playable sandbox for its own project type.
export function loadAuthoredDemo(kind='town'){
 if(state.playing)return false;
 const builders={animation:createAnimationDemo,town:createTownDemo,nature:createNatureDemo,garage:createGarageDemo,platformer:()=>{if(workspace.mode!=='2d')throw Error('Le parcours plateforme utilise le projet 2D.');return createBundledPhysicsScene2d()}};
 const genre=kind.startsWith('genre:')?kind.slice(6):null;
 const build=genre?mode=>createGenreScene(genre,mode):builders[kind];if(!build)throw Error('Scène démo inconnue.');
 const demo=build(workspace.mode);record('Avant changement de scène démo');
 if(genre)restoreGameProject({...freshGameProject(),id:gameProject.id,title:gameProject.title,...demo.game,genre});
 Object.assign(state,{entities:demo.entities,selected:demo.selected,nextId:demo.nextId,demoGuide:demo.guide});
 setCamera(demo.camera||{x:0,y:0,zoom:.8});gameProject.genre=genre||demo.genre||(kind==='platformer'?'platformer':'adventure');
 record('Scène démo · '+kind);notify();return true;
}
export function load3dBetaDemo(kind='town'){
 if(state.playing||workspace.mode!=='3d')return false;
 return loadAuthoredDemo(kind);
}
