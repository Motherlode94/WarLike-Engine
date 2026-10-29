import {createAdventureScene} from './adventure-scene.js';
import {prefab3d,get3dAsset} from '../assets/catalog-3d.js';
import {getAsset} from '../assets/catalog.js';
import {state,notify} from './state.js';
import {workspace} from './workspaces.js';
import {gameProject,restoreGameProject} from './game-project.js';
import {record} from './history.js';
const set=(key,value)=>({type:'setVariable',key,value});
const eq=(key,value=1)=>({type:'variable',key,operator:'==',value});
const message=value=>({type:'message',value});
const complete=key=>({type:'completeObjective',key});
const objective=(key,value,total=1)=>({type:'setObjective',key,value,total});
const dialogue=(speaker,value,choices=[])=>({type:'showDialogue',speaker,value,choices});
const interact=instructions=>({enabled:true,event:'interact',key:'e',once:false,instructions});
const travel=(value,entryX,entryY)=>({type:'loadScene',value,preserveProgress:true,entryX,entryY});
function addPrefab(entities,mode,id2d,id3d,name,x,y,size,props={}){
 let o;
 if(mode==='3d'){
  const asset=get3dAsset(id3d);if(!asset)throw Error('Modèle absent : '+id3d);
  o=prefab3d(id3d,entities.length+1,x,y);const scale=size/Math.max(...asset.normalizedSize);[o.w,o.h,o.depth3d]=asset.normalizedSize.map(v=>Math.max(1,v*scale));o.playable3d=false;
 }else{
  if(!getAsset(id2d))throw Error('Sprite absent : '+id2d);
  o={id:entities.length+1,type:'prefab',assetId:id2d,x,y,w:size,h:size,color:'#9bbfa8',animation:'idle',behavior:'none'};
 }
 Object.assign(o,{name,collision3d:false,hideLabelInPlay:true,hierarchyGroup:'Vallée des échos',...props});entities.push(o);return o;
}
export function createAdventureCampaign(mode='3d'){
 const first=createAdventureScene(mode),three=mode==='3d',p=first.entities.find(o=>o.adventure);
 p.adventure.chapter={index:1,total:2,name:'Le phare oublié'};
 p.adventure.notes.push({key:'advFinished',title:'Une lumière dans la vallée',text:'Le phare révèle un ancien passage. Rejoins la vallée des échos depuis le panneau dans les ruines.'});
 const beacon=first.entities.find(o=>o.name==='Cristal du phare');
 beacon.sequence.instructions=beacon.sequence.instructions.filter(a=>a.type!=='winGame');
 beacon.sequence.instructions.push(objective('advTravel','Rejoindre la vallée des échos'),dialogue('Le phare oublié','Le phare brille à nouveau. Dans son faisceau, un chemin vers la vallée des échos apparaît. Le panneau au sud du cristal permet de poursuivre le voyage.'));
 const passage=addPrefab(first.entities,mode,'free-tiny-dungeon-tile-0037','free-survival-kit-signpost','Passage vers la vallée',1190,515,three?95:64,{hideLabelInPlay:false,adventureInteractable:{label:'Voyager · Vallée des échos',radius:140,lockedHint:'Rallume le phare pour révéler le chemin de la vallée.'}});
 passage.sequence={...interact([travel('echo-valley',200,350)]),conditions:[eq('advFinished')]};
 first.nextId=first.entities.length+1;
 const entities=[],spawn=(...args)=>addPrefab(entities,mode,...args);
 const hero=structuredClone(p);hero.id=1;hero.x=200;hero.y=350;
 hero.adventure.title='La vallée des échos';hero.adventure.chapter={index:2,total:2,name:'La vallée des échos'};
 hero.adventure.items.push({id:'adventure-plank',name:'Lot de planches du pont'});
 hero.adventure.notes.push({key:'advValleyAccepted',title:'Orin et le sanctuaire',text:'Récupère les deux lots de planches, répare le pont, puis réveille les trois résonateurs dans l’ordre indiqué par les archives.'},{key:'advValleyClue',title:'Le chant des échos',text:'La FORÊT murmure, la MER répond, la BRAISE s’éveille. Active les résonateurs vert, bleu puis rouge. Une erreur remet la mélodie à zéro.'});
 const goals=[objective('advValleyMeet','Parler à Orin'),objective('advSupplies','Récupérer deux lots de planches',2),objective('advBridgeGoal','Réparer le pont'),objective('advHarmony','Accorder les trois résonateurs',3),objective('advSanctuary','Réveiller le sanctuaire')];
 hero.sequence={enabled:true,event:'start',once:true,instructions:[complete('advTravel'),...['advValleyAccepted','advValleyClue','advBridge','advResonance','advHarmonic','advCampaignFinished'].map(key=>set(key,0)),...goals,message('CHAPITRE 2 · La vallée des échos · Parle à Orin.') ]};hero.sequences=[];entities.push(hero);
 if(three)spawn(null,'free-nature-kit-ground-grass','Terrain de la vallée',-450,-450,2200,{w:2200,h:10,depth3d:1700,elevation3d:-.17,hierarchyGroup:'Terrain'});
 else for(const x of [-300,200,700,1200])for(const y of [-300,200,700])spawn('free-platformer-art-deluxe-grasscenter',null,'Terrain de la vallée',x,y,500,{hierarchyGroup:'Terrain'});
 const interactable=(...args)=>{const o=spawn(...args);o.hideLabelInPlay=false;return o};
 const orin=interactable('free-tiny-dungeon-tile-0085','quaternius-ultimatedanimatedcharacter-oldclassy-female','Orin · archiviste',330,280,three?112:64,{adventureInteractable:{label:'Parler à Orin',radius:155}});
 orin.sequence=interact([dialogue('Orin','Le phare nous a guidés jusqu’ici ! Le sanctuaire reste silencieux. Deux lots de planches attendent dans nos coffres. Répare le pont, puis écoute le chant des archives.',[{label:'Je vais réveiller le sanctuaire.',signal:'valley:accept'},{label:'Où trouver le chant ?',signal:'valley:history'},{label:'Je reviendrai.',signal:'valley:later'}])]);
 orin.sequences=[{enabled:true,event:'signal',signal:'valley:accept',instructions:[set('advValleyAccepted',1),complete('advValleyMeet'),message('Les coffres sont au nord et au sud. Le journal suit ta progression.')]},{enabled:true,event:'signal',signal:'valley:history',instructions:[dialogue('Orin','Les archives près du pont expliquent la mélodie : forêt, mer, braise. Le journal conservera cet indice après ta lecture.')]},{enabled:true,event:'signal',signal:'valley:later',instructions:[message('Orin reste disponible près de l’entrée.')] }];
 const archives=interactable('free-tiny-dungeon-tile-0075','quaternius-ultimatemodularruins-bookcase-full','Archives de la vallée',600,115,three?120:80,{adventureInteractable:{label:'Lire le chant des échos',radius:150}});
 archives.sequence=interact([set('advValleyClue',1),dialogue('Le chant des échos','« La FORÊT murmure, la MER répond, la BRAISE s’éveille. » Au-delà du pont, fais résonner le vert, le bleu puis le rouge. Une erreur fait retomber le silence.'),message('Le chant des échos est ajouté au journal.')]);
 for(const [name,x,y] of [['Coffre nord · planches',440,70],['Coffre sud · planches',470,570]]){
  const chest=interactable('free-tiny-dungeon-tile-0089','free-survival-kit-chest',name,x,y,three?85:64,{adventureInteractable:{label:'Prendre un lot de planches',radius:140,lockedHint:'Libère une place pour prendre les planches.'}});
  chest.sequence={...interact([{type:'giveItem',targetRole:'player',key:'adventure-plank',value:1},{type:'addObjectiveProgress',key:'advSupplies',value:1},{type:'setVisibility',value:false},message('Un lot de planches récupéré · deux lots réparent le pont.')]),once:true,conditions:[{type:'inventoryHasRoom',key:'adventure-plank'}]};
 }
 // A bounded stone ravine funnels the route through one solid, repairable gap.
 // Its visible Kenney rocks use the same footprints as their physics colliders.
 for(const y of [-340,-180,-20,140,460,620,780])spawn('free-tiny-dungeon-tile-0014','free-nature-kit-rock-talla','Paroi du ravin',800,y,160,{w:160,h:three?180:160,...(three?{depth3d:160}:{}),collision3d:true,solid3d:true,...(!three?{collider2d:{enabled:true,isTrigger:false}}:{}),hierarchyGroup:'Ravin'});
 // End caps close the finite demo arena; neither bank can bypass the crossing.
 for(const x of [-320,-160,0,160,320,480,640,960,1120,1280,1440,1600])for(const y of [-340,780])spawn('free-tiny-dungeon-tile-0014','free-nature-kit-rock-talla','Bord de la vallée',x,y,160,{w:160,h:three?180:160,...(three?{depth3d:160}:{}),collision3d:true,solid3d:true,...(!three?{collider2d:{enabled:true,isTrigger:false}}:{}),hierarchyGroup:'Ravin'});
 for(const x of [-320,1600])for(const y of [-180,-20,140,300,460,620])spawn('free-tiny-dungeon-tile-0014','free-nature-kit-rock-talla','Bord de la vallée',x,y,160,{w:160,h:three?180:160,...(three?{depth3d:160}:{}),collision3d:true,solid3d:true,...(!three?{collider2d:{enabled:true,isTrigger:false}}:{}),hierarchyGroup:'Ravin'});
 const debris=spawn('free-tiny-dungeon-tile-0014','free-nature-kit-rock-talla','Débris du pont',800,300,160,{w:160,h:three?180:160,...(three?{depth3d:160}:{}),collision3d:true,solid3d:true,...(!three?{collider2d:{enabled:true,isTrigger:false}}:{}),hierarchyGroup:'Ravin'});
 const deck=spawn('free-platformer-art-deluxe-bridge','free-nature-kit-bridge-wood','Passerelle restaurée',800,300,160,{w:160,h:three?35:160,...(three?{depth3d:160,elevation3d:-.15}:{}),visible:false,hierarchyGroup:'Ravin'});
 const bridge=interactable('free-tiny-dungeon-tile-0117','free-survival-kit-signpost','Pont à réparer',650,335,three?95:60,{adventureInteractable:{label:'Réparer le pont · 2 lots de planches',radius:160}});
 bridge.sequence={...interact([]),branches:[{conditions:[eq('advBridge')],instructions:[message('Le pont est réparé. Les résonateurs sont sur l’autre rive.')]},{conditions:[eq('advValleyAccepted'),{type:'questItemAtLeast',key:'adventure-plank',value:2}],instructions:[{type:'consumeQuestItem',key:'adventure-plank',value:2},set('advBridge',1),complete('advBridgeGoal'),{type:'setCollision',targetId:debris.id,value:false},{type:'setVisibility',targetId:debris.id,value:false},{type:'setVisibility',targetId:deck.id,value:true},{type:'emitFx',value:'energy',color:'#e4c18a'},message('Le pont est réparé · traverse vers les résonateurs.')]}],elseInstructions:[message('Parle à Orin et apporte les deux lots de planches des coffres.')]};
 for(const [index,color,label,x,y,sprite] of [[0,'#84e5aa','vert',1040,105,'gemgreen'],[1,'#78cfff','bleu',1190,390,'gemblue'],[2,'#ff9697','rouge',1020,625,'gemred']]){
  const resonator=interactable('free-platformer-art-deluxe-'+sprite,'free-tower-defense-kit-detail-crystal-large','Résonateur '+label,x,y,three?100:64,{color,colorCustomized:true,adventureInteractable:{label:'Faire résonner le cristal '+label,radius:145,lockedHint:'Accepte la mission d’Orin et répare le pont avant d’accorder les cristaux.'}});
  resonator.sequence={...interact([]),conditions:[eq('advValleyAccepted'),eq('advBridge')],branches:[{conditions:[eq('advHarmonic')],instructions:[message('La mélodie est complète · le sanctuaire peut être réveillé.')]},{conditions:[eq('advResonance',index)],instructions:[{type:'addVariable',key:'advResonance',value:1},{type:'addObjectiveProgress',key:'advHarmony',value:1},{type:'emitFx',value:'energy',color},...(index===2?[set('advHarmonic',1),message('Les trois notes s’unissent · rejoins le sanctuaire.')]:[message('La note '+label+' résonne · poursuis la mélodie.')])]}],elseInstructions:[set('advResonance',0),objective('advHarmony','Accorder les trois résonateurs',3),message('Fausse note · recommence par le vert. Le chant est dans les archives.')]};
 }
 const sanctuary=interactable('free-tiny-dungeon-tile-0054','free-nature-kit-statue-obelisk','Sanctuaire des échos',1430,350,three?150:96,{adventureInteractable:{label:'Réveiller le sanctuaire',radius:160,lockedHint:'Le sanctuaire attend la mélodie complète des trois résonateurs.'},lightType:'point',lightEnabled:false,lightColor:'#eac676',lightIntensity:2,lightRange:8});
 sanctuary.sequence={...interact([set('advCampaignFinished',1),complete('advSanctuary'),{type:'setLight',value:true},{type:'emitFx',value:'portal',color:'#eac676'},{type:'winGame',value:'Le phare et le sanctuaire brillent à l’unisson. La route est rouverte : Mira, Orin et les voyageurs peuvent enfin se retrouver. Les deux chapitres sont terminés.'}]),once:true,conditions:[eq('advHarmonic')]};
 const back=interactable('free-tiny-dungeon-tile-0037','free-survival-kit-signpost','Retour vers le phare',100,490,three?95:64,{adventureInteractable:{label:'Voyager · Le phare oublié',radius:140}});
 back.sequence=interact([travel('main',1190,440)]);
 for(const [x,y] of [[60,0],[380,-90],[660,650],[1280,-90],[1300,660]])spawn('survival-2d-survival-kit-tree','free-survival-kit-tree','Arbre de la vallée',x,y,three?220:112,{hierarchyGroup:'Nature'});
 const valley={id:'echo-valley',name:'02 · La vallée des échos',entities,camera:{x:0,y:0,zoom:.8}};
 return {...first,game:{activeSceneId:'main',startupSceneId:'main',scenes:[{id:'main',name:'01 · Le phare oublié',entities:structuredClone(first.entities),camera:first.camera},valley]}};
}
export function loadAdventureCampaign(){
 if(state.playing)return false;
 const scene=createAdventureCampaign(workspace.mode);
 Object.assign(state,{entities:scene.entities,selected:scene.selected,nextId:scene.nextId,camera:scene.camera});
 restoreGameProject({...gameProject,...scene.game,genre:'adventure'});
 record('Aventure · Le phare et la vallée');notify();return true;
}
