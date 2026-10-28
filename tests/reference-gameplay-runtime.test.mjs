import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultAi,defaultStats,damage,updateAi,inventoryAdd,inventoryRemove,equipItem,attack3d} from '../js/core/gameplay-components.js';
import {healthOf,hasLineOfSight} from '../js/core/ai-perception.js';
import {newSequence,resetSequences,updateSequences,conditionPass,sequenceRuntime} from '../js/core/logic-sequences.js';
import {createBlueprintPreset} from '../js/core/blueprint-presets.js';

const hero=(extra={})=>({id:1,type:'player',x:120,y:0,w:20,h:20,stats:defaultStats(),...extra});
const guard=(extra={})=>({id:2,x:0,y:0,w:20,h:20,stats:defaultStats(),
 ai:{...defaultAi(),speed:0,requireLineOfSight:true,fieldOfView:120,memoryDuration:.4,searchDuration:.2,patrolRadius:0,pathfinding:false},...extra});
const tick=(entities,player,dt=.1,keys=[])=>updateSequences(dt,{playing:true,entities,player,keys:new Set(keys)});
const source=(instructions,extra={})=>({id:10,x:0,y:0,w:20,h:20,
 sequence:{...newSequence(),event:'start',instructions,...extra}});

test('perception uses vision cone, obstacles and last observed position',()=>{
 const p=hero(),e=guard();
 updateAi([p,e],p,.1);
 assert.equal(e.ai.state,'chase');
 assert.equal(e.ai.visible,true);
 assert.equal(e.ai.targetId,p.id);
 const wall={id:3,type:'object',solid3d:true,x:50,y:-30,w:20,h:100};
 p.x=180;
 updateAi([p,e,wall],p,.1);
 assert.equal(e.ai.state,'investigate');
 assert.equal(e.ai.visible,false);
 assert.equal(e.ai.detected,false);
 assert.equal(e.ai.lastKnownX,120,'memory must not track the player through a wall');
 assert.ok(e.ai.awareness>0&&e.ai.awareness<1);
 const fresh=guard();p.x=-120;
 updateAi([p,fresh],p,.1);
 assert.equal(fresh.ai.state,'patrol');
 assert.equal(fresh.ai.detected,false,'target behind the guard is outside its vision cone');
 assert.equal(fresh.ai.targetId,null,'an unseen candidate must not be exposed as an acquired target');
});

test('lost target is investigated, searched, then guard returns home',()=>{
 const p=hero(),e=guard();
 updateAi([p,e],p,.1);
 e.x=120;p.x=1000;
 updateAi([p,e],p,.1);
 assert.equal(e.ai.state,'search');
 for(let i=0;i<5;i++)updateAi([p,e],p,.1);
 assert.equal(e.ai.state,'return');
 assert.equal(e.ai.awareness,0);
 e.ai.speed=120;
 for(let i=0;i<20;i++)updateAi([p,e],p,.1);
 assert.equal(e.ai.state,'patrol');
 assert.ok(Math.abs(e.x)<9);
});

test('Blueprint creates a functional guard and resolves player ID from zero',()=>{
 resetSequences();const p=hero({id:7}),e={id:2,x:0,y:0,w:20,h:20,sequence:createBlueprintPreset('ai-guard-alert','3d')};
 tick([p,e],p);
 assert.equal(e.ai.enabled,true);
 assert.equal(e.ai.requireLineOfSight,true);
 assert.equal(e.ai.fieldOfView,160);
 e.sequence=createBlueprintPreset('ai-target-player','3d');resetSequences();
 tick([p,e],p);
 assert.equal(e.aiTargetId,7);
 updateAi([p,e],p,.1);
 assert.equal(e.ai.targetId,7);
 assert.equal(e.ai.state,'chase');
});

test('explicit NPC target is used, same factions protected and removed targets forgotten',()=>{
 const p=hero({x:20,team:1}),e=guard({team:1,aiTargetId:3}),foe=hero({id:3,x:40,team:2});
 updateAi([p,e,foe],p,.1);
 assert.equal(healthOf(p),100);
 assert.equal(healthOf(foe),92);
 assert.equal(e.ai.targetId,3);
 foe.team=1;updateAi([p,e,foe],p,.1);
 assert.equal(e.ai.targetId,null);
 assert.equal(healthOf(foe),92);
 updateAi([p,e],p,.1);
 assert.equal(e.ai.state,'patrol');
 assert.equal(healthOf(p),100);
});

test('no melee hit crosses a wall and fast guards cannot tunnel through it',()=>{
 const p=hero({x:40}),e=guard(),wall={id:3,type:'object',x:25,y:-50,w:4,h:120};
 e.ai.requireLineOfSight=false;
 updateAi([p,e,wall],p,.1);
 assert.equal(healthOf(p),100);
 assert.equal(attack3d(p,[p,e,wall],{range:200}),null);
 assert.equal(hasLineOfSight(e,p,[e,p,wall]),false);
 wall.y=-1000;wall.h=2000;
 p.x=400;e.ai.speed=1000;e.ai.attackRange=10;
 updateAi([p,e,wall],p,.5);
 assert.ok(e.x+e.w<=wall.x,'substeps must stop at a thin collider');
});

test('Blueprint health operations and conditions share Stats and legacy hp',()=>{
 resetSequences();const p=hero({hp:100,stats:{...defaultStats(),health:40}});
 const o=source([{type:'addHealth',targetRole:'player',value:10},{type:'damageObject',targetRole:'player',value:15}]);
 tick([p,o],p);
 assert.equal(p.hp,35);assert.equal(p.stats.health,35);
 assert.equal(conditionPass({type:'healthBelow',targetRole:'player',value:40},o,{player:p}),true);
 const legacy={hp:20};damage(legacy,7);assert.equal(legacy.hp,13,'adding Stats must preserve pre-existing damage');
 const boss={hp:250};damage(boss,10);assert.equal(boss.hp,240);
 o.sequence=source([{type:'setHealth',targetRole:'player',value:500}]).sequence;resetSequences();tick([p,o],p);
 assert.equal(p.hp,100);assert.equal(p.stats.health,100);
});

test('real pickup unlocks inventory door; removing last item clears equipped slot',()=>{
 resetSequences();const p=hero({x:0}),chest=source([{type:'giveItem',targetRole:'player',key:'key',value:1}]);
 const door={id:3,x:10,y:0,w:20,h:20,collision3d:true,sequence:createBlueprintPreset('inventory-key-door','2d')};
 tick([p,chest,door],p,.1,['e']);
 assert.equal(door.collision3d,false);
 assert.equal(conditionPass({type:'inventoryHas',key:'key',value:1},door,{player:p}),true);
 inventoryAdd(p,'sword');equipItem(p,'sword');inventoryRemove(p,'sword');
 assert.equal(p.inventory.equipment.weapon,null);
 assert.equal(conditionPass({type:'inventoryMissing',key:'sword'},door,{player:p}),true);
});

test('wait receives full delay and suspended jobs cancel when disabled or removed',()=>{
 for(const cancel of ['none','disabled','removed']){
  resetSequences();const o=source([{type:'wait',value:.2},{type:'addVariable',key:'done',value:1}]),p=hero();
  const entities=[p,o];tick(entities,p,.1);tick(entities,p,.1);
  assert.equal(sequenceRuntime.globals.done,undefined,'first frame cannot consume the new wait');
  if(cancel==='disabled')o.sequenceEnabled=false;
  if(cancel==='removed')entities.pop();
  tick(entities,p,.1);
  assert.equal(sequenceRuntime.globals.done,cancel==='none'?1:undefined);
  assert.equal(sequenceRuntime.jobs.length,0,'cancelled jobs cannot leak runtime slots');
 }
});

test('missing player or explicit entity target never falls back to the owner',()=>{
 resetSequences();const o=source([{type:'setHealth',targetRole:'player',value:0},{type:'setHealth',targetId:999,value:0}],{once:true});
 o.hp=75;tick([o],null);
 assert.equal(o.hp,75);
 assert.equal(o.stats,undefined);
});

test('import and duplication retain independent AI, identity, health and inventory components',async()=>{
 const {state}=await import('../js/core/state.js');
 const {importScene,duplicateSelected}=await import('../js/core/scene.js');
 const backup={...state},originalDocument=globalThis.document;
 const element=()=>({replaceChildren(){},append(){},classList:{toggle(){}}});
 globalThis.document={querySelector:element,createElement:element,dispatchEvent(){}};
 try{
  state.playing=false;
  const actor={...guard(),name:'Garde',type:'character',color:'#4f9ce9',hp:42,rotation:95,depth3d:24,collision3d:false,
   aiFaction:'guards',aiTargetId:7,tags:['sentry'],weaponSystem:{ammo:12},
   threatIntel:{faction:'guard',relation:'hostile'},inventory:{capacity:4,items:[{id:'key',count:1}],equipment:{weapon:null}},
   sequence:createBlueprintPreset('ai-guard-alert','3d')};
  await importScene({text:async()=>JSON.stringify({entities:[actor]})});
  for(const key of ['ai','aiFaction','aiTargetId','tags','weaponSystem','threatIntel','hp','inventory','sequence','rotation','depth3d','collision3d'])assert.deepEqual(state.entities[0][key],actor[key],key);
  duplicateSelected();const [original,copy]=state.entities;
  copy.ai.speed=500;copy.inventory.items[0].count=99;copy.sequence.instructions[0].value=false;
  assert.notEqual(original.ai.speed,500);
  assert.equal(original.inventory.items[0].count,1);
  assert.equal(original.sequence.instructions[0].value,true);
 }finally{Object.assign(state,backup);globalThis.document=originalDocument}
});

test('2D foot collision opens after inventory Blueprint unlocks the door',async()=>{
 const {state}=await import('../js/core/state.js');
 const {walkPlayer}=await import('../js/core/player-controller.js');
 const backup=state.entities,p=hero({x:0}),door={id:3,type:'object',x:22,y:-10,w:20,h:60,
  sequence:createBlueprintPreset('inventory-key-door','2d')};
 try{
  state.entities=[p,door];walkPlayer(p,.1,new Set(['d']));assert.equal(p.x,0);
  inventoryAdd(p,'key');resetSequences();tick([p,door],p,.1,['e']);
  walkPlayer(p,.1,new Set(['d']));assert.ok(p.x>0);
 }finally{state.entities=backup}
});

test('2D HUD keeps rendering when a playable scene has no vehicles',async()=>{
 const {state}=await import('../js/core/state.js');
 const {drawDrivingHud,resetDriving}=await import('../js/core/vehicle.js');
 const backup=state.entities,p=hero();
 try{
  state.entities=[p];resetDriving();
  assert.doesNotThrow(()=>drawDrivingHud({save(){},restore(){}},800,600,p));
 }finally{state.entities=backup}
});
