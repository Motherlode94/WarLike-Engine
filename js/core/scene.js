import {resetEngineDiagnostics,stopEngineDiagnostics} from './engine-diagnostics.js';
import {startComponentRuntime,resetComponentRuntime} from './component-runtime.js';
import {resetSequences} from './logic-sequences.js';
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
 const id=state.nextId++;state.entities.push({id,name:'Audio Source',type:'object',x:410,y:260,w:28,h:28,elevation3d:1,color:'#84dcee',
 audioEnabled:true,audioClip:'vehicle',audioGain:.55,audioRange:18,audioInterval:3,audioLoop:true,audioSpatial:true});
 state.selected=[id];record('Ajouter Audio Source');notify();
}
export function deleteSelected(){if(state.playing||!state.selected.length)return;state.entities=state.entities.filter(o=>!state.selected.includes(o.id));state.selected=state.entities.length?[state.entities[0].id]:[];record('Supprimer objets');notify()}
export function togglePlay(){state.playing=!state.playing;const btn=document.querySelector('#play');if(state.playing){
 state.playBackup=JSON.stringify(state.entities);state.playNextId=state.nextId;
 const playable=state.entities.some(o=>o.playable3d===true||o.type==='player'||o.type==='character'||o.type==='prefab'&&getAsset(o.assetId)?.category==='Characters');
 if(!playable){
  const id=state.nextId++;
  state.entities.unshift({id,name:workspace.mode==='3d'?'3D Test Player':'2D Test Player',type:'character',skin:'scout',animation:'idle',x:100,y:100,w:45,h:78,color:'#41cdb5',elevation3d:0});
 }
 resetGame();resetSequences();resetEngineDiagnostics(workspace.mode);startComponentRuntime();btn.textContent='■ Stop';btn.classList.add('active')
}else{state.entities=JSON.parse(state.playBackup);state.nextId=state.playNextId??state.nextId;state.keys.clear();stopEngineDiagnostics();resetSequences();resetComponentRuntime();btn.textContent='▶ Play';btn.classList.remove('active')}document.querySelector('#status').textContent=state.playing?'Play mode':'Édition';renderHistory();notify()}
export function exportScene(){if(state.playing)return;const json=JSON.stringify({version:5,...workspacePayload(),entities:state.entities,camera:state.camera,lighting:{hour:lighting.hour,speed:lighting.speed,dayNight:lighting.dayNight,sunEnabled:lighting.sunEnabled,sunIntensity:lighting.sunIntensity,ambient:lighting.ambient}},null,2),url=URL.createObjectURL(new Blob([json],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='warlike-scene.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500)}
export async function importScene(file){if(state.playing)throw Error('Arrêter Play avant import');if(!file)throw Error('Aucun fichier');const data=JSON.parse(await file.text());if(!Array.isArray(data.entities)||data.entities.length>10000)throw Error('Format de scène invalide');const ids=new Set();let next=1;const parsed=data.entities.map(o=>{if(!o||!['object','player','character','prefab','mesh3d'].includes(o.type)||typeof o.name!=='string'||typeof o.color!=='string'||!/^#[0-9a-f]{6}$/i.test(o.color)||!['x','y','w','h'].every(k=>Number.isFinite(o[k]))||o.w<=0||o.h<=0)throw Error('Objet invalide');let id=Number.isSafeInteger(o.id)&&o.id>0&&!ids.has(o.id)?o.id:next;while(ids.has(id))id++;ids.add(id);next=Math.max(next,id+1);return{id,name:o.name.slice(0,100),type:o.type,x:o.x,y:o.y,w:o.w,h:o.h,color:o.color,colorCustomized:o.colorCustomized===true,materialRoughness:Number.isFinite(o.materialRoughness)?Math.max(.04,Math.min(1,o.materialRoughness)):.7,materialMetallic:Number.isFinite(o.materialMetallic)?Math.max(0,Math.min(1,o.materialMetallic)):0,...(o.stats&&typeof o.stats==='object'&&!Array.isArray(o.stats)?{stats:structuredClone(o.stats)}:{}),...(o.inventory&&typeof o.inventory==='object'&&!Array.isArray(o.inventory)?{inventory:structuredClone(o.inventory)}:{}),...(o.ai&&typeof o.ai==='object'&&!Array.isArray(o.ai)?{ai:structuredClone(o.ai)}:{}),...(o.controller3d&&typeof o.controller3d==='object'&&!Array.isArray(o.controller3d)?{controller3d:structuredClone(o.controller3d)}:{}),...(o.rigidbody3d&&typeof o.rigidbody3d==='object'&&!Array.isArray(o.rigidbody3d)?{rigidbody3d:structuredClone(o.rigidbody3d)}:{}),...(o.sequence&&typeof o.sequence==='object'?{sequence:structuredClone(o.sequence)}:{}),elevation3d:Number.isFinite(o.elevation3d)?o.elevation3d:0,...(o.type==='mesh3d'?{assetId:get3dAsset(o.assetId)?.id||'primitive-cube',meshShape:get3dAsset(o.assetId)?.shape||'cube',depth3d:Number.isFinite(o.depth3d)?o.depth3d:64,collision3d:o.collision3d!==false,playable3d:o.playable3d===true,rotation:Number.isFinite(o.rotation)?o.rotation:0}:{}),...Object.fromEntries(Object.entries(o).filter(([key,value])=>["lightType","lightEnabled","lightColor","lightIntensity","lightRange","lightAngle","audioEnabled","audioClip","audioGain","audioRange","audioInterval","audioLoop","audioSpatial","audioFileName"].includes(key)&&['string','number','boolean'].includes(typeof value))),...(o.gameMode&&typeof o.gameMode==='object'?{gameMode:{...modeDefaults(),...o.gameMode}}:{}),...(Number.isInteger(o.team)?{team:o.team}:{}),...(o.logic&&typeof o.logic==='object'?{logic:structuredClone(o.logic)}:{}),...(o.dialogue&&typeof o.dialogue==='object'?{dialogue:structuredClone(o.dialogue)}:{}),...Object.fromEntries(['horrorAiConfig','horrorHideConfig','horrorFearConfig'].filter(k=>o[k]&&typeof o[k]==='object'&&!Array.isArray(o[k])).map(k=>[k,structuredClone(o[k])])),...(o.type==='character'?{skin:['scout','soldier'].includes(o.skin)?o.skin:'scout',animation:(animationClips.includes(o.animation)||humanoidClips(o.assetId||'').includes(o.animation))?o.animation:'idle',animationSpeed:Number.isFinite(o.animationSpeed)&&o.animationSpeed>0?o.animationSpeed:1,animationPreview:!!o.animationPreview}:{}),...(o.type==='prefab'?{assetId:getAsset(o.assetId)?.id||'crate',animation:(animationClips.includes(o.animation)||humanoidClips(o.assetId||'').includes(o.animation))?o.animation:'idle',animationSpeed:Number.isFinite(o.animationSpeed)&&o.animationSpeed>0?o.animationSpeed:1,animationPreview:!!o.animationPreview,hp:Number.isFinite(o.hp)?o.hp:100,aiSpeed:Number.isFinite(o.aiSpeed)&&o.aiSpeed>=0?o.aiSpeed:65,detectionRadius:Number.isFinite(o.detectionRadius)&&o.detectionRadius>=0?o.detectionRadius:650,behavior:['none','patrol','chase','guard','wander','flee','follow'].includes(o.behavior)?o.behavior:'none',...(getAsset(o.assetId)?.category==='Elements'?{...elementDefaults(),...Object.fromEntries(Object.entries(o).filter(([k])=>['elementEnabled','elementValue','elementDamage','elementRadius','elementTargetX','elementTargetY','elementKey'].includes(k)))}:{}),...(getAsset(o.assetId)?.category==='Buildings'?{...buildingDefaults(getAsset(o.assetId)),...Object.fromEntries(Object.entries(o).filter(([k])=>['buildState','constructionProgress','buildHp','buildMaxHp','buildLevel','buildTeam','buildPowered','buildCollision','buildProduction','buildTime','buildQueue','buildTimer','buildGrid','houseDoorOpen','houseDoorProgress','houseLightsOn'].includes(k)))}:{}),...(getAsset(o.assetId)?.category==='Weapons'?{...weaponStats(o.assetId),...Object.fromEntries(Object.entries(o).filter(([k])=>['weaponDamage','weaponInterval','weaponRange','weaponOwner'].includes(k)))}:{}),...(getAsset(o.assetId)?.category==='Vehicles'?{maxSpeed:Number.isFinite(o.maxSpeed)&&o.maxSpeed>0?o.maxSpeed:vehicleStats(o.assetId)?.maxSpeed||250,acceleration:Number.isFinite(o.acceleration)&&o.acceleration>0?o.acceleration:vehicleStats(o.assetId)?.acceleration||210,brakeForce:Number.isFinite(o.brakeForce)&&o.brakeForce>0?o.brakeForce:vehicleStats(o.assetId)?.brakeForce||310,turnRate:Number.isFinite(o.turnRate)&&o.turnRate>0?o.turnRate:vehicleStats(o.assetId)?.turnRate||140,drag:Number.isFinite(o.drag)&&o.drag>=0?o.drag:1.4,collisionRadius:Number.isFinite(o.collisionRadius)&&o.collisionRadius>0?o.collisionRadius:vehicleStats(o.assetId)?.collisionRadius||25}:{})}:{})}});if(data.lighting&&typeof data.lighting==='object'){
 for(const key of ['hour','speed','sunIntensity','ambient'])if(Number.isFinite(data.lighting[key]))lighting[key]=data.lighting[key];
 for(const key of ['dayNight','sunEnabled'])if(typeof data.lighting[key]==='boolean')lighting[key]=data.lighting[key];
 }
 state.entities=parsed;state.nextId=next;state.selected=parsed.length?[parsed[0].id]:[];setCamera(data.camera);if(data.workspaces)restoreWorkspaces(data,true);record('Importer scène');notify()}

export function duplicateSelected(){if(state.playing||!state.selected.length)return;const copies=state.entities.filter(o=>state.selected.includes(o.id)).map(o=>({...o,id:state.nextId++,name:o.name+' Copy',x:o.x+24,y:o.y+24}));state.entities.push(...copies);state.selected=copies.map(o=>o.id);record('Dupliquer '+copies.length+' objet(s)');notify()}

export function loadCombatDemo(){if(state.playing)return;const entities=[],add=(name,type,assetId,x,y,w,h,other={})=>{entities.push({id:entities.length+1,name,type,assetId,x,y,w,h,color:'#579ca5',...other})};
add('Ranger','character',undefined,120,210,48,72,{skin:'scout',animation:'idle',hp:100});
for(const [x,y] of [[320,100],[590,290],[770,120],[470,430]])add('Zombie '+(entities.length+1),'prefab','zombie',x,y,54,76,{hp:100,behavior:'chase',animation:'idle'});
for(const [x,y] of [[780,390],[930,210]])add('Goblin '+(entities.length+1),'prefab','goblin',x,y,50,72,{hp:66,behavior:'chase',animation:'idle'});
for(const [x,y] of [[280,260],[520,125],[700,335],[975,380]])add('Crate '+(entities.length+1),'prefab','crate',x,y,68,62,{hp:100,behavior:'none'});
for(const [x,y] of [[190,430],[875,75]])add('Medkit '+(entities.length+1),'prefab','medkit',x,y,46,54,{hp:1,behavior:'none'});
add('Jeep','prefab','jeep',230,390,110,66,{hp:200,behavior:'none'});
add('Campfire','prefab','campfire',550,530,60,72,{hp:100,behavior:'none'});
state.entities=entities;state.nextId=entities.length+1;state.selected=[1];setCamera({x:65,y:40,zoom:.8});state.demoGuide='Combat 2D : ZQSD/WASD pour bouger, F ou clic pour tirer, H pour se soigner.';record('Charger Combat Sandbox');notify()}

export function loadDrivingDemo(){if(state.playing)return;const entities=[],add=(name,type,assetId,x,y,w,h,rest={})=>entities.push({id:entities.length+1,name,type,assetId,x,y,w,h,color:'#5f99af',rotation:0,...rest});
add('Driver','character',undefined,155,250,50,72,{skin:'scout',animation:'idle'});
add('Jeep','prefab','jeep',226,245,105,72,{hp:200,behavior:'none',maxSpeed:285,acceleration:235,brakeForce:320,turnRate:155,drag:1.3,collisionRadius:24});
add('Tank','prefab','tank',640,145,126,86,{hp:400,behavior:'none',maxSpeed:110,acceleration:95,brakeForce:160,turnRate:68,drag:2.1,collisionRadius:33});
add('Buggy','prefab','buggy',540,395,100,66,{hp:130,behavior:'none',maxSpeed:345,acceleration:310,brakeForce:260,turnRate:195,drag:.8,collisionRadius:23});
for(const [x,y] of [[410,220],[490,260],[750,350],[330,440],[850,160],[160,520]])add('Roadblock','prefab','crate',x,y,65,60,{hp:100});
for(const [x,y] of [[900,450],[1000,230],[390,550]])add('Rock','prefab','rock',x,y,75,64,{hp:100});
state.entities=entities;state.nextId=entities.length+1;state.selected=[2];setCamera({x:65,y:20,zoom:.85});state.demoGuide='Conduite 2D : E pour monter dans la Jeep proche, ZQSD/WASD pour conduire, E pour descendre.';record('Charger Driving Sandbox');notify()}

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

export function loadRpgDemo(){if(state.playing)return;const entities=[],add=(name,type,x,y,w,h,color,more={})=>entities.push({id:entities.length+1,name,type,x,y,w,h,color,...more});
add('Hero','character',105,240,48,72,'#32c4a8',{skin:'scout',hp:100});
const elder=defaultLogic();elder.prompt='Parler à Elara';elder.actions=[{type:'startDialogue'}];
const dialogue={title:'Elara — Gardienne',nodes:[
{text:'Bienvenue ! Le village a perdu trois reliques. Tu peux nous aider ?',choices:[{text:'Accepter la quête',next:1,quest:'relics',questTitle:'Les trois reliques',goal:3},{text:'Pas maintenant',next:-1}]},
{text:'Cherche trois fragments de cristal au nord du village. Reviens quand tu les auras.',choices:[{text:'Je m’en occupe.',next:-1}]}]};
add('Elara','object',300,240,55,75,'#9a83d4',{logic:elder,dialogue});
for(const [x,y] of [[460,150],[670,310],[870,190]]){const l=defaultLogic();l.prompt='Ramasser relique';l.once=true;l.conditions=[{type:'questActive',key:'relics'}];l.actions=[{type:'giveItem',key:'relic',value:1},{type:'progressQuest',key:'relics',value:1},{type:'message',value:'Relique récupérée !'},{type:'destroy'}];add('Relique','object',x,y,30,35,'#6ae9c3',{logic:l})}
const gate=defaultLogic();gate.prompt='Ouvrir portail';gate.conditions=[{type:'questCompleted',key:'relics'}];gate.actions=[{type:'message',value:'Le portail est déverrouillé !'},{type:'destroy'}];gate.once=true;
add('Portail ancien','object',1000,200,42,140,'#a56f48',{logic:gate});
for(const [x,y] of [[390,390],[770,460],[590,95]])add('Arbre','prefab',x,y,65,85,'#699b66',{assetId:'tree',hp:100});
state.entities=entities;state.nextId=entities.length+1;state.selected=[2];setCamera({x:90,y:35,zoom:.9});state.demoGuide='RPG 2D : parler à Elara avec E, accepter sa quête et ramasser les trois reliques.';record('Charger RPG Demo');notify()}

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
export function load3dBetaDemo(kind='town'){
 if(state.playing||workspace.mode!=='3d')return;
 const entities=[];
 const actor=(name,x,z,id='character-hero')=>{
  const e=prefab3d(id,entities.length+1,x,z);if(e){e.name=name;e.type='mesh3d';e.playable3d=true;entities.push(e)}
 };
 const put=(id,x,z,opts={})=>{
  const e=prefab3d(id,entities.length+1,x,z);
  if(!e)return null;
  Object.assign(e,opts);entities.push(e);return e;
 };
 actor('Player 3D',140,180);
 if(kind==='town'){
  put('environment-grass',-350,-350,{name:'Town Ground',collision3d:false});
  put('environment-road',150,520,{name:'Main Road',collision3d:false});
  put('building-house',420,180);put('building-garage',730,180);
  put('building-tower',970,370);put('building-lamp',390,490);
  put('vehicle-jeep',280,550);put('vehicle-sports',670,540);
  put('nature-oak',80,490);put('nature-pine',1030,140);
  put('prop-crate',860,560);
 }else if(kind==='nature'){
  put('environment-grass',-200,-100,{name:'Landscape',w:1400,depth3d:1000,h:4,collision3d:false});
  for(const [id,x,z] of [['nature-oak',400,220],['nature-pine',650,310],['nature-oak',970,180],['nature-boulder',800,550],['nature-rock',270,570],['nature-cactus',1090,630],['nature-bush',500,660],['nature-log',960,470]])put(id,x,z,{collision3d:id.includes('bush')?false:true});
  put('building-house',1160,320);
 }else{
  put('environment-road',40,390,{name:'Garage Track',w:1300,depth3d:460,h:4,collision3d:false});
  put('building-hangar',680,110);
  for(const [id,x,z] of [['vehicle-jeep',300,510],['vehicle-sports',550,520],['vehicle-tank',900,540],['vehicle-truck',1150,550],['vehicle-bike',360,740]])put(id,x,z);
  for(const [x,z] of [[200,900],[500,900],[800,900],[1100,900]])put('prop-cone',x,z,{collision3d:false});
 }
 const light=put('primitive-sphere',445,360,{name:'Sunlit Lamp',w:20,h:20,depth3d:20,elevation3d:3,color:'#ffd38a',collision3d:false});
 if(light)Object.assign(light,{lightType:'point',lightEnabled:true,lightColor:'#ffca88',lightIntensity:5,lightRange:17});
 const sound=put('primitive-cube',760,300,{name:'Ambient 3D Sound',w:22,h:22,depth3d:22,collision3d:false});
 if(sound)Object.assign(sound,{audioEnabled:true,audioClip:'vehicle',audioGain:.4,audioRange:18,audioInterval:3,audioLoop:true,audioSpatial:true});
 state.entities=entities;state.nextId=entities.length+1;state.selected=[1];setCamera({x:0,y:0,zoom:.7});
 state.demoGuide='3D '+kind+' : ZQSD/WASD pour bouger, Maj pour courir, clic droit pour orbiter.';record('Démo 3D : '+kind);notify();
}
