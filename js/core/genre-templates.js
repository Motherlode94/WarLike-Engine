import {createSurvivalScene} from './survival-scene.js';
import {createHeroForgeScene} from './hero-forge-scene.js';
import {default2dCharacterPng} from '../assets/real-starter-sprites-2d.js?v=fix-20261028';
// Playable starting scenes for Hub game genres. All data remains ordinary WarLike
// entities / Blueprint Sequences, so projects can be saved, reopened and edited.
import {prefab3d} from '../assets/catalog-3d.js';
import {defaultController,defaultInventory,defaultStats} from './gameplay-components.js';

export const genreTemplates={
 superhero:{label:'Hero Forge · Super-héros',description:'Pouvoirs, FX, progression RPG, monde réactif et escouade RTS',modes:['2d','3d']},
 sandbox:{label:'Projet vierge',description:'Scène minimale et bibliothèque libre',modes:['2d','3d']},
 tactical:{label:'FPS / TPS',description:'Capture et escouade de combat',modes:['2d','3d']},
 openworld:{label:'Monde ouvert',description:'Vehicule, PNJ et mission',modes:['2d','3d']},
 survival:{label:'Survival · Survie',description:'Besoins vitaux, récolte, fabrication, campement et dangers nocturnes',modes:['2d','3d']},
 rts:{label:'RTS',description:'Unites et capture',modes:['2d','3d']},
 horror:{label:'Horror',description:'Traque, cachette et generatrice',modes:['2d','3d']},
 fieldlab:{label:'WarLike Field Lab',description:'Circuit de diagnostic : marche, interactions, véhicule et obstacles',modes:['2d','3d']},
 rp:{label:'Roleplay (RP)',description:'Ville, PNJ, dialogue, boutique, réputation',modes:['2d','3d']},
 racing:{label:'Racing',description:'Véhicule pilotable, départ, checkpoints, arrivée',modes:['2d','3d']},
 simulation:{label:'Simulation',description:'Atelier, machines, production et ressources',modes:['2d','3d']},
 rpg:{label:'RPG',description:'Personnage, quête, expérience, marchand et soin',modes:['2d','3d']},
 fourx:{label:'Stratégie 4X',description:'Explorer, étendre, exploiter, exterminer (prototype au tour par tour)',modes:['2d','3d']}
};
export const normalizeGenre=value=>Object.hasOwn(genreTemplates,value)?value:'sandbox';
const interact=(instructions,{once=false,radius=170}={})=>({enabled:true,event:'interact',key:'e',radius,once,conditions:[],instructions});
const enter=(instructions,{once=true,radius=130}={})=>({enabled:true,event:'enter',radius,once,conditions:[],instructions});
const msg=value=>({type:'message',value});
const variable=(key,value)=>({type:'setVariable',key,value});
const inc=(key,value)=>({type:'addVariable',key,value});
const signal=value=>({type:'emitSignal',value});
const item=(key,value=1)=>({type:'giveItem',targetRole:'player',key,value});

export function createGenreScene(genre,mode='3d'){
 const chosen=normalizeGenre(genre),threeD=mode==='3d';
 if(chosen==='superhero')return createHeroForgeScene(mode);
 if(chosen==='survival')return createSurvivalScene(mode);
 if(!['2d','3d'].includes(mode))throw new Error('Invalid project type');
 const objects=[];
 const spawn=(assetId,name,x,y,props={})=>{
  const id=objects.length+1;
  const model=threeD?prefab3d(assetId,id,x,y):null;
  const base=model||{id,type:'object',name,x,y,w:75,h:65,color:props.color||'#7e9fb5'};
  const value={...base,name,...props,id,x,y};
  objects.push(value);return value;
 };
 const actor=()=>{
  const player=spawn('character-hero','Player',125,160,threeD?{
   playable3d:true,controller3d:defaultController(),stats:defaultStats(),inventory:defaultInventory(),tags:['player']
  }:{type:'player',w:64,h:64,color:'#41cdb5',tags:['player'],spriteDataUrl:default2dCharacterPng});
  return player;
 };
 const object=(assetId,name,x,y,props={})=>spawn(assetId,name,x,y,props);
 const marker=(name,x,y,sequence,color='#e4c16e')=>object(threeD?'prop-cone':'primitive-cube',name,x,y,
  {type:threeD?'mesh3d':'object',w:threeD?55:60,h:threeD?80:60,depth3d:55,color,collision3d:false,solid3d:false,sequence});
 const player=actor();
 if(['tactical','openworld','survival','rts','horror'].includes(chosen)){
  const mission=(name,x,y,actions)=>marker(name,x,y,interact(actions,{radius:130,once:true}));
  if(chosen==='tactical'){
   object('building-wall','Couverture',400,260,{collision3d:true,solid3d:true});
   object('vehicle-tank','Char arme',270,520,{team:1,maxSpeed:95,acceleration:80,brakeForce:180,turnRate:65,drag:2,vehicleWeapon:{enabled:true,range:700,damage:38,cooldown:.8,arc:35},tags:['armed-vehicle','military']});
   object('character-soldier','Allie',240,370,{team:1,playable3d:false});
   object('character-soldier','Opposant',760,390,{team:2,playable3d:false,stats:defaultStats(),ai:{enabled:true,detection:300,speed:35,attackRange:75,attackDamage:6,attackCooldown:2}});
   mission('Capturer',900,190,[variable('captured',1),signal('fps:capture'),msg('Zone capturee')]);
  }
  if(chosen==='openworld'){
   object('building-garage','Garage',590,160);
   object('vehicle-jeep','Jeep',260,360,{maxSpeed:210,acceleration:170,turnRate:120});
   object('character-civilian','Citoyen',460,330,{playable3d:false,sequence:interact([inc('reputation',1),msg('Bonjour !')])});
   mission('Livraison',980,520,[variable('delivered',1),inc('money',100),msg('Livraison terminee')]);
  }
  if(chosen==='rts'){
   object('building-hangar','QG',220,150,{team:1});
   object('character-soldier','Escouade A',370,320,{team:1,playable3d:false,tags:['rts-unit']});
   object('character-soldier','Escouade B',450,320,{team:1,playable3d:false,tags:['rts-unit']});
   object('building-tower','Poste adverse',930,230,{team:2});
   mission('Mine',550,480,[inc('resources',20),msg('Ressources +20')]);
   mission('Capture',910,370,[variable('outpostCaptured',1),signal('rts:capture'),msg('Avant-poste capture')]);
  }
  if(chosen==='horror'){
   object('building-wall','Cloison',500,250,{w:50,h:320,collision3d:true,solid3d:true});
   object('character-zombie','Traqueur',840,450,{playable3d:false,behavior:'none',horrorAiConfig:{enabled:true,visionRange:260,hearingRange:280,memorySeconds:8}});
   object('prop-container','Cachette',320,540,{collision3d:false,horrorHideConfig:{enabled:true,radius:100}});
   mission('Generatrice',950,140,[variable('powerOn',1),msg('Courant retabli')]);
   mission('Evacuation',1070,560,[variable('escaped',1),msg('Sortie atteinte')]);
  }
  player.sequence={...interact([variable('resources',30),variable('money',0),variable('supplies',0),msg('WarLike : objectifs '+chosen)]),event:'start',once:true};
 } else if(chosen==='fieldlab'){
  // Self-contained smoke-test course; no remote assets or external services required.
  // Interactions validate real player state; walking checkpoints require on-foot,
  // the driving checkpoint requires a mounted character.
  player.name='Field Lab · Pilote';
  player.sequence={...interact([
   variable('labWalk',0),variable('labInteract',0),variable('labDrive',0),
   msg('FIELD LAB : avance au point bleu, interagis avec la console, conduis au point rouge.')
  ]),event:'start',once:true};
  marker('01 · Test marche',350,155,{
   ...enter([variable('labWalk',1),signal('lab:walk'),msg('✓ Marche validée')],{once:true,radius:90}),
   conditions:[{type:'playerOnFoot'}]
  },'#63b4d5');
  marker('02 · Console interactive',320,365,
   interact([variable('labInteract',1),signal('lab:interact'),msg('✓ Interaction validée')],{radius:115,once:true}),'#e5be6e');
  const car=object('vehicle-jeep','03 · Véhicule test',520,170,{
   tags:['race-vehicle','fieldlab-vehicle'],maxSpeed:240,acceleration:190,brakeForce:300,
   turnRate:140,drag:1.35,reverseRatio:.45,rotation:0,
   ...(threeD?{collision3d:true}:{type:'prefab',assetId:'jeep',w:115,h:70})
  });
  if(threeD)car.csharpComponents=[{kind:'VehicleController',maxSpeed:240,acceleration:190,brakeForce:300,turnRate:140,drag:1.35,reverseRatio:.45}];
  marker('04 · Test conduite',815,180,{
   ...enter([variable('labDrive',1),signal('lab:drive'),msg('✓ Conduite validée')],{once:false,radius:115}),
   conditions:[{type:'playerInVehicle'}]
  },'#e3847b');
  object('building-wall','Obstacle collision A',690,305,{w:130,h:threeD?115:42,depth3d:35,collision3d:true,solid3d:true});
  object('building-wall','Obstacle collision B',815,385,{w:130,h:threeD?115:42,depth3d:35,collision3d:true,solid3d:true});
  marker('05 · Diagnostic final',1020,185,{
   ...interact([],{once:false,radius:135}),
   branches:[{conditions:[
    {type:'variable',key:'labWalk',operator:'==',value:1},
    {type:'variable',key:'labInteract',operator:'==',value:1},
    {type:'variable',key:'labDrive',operator:'==',value:1}
   ],instructions:[variable('labCompleted',1),signal('lab:complete'),msg('FIELD LAB : 3 / 3 vérifications réussies !')]}],
   elseInstructions:[msg('Diagnostic incomplet : valide marche, interaction et conduite.')]
  },'#83d3a9');
  const threat=object('character-zombie','Sentinelle hostile · test IA',1175,520,{
   ai:{enabled:true,state:'idle',detection:310,attackRange:75,attackDamage:5,attackCooldown:1.5,
     speed:35,homeX:null,homeY:null,patrolRadius:55,pathfinding:false,requireLineOfSight:true},
   stats:defaultStats(),threatIntel:{faction:'undead',relation:'hostile',className:'Sentinelle',level:4,weakness:'Corps à corps'},
   playable3d:false,tags:['fieldlab-enemy'],color:'#bb6873'
  });
  const neutral=object('character-civilian','Technicien allié · test faction',1070,660,{
   ai:{enabled:true,state:'idle',detection:220,attackRange:65,attackDamage:0,attackCooldown:2,
    speed:0,homeX:null,homeY:null,patrolRadius:0,pathfinding:false,requireLineOfSight:false},
   stats:defaultStats(),threatIntel:{faction:'civilian',relation:'friendly',className:'Technicien',level:1,weakness:'Aucune'},
   playable3d:false,tags:['fieldlab-ally']
  });
  if(!threeD){threat.type='object';neutral.type='object';}
  if(threeD){
   object('environment-road','Piste Field Lab',505,535,{collision3d:false,solid3d:false,w:1000,depth3d:150});
   object('building-garage','Hangar de tests',1080,320,{collision3d:true,solid3d:true});
  }
 } else if(chosen==='rp'){
  player.csharpComponents=[{kind:'Roleplay',money:50,reputation:0}];
  object('building-house','Quartier RP',330,165);
  object('character-civilian','Citoyen',270,315,{playable3d:false,sequence:interact([inc('reputation',1),msg('Bienvenue au quartier ! Réputation +1')])});
  marker('Boutique',505,300,interact([inc('money',-10),item('supplies'),msg('Achat : provisions, -10 crédits')]),'#73bda2');
  marker('Travail',480,110,interact([inc('money',20),msg('Mission de travail terminée : +20 crédits')]),'#eac57f');
  player.sequence={...interact([variable('money',50),variable('reputation',0),msg('RP : travail, commerce, réputation et PNJ')]),event:'start',once:true};
 } else if(chosen==='racing'){
  const car=object('vehicle-sports','Voiture de course',245,160,{tags:['race-vehicle'],maxSpeed:310,acceleration:225,brakeForce:310,turnRate:145,drag:1.15,reverseRatio:.45,rotation:0,
   ...(threeD?{collision3d:true}:{type:'prefab',assetId:'vehicle-jeep'})});
  car.csharpComponents=[{kind:'RacingRules'}];
  if(!threeD){car.type='prefab';car.assetId='jeep';car.w=115;car.h=72;}
  marker('Départ',180,360,interact([variable('raceStarted',1),variable('raceFinished',0),variable('raceElapsed',0),variable('raceCheckpoint',0),signal('race:start'),msg('Course lancée !')]));
  marker('Checkpoint 1',500,340,enter([inc('raceCheckpoint',1),signal('race:checkpoint'),msg('Checkpoint 1')],{once:true,radius:105}));
  marker('Arrivée',640,155,{...enter([],{once:false,radius:110}),branches:[{conditions:[{type:'variable',key:'raceCheckpoint',operator:'>=',value:1}],instructions:[variable('raceFinished',1),signal('race:finish'),msg('Arrivée !')]}],elseInstructions:[msg('Passe le checkpoint avant l’arrivée.')]});
  if(threeD)object('environment-road','Circuit',350,450,{collision3d:false,solid3d:false});
 } else if(chosen==='simulation'){
  player.csharpComponents=[{kind:'SimulationEconomy',money:100,materials:5}];
  object('building-garage','Atelier',340,135);
  marker('Machine de production',420,340,interact([inc('materials',2),msg('Production : +2 matériaux')]),'#7cbaaa');
  marker('Commande client',170,395,interact([inc('money',25),inc('materials',-1),msg('Commande livrée : +25 crédits')]),'#e9ba75');
  marker('Maintenance',590,200,interact([inc('maintenance',1),msg('Machine entretenue')]),'#a5bcdc');
  player.sequence={...interact([variable('materials',5),variable('money',100),variable('maintenance',0),msg('Simulation : ressources, fabrication et commandes')]),event:'start',once:true};
 } else if(chosen==='rpg'){
  player.csharpComponents=[{kind:'RpgProgression',gold:100}];
  const npc=object('character-civilian','Donneur de quête',315,220,{playable3d:false});
  npc.sequence=interact([variable('questActive',1),signal('rpg:quest'),msg('Quête : rejoindre les ruines')]);
  marker('Ruines',590,370,enter([variable('questCompleted',1),inc('experience',50),signal('rpg:quest-complete'),msg('Quête terminée : +50 XP')]));
  marker('Marchand',370,400,interact([item('potion'),inc('gold',-10),msg('Potion achetée (-10 or)')]),'#82cfa4');
  marker('Sanctuaire',160,390,interact([{type:'healObject',targetRole:'player',value:25},msg('Soin +25')]),'#a6dbcb');
  player.sequence={...interact([variable('gold',100),variable('experience',0),msg('RPG : dialogue, quête, objets et progression')]),event:'start',once:true};
 } else if(chosen==='fourx'){
  player.tags=[...new Set([...(player.tags||[]),'commander'])];
  const first=object('building-tower','Capitale',320,215,{team:1,tags:['4x-city'],playable3d:false,csharpComponents:[{kind:'FourXEmpire'}]});
  first.sequence={...interact([variable('turn',1),variable('food',12),variable('industry',8),variable('science',3),variable('territory',1),variable('army',2),msg('4X : explorer, étendre, exploiter, exterminer')]),event:'start',once:true};
  marker('Explorer',525,145,interact([inc('science',2),signal('4x:explore'),msg('Région explorée : +2 science')]),'#84afd6');
  marker('Coloniser',550,385,interact([inc('territory',1),inc('food',-2),signal('4x:expand'),msg('Territoire colonisé : -2 nourriture')]),'#93c599');
  marker('Mines',240,415,interact([inc('industry',3),msg('Ressources exploitées : +3 industrie')]),'#dbb47c');
  marker('Camp ennemi',705,345,{...interact([],{once:true}),branches:[{conditions:[{type:'variable',key:'army',operator:'>=',value:1}],instructions:[inc('army',-1),inc('territory',1),signal('4x:conquer'),msg('Victoire ! Camp ennemi conquis')]}],elseInstructions:[msg('Il faut au moins une armée pour conquérir ce camp.')]},'#d68080');
  marker('Fin du tour',80,350,interact([inc('turn',1),inc('food',3),inc('industry',2),inc('science',1),signal('4x:turn'),msg('Nouveau tour : ressources produites')]),'#be9ecb');
  if(threeD)object('character-soldier','Unité terrestre',690,260,{playable3d:false,team:1,tags:['rts-unit','4x-army'],ai:{enabled:false}});
 }
 // All starter projects retain at least one playable actor. The sandbox template
 // adds nothing else; it must stay small.
 return {entities:objects,selected:[player.id],nextId:objects.length+1,camera:{x:0,y:0,zoom:1}};
}
