import {gameProject} from './game-project.js';
import {prefab3d,get3dAsset} from '../assets/catalog-3d.js';
import {getAsset} from '../assets/catalog.js';
import {defaultController,defaultStats,defaultInventory,defaultAi} from './gameplay-components.js';
import {defaultAnimatorGraph} from './animator-graph.js';
import {defaultSurvival,defaultSurvivalNode,defaultSurvivalWorld} from './survival-runtime.js';
import {state,notify} from './state.js';
import {record} from './history.js';
import {workspace} from './workspaces.js';
const model=(id,size)=>{const o=prefab3d(id,0),a=get3dAsset(id),scale=size/Math.max(...a.normalizedSize);[o.w,o.h,o.depth3d]=a.normalizedSize.map(v=>Math.max(1,v*scale));o.playable3d=false;return o};
const sprite=id=>({id:0,type:'prefab',assetId:id,w:96,h:96,color:'#9ebd88',animation:'idle',behavior:'none',collision3d:false});
export function survivalBuildTemplates(){
 const result={};for(const mode of ['2d','3d']){const three=mode==='3d';result[mode]={campfire:{...(three?model('free-survival-kit-campfire-pit',96):sprite('survival-2d-survival-kit-campfire-pit')),name:'Feu de camp · partagé',collision3d:false,survivalNode:{enabled:true,kind:'campfire',fuel:180},fxEmitter:{enabled:true,kind:'fire',color:'#ffb65b',endColor:'#c43f2f',rate:18,scale:.7,lifetime:.7,speed:32,gravity:35,trail:true},...(three?{lightType:'point',lightEnabled:true,lightColor:'#ffa651',lightIntensity:1.8,lightRange:5}:{})},shelter:{...(three?model('free-nature-kit-tent-smallclosed',150):sprite('survival-2d-nature-kit-tent-smallclosed')),name:'Abri · repos',collision3d:false,survivalNode:{enabled:true,kind:'shelter'}}}}return result;
}
export function createSurvivalScene(mode='3d'){
 if(!['2d','3d'].includes(mode))throw Error('Mode de survie inconnu.');const three=mode==='3d',entities=[];
 const spawn=(id,name,x,y,size,props={})=>{const o=three?model(id,size):sprite('survival-2d-'+id.replace(/^free-/,''));Object.assign(o,{id:entities.length+1,name,x,y,hierarchyGroup:'Survie',...props});entities.push(o);return o};
 if(three){const ground=model('free-nature-kit-ground-grass',2000);Object.assign(ground,{id:1,name:'Clairière',x:-650,y:-650,w:2200,h:10,depth3d:2000,elevation3d:-.17,collision3d:false,hierarchyGroup:'Terrain'});entities.push(ground)}
 else for(const [x,y] of [[-300,-300],[200,-300],[700,-300],[-300,200],[200,200],[700,200],[-300,700],[200,700],[700,700]]){entities.push({id:entities.length+1,type:'prefab',assetId:'free-platformer-art-deluxe-grasscenter',name:'Clairière',x,y,w:500,h:500,color:'#437a51',collision3d:false,hierarchyGroup:'Terrain'})}
 let player;if(three)player=spawn('quaternius-ultimatedanimatedcharacter-bluesoldier-male','Survivant',300,330,115,{playable3d:true,controller3d:defaultController(),rotation:180});else{const a=getAsset('free-platformer-art-deluxe-p1-stand');player={id:entities.length+1,type:'prefab',assetId:a.id,name:'Survivant',x:300,y:330,w:52,h:74,color:'#7dc3a4',animation:'idle',behavior:'none',controller2d:{mode:'topDown',walkSpeed:190,sprintSpeed:290}};entities.push(player)}
 Object.assign(player,{team:1,tags:['player','survivor'],stats:defaultStats(),inventory:{...defaultInventory(),items:[{id:'water',count:1},{id:'berries',count:1}],capacity:24},animatorGraph:defaultAnimatorGraph(),survival:{...defaultSurvival(),buildTemplates:survivalBuildTemplates()},survivalWorld:defaultSurvivalWorld(),cameraRig:{mode:'orbit',distance:8,height:.7,followSharpness:10,collision:true}});
 const resource=(id,name,x,y,kind,size=90)=>spawn(id,name,x,y,size,{collision3d:three,survivalNode:{...defaultSurvivalNode(),kind,amount:kind==='water'||kind==='berries'?1:2,maxStock:kind==='water'?30:12,stock:kind==='water'?30:12},hierarchyGroup:'Ressources',...(!three&&['wood','stone'].includes(kind)?{collider2d:{enabled:true,isTrigger:false,width:kind==='wood'?40:58,height:32,offsetX:kind==='wood'?28:19,offsetY:56}}:{})});
 resource('free-survival-kit-tree','Arbre · bois · E',180,260,'wood',210);
 resource('free-survival-kit-resource-stone','Roche · pierre · E',440,260,'stone',85);
 resource('free-nature-kit-plant-bush','Sous-bois · fibres · E',190,500,'fiber',90);
 resource('free-survival-kit-bottle','Source · eau · E',450,500,'water',75);
 resource('free-nature-kit-plant-bush','Baies sauvages · E',630,360,'berries',100);
 for(const [x,y] of [[-120,80],[730,50],[940,660]])resource('free-survival-kit-tree','Arbre · bois · E',x,y,'wood',240);
 for(const [x,y] of [[-180,750],[1000,650]]){let foe;if(three)foe=spawn('quaternius-ultimatedanimatedcharacter-zombie-male','Rôdeur · danger nocturne',x,y,120);else{foe={id:entities.length+1,type:'prefab',assetId:'free-tiny-dungeon-tile-0111',name:'Rôdeur · danger nocturne',x,y,w:58,h:75,color:'#75966b',animation:'idle',collision3d:false};entities.push(foe)}Object.assign(foe,{team:2,tags:['enemy'],stats:{...defaultStats(),health:70,maxHealth:70},ai:{...defaultAi(),speed:32,detection:220,attackDamage:6,patrolRadius:55},survivalThreat:{enabled:true,speed:32,detection:220},animatorGraph:defaultAnimatorGraph()})}
 const goals=[['campfire','survivalCamp','Allumer un feu de camp'],['shelter','survivalShelter','Construire un abri'],['meal','survivalMeal','Cuisiner un repas'],['dawn','survivalDawn','Survivre jusqu’à l’aube']];
 player.sequence={enabled:true,event:'start',once:true,conditions:[],instructions:[...goals.map(([,key,value])=>({type:'setObjective',key,value,total:1})),{type:'message',value:'PREMIÈRE AUBE · Récolte, place ton camp, cuisine et survis à la nuit. R : tourner l’aperçu · Échap : annuler / pause.'}]};
 player.sequences=[...goals.map(([key,id])=>({enabled:true,event:'interval',interval:.5,once:true,conditions:[{type:'survivalMilestone',key}],instructions:[{type:'completeObjective',key:id}]})),{enabled:true,event:'interval',interval:.5,once:true,conditions:[{type:'survivalMilestone',key:'expedition'}],instructions:[{type:'winGame',value:'Première aube · le camp est prêt et vous avez survécu. Expédition accomplie !'}]},{enabled:true,event:'interval',interval:.5,once:true,conditions:[{type:'survivalPartyDefeated'}],instructions:[{type:'loseGame',value:'Tous les survivants sont tombés. Reprends la sauvegarde ou prépare mieux le camp.'}]}];
 return {entities,selected:[player.id],nextId:entities.length+1,camera:{x:0,y:0,zoom:.8},playerId:player.id};
}
export function loadSurvivalScene(){if(state.playing)return false;const scene=createSurvivalScene(workspace.mode);state.entities=scene.entities;state.selected=scene.selected;state.nextId=scene.nextId;state.camera=scene.camera;gameProject.genre='survival';record('Survival · Clairière');notify();return true}
