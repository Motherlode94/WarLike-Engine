// THE LAST LIGHT — original 3D post-collapse survival story in WarLike Engine.
// Inspired by the survival genre, without using licensed characters or narrative.
import {prefab3d} from '../assets/catalog-3d.js';
import {defaultController,defaultInventory,defaultStats,defaultAi} from './gameplay-components.js';
const set=(key,value)=>({type:'setVariable',key,value});
const eq=(key,value=1)=>({type:'variable',key,operator:'==',value});
const say=value=>({type:'message',value});
const goal=(key,value)=>({type:'setObjective',key,value,total:1});
const done=key=>({type:'completeObjective',key});
const interact=(instructions,options={})=>({enabled:true,event:'interact',key:'e',radius:155,once:true,conditions:[],instructions,...options});
export function createLastLightScene(mode='3d'){
 if(mode!=='3d')throw Error('THE LAST LIGHT exige un projet 3D.');
 const entities=[];
 const add=(asset,name,x,y,props={})=>{
  const obj=prefab3d(asset,entities.length+1,x,y);
  if(!obj)throw Error('Asset 3D absent : '+asset);
  Object.assign(obj,{name,playable3d:false,hideLabelInPlay:true,hierarchyGroup:'Décor',...props,id:entities.length+1});
  entities.push(obj);return obj;
 };
 const architecture=(name,x,y,w,depth,h=210,props={})=>add('primitive-cube',name,x,y,{
  w,depth3d:depth,h,collision3d:true,solid3d:true,color:'#5c625b',hierarchyGroup:'Architecture',...props
 });
 add('primitive-cube','Terrain · quartier de quarantaine',0,0,{w:1600,depth3d:1120,h:16,elevation3d:-.25,color:'#565a4e',collision3d:true,solid3d:true,tags:['ai-walkable'],hierarchyGroup:'Architecture'});
 architecture('Limite nord',0,0,1600,32);
 architecture('Limite sud',0,1088,1600,32);
 architecture('Limite ouest',0,0,32,1120);
 architecture('Limite est',1568,0,32,1120);
 architecture('Immeuble effondré',360,80,220,280,260,{color:'#4d4d50'});
 architecture('Ruines du dispensaire',750,80,270,200,220,{color:'#6d6b65'});
 architecture('Mur de sécurité · section',650,430,34,320,165,{color:'#62615e'});
 architecture('Barricade de l’ancienne avenue',1030,650,200,40,95,{color:'#6c554a'});
 architecture('Voiture abandonnée',360,670,160,95,55,{color:'#72685f'});
 architecture('Conteneur de secours',1080,290,160,95,88,{color:'#73766b'});
 const player=add('character-hero','Noé · survivant',145,145,{
  hierarchyGroup:'Personnages',tags:['player','last-light-protagonist'],team:1,playable3d:true,
  controller3d:{...defaultController(),walkSpeed:3.1,sprintSpeed:4.7},
  cameraRig:{mode:'thirdPerson',distance:5.7,height:.75,collision:true},
  stats:defaultStats(),inventory:defaultInventory(),collision3d:true
 });
 const light=(name,x,y,color,intensity)=>add('primitive-cube',name,x,y,{
  w:14,h:14,depth3d:14,elevation3d:2.7,color,collision3d:false,solid3d:false,
  lightType:'point',lightEnabled:true,lightColor:color,lightIntensity:intensity,lightRange:9,hierarchyGroup:'Éclairage'
 });
 light('Lampe de secours',280,245,'#f2bd85',1.5);
 light('Éclairage du dispensaire',880,355,'#8cb6a2',1.05);
 light('Feu de barricade',1210,890,'#ff9867',1.1);
 const clue=(asset,name,x,y,key,words)=> {
  const o=add(asset,name,x,y,{collision3d:false,solid3d:false,hierarchyGroup:'Ressources',tags:['last-light-clue'],adventureInteractable:{label:'Examiner '+name,radius:155}});
  o.sequence=interact([set(key,1),done('lastlight:'+key),say(words),{type:'setVisibility',value:false}],{
   conditions:[eq(key,0)],elseInstructions:[say('Tu as déjà récupéré cette preuve.')]
  });
  return o;
 };
 const radio=clue('prop-crate','01 · Radio de quarantaine',255,260,'radio','Radio : « Zone interdite. Les spores suivent les courants d’air. Les personnes évacuées ont été conduites vers la station. »');
 const medicine=clue('prop-crate','02 · Médicaments',945,320,'medicine','Un kit de soins encore scellé. Iris pourra stabiliser la blessure du jeune rescapé.');
 const journal=clue('prop-crate','03 · Carnet du médecin',220,850,'journal','Carnet : « L’infection altère la mémoire avant le corps. Ne tuez pas quelqu’un uniquement parce qu’il ne reconnaît plus son nom. »');
 const iris=add('character-civilian','Iris · éclaireuse',1290,850,{
  hierarchyGroup:'Personnages',tags:['last-light-companion'],stats:defaultStats(),collision3d:false,solid3d:false,
  adventureInteractable:{label:'Parler à Iris',radius:175,lockedHint:'Récupère les trois preuves avant de partir.'}
 });
 iris.sequence=interact([{type:'showDialogue',speaker:'Iris',value:'La station est notre dernière chance. On a les médicaments et les preuves. Le garçon peut survivre, mais la route est infestée. Tu viens avec nous ?',choices:[
  {label:'On reste ensemble. Personne ne sera abandonné.',signal:'lastlight:protect'},
  {label:'Je sécurise la route. Rejoins-moi à la sortie.',signal:'lastlight:scout'}
 ]}],{once:false,conditions:[eq('radio'),eq('medicine'),eq('journal'),eq('choice',0)],elseInstructions:[say('Iris : « Sans radio, médicaments et carnet, on ne tiendra pas jusqu’à la station. »')]});
 iris.sequences=[
  {enabled:true,event:'signal',signal:'lastlight:protect',once:true,instructions:[set('choice',1),done('lastlight:iris'),goal('lastlight:exit','Rejoindre la station avec Iris.'),say('Iris : « Cette fois, nous rentrerons tous. »')]},
  {enabled:true,event:'signal',signal:'lastlight:scout',once:true,instructions:[set('choice',2),done('lastlight:iris'),goal('lastlight:exit','Ouvrir la voie avant que les infectés se rapprochent.'),say('Iris : « Je reste près du garçon. Ne nous oublie pas. »')]}
 ];
 for(const [i,x,y] of [[1,690,780],[2,1230,480],[3,1340,960]]){
  add('character-zombie','Infecté errant '+i,x,y,{
   hierarchyGroup:'Infectés',tags:['last-light-infected'],team:2,collision3d:true,solid3d:false,
   stats:defaultStats(),ai:{...defaultAi(),enabled:true,state:'patrol',detection:330,fieldOfView:175,
    speed:47,patrolRadius:80,attackRange:50,attackDamage:5,attackCooldown:3,pathfinding:true,requireLineOfSight:true,homeX:x,homeY:y}
  });
 }
 const exit=add('primitive-cube','Porte · station de transit',1460,160,{
  hierarchyGroup:'Objectifs',w:70,h:180,depth3d:20,color:'#b9c9a1',collision3d:false,solid3d:false,
  adventureInteractable:{label:'Rejoindre la station',radius:155}
 });
 exit.sequence=interact([],{
  once:false,branches:[
   {conditions:[eq('choice',1)],instructions:[done('lastlight:exit'),{type:'winGame',value:'FIN · ENSEMBLE — Noé ouvre la station. Iris et le rescapé sont vivants. À travers la radio, une nouvelle voix prononce un nom oublié.'}]},
   {conditions:[eq('choice',2)],instructions:[done('lastlight:exit'),{type:'winGame',value:'FIN · ÉCLAIREUR — La route est libre, mais Iris n’a pas encore rejoint la station. Au loin, une lumière s’allume dans les ruines : quelqu’un les observait.'}]}
  ],elseInstructions:[say('La station est verrouillée. Rassemble les preuves et parle à Iris.')]
 });
 player.adventure={title:'THE LAST LIGHT · Les Cendres du Matin',combatEnabled:false,items:[],notes:[],demo:{
  id:'lastlightnative',title:'THE LAST LIGHT · Prologue 3D natif',
  description:'Explore un quartier en quarantaine, évite les infectés, récupère trois ressources, rejoins Iris et décide comment atteindre la station.',
  features:['Scène 3D éditable','Caméra TPS','Infectés IA','Blueprint','Dialogues','Deux issues'],
  steps:[{goal:'lastlight:radio',targetId:radio.id},{goal:'lastlight:medicine',targetId:medicine.id},{goal:'lastlight:journal',targetId:journal.id},{goal:'lastlight:iris',targetId:iris.id},{goal:'lastlight:exit',targetId:exit.id}]
 }};
 player.sequence={enabled:true,event:'start',once:true,instructions:[
  set('radio',0),set('medicine',0),set('journal',0),set('choice',0),
  goal('lastlight:radio','Retrouver la radio'),
  goal('lastlight:medicine','Récupérer les médicaments'),
  goal('lastlight:journal','Lire le carnet du médecin'),
  goal('lastlight:iris','Retrouver Iris'),
  say('THE LAST LIGHT · PROLOGUE — La ville est tombée il y a neuf ans. Ne fais pas de bruit. ZQSD / souris : explorer · E : interagir · J : journal.')
 ]};
 return {entities,selected:[player.id],nextId:entities.length+1,playerId:player.id,genre:'horror',camera:{x:80,y:70,zoom:.75},
  guide:'THE LAST LIGHT · Prologue original en 3D native. Trois preuves → Iris → station. WarLike Engine : Hierarchy, Inspector, Blueprint, WarNode. Les GLB et animations spécialisés viendront ensuite.'};
}
