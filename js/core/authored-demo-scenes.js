import {demoWarScripts} from './demo-war-scripts.js';
import {prefab3d,get3dAsset} from '../assets/catalog-3d.js';
import {getAsset} from '../assets/catalog.js';
import {lifeArt} from '../assets/life-sprites-2d.js';
import {defaultController,defaultStats,defaultInventory,defaultAi} from './gameplay-components.js';
import {defaultAnimatorGraph} from './animator-graph.js';
import {createSurvivalScene} from './survival-scene.js';
const set=(key,value)=>({type:'setVariable',key,value});
const eq=(key,value=1)=>({type:'variable',key,operator:'==',value});
const message=value=>({type:'message',value});
const goal=(key,value)=>({type:'setObjective',key,value,total:1});
const done=key=>({type:'completeObjective',key});
const interact=(instructions,more={})=>({enabled:true,event:'interact',radius:140,key:'e',once:false,instructions,...more});
const signal=(value,instructions,conditions=[])=>({enabled:true,event:'signal',signal:value,once:true,instructions,conditions});

function layout(mode,title,map){
 if(!['2d','3d'].includes(mode))throw Error('Mode de démo invalide.');
 const three=mode==='3d',entities=[];
 const place=(sprite,model,name,x,y,size,props={})=>{
  let object;
  if(three){const asset=get3dAsset(model);if(!asset||asset.shape!=='glb')throw Error('Modèle intégré absent : '+model);object=prefab3d(model,entities.length+1);const scale=size/Math.max(...asset.normalizedSize);[object.w,object.h,object.depth3d]=asset.normalizedSize.map(value=>Math.max(1,value*scale));object.playable3d=false;object.animationPreview=!!asset.animationClips?.length;}
  else {if(!getAsset(sprite))throw Error('Sprite intégré absent : '+sprite);object={type:'prefab',assetId:sprite,w:size,h:size,color:'#8abd85',animation:'idle',behavior:'none'}}
  Object.assign(object,{name,collision3d:false,hideLabelInPlay:true,hierarchyGroup:title,...props,id:entities.length+1});
  object.x=x-object.w/2;object.y=y-(three?object.depth3d:object.h)/2;entities.push(object);return object;
 };
 const solid=(sprite,model,name,x,y,size,props={})=>place(sprite,model,name,x,y,size,{collision3d:true,solid3d:true,...(!three?{collider2d:{enabled:true,isTrigger:false}}:{}),...props});
 const person=(name,x,y,props={})=>place('free-tiny-dungeon-tile-0098','free-mini-characters-character-male-a',name,x,y,three?112:52,{...(!three?{w:42,h:52,collider2d:{enabled:true,width:24,height:20,offsetX:9,offsetY:30}}:{}),stats:defaultStats(),team:1,hierarchyGroup:'Habitants',...props});
 // Backgrounds are laid before the actors; transparent sprites then retain their silhouettes.
 const background=map=>{if(entities.some(object=>object.hierarchyGroup==='Terrain'))return;if(three){const ground=place(null,'free-nature-kit-ground-grass','Sol du site',864,600,1728,{w:1728,h:6,depth3d:1200,elevation3d:-.12,hierarchyGroup:'Terrain'});entities.splice(entities.indexOf(ground),1);entities.unshift(ground)}else{const a=getAsset(map),ground=place(map,null,'Plan du site · Kenney',a.width/2,a.height/2,a.width,{w:a.width,h:a.height,hierarchyGroup:'Terrain'});entities.splice(entities.indexOf(ground),1);entities.unshift(ground)}};
 background(map);
 const player=person(three?'Alex · Messager':'Alex · Messager',510,880,{tags:['player'],collision3d:true,hierarchyGroup:'Joueur',inventory:defaultInventory(),...(three?{playable3d:true,controller3d:defaultController(),animatorGraph:defaultAnimatorGraph()}:{controller2d:{mode:'topDown',walkSpeed:190,sprintSpeed:280}}),cameraRig:{mode:'thirdPerson',distance:5.4,height:.72,collision:true,followSharpness:10}});
 const tree=(x,y,index)=>solid('life-town-tile-0004','free-nature-kit-tree-pinegrounda','Pin '+index,x,y,three?245:105,{hierarchyGroup:'Végétation',...(three?{collider3d:{shape:'box',width:.4,height:2,depth:.4}}:{collider2d:{enabled:true,width:28,height:22,offsetX:38,offsetY:78}})});
 const light=(x,y)=>{const lamp=place('life-town-tile-0094','free-city-kit-roads-light-square','Lampe du site',x,y,three?240:44,{lightType:'point',lightEnabled:true,lightIntensity:1.2,lightColor:'#ffd08b',lightRange:8,hierarchyGroup:'Éclairage'});return lamp};
 const finish=guide=>{
  // IDs remain stable even though terrain is rendered before characters.
  return {entities,selected:[player.id],nextId:Math.max(...entities.map(object=>object.id))+1,playerId:player.id,genre:'adventure',camera:{x:70-player.x*.75,y:220-player.y*.75,zoom:.75},guide};
 };
 return {three,entities,place,solid,person,player,background,tree,light,finish};
}

export function createTownDemo(mode='3d'){
 const s=layout(mode,'Quartier du Canal','demo-town-ground'),{three,entities,player,place,solid,person}=s;s.background('demo-town-ground');
 for(const [i,[x,y]] of [[100,130],[100,450],[90,1050],[1650,110],[1640,1060],[960,120],[1510,170],[1350,1040]].entries())s.tree(x,y,i+1);
 const house=(name,x,y,art,model)=>{const o=solid('life-town-tile-0048',model,name,x,y,three?330:160,{hierarchyGroup:'Bâtiments',...(!three?{type:'object',spriteDataUrl:lifeArt[art],w:160,h:160,collider2d:{enabled:true,width:150,height:115,offsetX:5,offsetY:25}}:{})});return o};
 house('Maison des voyageurs',270,300,'home','free-city-kit-commercial-building-a');
 house('Atelier du quartier',820,1010,'studio','free-city-kit-commercial-building-e');
 house('Poste du canal',1490,360,'cafe','free-city-kit-commercial-building-b');
 if(three)for(const y of [300,492,684,876])place(null,'free-nature-kit-ground-pathtile','Allée du quartier',540,y,192,{w:192,h:3,depth3d:192,elevation3d:.01,hierarchyGroup:'Allées'});
 if(three)for(const x of [348,540,732,924,1116,1308,1500])place(null,'free-nature-kit-ground-pathtile','Rue du canal',x,720,192,{w:192,h:3,depth3d:192,elevation3d:.01,hierarchyGroup:'Allées'});
 for(const y of [60,180,300,420,540,876,996,1116])solid('life-town-tile-0059','free-nature-kit-fence-simple','Clôture du canal',1120,y,three?120:120,{hierarchyGroup:'Passage',...(three?{rotation:90,collision3d:false,solid3d:false}:{w:25,h:120})});
 const gate=solid('life-town-tile-0059','free-nature-kit-fence-gate','Barrière motorisée',1120,720,three?250:192,{hierarchyGroup:'Passage',...(three?{rotation:90,collision3d:false,solid3d:false}:{w:30,h:192})});
 const mara=person('Mara · responsable du quartier',540,740,{adventureInteractable:{label:'Parler à Mara',radius:150},ai:{...defaultAi(),speed:14,patrolRadius:18,detection:80,attackDamage:0}});
 const fuse=place('life-town-tile-0106','free-survival-kit-box-open','Caisse de maintenance',820,850,three?65:46,{hierarchyGroup:'Atelier',adventureInteractable:{label:'Prendre le fusible',radius:135,lockedHint:'Parle à Mara et garde une place dans ton inventaire.'}});
 const relay=place('life-town-tile-0095','free-furniture-kit-radio','Tableau du relais',540,360,three?95:58,{hierarchyGroup:'Relais',adventureInteractable:{label:'Réparer le relais',radius:140,lockedHint:'Il manque le fusible de maintenance de l’atelier.'},lightType:'point',lightEnabled:false,lightColor:'#6edeb1',lightIntensity:2,lightRange:8,audioEnabled:false,audioClip:'kenney-interface-sounds-confirmation_001',audioLoop:false,audioGain:.3,fxEmitter:{enabled:false,kind:'electric',rate:8,lifetime:.35,speed:24,color:'#8be0ee'}});
 relay.warScripts=[demoWarScripts.town()];
 const scout=person('Éclaireur · accès bloqué',1470,720,{stats:{...defaultStats(),health:30},adventureInteractable:{label:'Secourir l’éclaireur',radius:140,lockedHint:'Rétablis le courant avant de sécuriser le passage.'}});
 s.light(390,700);s.light(1350,650);
 if(three){const car=place(null,'free-car-kit-delivery','Fourgon de l’atelier',310,1010,225,{collision3d:true,vehicleConfig:{driveable:true},maxSpeed:200,acceleration:155,brakeForce:280,turnRate:115,drag:1.4,hierarchyGroup:'Véhicules',tags:['vehicle']});car.rotation=90;}
 Object.assign(player,{adventure:{title:'Le quartier sans courant',combatEnabled:false,items:[{id:'demo-fuse',name:'Fusible de maintenance'}],notes:[],demo:{id:'town',title:'Quartier du Canal',description:'Une panne a bloqué le passage du canal. Aide les habitants à rétablir le relais.',features:['Dialogue à choix','Inventaire et conditions','Barrière physique','Lumière, son et FX','Sauvegarde et victoire'],steps:[{goal:'demoMeet',targetId:mara.id},{goal:'demoFuse',targetId:fuse.id},{goal:'demoPower',targetId:relay.id},{goal:'demoRescue',targetId:scout.id},{goal:'demoReturn',targetId:mara.id}]}}});
 player.sequence={enabled:true,event:'start',once:true,instructions:[...['demoAccepted','demoPowered','demoRescued'].map(key=>set(key,0)),goal('demoMeet','Parler à Mara sur la place'),message('LE QUARTIER SANS COURANT · E : interagir · J : journal · F5/F9 : sauvegarder / charger')]};
 mara.sequence=interact([],{branches:[
  {conditions:[eq('demoRescued')],instructions:[done('demoReturn'),{type:'winGame',value:'Le passage est rouvert et l’éclaireur est en sécurité. Le quartier retrouve son activité.'}]},
  {conditions:[eq('demoAccepted')],instructions:[message('Le fusible est dans la caisse de l’atelier. Répare ensuite le relais au nord de la place.')]},
  {conditions:[eq('demoAccepted',0)],instructions:[{type:'showDialogue',speaker:'Mara',value:'La panne a fermé la barrière du canal. Un éclaireur est resté de l’autre côté. Le fusible de rechange est dans la caisse de l’atelier. Tu peux nous aider ?',choices:[{label:'Je vais chercher le fusible.',signal:'demo:accept'},{label:'Je vais d’abord regarder les lieux.'}]}]}
 ]});
 mara.sequences=[signal('demo:accept',[set('demoAccepted',1),done('demoMeet'),goal('demoFuse','Récupérer le fusible devant l’atelier'),message('L’atelier se trouve à l’est de la place.')],[eq('demoAccepted',0)])];
 fuse.sequence=interact([{type:'giveItem',targetRole:'player',key:'demo-fuse',value:1},done('demoFuse'),goal('demoPower','Réparer le relais au nord de la place'),{type:'setVisibility',value:false}],{once:true,conditions:[eq('demoAccepted'),{type:'inventoryHasRoom',targetRole:'player',key:'demo-fuse'}]});
 relay.sequence=interact([{type:'consumeQuestItem',key:'demo-fuse',value:1},set('demoPowered',1),done('demoPower'),goal('demoRescue','Secourir l’éclaireur derrière la barrière'),{type:'setLight',value:true},{type:'setAudio',value:true},{type:'emitFx',value:'electric',color:'#8be0ee'},{type:'emitSignal',value:'demo:power'},message('Courant rétabli · la barrière du canal est ouverte.')],{once:true,conditions:[eq('demoAccepted'),{type:'questItemAtLeast',key:'demo-fuse',value:1}]});
 gate.sequence=signal('demo:power',[{type:'setCollision',value:false},{type:'setVisibility',value:false}]);
 if(three)for(const [name,y,depth] of [['Clôture nord · collision',0,624],['Clôture sud · collision',816,384],['Barrière · collision',624,192]])entities.push({id:entities.length+1,type:'object',name,x:1106,y,w:28,h:120,depth3d:depth,visible:false,collision3d:true,solid3d:true,hideLabelInPlay:true,hierarchyGroup:'Passage',...(name.startsWith('Barrière')?{sequence:signal('demo:power',[{type:'setCollision',value:false}])}:{})});
 scout.sequence=interact([{type:'setHealth',value:100},set('demoRescued',1),done('demoRescue'),goal('demoReturn','Retourner annoncer la bonne nouvelle à Mara'),{type:'emitFx',value:'heal',color:'#8be9b1'},message('Merci ! Je peux rejoindre le poste. Préviens Mara que le passage est sûr.')],{once:true,conditions:[eq('demoPowered')]});
 return s.finish('Quartier du Canal · E : parler / interagir · J : journal · Maj : courir · F5/F9 : sauvegarder / charger. Objectif : rétablir le relais et secourir l’éclaireur.');
}

export function createGarageDemo(mode='3d'){
 const s=layout(mode,'Piste d’essais','demo-garage-ground'),{three,player,place,solid}=s;s.background('demo-garage-ground');player.x=190;player.y=1030;
 const car=place('jeep','free-car-kit-race','Prototype · véhicule d’essai',360,900,three?215:100,{...(!three?{w:100,h:62}:{}),rotation:90,collision3d:true,vehicleConfig:{driveable:true},maxSpeed:270,acceleration:175,brakeForce:300,turnRate:130,drag:1.45,reverseRatio:.45,tags:['vehicle','race-vehicle'],csharpComponents:[{kind:'RacingRules',runtime:'web'}],hierarchyGroup:'Véhicule'});
 car.warScripts=[demoWarScripts.garage()];
 const console=place('life-town-tile-0115','free-survival-kit-signpost','Briefing · piste',250,1040,three?100:52,{adventureInteractable:{label:'Démarrer l’essai',radius:140},hierarchyGroup:'Départ'});
 const points=[[1370,900,'Virage est'],[1370,300,'Ligne du nord'],[350,300,'Virage ouest'],[350,900,'Ligne d’arrivée']];
 for(const [i,[x,y,label]] of points.entries()){
  const marker=place('life-town-tile-0095','free-city-kit-roads-construction-cone',label,x,y,three?45:34,{hierarchyGroup:'Checkpoints',tags:['checkpoint']});
  marker.sequence={enabled:true,event:'enter',radius:150,once:false,conditions:[eq('raceStarted'),{type:'playerInVehicle'}],branches:[{conditions:[eq('raceCheckpoint',i)],instructions:[set('raceCheckpoint',i+1),done('drive'+i),...(i===3?[set('raceFinished',1),{type:'winGame',value:'Tour d’essai terminé · quatre points franchis dans l’ordre. Le prototype est prêt pour le prochain départ.'}]:[goal('drive'+(i+1),'Franchir : '+points[i+1][2]),message('✓ '+label+' · prochain point : '+points[i+1][2])])]}]};
 }
 // Separate inner and outer edges give the road a readable racing line, without
 // putting props across the driving corridor or letting the player cut its centre.
 for(const x of [600,900,1200])for(const y of [485,745])solid('life-town-tile-0081','free-city-kit-roads-construction-fence','Barrière intérieure',x,y,three?275:190,{hierarchyGroup:'Limites de piste',...(!three?{w:190,h:28}:{}),...(three?{rotation:90}:{})});
 for(const x of [520,1275])solid('life-town-tile-0059','free-city-kit-roads-construction-fence','Limite intérieure latérale',x,615,three?210:220,{hierarchyGroup:'Limites de piste',...(!three?{w:28,h:220}:{} )});
 for(const [i,[x,y]] of [[90,130],[1640,130],[1630,1070],[820,615]].entries())s.tree(x,y,i+1);
 if(three){place(null,'free-city-kit-commercial-building-e','Atelier · zone des stands',120,670,290,{collision3d:true,hierarchyGroup:'Garage'});for(const x of [350,542,734,926,1118,1310])for(const y of [300,900])place(null,'free-city-kit-roads-road-straight','Revêtement du circuit',x,y,192,{rotation:90,w:192,h:3,depth3d:235,elevation3d:.01,hierarchyGroup:'Circuit'});for(const x of [350,1370])for(const y of [492,684])place(null,'free-city-kit-roads-road-straight','Revêtement du circuit',x,y,192,{w:235,h:3,depth3d:192,elevation3d:.01,hierarchyGroup:'Circuit'});}
 s.light(200,940);s.light(1500,450);
 player.adventure={title:'Piste d’essais · Tour de validation',combatEnabled:false,items:[],notes:[],demo:{id:'garage',title:'Piste d’essais',description:'Un véhicule réglable, une piste fermée et quatre passages à valider dans l’ordre.',features:['Entrée / sortie du véhicule','Accélération et freinage','Collisions','Checkpoints ordonnés','Chronométrage et victoire'],steps:[{goal:'driveStart',targetId:console.id}]}};
 player.sequence={enabled:true,event:'start',once:true,instructions:[set('raceStarted',0),set('raceFinished',0),set('raceCheckpoint',0),set('raceElapsed',0),goal('driveStart','Lire le briefing à l’entrée des stands'),message('PISTE D’ESSAIS · E : démarrer, puis monter dans le véhicule · ZQSD / flèches : conduire · Espace : frein à main')]};
 console.sequence=interact([set('raceStarted',1),done('driveStart'),goal('drive0','Franchir : '+points[0][2]),message('Essai lancé · rejoins le véhicule puis suis la piste vers l’est.')],{once:true,conditions:[{type:'playerOnFoot'}]});
 const result=s.finish('Piste d’essais · E : briefing / monter / descendre · ZQSD ou flèches : conduire · Espace : frein à main · Maj : sprint à pied. Franchis les quatre points dans l’ordre.');result.genre='racing';return result;
}

export function createNatureDemo(mode='3d'){return createSurvivalScene(mode)}
