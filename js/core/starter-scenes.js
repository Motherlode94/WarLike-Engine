import {prefab3d,get3dAsset} from '../assets/catalog-3d.js';
import {defaultStats,defaultAi} from './gameplay-components.js';
import {defaultTacticalUnit} from './rts-orders.js';
import {genreLabel} from './game-genres.js';

export const starterModels={
 'character-hero':'free-mini-characters-character-male-a',
 'character-civilian':'free-mini-characters-character-female-a',
 'character-soldier':'quaternius-ultimatedanimatedcharacter-bluesoldier-male',
 'character-zombie':'quaternius-ultimatedanimatedcharacter-zombie-male',
 'vehicle-jeep':'free-car-kit-delivery','vehicle-tank':'quaternius-animatedtanks-tank',
 'building-house':'free-city-kit-commercial-building-a',
 'building-garage':'free-city-kit-commercial-building-e',
 'building-wall':'free-nature-kit-fence-simple','building-tower':'free-city-kit-commercial-building-b',
 'building-hangar':'free-city-kit-commercial-building-e',
 'prop-container':'free-survival-kit-box-open','prop-cone':'free-city-kit-roads-construction-cone'
};
export const starterSprites={
 'character-civilian':'free-tiny-dungeon-tile-0099','character-soldier':'soldier','character-zombie':'zombie',
 'vehicle-jeep':'jeep','vehicle-tank':'tank','building-wall':'wall',
 'building-house':'life-town-tile-0048','building-garage':'life-town-tile-0050',
 'building-tower':'life-town-tile-0049','building-hangar':'life-town-tile-0050',
 'prop-container':'crate'
};
export function starterModel(id,entityId,x,y){
 const modelId=starterModels[id]||id,asset=get3dAsset(modelId),o=prefab3d(modelId,entityId,x,y);
 if(asset?.shape==='glb'){
  const size=id.startsWith('character-')?100:id.startsWith('vehicle-')?150:id.startsWith('building-')?170:id.includes('tree-')?180:55;
  const scale=size/Math.max(...asset.normalizedSize);
  [o.w,o.h,o.depth3d]=asset.normalizedSize.map(v=>Math.max(1,v*scale));
  o.playable3d=false;o.animationPreview=!!asset.animationClips?.length;
 }
 return o;
}
const set=(key,value)=>({type:'setVariable',key,value});
const add=(key,value)=>({type:'addVariable',key,value});
const check=(key,value=1,operator='==')=>({type:'variable',key,value,operator});
const done=key=>({type:'completeObjective',key});
const goal=(key,value)=>({type:'setObjective',key,value,total:1});
const say=value=>({type:'message',value});
const win=value=>({type:'winGame',value});

// Author the same mission rules in both workspaces. Models and ground layout
// differ by mode, but cost checks and quest prerequisites remain ordinary Blueprint.
export function finishStarterScene(genre,mode,entities,player){
 if(genre==='sandbox')return {entities,selected:[player.id],nextId:entities.length+1,camera:{x:0,y:0,zoom:1}};
 const three=mode==='3d',find=name=>entities.find(o=>o.name===name),combat=genre==='tactical'||genre==='rts';
 const floor=three?{...prefab3d('free-nature-kit-ground-grass',0),w:1500,h:6,depth3d:1000,elevation3d:-.12}:{type:'prefab',assetId:'life-town-tile-0000',w:1500,h:1000,tileSize:48};
 Object.assign(floor,{id:0,name:genre==='horror'?'Domaine · terrain':'Terrain · '+genreLabel(genre,mode),x:-100,y:-100,collision3d:false,solid3d:false,hideLabelInPlay:true,hierarchyGroup:'Terrain'});
 entities.unshift(floor);
 const roadColor=genre==='horror'?'#48504b':genre==='tactical'||genre==='rts'?'#7d8477':'#ba9a70';
 for(const [x,y,w,d] of [[80,225,1190,80],[80,470,1190,80],[180,70,80,690],[780,70,80,690]]){
  const road=three?{...prefab3d('free-nature-kit-ground-pathtile',0),h:3,depth3d:d,elevation3d:.01}:{type:'object',h:d,color:roadColor};
  Object.assign(road,{name:'Chemin du site',x,y,w,collision3d:false,solid3d:false,hideLabelInPlay:true,hierarchyGroup:'Terrain'});entities.splice(1,0,road);
 }
 player.starterGenre=genre;
 // Keep the departure and mission routes clear of large building footprints.
 const base=find('QG');if(base)Object.assign(base,{x:260,y:50});
 const house=find('Quartier RP');if(house)Object.assign(house,{x:450,y:20,w:180,...(three?{h:170,depth3d:110}:{h:110})});
 const work=find('Travail');if(work)Object.assign(work,{x:670,y:190});
 const workshop=find('Atelier');if(workshop)Object.assign(workshop,{x:450,y:25,w:200,...(three?{h:170,depth3d:120}:{h:120})});
 const cover=find('Couverture');if(cover)Object.assign(cover,{w:160,...(three?{h:110,depth3d:35}:{h:35})});
 const wall=find('Cloison');if(wall&&three)Object.assign(wall,{w:45,h:180,depth3d:320});
 for(const o of entities){
  o.hierarchyGroup??=o===player?'Joueur':o.sequence?'Interactions':o.ai?'Personnages':'Décor';
  if(o!==player&&o.name!=='Cloison')o.hideLabelInPlay??=true;
  if(o.sequence?.event==='interact')o.adventureInteractable={label:o.name,radius:o.sequence.radius||130};
  if(/Citoyen|Donneur|Allie|Escouade/.test(o.name))o.team=1;
 }
 // Boundaries describe the playable site rather than relying on empty infinity.
 for(const [name,x,y,w,d] of [['Nord',-100,-100,1500,18],['Sud',-100,882,1500,18],['Ouest',-100,-100,18,1000],['Est',1382,-100,18,1000]])entities.push({type:'object',name:'Limite · '+name,x,y,w,h:three?110:d,depth3d:d,color:'#435862',collision3d:true,solid3d:true,hideLabelInPlay:true,hierarchyGroup:'Limites',...(!three?{collider2d:{enabled:true}}:{})});
 for(const [i,[x,y]] of [[30,30],[1220,40],[1180,730],[30,740]].entries()){
  const tree=three?starterModel('free-nature-kit-tree-pinegrounda',0,x,y):{type:'prefab',assetId:'life-town-tile-0004',x,y,w:75,h:100};
  Object.assign(tree,{name:'Repère du site '+(i+1),collision3d:false,hideLabelInPlay:true,hierarchyGroup:'Décor'});entities.push(tree);
 }
 entities.forEach((o,i)=>o.id=i+1);
 const targets=[],initial=[];
 const task=(key,label,name)=>{initial.push(goal(key,label));const o=find(name);if(o)targets.push({goal:key,targetId:o.id});return key};
 const bind=(name,actions,{conditions=[],once=false,hint='Objectif indisponible pour le moment.'}={})=>{
  const o=find(name);if(!o)return;o.adventureInteractable={label:name,radius:130,lockedHint:hint};
  o.sequence={enabled:true,event:'interact',key:'e',radius:130,once,conditions,instructions:actions};
 };
 const finishWhen=(keys,text)=>{player.sequences??=[];player.sequences.push({enabled:true,event:'interval',interval:.25,once:true,conditions:keys.map(key=>({type:'objectiveComplete',key})),instructions:[win(text)]})};
 const economy=(name,costKey,cost,itemId,text)=>bind(name,[{type:'giveItem',targetRole:'player',key:itemId,value:1},add(costKey,-cost),say(text)],{conditions:[check(costKey,cost,'>='),{type:'inventoryHasRoom',targetRole:'player',key:itemId}],hint:'Il faut '+cost+' '+(costKey==='gold'?'or':'crédits')+' et une place libre dans l’inventaire.'});
 const start=[];
 if(genre==='rp'){
  start.push(set('money',50),set('reputation',0));
  const meet=task('rpMeet','Rencontrer le citoyen','Citoyen'),job=task('rpWork','Effectuer un travail','Travail'),buy=task('rpBuy','Acheter des provisions','Boutique');
  bind('Citoyen',[add('reputation',1),done(meet),say('Bienvenue au quartier. Le travail se trouve à l’est de la place.')],{once:true});
  bind('Travail',[add('money',20),done(job),say('Travail terminé · +20 crédits.')]);
  economy('Boutique','money',10,'supplies','Provisions achetées · −10 crédits.');find('Boutique').sequence.instructions.push(done(buy));finishWhen([meet,job,buy],'Installation au quartier réussie.');
 }
 if(genre==='simulation'){
  start.push(set('materials',5),set('money',100),set('maintenance',0),set('produced',0));
  const produce=task('simProduce','Produire à l’atelier','Machine de production'),order=task('simOrder','Livrer une commande','Commande client'),maintain=task('simMaintain','Entretenir la machine','Maintenance');
  bind('Machine de production',[add('materials',2),set('produced',1),done(produce),say('Production terminée · +2 matériaux.')]);
  bind('Commande client',[add('materials',-1),add('money',25),done(order),say('Commande livrée · +25 crédits.')],{conditions:[check('produced'),check('materials',1,'>=')],hint:'Produis à l’atelier et conserve au moins un matériau pour livrer.'});
  bind('Maintenance',[add('maintenance',1),done(maintain),say('Machine entretenue.')],{once:true});finishWhen([produce,order,maintain],'Première commande produite, livrée et atelier entretenu.');
 }
 if(genre==='rpg'){
  start.push(set('gold',100),set('experience',0),set('questActive',0),set('questCompleted',0),set('questRewarded',0));
  task('rpgTalk','Accepter la quête','Donneur de quête');targets.push({goal:'rpgRuins',targetId:find('Ruines').id},{goal:'rpgReturn',targetId:find('Donneur de quête').id});
  bind('Donneur de quête',[]);find('Donneur de quête').sequence.branches=[
   {conditions:[check('questCompleted'),check('questRewarded',0)],instructions:[set('questRewarded',1),add('experience',50),done('rpgReturn'),win('Exploration terminée · récompense : 50 XP.')]},
   {conditions:[check('questActive',0)],instructions:[set('questActive',1),done('rpgTalk'),goal('rpgRuins','Explorer les ruines'),say('Explore les ruines au sud-est, puis reviens me voir.')]},
   {conditions:[check('questActive')],instructions:[say('Les ruines se trouvent au sud-est de la place.')]}
  ];
  bind('Ruines',[set('questCompleted',1),done('rpgRuins'),goal('rpgReturn','Rapporter la découverte au donneur de quête')],{once:true,conditions:[check('questActive')],hint:'Accepte d’abord la quête auprès du donneur de quête.'});
  economy('Marchand','gold',10,'potion','Potion achetée · −10 or.');
 }
 if(genre==='openworld'){
  start.push(set('money',0),set('reputation',0),set('delivered',0),set('deliveryAccepted',0));
  task('worldAccept','Prendre le colis auprès du citoyen','Citoyen');targets.push({goal:'worldDeliver',targetId:find('Livraison').id});
  bind('Citoyen',[{type:'giveItem',targetRole:'player',key:'starter-parcel',value:1},set('deliveryAccepted',1),done('worldAccept'),goal('worldDeliver','Livrer le colis à l’est du quartier'),say('Prends la Jeep pour rejoindre la livraison. E : monter ou descendre.')],{once:true,conditions:[{type:'inventoryHasRoom',targetRole:'player',key:'starter-parcel'}]});
  bind('Livraison',[{type:'consumeQuestItem',key:'starter-parcel',value:1},set('delivered',1),add('money',100),done('worldDeliver'),win('Colis livré · +100 crédits.')],{once:true,conditions:[check('deliveryAccepted'),{type:'questItemAtLeast',key:'starter-parcel',value:1}],hint:'Prends d’abord le colis auprès du citoyen.'});
 }
 if(genre==='horror'){
  start.push(set('powerOn',0),set('escaped',0));task('horrorPower','Rétablir la génératrice','Generatrice');targets.push({goal:'horrorEscape',targetId:find('Evacuation').id});
  bind('Generatrice',[set('powerOn',1),done('horrorPower'),goal('horrorEscape','Rejoindre le point d’évacuation'),say('Courant rétabli. Rejoins la sortie au sud-est.')],{once:true});
  bind('Evacuation',[set('escaped',1),done('horrorEscape'),win('Évacuation réussie.')],{conditions:[check('powerOn')],once:true,hint:'La sortie reste verrouillée. Rétablis la génératrice au nord-est.'});
  player.horrorSettings={enabled:true};
  Object.assign(find('Traqueur'),{team:2,stats:defaultStats(),ai:{...defaultAi(),state:'patrol',speed:55,detection:240,attackDamage:8,requireLineOfSight:true},horrorAiConfig:{enabled:false}});
 }
 if(genre==='tactical'){
  start.push(set('captured',0),set('tacticalEnemyDown',0));task('tacticalEnemy','Neutraliser l’opposant','Opposant');task('tacticalCapture','Atteindre et capturer le poste à l’est','Capturer');
  bind('Capturer',[set('captured',1),done('tacticalCapture'),win('Poste sécurisé.')],{once:true,conditions:[check('tacticalEnemyDown'),{type:'playerOnFoot'}],hint:'Neutralise l’opposant et descends du véhicule pour sécuriser le poste.'});
  const enemy=find('Opposant');enemy.ai={...defaultAi(),...enemy.ai,requireLineOfSight:true,pathfinding:true};
  enemy.sequence={enabled:true,event:'death',once:true,instructions:[set('tacticalEnemyDown',1),done('tacticalEnemy'),say('Opposant neutralisé. Capture le poste à pied.')]};
  if(three)player.fpsController=true;
 }
 if(genre==='rts'){
  start.push(set('resources',30),set('mineSecured',0),set('outpostCaptured',0));task('rtsMine','Sécuriser la mine','Mine');task('rtsCapture','Envoyer une escouade au poste adverse','Capture');
  bind('Mine',[add('resources',20),set('mineSecured',1),done('rtsMine'),say('Mine sécurisée. Sélectionne une escouade puis donne un ordre vers le poste adverse.')],{once:true});
  const post=find('Capture');post.adventureInteractable=null;
  post.sequence={enabled:true,event:'signal',signal:'starter:rts-capture',once:true,conditions:[check('mineSecured')],instructions:[set('outpostCaptured',1),done('rtsCapture'),win('Mine et avant-poste sécurisés par l’escouade.')]};
  for(const unit of entities.filter(o=>o.tags?.includes('rts-unit'))){unit.tacticalUnit=defaultTacticalUnit();unit.stats=defaultStats();unit.sequence={enabled:true,event:'interval',interval:.25,once:false,conditions:[check('mineSecured'),check('outpostCaptured',0),{type:'distanceToPointLess',x:post.x,y:post.y,value:130}],instructions:[{type:'emitSignal',value:'starter:rts-capture'}]}}
 }
 if(genre==='fourx'){
  delete find('Capitale').sequence;
  start.push(set('turn',1),set('food',12),set('industry',8),set('science',3),set('territory',1),set('army',2),set('explored',0),set('expanded',0));
  task('fourExplore','Explorer la région','Explorer');task('fourExpand','Fonder une colonie','Coloniser');task('fourTurn','Terminer un tour','Fin du tour');task('fourConquer','Prendre le camp ennemi','Camp ennemi');
  bind('Explorer',[set('explored',1),add('science',2),done('fourExplore'),say('Région explorée · +2 science.')],{once:true});
  bind('Coloniser',[set('expanded',1),add('food',-2),add('territory',1),done('fourExpand'),say('Colonie fondée · −2 nourriture.')],{once:true,conditions:[check('explored'),check('food',2,'>=')],hint:'Explore la région et conserve deux unités de nourriture.'});
  const endTurn=find('Fin du tour');endTurn.sequence.instructions.push(done('fourTurn'));
  bind('Camp ennemi',[add('army',-1),add('territory',1),done('fourConquer'),win('Région explorée, colonisée et camp conquis.')],{once:true,conditions:[check('expanded'),check('turn',2,'>='),check('army',1,'>=')],hint:'Fonde une colonie, termine un tour et conserve au moins une armée.'});
 }
 if(genre==='fieldlab'){
  // Existing diagnostic sequences remain intact; add reachability and navigation.
  player.adventure={title:'WarLike Field Lab',combatEnabled:false,items:[],notes:[]};
  return {entities,selected:[player.id],playerId:player.id,nextId:entities.length+1,genre,camera:{x:0,y:0,zoom:.8},guide:'Field Lab · ZQSD : marcher · E : console / véhicule · valide marche, interaction et conduite.'};
 }
 player.adventure={title:genreLabel(genre,mode),combatEnabled:combat,items:genre==='openworld'?[{id:'starter-parcel',name:'Colis à livrer'}]:[],notes:[],hint:genre==='tactical'?(three?'Clic : viser / tirer · F : tirer · E : capturer ou monter · ZQSD : marcher':'Souris : viser · F / clic : tirer · E : capturer / véhicule · ZQSD : marcher'):genre==='horror'?'L : lampe · Maj : courir · E : interagir · Échap : pause':genre==='rts'?'Clic : sélectionner · clic droit : ordre · E : sécuriser la mine':'ZQSD / flèches : marcher · Maj : courir · E : interagir · J : journal',demo:{id:genre,title:genreLabel(genre,mode),description:'Parcours de départ avec objectifs, interactions et limites de scène.',features:['Objectifs ordonnés','Interactions à portée','Collisions','Fin de mission'],steps:targets}};
 player.sequence={enabled:true,event:'start',once:true,instructions:[...start,...initial,say(player.adventure.hint)]};
 player.sequences??=[];player.sequences.push({enabled:true,event:'death',once:true,instructions:[{type:'loseGame',value:'Ton personnage est tombé. Recommence ou reprends ta sauvegarde.'}]});
 return {entities,selected:[player.id],playerId:player.id,nextId:entities.length+1,genre,camera:{x:0,y:0,zoom:.8},guide:player.adventure.hint};
}
