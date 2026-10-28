import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectSurvivalPlacement,survivalBuildLimit,survivalCenter} from '../js/core/survival-building.js';
import {survivalAction,ensureSurvival,survivalMilestones,tickSurvival} from '../js/core/survival-runtime.js';
import {createSurvivalScene} from '../js/core/survival-scene.js';
import {inventoryCount} from '../js/core/gameplay-components.js';
import {gameSession,saveGameSlot,queueLoadGame,captureGameSave} from '../js/core/game-session.js';
import {resetSequences,updateSequences,sequenceRuntime,conditionPass} from '../js/core/logic-sequences.js';
import {reconcileLanSurvivors} from '../js/core/lan-survivors.js';
import {restoreGameProject} from '../js/core/game-project.js';
const fresh=(mode='2d')=>{const scene=createSurvivalScene(mode),p=scene.entities.find(o=>o.survival);p.x=p.y=0;p.survivalWorld.timeScale=3600;return {p,entities:[p],mode,next:100}};
const supplies=p=>p.inventory.items=[{id:'wood',count:12},{id:'stone',count:8},{id:'fiber',count:8},{id:'berries',count:4},{id:'water',count:2}];
const act=(f,action)=>{ensureSurvival(f.p).actionCooldown=0;return survivalAction(f.p,action,f.entities,{mode:f.mode,allocateId:()=>f.next++})};
const place=(f,recipe,x,y,rotation=0)=>act(f,{type:'place',recipe,x,y,rotation});
const context=f=>({playing:true,entities:f.entities,player:f.p,mode:f.mode,allocateId:()=>f.next++,keys:new Set(),globals:sequenceRuntime.globals,fired:sequenceRuntime.fired});
const run=f=>updateSequences(.1,context(f));
const memory=()=>{const map=new Map();return {setItem:(k,v)=>map.set(k,v),getItem:k=>map.get(k)}};

test('manual placement validates snapped coordinates, rotation, range and characters in both modes',()=>{
 for(const mode of ['2d','3d']){
  const f=fresh(mode),template=f.p.survival.buildTemplates[mode].shelter;
  const check=inspectSurvivalPlacement(f.p,template,{x:191,y:192,rotation:90},f.entities,{mode,snap:true});assert.equal(check.ok,true);assert.equal(check.entity.rotation,90);assert.equal(survivalCenter(check.entity,mode).x,192);
  assert.equal(inspectSurvivalPlacement(f.p,template,{x:NaN,y:0},f.entities,{mode}).ok,false);
  assert.equal(inspectSurvivalPlacement(f.p,template,{x:2000,y:0},f.entities,{mode}).ok,false);
  const center=survivalCenter(f.p,mode);assert.equal(inspectSurvivalPlacement(f.p,template,{...center,rotation:0},f.entities,{mode}).ok,false);
  if(mode==='2d'){const wall={id:66,type:'object',x:0,y:0,w:10,h:10,collider2d:{enabled:true,width:500,height:500}};assert.equal(inspectSurvivalPlacement(f.p,template,{x:192,y:192},[f.p,wall],{mode}).ok,false)}
  const other={...structuredClone(f.p),id:44,x:180,y:140};assert.equal(inspectSurvivalPlacement(f.p,template,{x:192,y:192},[f.p,other],{mode}).ok,false);
  if(mode==='3d'){f.p.elevation3d=10;assert.equal(inspectSurvivalPlacement(f.p,template,{x:192,y:192},f.entities,{mode}).ok,false)}
 }
});

test('a build is charged only after the host rechecks its location and concurrent occupancy',()=>{
 for(const mode of ['2d','3d']){
  const f=fresh(mode);supplies(f.p);const before=structuredClone(f.p.inventory);
  assert.equal(place(f,'campfire',9000,20).ok,false);assert.deepEqual(f.p.inventory,before);
  assert.equal(place(f,'campfire',180,20,90).ok,true);assert.equal(f.entities[1].rotation,90);assert.equal(inventoryCount(f.p,'wood'),8);
  const guest=structuredClone(f.p);guest.id=2;guest.survivalState={};guest.x=0;guest.y=50;supplies(guest);const inventory=structuredClone(guest.inventory);
  assert.equal(survivalAction(guest,{type:'place',recipe:'campfire',x:180,y:20,rotation:0},f.entities,{mode,allocateId:()=>f.next++}).ok,false);assert.deepEqual(guest.inventory,inventory);assert.equal(f.entities.length,2);
  assert.equal(act(f,{type:'place',recipe:'arbitrary',x:180,y:20}).ok,false);
 }
});

test('construction reserves room for three LAN players even before they join',()=>{
 const f=fresh();f.p._netPeerId='host';const entities=[f.p,...Array.from({length:252},(_,i)=>({id:i+2,type:'prefab',x:10000,y:10000,w:1,h:1,collision3d:false}))];assert.equal(survivalBuildLimit(entities),253);
 assert.equal(inspectSurvivalPlacement(f.p,f.p.survival.buildTemplates['2d'].campfire,{x:180,y:20},entities).ok,false);
 entities.pop();assert.equal(inspectSurvivalPlacement(f.p,f.p.survival.buildTemplates['2d'].campfire,{x:180,y:20},entities).ok,true);
});

test('fresh LAN survivors do not inherit host supplies, damage or completed objectives',()=>{
 const f=fresh();supplies(f.p);f.p.stats.health=15;ensureSurvival(f.p).recipes={meal:9};let id=50;
 const players=[{id:'host',name:'Hôte'},{id:'guest',name:'Ami'}];reconcileLanSurvivors(f.entities,players,f.p,{hostId:'host',allocateId:()=>id++});
 const guest=f.entities.find(o=>o.coopSeat);assert.equal(inventoryCount(guest,'wood'),0);assert.equal(inventoryCount(guest,'water'),1);assert.equal(guest.stats.health,100);assert.equal(guest.survivalState.recipes,undefined);assert.equal(guest.sequence,undefined);assert.equal(guest.survivalWorld,undefined);assert.equal(guest.survivalCompanions,undefined);
});

test('a saved disconnected companion reclaims their own supplies without occupying the live scene',()=>{
 const f=fresh();let id=50;const host={id:'host',name:'Hôte'};
 reconcileLanSurvivors(f.entities,[host,{id:'g1',name:'Ami'}],f.p,{hostId:'host',allocateId:()=>id++});let guest=f.entities[1];supplies(guest);guest.survivalState.recipes={meal:1};guest.stats.health=47;
 reconcileLanSurvivors(f.entities,[host],f.p,{hostId:'host',allocateId:()=>id++});assert.equal(f.entities.length,1);assert.equal(f.p.survivalCompanions.length,1);assert.equal(survivalMilestones(f.entities).meal,true);
 const save=JSON.parse(JSON.stringify(captureGameSave({entities:f.entities,globals:{},fired:[]})));const entities=save.entities,p=entities[0];
 reconcileLanSurvivors(entities,[host,{id:'g2',name:'Autre'}],p,{hostId:'host',allocateId:()=>id++});assert.equal(inventoryCount(entities[1],'wood'),0);
 reconcileLanSurvivors(entities,[host,{id:'g2',name:'Autre'},{id:'g3',name:'Ami'}],p,{hostId:'host',allocateId:()=>id++});guest=entities.find(o=>o.coopName==='Ami');assert.equal(inventoryCount(guest,'wood'),12);assert.equal(guest.stats.health,47);assert.equal(p.survivalCompanions.length,0);assert.equal(guest._netPeerId,'g3');
});

test('save/load preserves active guest input safety, camp placement, needs and shared recipe progress',()=>{
 restoreGameProject({id:'survival-save'});resetSequences();const f=fresh();supplies(f.p);assert.equal(place(f,'campfire',180,20).ok,true);const fire=f.entities[1];fire.survivalNode.fuel=42;f.p._netKeys=new Set(['w']);f.p.survivalState.water=33;const ctx={...context(f),storage:memory()};run(f);saveGameSlot(ctx);
 f.entities.splice(1);f.p.inventory.items=[];f.p.survivalState.water=0;queueLoadGame(ctx);updateSequences(.1,ctx);const p=f.entities[0];assert.equal(p.survivalState.water,33);assert.equal(inventoryCount(p,'wood'),8);assert.equal(f.entities[1].x,fire.x);assert.equal(f.entities[1].survivalNode.fuel,42);assert.equal(p._netKeys,undefined);assert.doesNotThrow(()=>tickSurvival(f.entities,.1));
});

test('a surviving teammate can revive the host; defeat waits until the whole party is down',()=>{
 restoreGameProject({id:'survival-rescue'});resetSequences();const f=fresh();supplies(f.p);let id=50;reconcileLanSurvivors(f.entities,[{id:'host',name:'Hôte'},{id:'g',name:'Ami'}],f.p,{hostId:'host',allocateId:()=>id++});const guest=f.entities[1];guest.x=20;guest.y=0;supplies(guest);f.p.stats.health=0;run(f);for(let i=0;i<10;i++)run(f);assert.equal(gameSession.phase,'playing');
 assert.equal(survivalAction(guest,'revive',f.entities).ok,true);assert.equal(f.p.stats.health,35);assert.equal(inventoryCount(guest,'fiber'),6);
 f.p.stats.health=0;guest.stats.health=0;for(let i=0;i<10;i++)run(f);assert.equal(gameSession.phase,'lost');
});

for(const mode of ['2d','3d'])test('First Dawn '+mode+' completes real harvest, placement, cooking and dawn via editable Blueprints',()=>{
 restoreGameProject({id:'dawn-'+mode});resetSequences();const f=fresh(mode);run(f);
 // Resource nodes use the same atomic harvest path as E and LAN commands.
 for(const [kind,amount] of [['wood',12],['stone',2],['fiber',6],['berries',2]]){
  const c=survivalCenter(f.p,mode),node={id:f.next++,type:'prefab',x:c.x+30,y:c.y,w:20,h:20,depth3d:20,collision3d:false,survivalNode:{enabled:true,kind,stock:amount,amount,respawn:0}};f.entities.push(node);assert.equal(act(f,'gather').ok,true);f.entities.splice(f.entities.indexOf(node),1);
 }
 assert.equal(place(f,'campfire',180,20).ok,true);assert.equal(place(f,'shelter',180,170).ok,true);
 const c=survivalCenter(f.p,mode);f.p.x+=70-c.x;f.p.y+=95-c.y;assert.equal(act(f,'craft:meal').ok,true);assert.equal(survivalMilestones(f.entities,{mode}).dawn,false);
 for(let i=0;i<132;i++){tickSurvival(f.entities,.1,{mode,player:f.p});run(f)}
 assert.equal(survivalMilestones(f.entities,{mode}).expedition,true);assert.equal(gameSession.phase,'won');assert.equal(Object.values(gameSession.objectives).filter(o=>o.status==='complete').length,4);
 assert.equal(conditionPass({type:'survivalMilestone',key:'expedition'},f.p,{entities:f.entities,mode}),true);
});
