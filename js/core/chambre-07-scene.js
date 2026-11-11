// CHAMBRE 07 — native, editable WarLike 3D demo (no iframe or raycaster).
// All objects are ordinary scene entities; quest logic uses Blueprint Sequences.
import {prefab3d} from '../assets/catalog-3d.js';
import {defaultController,defaultStats,defaultInventory,defaultAi} from './gameplay-components.js';

const set=(key,value)=>({type:'setVariable',key,value});
const eq=(key,value=1)=>({type:'variable',key,operator:'==',value});
const say=value=>({type:'message',value});
const goal=(key,value)=>({type:'setObjective',key,value,total:1});
const done=key=>({type:'completeObjective',key});
const emit=value=>({type:'emitSignal',value});
const interact=(instructions,options={})=>({enabled:true,event:'interact',key:'e',radius:145,once:true,conditions:[],instructions,...options});
const listen=(name,instructions)=>({enabled:true,event:'signal',signal:name,once:true,instructions});

export function createChambre07Scene(mode='3d'){
 if(mode!=='3d')throw Error('CHAMBRE 07 exige un projet 3D.');
 const entities=[];
 const add=(asset,name,x,y,props={})=>{
  const object=prefab3d(asset,entities.length+1,x,y);
  if(!object)throw Error('Ressource 3D manquante : '+asset);
  Object.assign(object,{name,hierarchyGroup:'Décor',hideLabelInPlay:true,playable3d:false,...props,id:entities.length+1});
  entities.push(object);return object;
 };
 const block=(name,x,y,w,depth,height=220,props={})=>add('primitive-cube',name,x,y,{
  w,depth3d:depth,h:height,elevation3d:0,
  color:'#535269',collision3d:true,solid3d:true,hierarchyGroup:'Architecture',...props
 });
 // This floor is both rendered and solid. Its top coincides with z=0.
 add('primitive-cube','Plancher · appartement',0,0,{
  w:1152,depth3d:896,h:16,elevation3d:-.25,
  color:'#61515c',collision3d:true,solid3d:true,tags:['ai-walkable'],hierarchyGroup:'Architecture'
 });
 // Closed outer boundaries. Inner partitions intentionally leave walkable openings.
 block('Mur nord',0,0,1152,24);
 block('Mur sud',0,872,1152,24);
 block('Mur ouest',0,0,24,896);
 block('Mur est',1128,0,24,896);
 block('Cloison chambre · nord',420,24,24,320);
 block('Cloison chambre · sud',420,520,24,352);
 block('Cloison salon · gauche',444,410,245,24);
 block('Cloison salon · droite',835,410,293,24);
 block('Cloison archives · ouest',790,24,24,230);
 block('Cloison archives · sud',790,320,24,90);
 // Decorative furniture stays physically solid, but never blocks the mission route.
 block('Table basse',120,300,150,70,37,{color:'#8f7189',hierarchyGroup:'Mobilier'});
 block('Console archives',870,130,150,55,85,{color:'#454f65',hierarchyGroup:'Mobilier'});
 block('Lit ancien',130,610,175,100,48,{color:'#624c70',hierarchyGroup:'Mobilier'});
 const player=add('character-hero','Joueur · CHAMBRE 07',130,130,{
  hierarchyGroup:'Joueur',tags:['player'],team:1,playable3d:true,
  cameraRig:{mode:'firstPerson',distance:1.2,height:.78,collision:true,followSharpness:12},
  controller3d:{...defaultController(),walkSpeed:3.5,sprintSpeed:5.3},
  stats:defaultStats(),inventory:defaultInventory(),collision3d:true,
  hideLabelInPlay:true
 });
 const light=(name,x,y,color,intensity=1.5)=>add('primitive-cube',name,x,y,{
  w:18,h:18,depth3d:18,elevation3d:2.6,color,collision3d:false,solid3d:false,
  lightType:'point',lightEnabled:true,lightColor:color,lightIntensity:intensity,lightRange:8,
  hierarchyGroup:'Éclairage'
 });
 light('Lumière salon',240,220,'#ff9fcf',1.6);
 light('Lumière archives',970,280,'#8dafff',1.1);
 light('Lumière couloir',660,700,'#f3b0cf',.9);
 const memory=(name,x,y,key,description,color)=>{
  const o=add('primitive-cube',name,x,y,{
   w:35,h:42,depth3d:35,elevation3d:.55,color,collision3d:false,solid3d:false,
   hierarchyGroup:'Souvenirs',adventureInteractable:{label:'Examiner '+name,radius:145},
   tags:['collectible','chambre07-memory']
  });
  o.sequence=interact([
   set(key,1),done('chambre:'+key),say(description),
   {type:'setVisibility',value:false}
  ],{conditions:[eq(key,0)],elseInstructions:[say('Ce souvenir est déjà enregistré.')]});
  return o;
 };
 const photo=memory('01 · Photographie',300,210,'chambrePhoto','La silhouette a été découpée de cette photographie.','#d59bac');
 const tape=memory('02 · Cassette',950,330,'chambreTape','Une bande porte ta voix : « Ne laisse pas la chambre choisir. »','#83a9d4');
 const letter=memory('03 · Lettre',220,760,'chambreLetter','Elle a peur d’être oubliée. Mais pourquoi te retient-elle ici ?','#e5c68d');
 const lia=add('character-civilian','Lia · la voix',980,680,{
  hierarchyGroup:'Personnages',collision3d:false,solid3d:false,
  stats:defaultStats(),tags:['chambre07-npc'],
  adventureInteractable:{label:'Parler à Lia',radius:155,lockedHint:'Retrouve les trois souvenirs avant de lui parler.'}
 });
 lia.sequence=interact([{
  type:'showDialogue',speaker:'Lia',value:'Tu as tout retrouvé. Crois-tu encore ma voix ?',
  choices:[
   {label:'Je veux comprendre.',signal:'chambre:trust'},
   {label:'Tu me mens.',signal:'chambre:reject'}
  ]
 }],{
  once:false,conditions:[eq('chambrePhoto'),eq('chambreTape'),eq('chambreLetter'),eq('chambreChoice',0)],
  elseInstructions:[say('Lia attend que tu rassembles les trois souvenirs.')]
 });
 lia.sequences=[
  listen('chambre:trust',[set('chambreChoice',1),done('chambre:lia'),goal('chambre:exit','Rejoins la sortie avant que la chambre ne se referme.'),say('Lia : « Tu peux encore partir. »'),emit('chambre:chase')]),
  listen('chambre:reject',[set('chambreChoice',2),done('chambre:lia'),goal('chambre:exit','Fuis la chambre et retrouve la vraie sortie.'),say('Lia : « Alors cours. »'),emit('chambre:chase')])
 ];
 const hunter=add('character-zombie','Ombre · poursuivant',1030,780,{
  hierarchyGroup:'Menaces',collision3d:true,solid3d:false,
  tags:['chambre07-hunter'],team:2,stats:defaultStats(),
  ai:{...defaultAi(),enabled:false,state:'idle',detection:1200,fieldOfView:360,
   speed:78,patrolRadius:0,attackRange:60,attackDamage:5,attackCooldown:2.5,
   pathfinding:true,requireLineOfSight:false,homeX:1030,homeY:780},
  sequences:[listen('chambre:chase',[{type:'setAiEnabled',value:true},say('Quelque chose s’éveille derrière toi…')])]
 });
 const exit=add('primitive-cube','Porte de sortie',1050,75,{
  hierarchyGroup:'Objectifs',w:55,depth3d:18,h:160,color:'#97d8c8',
  collision3d:false,solid3d:false,adventureInteractable:{label:'Ouvrir la sortie',radius:145}
 });
 exit.sequence=interact([],{
  once:false,
  branches:[
   {conditions:[eq('chambreChoice',1)],instructions:[done('chambre:exit'),{type:'winGame',value:'FIN · LA MÉMOIRE — Tu conserves les fragments de vérité.'}]},
   {conditions:[eq('chambreChoice',2)],instructions:[done('chambre:exit'),{type:'winGame',value:'FIN · LA RUPTURE — Tu t’échappes en refusant la voix.'}]}
  ],
  elseInstructions:[say('La porte est verrouillée. Cherche les souvenirs puis parle à Lia.')]
 });
 player.adventure={title:'CHAMBRE 07 · La Voix',combatEnabled:false,items:[],notes:[],
  demo:{id:'chambre07native',title:'CHAMBRE 07 · scène 3D native',
   description:'Explore un appartement 3D, récupère les souvenirs, choisis une réponse et échappe-toi.',
   features:['Scène éditable','Caméra FPS','Collisions 3D','Blueprint','IA de poursuite','Deux fins'],
   steps:[
    {goal:'chambre:chambrePhoto',targetId:photo.id},
    {goal:'chambre:chambreTape',targetId:tape.id},
    {goal:'chambre:chambreLetter',targetId:letter.id},
    {goal:'chambre:lia',targetId:lia.id},
    {goal:'chambre:exit',targetId:exit.id}
   ]
  }
 };
 player.sequence={enabled:true,event:'start',once:true,instructions:[
  set('chambrePhoto',0),set('chambreTape',0),set('chambreLetter',0),set('chambreChoice',0),
  goal('chambre:chambrePhoto','Retrouver la photographie'),
  goal('chambre:chambreTape','Retrouver la cassette'),
  goal('chambre:chambreLetter','Retrouver la lettre'),
  goal('chambre:lia','Comprendre la voix de Lia'),
  say('CHAMBRE 07 · ZQSD / souris : explorer · E : examiner · J : journal · F5/F9 : sauvegarder / charger.')
 ]};
 return {entities,selected:[player.id],nextId:entities.length+1,playerId:player.id,
  genre:'horror',camera:{x:70,y:60,zoom:.8},
  guide:'CHAMBRE 07 · Scène 3D native. Trois souvenirs → Lia → sortie. Caméra FPS, Blueprint et IA éditables. ZQSD / souris · E : interagir · F5/F9 : sauvegarde.'
 };
}
