import {prefab3d,get3dAsset} from '../assets/catalog-3d.js';
import {getAsset} from '../assets/catalog.js';
import {defaultController,defaultStats,defaultInventory} from './gameplay-components.js';
import {defaultAnimatorGraph} from './animator-graph.js';
import {state,notify} from './state.js';
import {workspace} from './workspaces.js';
import {gameProject} from './game-project.js';
import {record} from './history.js';
const set=(key,value)=>({type:'setVariable',key,value});
const eq=(key,value=1)=>({type:'variable',key,operator:'==',value});
const message=value=>({type:'message',value});
const complete=key=>({type:'completeObjective',key});
const dialogue=(speaker,value,choices=[])=>({type:'showDialogue',speaker,value,choices});
const interact=instructions=>({enabled:true,event:'interact',key:'e',radius:170,once:false,instructions});
const onSignal=(signal,instructions,conditions=[])=>({enabled:true,event:'signal',signal,once:false,conditions,instructions});
export function createAdventureScene(mode='3d'){
 if(!['2d','3d'].includes(mode))throw Error('Mode d’aventure inconnu.');
 const three=mode==='3d',entities=[];
 const spawn=(id2d,id3d,name,x,y,size=80,props={})=>{
  let o;if(three){o=prefab3d(id3d,entities.length+1,x,y);const a=get3dAsset(id3d),scale=size/Math.max(...a.normalizedSize);[o.w,o.h,o.depth3d]=a.normalizedSize.map(v=>Math.max(1,v*scale));o.playable3d=false}else{if(!getAsset(id2d))throw Error('Sprite absent : '+id2d);o={id:entities.length+1,type:'prefab',assetId:id2d,x,y,w:size,h:size,color:'#8cbda4',animation:'idle',behavior:'none'}}
  Object.assign(o,{name,collision3d:false,hideLabelInPlay:true,hierarchyGroup:'Aventure',...props});entities.push(o);return o;
 };
 if(three)spawn(null,'free-nature-kit-ground-grass','Prairie',-550,-400,2000,{w:2200,h:10,depth3d:1700,elevation3d:-.17,hierarchyGroup:'Terrain'});
 else for(const x of [-300,200,700,1200])for(const y of [-300,200,700])spawn('free-platformer-art-deluxe-grasscenter',null,'Prairie',x,y,500,{hierarchyGroup:'Terrain'});
 for(const x of [1110,1270])for(const y of [160,320,480])spawn('free-tiny-dungeon-tile-0048','free-nature-kit-ground-grass','Sol des ruines',x,y,160,{...(three?{w:160,h:8,depth3d:160,elevation3d:-.12}:{}),hierarchyGroup:'Terrain'});
 const player=spawn('free-tiny-dungeon-tile-0098','quaternius-ultimatedanimatedcharacter-knight-golden-female','Éclaireuse',200,360,three?115:64,{hideLabelInPlay:false,collision3d:true,team:1,tags:['player','adventurer'],stats:defaultStats(),inventory:defaultInventory(),...(three?{playable3d:true,controller3d:defaultController(),rotation:180,cameraRig:{mode:'orbit',distance:9,height:.7,followSharpness:10,collision:true}}:{w:48,h:64,controller2d:{mode:'topDown',walkSpeed:190,sprintSpeed:290}}),animatorGraph:defaultAnimatorGraph(),adventure:{combatEnabled:false,title:'Le phare oublié',items:[{id:'adventure-key',name:'Clé des ruines'}],notes:[{key:'advClue',title:'La formule des gardiens',text:'L’ÉTOILE veille ; l’AUBE éveille. La stèle nord attend une étoile, celle du sud attend l’aube.'},{key:'advAccepted',title:'La demande de Mira',text:'Retrouver la clé, réveiller les deux stèles, ouvrir la grille puis rallumer le phare dans les ruines.'}]}});
 const interactable=(...args)=>{const o=spawn(...args);o.hideLabelInPlay=false;return o};
 const mira=interactable('free-tiny-dungeon-tile-0100','quaternius-ultimatedanimatedcharacter-oldclassy-female','Mira · gardienne',320,280,three?112:64,{adventureInteractable:{label:'Parler à Mira',radius:160}});
 mira.sequence=interact([dialogue('Mira','Le phare des ruines s’est éteint. La clé et les deux stèles peuvent réveiller son cristal. M’aideras-tu ?',[{label:'Je vais rallumer le phare.',signal:'adv:accept'},{label:'Que sais-tu des stèles ?',signal:'adv:history'},{label:'Je préfère explorer d’abord.',signal:'adv:decline'}])]);
 mira.sequences=[onSignal('adv:accept',[set('advAccepted',1),complete('advMeet'),message('Mission acceptée · consulte le journal avec J.')]),onSignal('adv:history',[dialogue('Mira','Le coffre des gardiens conserve la formule. Lis-la, puis choisis un symbole sur chaque stèle. La grille demande aussi la clé.',[{label:'Je vais vous aider.',signal:'adv:accept'},{label:'Je vais d’abord examiner le coffre.',signal:'adv:decline'}])]),onSignal('adv:decline',[message('Tu peux revenir parler à Mira quand tu le souhaites.')])];
 const clue=interactable('free-tiny-dungeon-tile-0089','free-survival-kit-chest','Coffre des gardiens',440,105,three?85:64,{adventureInteractable:{label:'Lire le parchemin du coffre',radius:150}});
 clue.sequence=interact([set('advClue',1),dialogue('Parchemin des gardiens','« L’ÉTOILE veille ; l’AUBE éveille. » Au nord, choisis le signe de la nuit. Au sud, celui du jour naissant.'),message('Indice ajouté au journal.')]);
 const key=interactable('free-platformer-art-deluxe-keyyellow','free-mini-dungeon-key','Clé des ruines',520,420,three?48:42,{adventureInteractable:{label:'Ramasser la clé des ruines',radius:140,lockedHint:'Libère une place dans ton inventaire pour prendre la clé.'}});
 key.sequence={...interact([{type:'giveItem',targetRole:'player',key:'adventure-key',value:1},set('advKey',1),complete('advKeyGoal'),{type:'setVisibility',value:false},message('Clé des ruines obtenue.')]),once:true,conditions:[{type:'inventoryHasRoom',key:'adventure-key'}]};
 const steles=[];
 for(const [index,x,y,labels,answer] of [[0,650,145,['Soleil','Étoile','Vague'],1],[1,650,565,['Aube','Crépuscule','Minuit'],0]]){
  const id='advRune'+index,stele=interactable('free-tiny-dungeon-tile-0064','free-nature-kit-statue-obelisk',index?'Stèle sud':'Stèle nord',x,y,three?125:80,{adventureInteractable:{label:index?'Examiner la stèle sud':'Examiner la stèle nord',radius:150}});
  stele.sequence=interact([dialogue(stele.name,'Trois symboles sont gravés dans la pierre. Lequel faut-il toucher ?',labels.map((label,i)=>({label,signal:i===answer?'adv:rune'+index:'adv:wrong'})))]);
  stele.sequences=[onSignal('adv:rune'+index,[set(id,1),{type:'addObjectiveProgress',key:'advRunes',value:1},{type:'setColor',value:'#83e4d8'},{type:'emitFx',value:'energy',color:'#83e4d8'},message('La stèle s’illumine.')],[eq(id,0)])];steles.push(stele);
 }
 player.sequences=[onSignal('adv:wrong',[message('La pierre reste froide · relis la formule dans le journal.')])];
 const wall=(x,y)=>spawn('free-tiny-dungeon-tile-0014','free-castle-kit-wall','Mur des ruines',x,y,three?210:160,{...(three?{}:{w:160,h:160}),collision3d:true,solid3d:true,...(!three?{collider2d:{enabled:true,isTrigger:false}}:{}),hierarchyGroup:'Ruines'});
 for(const y of [0,160,480,640])wall(950,y);
 for(const y of [0,160,320,480,640])wall(1430,y);
 for(const x of [1110,1270]){wall(x,0);wall(x,640)}
 const gate=interactable('free-tiny-dungeon-tile-0045','free-castle-kit-gate','Grille des ruines',three?1012:950,320,three?220:160,{...(three?{}:{w:160,h:160}),collision3d:true,solid3d:true,...(!three?{collider2d:{enabled:true,isTrigger:false}}:{}),adventureInteractable:{label:'Ouvrir la grille des ruines',radius:180},hierarchyGroup:'Ruines'});
 gate.sequence={...interact([]),branches:[{conditions:[eq('advAccepted'),eq('advRune0'),eq('advRune1'),{type:'questItemAtLeast',key:'adventure-key',value:1}],instructions:[{type:'consumeQuestItem',key:'adventure-key',value:1},set('advGate',1),complete('advGateGoal'),{type:'setCollision',value:false},{type:'setVisibility',value:false},{type:'enableObject',value:false},message('La grille s’ouvre · le cristal t’attend dans les ruines.')]}],elseInstructions:[message('Il faut la clé, les deux stèles éveillées et la mission de Mira.')]};
 const beacon=interactable('free-platformer-art-deluxe-gemblue','free-tower-defense-kit-detail-crystal-large','Cristal du phare',1280,350,three?105:64,{adventureInteractable:{label:'Rallumer le phare',radius:160},lightType:'point',lightEnabled:false,lightColor:'#74d9ff',lightIntensity:2,lightRange:7});
 beacon.sequence={...interact([set('advFinished',1),complete('advBeacon'),{type:'setLight',value:true},{type:'emitFx',value:'portal',color:'#74d9ff'},{type:'winGame',value:'Le phare oublié brille à nouveau. Mira et les voyageurs retrouveront leur chemin.'}]),once:true,conditions:[eq('advGate')]};
 for(const [x,y] of [[40,20],[360,-70],[800,20],[20,680],[390,750],[800,780]])spawn('survival-2d-survival-kit-tree','free-survival-kit-tree','Arbre',x,y,three?220:112,{hierarchyGroup:'Nature',collision3d:three,...(!three?{collider2d:{enabled:true,width:42,height:30,offsetX:35,offsetY:75}}:{})});
 const goals=[['advMeet','Accepter la mission de Mira',1],['advKeyGoal','Retrouver la clé des ruines',1],['advRunes','Éveiller les deux stèles',2],['advGateGoal','Ouvrir la grille',1],['advBeacon','Rallumer le phare',1]];
 player.sequence={enabled:true,event:'start',once:true,instructions:[...['advAccepted','advClue','advKey','advRune0','advRune1','advGate','advFinished'].map(key=>set(key,0)),...goals.map(([key,value,total])=>({type:'setObjective',key,value,total})),message('LE PHARE OUBLIÉ · E interagir · J journal · F5 / F9 sauvegarde.') ]};
 return {entities,selected:[player.id],nextId:entities.length+1,camera:{x:0,y:0,zoom:.8},playerId:player.id};
}
export function loadAdventureScene(){if(state.playing)return false;const scene=createAdventureScene(workspace.mode);Object.assign(state,{entities:scene.entities,selected:scene.selected,nextId:scene.nextId,camera:scene.camera});gameProject.genre='adventure';record('Aventure · Le phare oublié');notify();return true}
