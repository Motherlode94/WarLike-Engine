// Iron Defiance — native WarLike Engine learning mission.
// A focused editor lab, not a replacement for the standalone Three.js RTS.
import {prefab3d} from '../assets/catalog-3d.js';
import {defaultController,defaultStats,defaultInventory} from './gameplay-components.js';
import {createGraph} from './blueprint-graph.js';
const set=(key,value)=>({type:'setVariable',key,value});
const say=value=>({type:'message',value});
const emit=value=>({type:'emitSignal',value});
const eq=(key,value=1)=>({type:'variable',key,operator:'==',value});
function interact(instructions,extra={}){return {enabled:true,event:'interact',key:'e',radius:155,once:false,instructions,...extra};}
export function createIronDefianceTrainingScene(mode='3d'){
 if(mode!=='3d')throw Error('Iron Defiance Academy exige un projet 3D.');
 const entities=[];
 const add=(asset,name,x,y,props={})=>{
  const object=prefab3d(asset,entities.length+1,x,y);
  if(!object)throw Error('Ressource 3D manquante : '+asset);
  Object.assign(object,{id:entities.length+1,name,hierarchyGroup:'Iron Defiance Academy',hideLabelInPlay:true,playable3d:false,...props});
  entities.push(object);return object;
 };
 add('primitive-cube','Sol · terrain école',0,0,{w:1152,depth3d:832,h:16,elevation3d:-.25,color:'#58685e',collision3d:true,solid3d:true,tags:['ai-walkable'],hierarchyGroup:'Terrain'});
 const player=add('character-hero','Commandant · FPS',100,110,{hierarchyGroup:'Commandement',tags:['player','iron-academy'],team:1,playable3d:true,cameraRig:{mode:'firstPerson',distance:1.2,height:.78,collision:true,followSharpness:12},controller3d:{...defaultController(),walkSpeed:3.8,sprintSpeed:5.6},stats:defaultStats(),inventory:defaultInventory(),collision3d:true});
 const positions=[{name:'Alpha',count:5,x:210,color:'#5b9b91'},{name:'Beta',count:4,x:500,color:'#9caa78'},{name:'Delta',count:3,x:780,color:'#caa06c'}];
 for(const t of positions){
  for(let i=0;i<t.count;i++){
   const soldier=add('character-civilian',t.name+' · Soldat '+(i+1),t.x+(i%3)*54,310+Math.floor(i/3)*95,{
    hierarchyGroup:'Escouade 01 / '+t.name,tags:['iron-soldier','iron-'+t.name.toLowerCase()],team:1,
    color:t.color,stats:defaultStats(),collision3d:true,solid3d:false
   });
   soldier.ironTraining={squad:'Escouade 01',team:t.name,slot:i+1,nominal:t.count,editable:true};
  }
  const console=add('primitive-cube','Terminal · '+t.name,t.x,190,{
   w:48,h:85,depth3d:45,elevation3d:.65,color:t.color,collision3d:false,solid3d:false,
   hierarchyGroup:'Blueprint · Terminals',adventureInteractable:{label:'Activer '+t.name,radius:155}
  });
  const sequence=interact([
   set('iron_'+t.name.toLowerCase(),1),
   say('Équipe '+t.name+' enregistrée. Ouvre cet objet dans Blueprint / WarNode pour modifier la logique.'),
   emit('iron:team:'+t.name.toLowerCase())
  ]);
  sequence.graph=createGraph(sequence);
  console.sequence=sequence;
 }
 const finish=add('primitive-cube','Terminal · Synthèse',1000,650,{
  w:65,h:110,depth3d:65,elevation3d:.65,color:'#7dcdbd',collision3d:false,solid3d:false,
  hierarchyGroup:'Blueprint · Terminals',adventureInteractable:{label:'Valider les trois équipes',radius:155}
 });
 finish.sequence=interact([{type:'winGame',value:'IRON DEFIANCE ACADEMY : Alpha, Beta et Delta validées.'}],{
  conditions:[eq('iron_alpha'),eq('iron_beta'),eq('iron_delta')],
  elseInstructions:[say('Active Alpha, Beta et Delta avant de valider la formation.')]
 });
 player.sequence={enabled:true,event:'start',once:true,instructions:[
  set('iron_alpha',0),set('iron_beta',0),set('iron_delta',0),
  {type:'setObjective',key:'iron:academy',value:'Visite les terminaux Alpha, Beta et Delta, puis valide la formation.',total:1},
  say('IRON DEFIANCE ACADEMY · ZQSD/WASD + souris · E aux terminaux · Blueprint / WarNode éditables dans Inspector.')
 ]};
 player.adventure={title:'IRON DEFIANCE · Academy',combatEnabled:false,items:[],notes:[],
  demo:{id:'irondefiancetraining',title:'Iron Defiance · Academy native',
   description:'Manipule 12 soldats répartis Alpha 5 / Beta 4 / Delta 3 et trois terminaux Blueprint.',
   features:['Hierarchy / Inspector','Blueprint / WarNode','Exemple WarScript séparé','Caméra FPS','Scène native éditable'],
   steps:[{goal:'iron:academy',targetId:finish.id}]}
 };
 return {entities,selected:[player.id],nextId:entities.length+1,playerId:player.id,genre:'rts',
  camera:{x:70,y:60,zoom:.8},guide:'Iron Defiance Academy · Ouvre Hierarchy et Inspector, puis Blueprint / WarNode sur les trois terminaux. En Play : ZQSD + souris, E pour activer Alpha, Beta, Delta et la synthèse.'};
}
