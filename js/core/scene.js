import {humanoidClips} from '../assets/humanoid-rigs.js';
import {animationClips} from '../assets/catalog.js';
import {defaultLogic} from './visual-logic.js';
import {resetGame} from './gameplay.js';
import {getAsset} from '../assets/catalog.js';
import {state,notify} from './state.js';
import {record,renderHistory} from './history.js';
import {setCamera} from './camera.js';
export function addEntity(type='object'){if(state.playing)return;const id=state.nextId++;state.entities.push({id,name:(type==='player'?'Player ':type==='character'?'Character ':'Object ')+id,type,x:80+id*20,y:80+id*15,w:type==='character'?64:type==='player'?38:64,h:type==='character'?96:type==='player'?38:64,color:type==='player'?'#41cdb5':'#8195ef',...(type==='character'?{skin:'scout',animation:'idle'}:{})});state.selected=[id];record('Créer '+type);notify()}
export function addPrefab(assetId){if(state.playing)return;const prefab=getAsset(assetId);if(!prefab)return;const id=state.nextId++;const item={id,name:prefab.name+' '+id,type:'prefab',assetId:prefab.id,x:120+(id%10)*25,y:100+(id%7)*25,w:prefab.width,h:prefab.height,color:'#6f9eaf',animation:prefab.kind==='effect'?'loop':'idle',animationSpeed:1,animationPreview:false,hp:prefab.hp,behavior:'none',...(prefab.category==='Vehicles'?{maxSpeed:250,acceleration:210,brakeForce:310,turnRate:140,drag:1.4,collisionRadius:25,rotation:0}:{})};state.entities.push(item);state.selected=[id];record('Ajouter '+prefab.name);notify()}
export function deleteSelected(){if(state.playing||!state.selected.length)return;state.entities=state.entities.filter(o=>!state.selected.includes(o.id));state.selected=state.entities.length?[state.entities[0].id]:[];record('Supprimer objets');notify()}
export function togglePlay(){state.playing=!state.playing;const btn=document.querySelector('#play');if(state.playing){resetGame();state.playBackup=JSON.stringify(state.entities);btn.textContent='■ Stop';btn.classList.add('active')}else{state.entities=JSON.parse(state.playBackup);btn.textContent='▶ Play';btn.classList.remove('active')}document.querySelector('#status').textContent=state.playing?'Play mode':'Édition';renderHistory();notify()}
export function exportScene(){const json=JSON.stringify({version:3,entities:state.entities,camera:state.camera},null,2),url=URL.createObjectURL(new Blob([json],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='warlike-scene.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500)}
export async function importScene(file){if(state.playing)throw Error('Arrêter Play avant import');if(!file)throw Error('Aucun fichier');const data=JSON.parse(await file.text());if(!Array.isArray(data.entities)||data.entities.length>10000)throw Error('Format de scène invalide');const ids=new Set();let next=1;const parsed=data.entities.map(o=>{if(!o||!['object','player','character','prefab'].includes(o.type)||typeof o.name!=='string'||typeof o.color!=='string'||!/^#[0-9a-f]{6}$/i.test(o.color)||!['x','y','w','h'].every(k=>Number.isFinite(o[k]))||o.w<=0||o.h<=0)throw Error('Objet invalide');let id=Number.isSafeInteger(o.id)&&o.id>0&&!ids.has(o.id)?o.id:next;while(ids.has(id))id++;ids.add(id);next=Math.max(next,id+1);return{id,name:o.name.slice(0,100),type:o.type,x:o.x,y:o.y,w:o.w,h:o.h,color:o.color,...(o.logic&&typeof o.logic==='object'?{logic:structuredClone(o.logic)}:{}),...(o.dialogue&&typeof o.dialogue==='object'?{dialogue:structuredClone(o.dialogue)}:{}),...(o.type==='character'?{skin:['scout','soldier'].includes(o.skin)?o.skin:'scout',animation:(animationClips.includes(o.animation)||humanoidClips(o.assetId||'').includes(o.animation))?o.animation:'idle',animationSpeed:Number.isFinite(o.animationSpeed)&&o.animationSpeed>0?o.animationSpeed:1,animationPreview:!!o.animationPreview}:{}),...(o.type==='prefab'?{assetId:getAsset(o.assetId)?.id||'crate',animation:animationClips.includes(o.animation)?o.animation:'idle',animationSpeed:Number.isFinite(o.animationSpeed)&&o.animationSpeed>0?o.animationSpeed:1,animationPreview:!!o.animationPreview,hp:Number.isFinite(o.hp)?o.hp:100,aiSpeed:Number.isFinite(o.aiSpeed)&&o.aiSpeed>=0?o.aiSpeed:65,detectionRadius:Number.isFinite(o.detectionRadius)&&o.detectionRadius>=0?o.detectionRadius:650,behavior:['none','patrol','chase','guard','wander','flee','follow'].includes(o.behavior)?o.behavior:'none',...(getAsset(o.assetId)?.category==='Vehicles'?{maxSpeed:Number.isFinite(o.maxSpeed)&&o.maxSpeed>0?o.maxSpeed:250,acceleration:Number.isFinite(o.acceleration)&&o.acceleration>0?o.acceleration:210,brakeForce:Number.isFinite(o.brakeForce)&&o.brakeForce>0?o.brakeForce:310,turnRate:Number.isFinite(o.turnRate)&&o.turnRate>0?o.turnRate:140,drag:Number.isFinite(o.drag)&&o.drag>=0?o.drag:1.4,collisionRadius:Number.isFinite(o.collisionRadius)&&o.collisionRadius>0?o.collisionRadius:25}:{})}:{})}});state.entities=parsed;state.nextId=next;state.selected=parsed.length?[parsed[0].id]:[];setCamera(data.camera);record('Importer scène');notify()}

export function duplicateSelected(){if(state.playing||!state.selected.length)return;const copies=state.entities.filter(o=>state.selected.includes(o.id)).map(o=>({...o,id:state.nextId++,name:o.name+' Copy',x:o.x+24,y:o.y+24}));state.entities.push(...copies);state.selected=copies.map(o=>o.id);record('Dupliquer '+copies.length+' objet(s)');notify()}

export function loadCombatDemo(){if(state.playing)return;const entities=[],add=(name,type,assetId,x,y,w,h,other={})=>{entities.push({id:entities.length+1,name,type,assetId,x,y,w,h,color:'#579ca5',...other})};
add('Ranger','character',undefined,120,210,48,72,{skin:'scout',animation:'idle',hp:100});
for(const [x,y] of [[320,100],[590,290],[770,120],[470,430]])add('Zombie '+(entities.length+1),'prefab','zombie',x,y,54,76,{hp:100,behavior:'chase',animation:'idle'});
for(const [x,y] of [[780,390],[930,210]])add('Goblin '+(entities.length+1),'prefab','goblin',x,y,50,72,{hp:66,behavior:'chase',animation:'idle'});
for(const [x,y] of [[280,260],[520,125],[700,335],[975,380]])add('Crate '+(entities.length+1),'prefab','crate',x,y,68,62,{hp:100,behavior:'none'});
for(const [x,y] of [[190,430],[875,75]])add('Medkit '+(entities.length+1),'prefab','medkit',x,y,46,54,{hp:1,behavior:'none'});
add('Jeep','prefab','jeep',1030,115,110,66,{hp:200,behavior:'none'});
add('Campfire','prefab','campfire',550,530,60,72,{hp:100,behavior:'none'});
state.entities=entities;state.nextId=entities.length+1;state.selected=[1];setCamera({x:65,y:40,zoom:.8});record('Charger Combat Sandbox');notify()}

export function loadDrivingDemo(){if(state.playing)return;const entities=[],add=(name,type,assetId,x,y,w,h,rest={})=>entities.push({id:entities.length+1,name,type,assetId,x,y,w,h,color:'#5f99af',rotation:0,...rest});
add('Driver','character',undefined,155,250,50,72,{skin:'scout',animation:'idle'});
add('Jeep','prefab','jeep',270,245,105,72,{hp:200,behavior:'none',maxSpeed:285,acceleration:235,brakeForce:320,turnRate:155,drag:1.3,collisionRadius:24});
add('Tank','prefab','tank',640,145,126,86,{hp:400,behavior:'none',maxSpeed:110,acceleration:95,brakeForce:160,turnRate:68,drag:2.1,collisionRadius:33});
add('Buggy','prefab','buggy',540,395,100,66,{hp:130,behavior:'none',maxSpeed:345,acceleration:310,brakeForce:260,turnRate:195,drag:.8,collisionRadius:23});
for(const [x,y] of [[410,220],[490,260],[750,350],[330,440],[850,160],[160,520]])add('Roadblock','prefab','crate',x,y,65,60,{hp:100});
for(const [x,y] of [[900,450],[1000,230],[390,550]])add('Rock','prefab','rock',x,y,75,64,{hp:100});
state.entities=entities;state.nextId=entities.length+1;state.selected=[2];setCamera({x:65,y:20,zoom:.85});record('Charger Driving Sandbox');notify()}

export function addLogicHotspot(){if(state.playing)return;const id=state.nextId++;state.entities.push({id,name:'Hotspot '+id,type:'object',x:210+id*13,y:180+id*8,w:48,h:48,color:'#f2b65b',logic:defaultLogic()});state.selected=[id];record('Créer hotspot');notify()}
export function loadLogicDemo(){if(state.playing)return;const entities=[],add=(name,type,x,y,w,h,color,logic)=>entities.push({id:entities.length+1,name,type,x,y,w,h,color,...(type==='character'?{skin:'scout'}:{}),...(logic?{logic}:{})});
add('Player','character',100,190,48,72,'#36c9ad');
const chest=defaultLogic();chest.prompt='Ouvrir le coffre';chest.actions=[{type:'giveItem',key:'key',value:1},{type:'message',value:'Clé trouvée dans le coffre !'}];chest.once=true;
add('Coffre interactif','object',320,195,54,52,'#d2a04f',chest);
const door=defaultLogic();door.prompt='Ouvrir la porte';door.conditions=[{type:'hasItem',key:'key',value:1}];door.actions=[{type:'message',value:'Porte ouverte. Passage débloqué !'},{type:'destroy'}];door.once=true;
add('Porte verrouillée','object',620,177,35,95,'#91705a',door);
const greet=defaultLogic();greet.event='onEnter';greet.prompt='Accueil';greet.once=true;greet.actions=[{type:'message',value:'Explore la scène : récupère la clé puis ouvre la porte.'}];
add('Zone bienvenue','object',175,170,50,90,'#4b90ac',greet);
state.entities=entities;state.nextId=entities.length+1;state.selected=[2];setCamera({x:100,y:75,zoom:1});record('Charger Visual Logic Demo');notify()}

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
state.entities=entities;state.nextId=entities.length+1;state.selected=[2];setCamera({x:90,y:35,zoom:.9});record('Charger RPG Demo');notify()}
