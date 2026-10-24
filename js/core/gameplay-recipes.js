// WarLike gameplay recipes: reusable no-code configurations for a selected object.
// Recipes only write serializable components; they do not execute untrusted source.
import {defaultStats,defaultInventory,defaultAi,defaultController} from './gameplay-components.js';
export const recipes=[
 {id:'player-adventure',name:'Player Adventure',description:'Player 3D, stamina, health, basic inventory'},
 {id:'enemy-guard',name:'Enemy Guard',description:'Patrol, detect, chase and attack player'},
 {id:'enemy-boss',name:'Enemy Boss',description:'High-health elite enemy with stronger attack'},
 {id:'healing-station',name:'Healing Station',description:'Press E to restore health using Logic Sequences'},
 {id:'locked-door',name:'Locked Door',description:'Interactive door controlled by a global key variable'},
 {id:'loot-chest',name:'Loot Chest',description:'Press E once to give an item to player'}
];
const seq=(instructions,extra={})=>({enabled:true,event:'interact',radius:110,key:'e',once:false,conditions:[],instructions,...extra});
export function applyRecipe(o,id){
 if(!o||typeof o!=='object')return false;
 switch(id){
 case 'player-adventure':o.playable3d=true;o.stats=defaultStats();o.inventory=defaultInventory();o.controller3d=defaultController();return true;
 case 'enemy-guard':o.stats=defaultStats();o.ai={...defaultAi(),detection:450,attackRange:65,speed:75};return true;
 case 'enemy-boss':o.stats={...defaultStats(),maxHealth:350,health:350};o.ai={...defaultAi(),detection:750,attackRange:95,attackDamage:20,speed:90,attackCooldown:1.8};return true;
 case 'healing-station':o.sequence=seq([{type:'healObject',targetRole:'player',value:25},{type:'message',value:'Soins +25'}],{interval:1});return true;
 case 'locked-door':o.sequence=seq([],{branches:[{conditions:[{type:'variable',key:'hasKey',operator:'==',value:1}],instructions:[{type:'message',value:'Porte ouverte'},{type:'enableObject',value:false}]}],elseInstructions:[{type:'message',value:'Porte verrouillée : clé requise'}]});return true;
 case 'loot-chest':o.sequence=seq([{type:'giveItem',targetRole:'player',key:'key',value:1},{type:'setVariable',key:'hasKey',value:1},{type:'message',value:'Clé obtenue'}],{once:true});return true;
 default:return false;
 }
}
