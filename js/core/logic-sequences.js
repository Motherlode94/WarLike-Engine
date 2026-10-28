import {questItemCount,consumeQuestItem} from './quest-inventory.js';
import {adventureTarget} from './adventure-runtime.js';
import {survivalToolStatus} from './survival-tools.js';
import {survivalAction,survivalMilestones} from './survival-runtime.js';
import {playAnimatorState,setAnimatorParameter} from './animator-graph.js';
import {castHeroPower,ensureHeroState,heroAbilities} from './superhero-runtime.js';
import {awardExperience,upgradeHeroSkill} from './rpg-progression.js';
import {emitFx} from './fx-runtime.js';
import {heroCenter} from './hero-movement.js';
import {interactSimulationNode,damageSimulationNode} from './simulation-nodes.js';
import {orderRtsMove,orderRtsGroup} from './rts-orders.js';
import {gameProject,safeKey} from './game-project.js';
import {gameSession,resetGameSession,openGameDialogue,chooseGameDialogue,gameIsRunning,setGamePhase,setObjective,advanceObjective,completeObjective,startTimer,tickGameSession,saveGameSlot,queueLoadGame,hasGameSlot,captureGameSave,queueScene,applySessionChange} from './game-session.js';
import {vehicleComponents,repairVehicle,refuelVehicle,setVehicleEngine,canDriveVehicle,setVehicleGear} from './vehicle-components.js';
import {fireVehicleWeapon} from './vehicle-weapons-3d.js';
import {recordEngineEvent} from './engine-diagnostics.js';
import {coerceVariable} from './blueprint-graph.js';
import {horror,triggerHorrorJumpscare} from './horror-survival.js';
import {inventoryAdd,inventoryRemove,inventoryCount,equipItem,damage,setHealth,ensureAi} from './gameplay-components.js';
import {healthOf,sameFaction,isHostileTo} from './ai-perception.js';
// WarLike Sequences — no-code event, branch, instruction and signal runtime.
// Independent of the legacy 2D Visual Logic component; works in either workspace.
export const sequenceEvents=['start','interact','enter','exit','keyDown','interval','signal','healthChanged','death','variableChanged','objectiveCompleted','timerExpired'];
export const sequenceConditions=['inventoryHasRoom','questItemAtLeast','survivalToolUsable','survivalToolDurabilityBelow','survivalMilestone','survivalPartyDefeated','survivalNeedBelow','survivalBuilt','survivalNightsAtLeast','animatorStateIs','heroEnergyAbove','heroPowerReady','heroFlightActive','rpgLevelAtLeast','heroReputationAtLeast','simulationPowered','simulationRescued','always','variable','localVariable','distanceLess','distanceGreater','objectEnabled','healthBelow','healthAbove','hasTag','playerInVehicle','playerOnFoot','randomChance','inventoryHas','inventoryMissing','tagMissing','speedAbove','speedBelow','distanceToPointLess','distanceToPointGreater','horrorThreatAbove','horrorFearAbove','gameTimeAbove','objectType','entityExists','aiStateIs','aiAwarenessAbove','aiCanSeeTarget','aiHasTarget','sameFaction','isHostile','weaponAmmoAbove','weaponReady','vehicleDriveable','vehicleFuelBelow','vehicleHealthBelow','vehicleHasDriver','objectiveActive','objectiveComplete','timerRunning','timerExpired','gamePhaseIs','saveExists'];
export const sequenceInstructions=['consumeQuestItem','repairSurvivalTool','survivalInteract','craftSurvivalItem','consumeSurvivalItem','playAnimatorState','setAnimatorParameter','emitOwnedFx','castHeroPower','restoreHeroEnergy','giveExperience','upgradeHeroSkill','emitFx','repairSimulationNode','rtsOrder','message','setVariable','addVariable','setLocal','addLocal','wait','moveObject','teleportObject','setColor','enableObject','setHealth','addHealth','setAnimation','setBehavior','emitSignal','destroyObject','giveItem','removeItem','equipItem','damageObject','healObject','setTag','removeTag','setSpeed','addSpeed','setPosition','setRotation','setScale','setVisibility','setCollision','setObjective','completeObjective','setCheckpoint','setTeam','setScore','addScore','setFuel','addFuel','setHunger','addHunger','setThirst','addThirst','setStamina','addStamina','setFear','setThreat','setLight','setAudio','setVehicleState','setAiState','setAiFaction','setAiTarget','setAiDetection','setAiAttackRange','setAiPatrolPoint','setWeaponAmmo','addWeaponAmmo','reloadWeapon','setWeaponDamage','fireVehicleWeapon','repairVehicle','refuelVehicle','setVehicleEngine','setVehicleGear','setVehicleWeapon','clearAiTarget','setAiEnabled','setAiLineOfSight','setAiFieldOfView','setAiMemory','setAiSearchDuration','branch','addObjectiveProgress','startTimer','stopTimer','saveGame','loadGame','restoreCheckpoint','loadScene','winGame','loseGame','pauseGame','resumeGame','showDialogue','closeDialogue','spawnObject'];
export const newSequence=()=>({enabled:true,event:'interact',key:'e',radius:96,interval:2,signal:'',once:false,conditions:[],instructions:[{type:'message',value:'Bienvenue !'}]});
export const sequenceRuntime={globals:{},messages:[],time:0,pressed:new Set(),inside:new Set(),fired:new Set(),cooldowns:new Map(),jobs:[],signals:[],trace:[],errors:[],observed:new Map(),interactions:[],signalActors:new Map()};
const number=(n,def=0)=>Number.isFinite(Number(n))?Number(n):def;
const MAX_ACTIONS=256,MAX_SIGNALS=64,MAX_JOBS=100;
const distance=(a,b)=>Math.hypot((number(a.x)+number(a.w)/2)-(number(b.x)+number(b.w)/2),(number(a.y)+number(a.h)/2)-(number(b.y)+number(b.h)/2));
const safeSteps=steps=>Array.isArray(steps)?steps.slice(0,MAX_ACTIONS):[];
const safeConditions=conditions=>Array.isArray(conditions)?conditions.slice(0,MAX_ACTIONS):[];
export function resetSequences(){sequenceRuntime.globals={};sequenceRuntime.messages=[];sequenceRuntime.time=0;sequenceRuntime.pressed.clear();sequenceRuntime.inside.clear();sequenceRuntime.fired.clear();sequenceRuntime.cooldowns.clear();sequenceRuntime.jobs=[];sequenceRuntime.signals=[];sequenceRuntime.trace=[];sequenceRuntime.errors=[];sequenceRuntime.observed.clear();sequenceRuntime.interactions=[];sequenceRuntime.signalActors.clear();resetGameSession();for(const v of gameProject.variables)if(safeKey(v.name))sequenceRuntime.globals[v.name]=coerceVariable(v.type,v.value)}
export const emitSequenceSignal=(name,actorId=null)=>{const key=String(name||'').slice(0,60);if(sequenceRuntime.signals.length<MAX_SIGNALS){sequenceRuntime.signals.push(key);if(Number.isSafeInteger(actorId))sequenceRuntime.signalActors.set(key,actorId)}};
export function queueSequenceInteraction(actorId,targetId){if(![actorId,targetId].every(id=>Number.isSafeInteger(id)&&id>0)||sequenceRuntime.interactions.length>=8)return false;sequenceRuntime.interactions.push({actorId,targetId});return true}
export function chooseSequenceDialogue(index,options={}){if(!gameIsRunning())return false;const owner=gameSession.dialogue?.actorId,signals=chooseGameDialogue(index,options);if(!signals)return false;for(const signal of signals)emitSequenceSignal(signal,owner);return true}
export function sequenceEntries(owner){
 const entries=owner.sequence&&typeof owner.sequence==='object'?[{key:owner.id,sequence:owner.sequence}]:[];
 if(Array.isArray(owner.sequences))owner.sequences.slice(0,32).forEach((sequence,i)=>{if(sequence&&typeof sequence==='object')entries.push({key:owner.id+':extra:'+i,sequence})});
 return entries;
}
const jobSequence=(owner,job)=>sequenceEntries(owner).find(entry=>entry.key===(job.sequenceKey??owner.id))?.sequence;
export const conditionsPass=(conditions,owner,ctx,mode='all')=>mode==='any'?safeConditions(conditions).some(c=>c&&conditionPass(c,owner,ctx)):safeConditions(conditions).every(c=>c&&conditionPass(c,owner,ctx));
function traceAction(job,action,status='ok',message=''){
 const rt=sequenceRuntime;rt.trace.push({time:rt.time,objectId:job.objectId,sequenceKey:job.sequenceKey,type:action.type,nodeId:action._nodeId||null,status,message});
 if(rt.trace.length>160)rt.trace.shift();
 if(status==='error'){rt.errors.push(rt.trace.at(-1));if(rt.errors.length>40)rt.errors.shift();gameSession.notice=message;gameSession.revision++}
}
export function resolveSequenceTarget(step,owner,ctx){
 if(step.targetRole==='player')return ctx.player||null;
 if(step.targetId!=null&&step.targetId!==''&&number(step.targetId)>0)return (ctx.entities||[]).find(entity=>entity.id===number(step.targetId))||null;
 return owner;
}
export function conditionPass(c,o,ctx){
 const target=resolveSequenceTarget(c,o,ctx);
 const inventoryTarget=c.targetRole||c.targetId?target:ctx.player;
 const compare=(a,b,op)=>op==='>'?number(a)>number(b):op==='<'?number(a)<number(b):op==='>='?number(a)>=number(b):op==='<='?number(a)<=number(b):op==='!='?String(a)!==String(b):String(a)===String(b);
 let pass=false;
 switch(c.type){
 case 'questItemAtLeast':pass=questItemCount(ctx.entities||[],String(c.key||''))>=Math.max(1,number(c.value,1));break;
 case 'survivalToolUsable':pass=survivalToolStatus(target,c.key)?.usable===true;break;
 case 'survivalToolDurabilityBelow':{const tool=survivalToolStatus(target,c.key);pass=!!tool?.owned&&tool.durability/tool.maxDurability*100<number(c.value,25);break}
 case 'survivalNeedBelow':pass=!!target?.survivalState&&['food','water','rest','warmth'].includes(c.key)&&number(target.survivalState[c.key],100)<number(c.value,20);break;
 case 'survivalMilestone':pass=survivalMilestones(ctx.entities||[],{mode:ctx.mode||'2d'})[c.key]===true;break;
 case 'survivalPartyDefeated':pass=survivalMilestones(ctx.entities||[]).defeated;break;
 case 'survivalBuilt':pass=number(target?.survivalState?.builds?.[c.key])>0;break;
 case 'survivalNightsAtLeast':pass=number(target?.survivalState?.nights)>=number(c.value,1);break;
 case 'animatorStateIs':pass=target?._animatorFrame?.stateId===String(c.value);break;
 case 'heroEnergyAbove':pass=!!target?.superhero&&number(target.heroState?.energy,target.superhero.maxEnergy)>=number(c.value,25);break;
 case 'heroPowerReady':{const def=Object.hasOwn(heroAbilities,String(c.value))?heroAbilities[String(c.value)]:null;pass=!!target?.superhero&&target.superhero.enabled!==false&&!!def&&number(target.heroState?.energy,target.superhero.maxEnergy)>=def.cost&&number(target.heroState?.cooldowns?.[c.value])<=0;break}
 case 'heroFlightActive':pass=target?.heroState?.flight===true;break;
 case 'rpgLevelAtLeast':pass=number(target?.rpgProgression?.level,1)>=number(c.value,1);break;
 case 'heroReputationAtLeast':pass=number(target?.heroState?.reputation)>=number(c.value,1);break;
 case 'simulationPowered':pass=target?.simulationNode?.enabled===true&&target.simulationNode.powered===true;break;
 case 'simulationRescued':pass=target?.simulationNode?.rescued===true;break;
 case 'always':pass=true;break;
 case 'objectiveActive':pass=gameSession.objectives[c.key]?.status==='active';break;
 case 'objectiveComplete':pass=gameSession.objectives[c.key]?.status==='complete';break;
 case 'timerRunning':pass=!!gameSession.timers[c.key]&&!gameSession.timers[c.key].expired;break;
 case 'timerExpired':pass=gameSession.timers[c.key]?.expired===true;break;
 case 'gamePhaseIs':pass=gameSession.phase===String(c.value);break;
 case 'saveExists':pass=hasGameSlot(ctx,c.key||'quick');break;
 case 'variable':pass=compare(sequenceRuntime.globals[c.key],c.value,c.operator||'==');break;
 case 'localVariable':pass=compare(o.sequenceLocal?.[c.key],c.value,c.operator||'==');break;
 case 'distanceLess':pass=!!ctx.player&&distance(o,ctx.player)<Math.max(0,number(c.value,96));break;
 case 'distanceGreater':pass=!!ctx.player&&distance(o,ctx.player)>Math.max(0,number(c.value,96));break;
 case 'healthBelow':pass=!!target&&healthOf(target)<number(c.value,50);break;
 case 'healthAbove':pass=!!target&&healthOf(target)>number(c.value,50);break;
 case 'hasTag':pass=Array.isArray(o.tags)&&o.tags.includes(String(c.value??''));break;
 case 'playerInVehicle':pass=!!ctx.player?._hiddenInVehicle;break;
 case 'playerOnFoot':pass=!!ctx.player&&!ctx.player._hiddenInVehicle;break;
 case 'randomChance':pass=Math.random()<Math.max(0,Math.min(1,number(c.value,.5)));break;
 case 'objectEnabled':pass=o.sequenceEnabled!==false;break;
 case 'inventoryHasRoom':{const inv=inventoryTarget?.inventory;pass=!!inv&&Array.isArray(inv.items)&&(inv.items.some(item=>item.id===c.key&&number(item.count)>0)||inv.items.length<Math.max(1,number(inv.capacity,16)));break}
 case 'inventoryHas':pass=inventoryCount(inventoryTarget,c.key)>=Math.max(1,number(c.value,1));break;
 case 'inventoryMissing':pass=inventoryCount(inventoryTarget,c.key)<Math.max(1,number(c.value,1));break;
 case 'tagMissing':pass=!Array.isArray(o.tags)||!o.tags.includes(String(c.value??''));break;
 case 'speedAbove':pass=number(o.aiSpeed??o.maxSpeed)>number(c.value);break;
 case 'speedBelow':pass=number(o.aiSpeed??o.maxSpeed)<number(c.value);break;
 case 'distanceToPointLess':pass=Math.hypot(number(o.x)-number(c.x),number(o.y)-number(c.y))<number(c.value,100);break;
 case 'distanceToPointGreater':pass=Math.hypot(number(o.x)-number(c.x),number(o.y)-number(c.y))>number(c.value,100);break;
 case 'horrorThreatAbove':pass=number(horror.threat)>number(c.value,.5);break;
 case 'horrorFearAbove':pass=number(horror.fear)>number(c.value,50);break;
 case 'gameTimeAbove':pass=number(sequenceRuntime.time)>number(c.value,10);break;
 case 'objectType':pass=String(o.type)===String(c.value);break;
 case 'aiStateIs':pass=!!target&&String(target.ai?.state||target.horrorAI?.state||target.behavior||'idle')===String(c.value);break;
 case 'aiCanSeeTarget':pass=target?.ai?.visible===true;break;
 case 'aiHasTarget':pass=target?.ai?.targetId!=null;break;
 case 'aiAwarenessAbove':pass=number(target?.horrorAI?.awareness??target?.ai?.awareness)>number(c.value,.5);break;
 case 'sameFaction':pass=sameFaction(target,ctx.player);break;
 case 'isHostile':pass=isHostileTo(target,ctx.player,ctx.player);break;
 case 'weaponAmmoAbove':pass=number(o.weaponSystem?.ammo)>number(c.value,0);break;
 case 'weaponReady':pass=number(o.weaponSystem?.ammo)>0&&number(o.weaponSystem?.cooldown)<=0;break;
 case 'vehicleDriveable':pass=!!o.vehicleSystems&&canDriveVehicle(o);break;
 case 'vehicleFuelBelow':pass=number(o.vehicleSystems?.fuel?.amount,100)<number(c.value,25);break;
 case 'vehicleHealthBelow':pass=number(o.vehicleSystems?.engine?.health,100)<number(c.value,50);break;
 case 'vehicleHasDriver':pass=o.vehicleSystems?.seats?.driverId!=null;break;
 case 'entityExists':pass=(ctx.entities||[]).some(entity=>entity.id===number(c.value)||entity.name===String(c.value));break;
 default:pass=false;
 }
 return c.negate?!pass:pass;
}
export function chooseSequenceBranch(sequence,obj,ctx){
 if(!Array.isArray(sequence.branches)||!sequence.branches.length)return safeSteps(sequence.instructions);
 for(const branch of sequence.branches.slice(0,MAX_ACTIONS)){if(!branch||typeof branch!=='object')continue;if(conditionsPass(branch.conditions,obj,ctx,branch.conditionMode))return safeSteps(branch.instructions)}
 return safeSteps(sequence.elseInstructions);
}
function execute(job,ctx,actionsLeft){
 if(job.playerId!=null){const player=ctx.entities.find(o=>o.id===job.playerId);if(!player){job.index=job.steps.length;return 0}ctx={...ctx,player}}
 const rt=sequenceRuntime,entity=ctx.entities.find(o=>o.id===job.objectId);
 if(!entity||!jobSequence(entity,job)||jobSequence(entity,job)?.enabled===false||entity.sequenceEnabled===false||entity._sequenceDestroyed){job.index=job.steps.length;return 0}
 let count=0;
 while(job.index<job.steps.length&&count<actionsLeft){
  if(!gameIsRunning()&&!job.runWhenPaused)return count;
  const a=job.steps[job.index++];count++;if(!a||a.disabled||typeof a.type!=='string')continue;
  recordEngineEvent('blueprint',String(a.type)+' · '+String(entity.name||entity.id));
  const key=String(a.key||'score').slice(0,60),val=a.value;
  if(!safeKey(key)){traceAction(job,a,'error','Nom de variable réservé ou invalide');continue}
  const targetObject=resolveSequenceTarget(a,entity,ctx);
  if(!targetObject){traceAction(job,a,'error','Objet cible introuvable');continue}
  traceAction(job,a);
  try{switch(a.type){
  case 'consumeQuestItem':if(!consumeQuestItem(ctx.entities,key,number(val,1))){traceAction(job,a,'error','Objet de quête manquant.');job.index=job.steps.length;return count}break;
  case 'repairSurvivalTool':survivalAction(targetObject,'repair:'+String(val||'axe'),ctx.entities,{mode:ctx.mode||'2d'});break;
  case 'survivalInteract':survivalAction(targetObject,'gather',ctx.entities,{mode:ctx.mode||'2d'});break;
  case 'craftSurvivalItem':survivalAction(targetObject,'craft:'+String(val||'campfire'),ctx.entities,{mode:ctx.mode||'2d',allocateId:ctx.allocateId});break;
  case 'consumeSurvivalItem':survivalAction(targetObject,String(val||'drink'),ctx.entities,{mode:ctx.mode||'2d'});break;
  case 'playAnimatorState':playAnimatorState(targetObject,String(val||'motion'),number(a.duration,1));break;
  case 'setAnimatorParameter':setAnimatorParameter(targetObject,String(a.key||''),a.valueType==='boolean'?val===true||val==='true':a.valueType==='string'?String(val):number(val));break;
  case 'emitOwnedFx':if(targetObject.fxEmitter)emitFx(targetObject.fxEmitter.kind,heroCenter(targetObject,ctx.mode||'2d'),{...targetObject.fxEmitter,mode:ctx.mode||'2d',count:Math.max(1,Math.min(120,number(val,24))),ownerId:targetObject.id});break;
  case 'castHeroPower':{const result=castHeroPower(targetObject,String(val||'bolt'),{...ctx,mode:ctx.mode|| (targetObject.type==='mesh3d'?'3d':'2d'),yaw:ctx.player===targetObject?ctx.yaw:null});if(!result.ok)rt.messages.push({text:result.reason,ttl:2});break}
  case 'restoreHeroEnergy':if(targetObject.superhero){const s=ensureHeroState(targetObject);s.energy=Math.max(0,Math.min(targetObject.superhero.maxEnergy,s.energy+number(val,25)))}break;
  case 'giveExperience':awardExperience(targetObject,number(val,25));break;
  case 'upgradeHeroSkill':upgradeHeroSkill(targetObject,String(val||'power'));break;
  case 'emitFx':emitFx(String(val||'energy'),heroCenter(targetObject,ctx.mode|| (targetObject.type==='mesh3d'?'3d':'2d')),{mode:ctx.mode|| (targetObject.type==='mesh3d'?'3d':'2d'),color:a.color,scale:Math.max(.1,Math.min(8,number(a.scale,1))),count:24,ring:true});break;
  case 'repairSimulationNode':{const result=interactSimulationNode(ctx.player,targetObject,{mode:ctx.mode||'2d'});rt.messages.push({text:result.reason,ttl:2});break}
  case 'rtsOrder':if(val==='move')orderRtsMove(ctx.entities,[targetObject.id],{x:number(a.x),y:number(a.y)});else orderRtsGroup(ctx.entities,[targetObject.id],String(val||'follow'),a.key&&a.key!=='player'?number(a.key):ctx.player?.id);break;
  case 'message':rt.messages.push({text:String(val||'Action exécutée').slice(0,160),ttl:3});break;
  case 'setVariable':rt.globals[key]=val??0;break;
  case 'addVariable':rt.globals[key]=number(rt.globals[key])+number(val);break;
  case 'setLocal':entity.sequenceLocal??={};entity.sequenceLocal[key]=val??0;break;
  case 'addLocal':entity.sequenceLocal??={};entity.sequenceLocal[key]=number(entity.sequenceLocal[key])+number(val);break;
  case 'moveObject':{const target=targetObject;target.x+=number(a.x);target.y+=number(a.y);break}
  case 'teleportObject':{const target=targetObject;target.x=number(a.x,target.x);target.y=number(a.y,target.y);break}
  case 'giveItem':{const target=targetObject;inventoryAdd(target,key,Math.max(1,number(val,1)));break}
  case 'removeItem':{const target=targetObject;inventoryRemove(target,key,Math.max(1,number(val,1)));break}
  case 'equipItem':{const target=targetObject;equipItem(target,key,a.slot||'weapon');break}
  case 'damageObject':{const target=targetObject;if(target.simulationNode?.kind==='destructible')damageSimulationNode(target,number(val,10),ctx.player,{mode:ctx.mode||'2d'});else damage(target,number(val,10));break}
  case 'healObject':{const target=targetObject;setHealth(target,healthOf(target)+Math.max(0,number(val,10)));break}
  case 'setHealth':{const target=targetObject;setHealth(target,number(val,100));break}
  case 'addHealth':{const target=targetObject;setHealth(target,healthOf(target)+number(val));break}
  case 'setAnimation':{const target=targetObject;target.animation=String(val||'idle').slice(0,64);break}
  case 'setBehavior':{const target=targetObject;const behavior=String(val||'none');if(['none','patrol','chase','guard','wander','flee','follow'].includes(behavior))target.behavior=behavior;break}
  case 'setColor':if(/^#[a-f0-9]{6}$/i.test(String(val))){entity.color=val;entity.colorCustomized=true}break;
  case 'enableObject':{const target=targetObject;target.sequenceEnabled=val!==false&&String(val)!=='false';break}
  case 'emitSignal':if(horror.enabled&&String(val||key)==='horror:jumpscare')triggerHorrorJumpscare();emitSequenceSignal(val||key,ctx.player?.id);break;
  case 'destroyObject':targetObject._sequenceDestroyed=true;break;
  case 'setTag':targetObject.tags=Array.from(new Set([...(Array.isArray(targetObject.tags)?targetObject.tags:[]),String(val??key).slice(0,60)]));break;
  case 'removeTag':targetObject.tags=(targetObject.tags||[]).filter(tag=>tag!==String(val??key));break;
  case 'setSpeed':targetObject.aiSpeed=Math.max(0,number(val,65));if(targetObject.ai)targetObject.ai.speed=targetObject.aiSpeed;break;
  case 'addSpeed':targetObject.aiSpeed=Math.max(0,number(targetObject.ai?.speed??targetObject.aiSpeed,65)+number(val));if(targetObject.ai)targetObject.ai.speed=targetObject.aiSpeed;break;
  case 'setPosition':targetObject.x=number(a.x,targetObject.x);targetObject.y=number(a.y,targetObject.y);break;
  case 'setRotation':targetObject.rotation=number(val);break;
  case 'setScale':targetObject.scale=Math.max(.01,number(val,1));break;
  case 'setVisibility':targetObject.visible=val!==false&&String(val)!=='false';break;
  case 'setCollision':targetObject.collision3d=val!==false&&String(val)!=='false';if(targetObject.collider2d)targetObject.collider2d.enabled=targetObject.collision3d;break;
  case 'setObjective':setObjective(key,val,a.total);rt.globals['objective:'+key]=0;rt.messages.push({text:String(val||key).slice(0,160),ttl:3});break;
  case 'completeObjective':{const previous=gameSession.objectives[key]?.status;if(!gameSession.objectives[key])setObjective(key,key);completeObjective(key);rt.globals['objective:'+key]=1;if(previous!=='complete')emitSequenceSignal('objective:'+key);break}
  case 'setCheckpoint':rt.globals.checkpointX=number(targetObject.x);rt.globals.checkpointY=number(targetObject.y);gameSession.checkpoint=captureGameSave({...ctx,globals:rt.globals,fired:rt.fired});break;
  case 'setTeam':targetObject.team=Math.max(0,Math.trunc(number(val,1)));break;
  case 'setScore':rt.globals.score=number(val);break;
  case 'addScore':rt.globals.score=number(rt.globals.score)+number(val);break;
  case 'setFuel':targetObject.fuel=Math.max(0,number(val));break;
  case 'addFuel':targetObject.fuel=Math.max(0,number(targetObject.fuel)+number(val));break;
  case 'setHunger':rt.globals.hunger=Math.max(0,Math.min(100,number(val)));break;
  case 'addHunger':rt.globals.hunger=Math.max(0,Math.min(100,number(rt.globals.hunger,100)+number(val)));break;
  case 'setThirst':rt.globals.thirst=Math.max(0,Math.min(100,number(val)));break;
  case 'addThirst':rt.globals.thirst=Math.max(0,Math.min(100,number(rt.globals.thirst,100)+number(val)));break;
  case 'setStamina':rt.globals.stamina=Math.max(0,Math.min(100,number(val)));break;
  case 'addStamina':rt.globals.stamina=Math.max(0,Math.min(100,number(rt.globals.stamina,100)+number(val)));break;
  case 'setFear':horror.fear=Math.max(0,Math.min(100,number(val)));break;
  case 'setThreat':horror.threat=Math.max(0,Math.min(1,number(val)));break;
  case 'setLight':targetObject.lightEnabled=val!==false&&String(val)!=='false';break;
  case 'setAudio':targetObject.audioEnabled=val!==false&&String(val)!=='false';break;
  case 'setVehicleState':targetObject.vehicleState=String(val??'parked').slice(0,60);break;
  case 'setAiState':ensureAi(targetObject).state=String(val||'idle').slice(0,40);break;
  case 'setAiFaction':targetObject.aiFaction=String(val||'neutral').slice(0,40);break;
  case 'setAiTarget':ensureAi(targetObject);targetObject.aiTargetId=number(val)>0?number(val):(ctx.player?.id??null);targetObject.ai.path=null;break;
  case 'clearAiTarget':targetObject.aiTargetId=null;if(targetObject.ai){Object.assign(targetObject.ai,{targetId:null,memoryRemaining:0,searchRemaining:0,path:null})}break;
  case 'setAiDetection':ensureAi(targetObject).detection=Math.max(0,number(val,300));break;
  case 'setAiAttackRange':ensureAi(targetObject).attackRange=Math.max(0,number(val,70));break;
  case 'setAiEnabled':ensureAi(targetObject).enabled=val!==false&&String(val)!=='false'&&String(val)!=='0';break;
  case 'setAiLineOfSight':ensureAi(targetObject).requireLineOfSight=val!==false&&String(val)!=='false'&&String(val)!=='0';break;
  case 'setAiFieldOfView':ensureAi(targetObject).fieldOfView=Math.max(0,Math.min(360,number(val,160)));break;
  case 'setAiMemory':ensureAi(targetObject).memoryDuration=Math.max(0,Math.min(120,number(val,4)));break;
  case 'setAiSearchDuration':ensureAi(targetObject).searchDuration=Math.max(0,Math.min(120,number(val,2)));break;
  case 'setAiPatrolPoint':ensureAi(targetObject);targetObject.ai.path=null;targetObject.ai.homeX=number(a.x,targetObject.x);targetObject.ai.homeY=number(a.y,targetObject.y);targetObject.ai.state='patrol';break;
  case 'setWeaponAmmo':targetObject.weaponSystem??={};targetObject.weaponSystem.ammo=Math.max(0,Math.trunc(number(val)));break;
  case 'addWeaponAmmo':targetObject.weaponSystem??={};targetObject.weaponSystem.ammo=Math.max(0,Math.trunc(number(targetObject.weaponSystem.ammo)+number(val)));break;
  case 'reloadWeapon':targetObject.weaponSystem??={};targetObject.weaponSystem.ammo=Math.max(0,Math.trunc(number(targetObject.weaponSystem.magazineSize,30)));break;
  case 'setWeaponDamage':targetObject.weaponSystem??={};targetObject.weaponSystem.damage=Math.max(0,number(val,20));break;
  case 'fireVehicleWeapon':{const shot=fireVehicleWeapon(targetObject,ctx.entities);if(shot.fired)emitSequenceSignal(shot.hit?'weapon:hit':'weapon:fired');break}
  case 'repairVehicle':repairVehicle(targetObject,Math.max(0,number(val,25)));break;
  case 'refuelVehicle':refuelVehicle(targetObject,Math.max(0,number(val,25)));break;
  case 'setVehicleEngine':setVehicleEngine(targetObject,val!==false&&String(val)!=='false'&&String(val)!=='0');break;
  case 'setVehicleGear':setVehicleGear(targetObject,number(val,1));break;
  case 'setVehicleWeapon':targetObject.vehicleWeapon??={};targetObject.vehicleWeapon.enabled=val!==false&&String(val)!=='false'&&String(val)!=='0';break;
  case 'branch':{const yes=conditionsPass(a.conditions,entity,ctx,a.conditionMode);const steps=safeSteps(yes?a.thenInstructions:a.elseInstructions);if(job.steps.length+steps.length>1024)throw Error('Branche trop volumineuse');job.steps.splice(job.index,0,...structuredClone(steps));break}
  case 'addObjectiveProgress':{const was=gameSession.objectives[key]?.status;advanceObjective(key,number(val,1));if(was==='active'&&gameSession.objectives[key]?.status==='complete'){rt.globals['objective:'+key]=1;emitSequenceSignal('objective:'+key)}break}
  case 'startTimer':startTimer(key,number(val,10));break;
  case 'stopTimer':delete gameSession.timers[key];break;
  case 'saveGame':saveGameSlot({...ctx,globals:rt.globals,fired:rt.fired},a.key?key:'quick');emitSequenceSignal('game:saved');break;
  case 'loadGame':queueLoadGame(ctx,a.key?key:'quick');return count;
  case 'restoreCheckpoint':if(!gameSession.checkpoint)throw Error('Aucun checkpoint actif');gameSession.pending={kind:'restore',data:structuredClone(gameSession.checkpoint)};return count;
  case 'loadScene':queueScene(String(val||key));return count;
  case 'winGame':setGamePhase('won',String(val||'Victoire !'));return count;
  case 'loseGame':setGamePhase('lost',String(val||'Partie terminée'));return count;
  case 'pauseGame':setGamePhase('paused');return count;
  case 'resumeGame':setGamePhase('playing');break;
  case 'showDialogue':openGameDialogue(a,ctx.player?.id,entity.name||'');break;
  case 'closeDialogue':gameSession.dialogue=null;gameSession.revision++;break;
  case 'spawnObject':{const template=ctx.entities.find(o=>o.id===number(val));if(!template)throw Error('Objet modèle introuvable');if(ctx.entities.length>=10000)throw Error('Limite de 10000 objets atteinte');const copy=structuredClone(template);copy.id=ctx.allocateId?ctx.allocateId():Math.max(0,...ctx.entities.map(o=>o.id))+1;copy.name=String(a.name||template.name+' · instance');copy.x=number(a.x,template.x+40);copy.y=number(a.y,template.y);copy.playable3d=false;delete copy._sequenceDestroyed;ctx.entities.push(copy);break}
  case 'wait':job.wait=Math.min(120,Math.max(0,number(val,.5)));return count;
  default:traceAction(job,a,'error','Instruction inconnue : '+a.type);
  }}catch(error){traceAction(job,a,'error',String(error.message||error))}
 }
 return count;
}
export function updateSequences(dt,ctx){
 if(!ctx?.playing)return;
 const rt=sequenceRuntime;
 ctx={...ctx,globals:rt.globals,fired:rt.fired};
 const change=applySessionChange(ctx);
 if(change){rt.interactions=[];rt.signalActors.clear();rt.time=gameSession.elapsed;rt.jobs=[];rt.inside.clear();rt.cooldowns.clear();rt.observed.clear();rt.fired=new Set(change.fired||[]);if(change.kind==='restore')for(const o of ctx.entities)for(const entry of sequenceEntries(o))if(entry.sequence.event==='start')rt.cooldowns.set('start:'+entry.key,Infinity);emitSequenceSignal(change.kind==='restore'?'game:loaded':'scene:loaded');ctx.onSceneChange?.(change);ctx.pressedKeys?.clear();return}
 const running=gameIsRunning();dt=running?Math.min(.1,Math.max(0,number(dt))):0;rt.time+=dt;
 for(const signal of tickGameSession(dt))emitSequenceSignal(signal);
 // Shared race clock for racing Blueprints; advances only while a race is active.
 if(number(rt.globals.raceStarted)===1&&number(rt.globals.raceFinished)!==1)rt.globals.raceElapsed=Math.round((number(rt.globals.raceElapsed)+dt)*1000)/1000;
 const keys=ctx.keys instanceof Set?ctx.keys:new Set(),player=ctx.player||null,objects=Array.isArray(ctx.entities)?ctx.entities:[];
 const signals=rt.signals.splice(0,MAX_SIGNALS),signalActors=new Map(rt.signalActors),interactions=rt.interactions.splice(0,8);rt.signalActors.clear();let budget=MAX_ACTIONS;
 // Only jobs suspended before this frame spend dt. Newly started Wait actions
 // must receive their full requested delay, even on the first frame.
 const pendingJobs=running?rt.jobs.splice(0):[];
 for(const job of pendingJobs){
  const owner=objects.find(o=>o.id===job.objectId);
  if(!owner||!jobSequence(owner,job)||jobSequence(owner,job)?.enabled===false||owner.sequenceEnabled===false||owner._sequenceDestroyed)continue;
  job.wait=Math.max(0,job.wait-dt);
  if(job.wait<=1e-9&&budget>0)budget-=execute(job,ctx,budget)||0;
  if(job.index<job.steps.length)rt.jobs.push(job);
 }
 const start=(o,s,id,actor=player)=>{
  const eventCtx={...ctx,player:actor};
  if(!gameIsRunning()&&!s.runWhenPaused)return;
  if(rt.jobs.length>=MAX_JOBS||budget<=0)return;
  if(s.once&&rt.fired.has(id))return;
  if(Array.isArray(s.graph?.variables))for(const v of s.graph.variables.slice(0,128)){if(v&&safeKey(v.name)&&!(v.name in rt.globals))rt.globals[v.name]=coerceVariable(v.type,v.value)}
  const basePassed=conditionsPass(s.conditions,o,eventCtx,s.conditionMode);
  if(!basePassed&&!Array.isArray(s.elseInstructions)){if(o.adventureInteractable?.lockedHint)rt.messages.push({text:String(o.adventureInteractable.lockedHint).slice(0,160),ttl:3});return;}
  rt.fired.add(id);const steps=safeSteps(basePassed?chooseSequenceBranch(s,o,eventCtx):s.elseInstructions);
  const job={objectId:o.id,playerId:objects.some(o=>o===actor)?actor.id:undefined,sequenceKey:id,runWhenPaused:s.runWhenPaused===true,steps:structuredClone(steps),index:0,wait:0};
  budget-=execute(job,ctx,budget)||0;
  if(job.index<job.steps.length)rt.jobs.push(job);
 };
 for(const o of objects){
  if(!o||typeof o!=='object')continue;
  for(const {sequence:s,key:sequenceKey} of sequenceEntries(o)){if(s.enabled===false||o.sequenceEnabled===false||o._sequenceDestroyed)continue;
  const isInside=!!player&&distance(o,player)<=Math.max(0,number(s.radius,96));
  const wasInside=rt.inside.has(sequenceKey);if(isInside)rt.inside.add(sequenceKey);else rt.inside.delete(sequenceKey);
  if(!running&&!s.runWhenPaused)continue;
  const k=String(s.key||'e').toLowerCase();const newKey=ctx.pressedKeys?.has(k)||(keys.has(k)&&!rt.pressed.has(k));
  let trigger=false,eventPlayer=player;
  switch(s.event){
  case 'start':trigger=!rt.cooldowns.has('start:'+sequenceKey);rt.cooldowns.set('start:'+sequenceKey,Infinity);break;
  case 'interact':if(o.adventureInteractable){if(gameSession.dialogue)break;const request=interactions.find(r=>r.targetId===o.id);eventPlayer=request?objects.find(p=>p.id===request.actorId):player;trigger=!!(request||newKey)&&adventureTarget(eventPlayer,objects,{mode:ctx.mode||'2d'})===o}else trigger=isInside&&newKey&&!ctx.player?._vehicleInputConsumed;break;
  case 'keyDown':trigger=newKey;break;
  case 'enter':{
   // A gate can become valid while the player remains inside (e.g. mounting
   // a car). Retry until it succeeds; rejected conditions never consume 'once'.
   const conditions=safeConditions(s.conditions);
   const allowed=conditionsPass(conditions,o,ctx,s.conditionMode);
   const key='inside-ok:'+sequenceKey;
   const already=rt.cooldowns.get(key)===true;
   trigger=isInside&&allowed&&!already&&(!wasInside||conditions.length>0);
   if(!isInside||!allowed)rt.cooldowns.delete(key);
   else if(trigger)rt.cooldowns.set(key,true);
   break;
  }
  case 'exit':trigger=!isInside&&wasInside;break;
  case 'signal':trigger=signals.includes(String(s.signal||''));if(trigger&&signalActors.has(String(s.signal||'')))eventPlayer=objects.find(p=>p.id===signalActors.get(String(s.signal||'')))||player;break;
  case 'healthChanged':case 'death':{const hp=healthOf(o),previous=rt.observed.get(sequenceKey);trigger=previous!==undefined&&(s.event==='death'?previous>0&&hp<=0:previous!==hp);rt.observed.set(sequenceKey,hp);break}
  case 'variableChanged':{const value=rt.globals[s.variable||'score'],previous=rt.observed.get(sequenceKey);trigger=rt.observed.has(sequenceKey)&&previous!==value;rt.observed.set(sequenceKey,value);break}
  case 'objectiveCompleted':trigger=signals.includes('objective:'+String(s.signal||s.variable||''));break;
  case 'timerExpired':trigger=signals.includes('timer:'+String(s.signal||s.variable||''));break;
  case 'interval':{const key='interval:'+sequenceKey,next=rt.cooldowns.get(key)??(rt.time+Math.max(.1,number(s.interval,2)));trigger=rt.time>=next;if(trigger||!rt.cooldowns.has(key))rt.cooldowns.set(key,rt.time+Math.max(.1,number(s.interval,2)));break}
  }
  if(trigger)start(o,s,sequenceKey,eventPlayer);
 }
 }
 for(const k of Array.from(rt.pressed))if(!keys.has(k))rt.pressed.delete(k);
 for(const k of keys)rt.pressed.add(k);
 ctx.pressedKeys?.clear();
 rt.jobs=rt.jobs.filter(j=>j.index<j.steps.length);
 rt.messages=rt.messages.filter(m=>(m.ttl-=dt)>0);
 // Remove objects only after action execution, never while iterating triggers.
 for(let i=objects.length-1;i>=0;i--)if(objects[i]._sequenceDestroyed)objects.splice(i,1);
}

export function drawSequenceMessages(ctx,width,height){
 if(!sequenceRuntime.messages.length)return;
 ctx.save();ctx.font='12px system-ui';ctx.textAlign='center';
 sequenceRuntime.messages.slice(-3).forEach((m,i)=>{
  const y=height-175-i*34;ctx.fillStyle='#162c3be8';ctx.fillRect(width/2-195,y-18,390,28);
  ctx.fillStyle='#e0ffef';ctx.fillText(m.text,width/2,y+1,365);
 });
 ctx.restore();
}
