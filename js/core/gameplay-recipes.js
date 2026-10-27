// WarLike gameplay recipes: reusable no-code configurations for a selected object.
// Recipes only write serializable components; they do not execute untrusted source.
import {defaultStats,defaultInventory,defaultAi,defaultController} from './gameplay-components.js';
export const recipes=[
 {id:'player-adventure',name:'Player Adventure',description:'Player 3D, stamina, health, basic inventory'},
 {id:'enemy-guard',name:'Enemy Guard',description:'Patrol, detect, chase and attack player'},
 {id:'enemy-boss',name:'Enemy Boss',description:'High-health elite enemy with stronger attack'},
 {id:'healing-station',name:'Healing Station',description:'Press E to restore health using Logic Sequences'},
 {id:'locked-door',name:'Locked Door',description:'Interactive door controlled by a global key variable'},
 {id:'loot-chest',name:'Loot Chest',description:'Press E once to give an item to player'},
 {id:'fps-player',name:'FPS · Joueur',description:'Contrôleur 3D, santé, endurance et inventaire'},
 {id:'tps-player',name:'TPS · Joueur',description:'Contrôleur 3D troisième personne, inventaire et endurance'},
 {id:'fps-enemy',name:'FPS/TPS · Ennemi tactique',description:'Détection, poursuite, attaque et points de vie'},
 {id:'rts-unit',name:'RTS · Unité',description:'Unité avec équipe, IA de garde et statistiques'},
 {id:'rts-command',name:'RTS · Poste de commandement',description:'Capture de point et signal de contrôle'},
 {id:'action-checkpoint',name:'Action · Checkpoint',description:'Sauvegarde un point de passage dans les variables Blueprint'},
 {id:'adventure-quest',name:'Aventure · Donneur de mission',description:'Interaction et activation de mission'},
 {id:'race-start',name:'Course · Départ',description:'Compte à rebours logique et signal de départ'},
 {id:'race-checkpoint',name:'Course · Passage obligatoire',description:'Validation d’un checkpoint et progression du tour'},
 {id:'race-finish',name:'Course · Arrivée',description:'Annonce une arrivée après les passages prévus'},
 {id:'race-vehicle',name:'Course · Véhicule',description:'Propriétés de conduite configurables sur un véhicule'}

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
 case 'fps-player':
 case 'tps-player':o.playable3d=true;o.stats=defaultStats();o.inventory=defaultInventory();o.controller3d={...defaultController(),cameraMode:id==='fps-player'?'firstPerson':'thirdPerson'};o.tags=[...new Set([...(o.tags||[]),'player',id==='fps-player'?'fps':'tps'])];return true;
 case 'fps-enemy':o.stats=defaultStats();o.ai={...defaultAi(),detection:600,attackRange:240,attackDamage:12,speed:85,requireLineOfSight:true};return true;
 case 'rts-unit':o.stats=defaultStats();o.team=1;o.ai={...defaultAi(),enabled:false,state:'guard',detection:300,attackRange:160,attackDamage:9,speed:60};o.tags=[...new Set([...(o.tags||[]),'rts-unit'])];return true;
 case 'rts-command':o.sequence={...seq([{type:'setVariable',key:'rtsPointCaptured',value:1},{type:'emitSignal',value:'rts:point-captured'},{type:'message',value:'Point stratégique capturé'}],{event:'enter',radius:125,once:true})};return true;
 case 'action-checkpoint':o.sequence={...seq([{type:'setVariable',key:'checkpointX',value:o.x},{type:'setVariable',key:'checkpointY',value:o.y},{type:'emitSignal',value:'adventure:checkpoint'},{type:'message',value:'Checkpoint activé'}],{event:'enter',radius:110,once:true})};return true;
 case 'adventure-quest':o.sequence=seq([{type:'setVariable',key:'missionActive',value:1},{type:'emitSignal',value:'adventure:quest-start'},{type:'message',value:'Nouvelle mission'}]);return true;
 case 'race-start':o.sequence={...seq([{type:'setVariable',key:'raceStarted',value:1},{type:'setVariable',key:'raceFinished',value:0},{type:'setVariable',key:'raceElapsed',value:0},{type:'setVariable',key:'raceCheckpoint',value:0},{type:'emitSignal',value:'race:start'},{type:'message',value:'Course lancée !'}],{event:'interact',radius:130,once:true})};return true;
 case 'race-checkpoint':o.sequence={...seq([],{event:'enter',radius:110,once:false,branches:[{conditions:[{type:'variable',key:'raceStarted',operator:'==',value:1}],instructions:[{type:'addVariable',key:'raceCheckpoint',value:1},{type:'emitSignal',value:'race:checkpoint'},{type:'message',value:'Checkpoint validé'}]}]})};return true;
 case 'race-finish':o.sequence={...seq([],{event:'enter',radius:120,once:true,branches:[{conditions:[{type:'variable',key:'raceCheckpoint',operator:'>=',value:1}],instructions:[{type:'setVariable',key:'raceFinished',value:1},{type:'emitSignal',value:'race:finish'},{type:'message',value:'Arrivée !'}]}],elseInstructions:[{type:'message',value:'Passe d’abord les checkpoints'}]})};return true;
 case 'race-vehicle':o.maxSpeed=310;o.acceleration=225;o.brakeForce=310;o.turnRate=145;o.drag=1.15;o.collisionRadius=Math.max(12,(o.w||64)*.3);o.tags=[...new Set([...(o.tags||[]),'race-vehicle'])];return true;

 default:return false;
 }
}
