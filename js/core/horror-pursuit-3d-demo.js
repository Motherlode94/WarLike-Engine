import {state,notify} from './state.js';
import {workspace} from './workspaces.js';
import {prefab3d} from '../assets/catalog-3d.js';
import {defaultController,defaultStats,defaultInventory} from './gameplay-components.js';
import {horror} from './horror-survival.js';
import {record} from './history.js';

export function loadHorror3dDemo(){
 if(state.playing)throw Error('Arrete Play avant de charger la scene.');
 if(workspace.mode!=='3d')throw Error('Ouvre un projet 3D dans le Hub.');
 const entities=[];let next=1;
 const add=(asset,name,x,y,props={})=>{
  const o=prefab3d(asset,next++,x,y);
  if(!o)throw Error('Asset absent: '+asset);
  Object.assign(o,{name,...props});entities.push(o);return o;
 };
 const player=add('character-hero','Survivant',110,140,{playable3d:true,controller3d:defaultController(),stats:defaultStats(),inventory:defaultInventory()});
 for(const [x,y,w,h] of [[20,20,1200,40],[20,20,40,850],[20,830,1200,40],[1180,20,40,850],[330,50,38,350],[570,450,38,380],[800,50,38,370]]){
  add('building-wall','Mur',x,y,{w,h,depth3d:40,collision3d:true});
 }
 add('character-zombie','Traqueur',940,590,{playable3d:false,behavior:'none',horrorAiConfig:{enabled:true,visionRange:300,hearingRange:310,memorySeconds:8,chaseSpeed:95},horrorAI:{awareness:0,searchTimer:0,lastKnown:null}});
 for(const [x,y] of [[220,650],[720,630]])add('prop-container','Cachette',x,y,{collision3d:false,horrorHideConfig:{enabled:true,radius:105}});
 add('prop-crate','Generateur',990,170,{collision3d:false,sequence:{enabled:true,event:'interact',key:'e',radius:120,once:true,conditions:[],instructions:[{type:'setVariable',key:'powerRestored',value:1},{type:'message',value:'Electricite retablie !'}]}});
 add('prop-crate','Porte de sortie',1060,750,{collision3d:false,sequence:{enabled:true,event:'interact',key:'e',radius:120,conditions:[{type:'variable',key:'powerRestored',operator:'==',value:1}],instructions:[{type:'setVariable',key:'escaped',value:1},{type:'message',value:'Evasion reussie !'}],elseInstructions:[{type:'message',value:'Le courant est coupe.'}]}});
 state.entities=entities;state.nextId=next;state.selected=[player.id];horror.enabled=true;
 const toggle=document.getElementById('horrorSurvivalToggle');if(toggle)toggle.checked=true;
 record('Scene Horror Pursuit 3D');notify();
}
