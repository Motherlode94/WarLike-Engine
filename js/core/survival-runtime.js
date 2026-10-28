import {survivalTools,survivalToolStatus,wearSurvivalTool} from './survival-tools.js';
import {activeBody3d,collisionBox3d,segmentBox3d,solidBody3d} from './collision-3d.js';
import {colliderRect2d,solidCollider2d} from './physics-2d.js';
import {inventoryAdd,inventoryRemove,inventoryCount,damage,setHealth} from './gameplay-components.js';
import {healthOf} from './ai-perception.js';
import {inspectSurvivalPlacement} from './survival-building.js';
import {noteAnimatorAction} from './animator-graph.js';
const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const survivalResources={wood:'Bois',stone:'Pierre',fiber:'Fibres',berries:'Baies',water:'Eau'};
export const survivalRecipes={
 campfire:{name:'Feu de camp',cost:{wood:4,stone:2},build:'campfire'},
 shelter:{name:'Abri',cost:{wood:6,fiber:4},build:'shelter'},
 bandage:{name:'Bandage · +25 PV',cost:{fiber:2},heal:25},
 axe:{name:'Hache',cost:{wood:2,stone:2,fiber:1},tool:'axe'},
 pickaxe:{name:'Pioche',cost:{wood:2,stone:3,fiber:1},tool:'pickaxe'},
 meal:{name:'Repas · +45 satiété',cost:{berries:2,wood:1},food:45,station:'campfire'}
};
export const defaultSurvival=()=>({enabled:true,foodDrain:.12,waterDrain:.2,restDrain:.08,starvationDamage:2,coldDamage:1,toolDurability:20,toolHarvestBonus:2,buildTemplates:{},startInventory:[{id:'water',count:1},{id:'berries',count:1}]});
export const defaultSurvivalNode=()=>({enabled:true,kind:'wood',stock:12,maxStock:12,amount:2,respawn:90,cooldown:0});
export const defaultSurvivalWorld=()=>({enabled:true,hour:17,timeScale:240,day:1});
export function ensureSurvival(o){o.survivalState??={food:85,water:80,rest:100,warmth:80,elapsed:0,harvested:0,crafted:0,actionCooldown:0,restCooldown:0,nights:0,builds:{},notice:'',noticeTime:0};return o.survivalState}
const center=(o,mode)=>({x:n(o.x)+n(o.w)/2,y:n(o.y)+n(mode==='3d'?o.depth3d:o.h,n(o.h))/2,z:mode==='3d'?n(o.elevation3d)*64:0});
export const survivalDistance=(a,b,mode='2d')=>{const x=center(a,mode),y=center(b,mode);return Math.hypot(x.x-y.x,x.y-y.y,x.z-y.z)};
const station=(actor,entities,kind,mode)=>entities.find(o=>o.survivalNode?.enabled!==false&&o.survivalNode?.kind===kind&&o.visible!==false&&(kind!=='campfire'||n(o.survivalNode.fuel)>0)&&survivalDistance(actor,o,mode)<180);
const result=(actor,ok,message)=>{const s=ensureSurvival(actor);s.notice=message;s.noticeTime=3;return {ok,message}};
export function tickSurvival(entities,dt,{mode='2d',hour=14,player=null,keys=new Set()}={}){
 const frame=clamp(n(dt),0,.1);if(!frame)return null;
 const world=entities.find(o=>o.survivalWorld?.enabled)?.survivalWorld;
 if(world){const time=n(world.hour,17)+frame*clamp(n(world.timeScale,240),0,3600)/3600;world.day=Math.max(1,n(world.day,1))+Math.floor(time/24);world.hour=((time%24)+24)%24;hour=world.hour}
 const night=hour>=19||hour<6;
 for(const o of entities){const node=o.survivalNode;if(node?.kind==='campfire'){node.fuel=Math.max(0,n(node.fuel)-frame);if(o.fxEmitter)o.fxEmitter.enabled=node.fuel>0;o.lightEnabled=node.fuel>0}if(node?.enabled!==false&&node&&n(node.stock)<=0&&n(node.respawn)>0&&!['campfire','shelter'].includes(node.kind)){node.cooldown=Math.max(0,n(node.cooldown)-frame);if(!node.cooldown)node.stock=Math.max(1,n(node.maxStock,12))}
  if(o.survivalThreat&&o.ai){o.ai.enabled=o.survivalThreat.enabled!==false;o.ai.speed=n(o.survivalThreat.speed,35)*(night?1.7:1);o.ai.detection=n(o.survivalThreat.detection,220)*(night?1.6:.65)}
  const cfg=o.survival;if(!cfg||cfg.enabled===false||o.survivalDormant)continue;const s=ensureSurvival(o);s.noticeTime=Math.max(0,n(s.noticeTime)-frame);s.actionCooldown=Math.max(0,n(s.actionCooldown)-frame);s.restCooldown=Math.max(0,n(s.restCooldown)-frame);if(healthOf(o)<=0)continue;
  const input=o._netKeys instanceof Set?o._netKeys:(o===player?keys:new Set()),effort=input.has('shift')?1.6:1,fire=station(o,entities,'campfire',mode),shelter=station(o,entities,'shelter',mode);
  s.elapsed=n(s.elapsed)+frame;s.food=clamp(n(s.food,85)-Math.max(0,n(cfg.foodDrain,.12))*effort*frame,0,100);s.water=clamp(n(s.water,80)-Math.max(0,n(cfg.waterDrain,.2))*effort*frame,0,100);s.rest=clamp(n(s.rest,100)-Math.max(0,n(cfg.restDrain,.08))*effort*frame,0,100);s.warmth=clamp(n(s.warmth,80)+(fire?2:shelter?.5:night?-.45:.3)*frame,0,100);s.sheltered=!!shelter;s.warmed=!!fire;if(s.night&&!night)s.nights=n(s.nights)+1;s.night=night;
  if(o.stats)o.stats.stamina=Math.min(n(o.stats.stamina,100),Math.max(1,n(o.stats.maxStamina,100))*(.3+.7*s.rest/100));
  const harm=(!s.food||!s.water?Math.max(0,n(cfg.starvationDamage,2)):0)+(!s.warmth?Math.max(0,n(cfg.coldDamage,1)):0);if(harm)damage(o,harm*frame);
 }
 return world||{hour,day:1};
}
const activeResource=o=>activeBody3d(o)&&o.visible!==false&&o.survivalNode?.enabled!==false&&o.survivalNode&&Object.hasOwn(survivalResources,o.survivalNode.kind);
export function survivalResourceBlocked(actor,node,entities,mode='2d'){
 const a=center(actor,mode),b=center(node,mode),from={...a,z:mode==='3d'?a.z+n(actor.h,64)*.5:.5},to={...b,z:mode==='3d'?b.z+n(node.h,32)*.5:.5};
 return entities.some(o=>{
  if(o===actor||o===node||!activeBody3d(o))return false;
  if(mode==='3d')return solidBody3d(o)&&segmentBox3d(from,to,collisionBox3d(o))!==null;
  if(!solidCollider2d(o))return false;const r=colliderRect2d(o);
  return segmentBox3d(from,to,{x:r.x,y:r.y,z:0,w:r.w,d:r.h,h:1})!==null;
 });
}
export function survivalHarvestTarget(actor,entities,{mode='2d'}={}){
 if(!actor)return null;
 const candidates=entities.filter(o=>activeResource(o)&&survivalDistance(actor,o,mode)<=135).sort((a,b)=>survivalDistance(actor,a,mode)-survivalDistance(actor,b,mode));
 const stocked=candidates.filter(o=>Math.floor(n(o.survivalNode.stock))>0);
 const node=stocked.find(o=>!survivalResourceBlocked(actor,o,entities,mode))||stocked[0]||candidates[0];if(!node)return null;
 const stock=Math.max(0,Math.floor(n(node.survivalNode.stock))),blocked=survivalResourceBlocked(actor,node,entities,mode);
 const id=Object.keys(survivalTools).find(id=>survivalTools[id].resource===node.survivalNode.kind),tool=survivalToolStatus(actor,id);
 const amount=Math.min(stock,Math.max(1,Math.floor(n(node.survivalNode.amount,2)))+(tool?.usable?tool.bonus:0));
 return {node,stock,blocked,tool,amount,available:stock>0&&!blocked};
}
export function gatherSurvival(actor,entities,{mode='2d'}={}){
 const s=ensureSurvival(actor);if(s.actionCooldown>0)return result(actor,false,'Attends un instant.');
 const target=survivalHarvestTarget(actor,entities,{mode});
 if(!target)return result(actor,false,'Approche-toi d’une ressource pour récolter.');
 if(!target.stock)return result(actor,false,'Ressource épuisée · elle se régénère.');
 if(target.blocked)return result(actor,false,'Obstacle entre toi et la ressource · contourne-le.');
 const {node,amount,tool}=target,c=node.survivalNode;
 if(!inventoryAdd(actor,c.kind,amount))return result(actor,false,'Inventaire plein.');
 c.stock-=amount;if(c.stock<=0)c.cooldown=Math.max(0,n(c.respawn,90));
 const after=tool?.usable?wearSurvivalTool(actor,tool.id):null;
 s.harvested=n(s.harvested)+amount;s.actionCooldown=.35;noteAnimatorAction(actor,'gather',.4);
 return result(actor,true,'+'+amount+' '+survivalResources[c.kind]+(after?' · '+after.name+' '+after.durability+'/'+after.maxDurability+(after.durability?'':' · cassée, répare-la'):tool?.owned?' · à la main, outil cassé':''));
}
export function repairSurvivalTool(actor,id){
 const tool=survivalToolStatus(actor,id),s=ensureSurvival(actor);
 if(!tool?.owned)return result(actor,false,'Fabrique cet outil avant de le réparer.');
 if(s.actionCooldown>0)return result(actor,false,'Attends un instant.');
 if(tool.durability>=tool.maxDurability)return result(actor,false,'Cet outil est déjà en bon état.');
 for(const [item,count] of Object.entries(tool.repair))if(inventoryCount(actor,item)<count)return result(actor,false,'Réparation : il manque '+survivalResources[item]+'.');
 for(const [item,count] of Object.entries(tool.repair))inventoryRemove(actor,item,count);
 s.tools??={};s.tools[id]={durability:tool.maxDurability,maxDurability:tool.maxDurability};s.actionCooldown=.5;
 noteAnimatorAction(actor,'craft',.5);return result(actor,true,tool.name+' réparée · '+tool.maxDurability+'/'+tool.maxDurability+'.');
}
function buildSpot(actor,template,entities,mode){
 const a=center(actor,mode),distance=100+Math.max(n(template.w),n(mode==='3d'?template.depth3d:template.h))/2;
 for(const [x,y] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1]]){
  const check=inspectSurvivalPlacement(actor,template,{x:a.x+x*distance,y:a.y+y*distance,rotation:0},entities,{mode});
  if(check.ok)return check.entity;
 }return null;
}
export function craftSurvival(actor,id,entities,{mode='2d',allocateId=null,placement=null}={}){
 const recipe=Object.hasOwn(survivalRecipes,id)?survivalRecipes[id]:null,s=ensureSurvival(actor);if(!recipe)return result(actor,false,'Recette inconnue.');if(s.actionCooldown>0)return result(actor,false,'Attends un instant.');
 for(const [item,count] of Object.entries(recipe.cost))if(inventoryCount(actor,item)<count)return result(actor,false,'Il manque '+survivalResources[item]+'.');
 if(recipe.tool&&survivalToolStatus(actor,recipe.tool)?.owned)return result(actor,false,'Tu possèdes déjà cet outil · utilise Réparer.');
 if(recipe.station&&!station(actor,entities,recipe.station,mode))return result(actor,false,'Approche-toi d’un feu pour cuisiner.');
 let build=null;if(recipe.build){const template=actor.survival?.buildTemplates?.[mode]?.[recipe.build];if(!template||!allocateId)return result(actor,false,'Prefab de construction à configurer dans le composant Survie.');if(placement){const check=inspectSurvivalPlacement(actor,template,placement,entities,{mode});if(!check.ok)return result(actor,false,check.message);build=check.entity}else build=buildSpot(actor,template,entities,mode);if(!build)return result(actor,false,'Libère une place près du personnage.');build.id=allocateId();build.survivalBuiltBy=actor.coopName||actor.name||'Survivant';if(!Number.isSafeInteger(build.id)||entities.some(o=>o.id===build.id))return result(actor,false,'Identifiant de construction invalide.')}
 let preparedInventory=null;if(recipe.tool){const copy={inventory:structuredClone(actor.inventory)};for(const [item,count] of Object.entries(recipe.cost))inventoryRemove(copy,item,count);if(!inventoryAdd(copy,survivalTools[recipe.tool].item,1))return result(actor,false,'Inventaire plein · libère une place pour l’outil.');preparedInventory=copy.inventory}
 if(preparedInventory){actor.inventory=preparedInventory;const tool=survivalToolStatus(actor,recipe.tool);s.tools??={};s.tools[recipe.tool]={durability:tool.maxDurability,maxDurability:tool.maxDurability}}else for(const [item,count] of Object.entries(recipe.cost))inventoryRemove(actor,item,count);
 if(build){entities.push(build);s.builds??={};s.builds[recipe.build]=n(s.builds[recipe.build])+1}if(recipe.heal)setHealth(actor,healthOf(actor)+recipe.heal);if(recipe.food)s.food=clamp(s.food+recipe.food,0,100);s.recipes??={};s.recipes[id]=n(s.recipes[id])+1;s.crafted++;s.actionCooldown=.5;noteAnimatorAction(actor,'craft',.5);return result(actor,true,recipe.name+' fabriqué'+(build?' et posé.':'.'));
}
export function survivalAction(actor,action,entities,ctx={}){
 if(!actor?.survival||actor.survival.enabled===false||actor.survivalDormant||healthOf(actor)<=0)return {ok:false,message:'Personnage indisponible.'};
 if(action&&typeof action==='object'){if(action.type!=='place'||!['campfire','shelter'].includes(action.recipe))return result(actor,false,'Commande de construction inconnue.');return craftSurvival(actor,action.recipe,entities,{...ctx,placement:action})}
 if(typeof action!=='string')return result(actor,false,'Commande inconnue.');
 if(action.startsWith('repair:'))return repairSurvivalTool(actor,action.slice(7));
 if(action==='gather')return gatherSurvival(actor,entities,ctx);if(action.startsWith('craft:'))return craftSurvival(actor,action.slice(6),entities,ctx);const s=ensureSurvival(actor);if(s.actionCooldown>0)return result(actor,false,'Attends un instant.');
 if(action==='refuel'){const fire=entities.find(o=>o.survivalNode?.kind==='campfire'&&survivalDistance(actor,o,ctx.mode||'2d')<180);if(!fire)return result(actor,false,'Approche-toi d’un feu de camp.');if(!inventoryRemove(actor,'wood',1))return result(actor,false,'Il manque du bois.');fire.survivalNode.fuel=Math.min(600,n(fire.survivalNode.fuel)+60);s.actionCooldown=.5;return result(actor,true,'Feu alimenté · +60 s.')}
 if(action==='rest'){if(s.restCooldown>0)return result(actor,false,'Laisse passer quelques secondes entre deux repos.');if(!station(actor,entities,'shelter',ctx.mode||'2d'))return result(actor,false,'Construis un abri et approche-toi pour te reposer.');s.rest=clamp(s.rest+35,0,100);s.actionCooldown=.5;s.restCooldown=15;return result(actor,true,'Repos +35 · nouvel arrêt dans 15 s.')}
 if(action==='revive'){const fallen=entities.filter(o=>o!==actor&&o.survival&&!o.survivalDormant&&o.survival.enabled!==false&&healthOf(o)<=0&&survivalDistance(actor,o,ctx.mode||'2d')<135).sort((a,b)=>survivalDistance(actor,a,ctx.mode||'2d')-survivalDistance(actor,b,ctx.mode||'2d'))[0];if(!fallen)return result(actor,false,'Approche-toi d’un coéquipier à terre.');if(!inventoryRemove(actor,'fiber',2))return result(actor,false,'Il faut 2 fibres pour relever un coéquipier.');setHealth(fallen,35);const other=ensureSurvival(fallen);for(const key of ['food','water','warmth'])other[key]=Math.max(20,n(other[key]));s.actionCooldown=1;result(fallen,true,'Ton coéquipier t’a relevé · +35 PV.');return result(actor,true,'Coéquipier relevé · 2 fibres utilisées.')}
 const item=action==='drink'?'water':action==='eat'?'berries':null;if(!item||!inventoryRemove(actor,item,1))return result(actor,false,'Aucune provision correspondante.');if(action==='drink')s.water=clamp(s.water+35,0,100);else s.food=clamp(s.food+20,0,100);s.actionCooldown=.5;return result(actor,true,action==='drink'?'Hydratation +35.':'Satiété +20.');
}

export function survivalMilestones(entities,{mode='2d'}={}){
 const party=entities.filter(o=>o.survival&&o.survival.enabled!==false&&!o.survivalDormant),living=party.filter(o=>healthOf(o)>0);
 const campfire=entities.some(o=>o.survivalNode?.enabled!==false&&o.survivalNode?.kind==='campfire'&&n(o.survivalNode.fuel)>0);
 const shelter=entities.some(o=>o.survivalNode?.enabled!==false&&o.survivalNode?.kind==='shelter');
 const meal=entities.some(o=>n(o.survivalState?.recipes?.meal)>0||o.survivalCompanions?.some(c=>n(c.survivalState?.recipes?.meal)>0)),dawn=living.some(o=>n(o.survivalState?.nights)>0);
 const expedition=campfire&&shelter&&meal&&dawn&&living.some(o=>station(o,entities,'campfire',mode)&&station(o,entities,'shelter',mode));
 return {campfire,shelter,meal,dawn,expedition,defeated:party.length>0&&living.length===0};
}
