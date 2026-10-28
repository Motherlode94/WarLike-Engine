import {walkPlatformer2d} from '../js/core/physics-2d.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultSurvival,defaultSurvivalNode,ensureSurvival,tickSurvival,gatherSurvival,craftSurvival,survivalAction} from '../js/core/survival-runtime.js';
import {createSurvivalScene,survivalBuildTemplates} from '../js/core/survival-scene.js';
import {inventoryCount} from '../js/core/gameplay-components.js';
import {conditionPass,sequenceInstructions,sequenceConditions} from '../js/core/logic-sequences.js';
import {instructionLabels,conditionLabels} from '../js/core/blueprint-catalog.js';
import {inspectBlueprintGame} from '../js/core/blueprint-validation.js';
import {gameRuntimeModels} from '../js/core/game-build.js';
import {survivalSprites2d} from '../js/assets/survival-sprites-2d.js';
const actor=(id=1)=>({id,type:'player',x:0,y:0,w:32,h:64,stats:{health:100,maxHealth:100,stamina:100,maxStamina:100},inventory:{capacity:12,items:[],equipment:{}},survival:defaultSurvival()});
const node=(kind='wood',stock=2)=>({id:2,type:'object',x:60,y:0,w:30,h:40,survivalNode:{...defaultSurvivalNode(),kind,stock,maxStock:2,respawn:.2}});
const materials=o=>o.inventory.items=[{id:'wood',count:12},{id:'stone',count:8},{id:'fiber',count:8},{id:'berries',count:4},{id:'water',count:2}];
const expire=o=>{ensureSurvival(o).actionCooldown=0};
test('survival needs and starvation damage are per player and configurable',()=>{
 const a=actor(),b=actor(3);ensureSurvival(a).water=0;const before=ensureSurvival(b).water;tickSurvival([a,b],.1,{hour:14,player:a,keys:new Set(['shift'])});assert.ok(a.stats.health<100);assert.equal(b.stats.health,100);assert.ok(b.survivalState.water<before);assert.ok(a.survivalState.food<b.survivalState.food);a.survival.enabled=false;const copy=structuredClone(a.survivalState);tickSurvival([a],.1);assert.deepEqual(a.survivalState,copy);
});
test('harvest depletes a shared stock atomically and regenerates after exhaustion',()=>{
 const a=actor(),b=actor(3),resource=node();assert.equal(gatherSurvival(a,[a,b,resource]).ok,true);assert.equal(inventoryCount(a,'wood'),2);assert.equal(gatherSurvival(b,[a,b,resource]).ok,false);assert.equal(inventoryCount(b,'wood'),0);tickSurvival([resource],.1);assert.equal(resource.survivalNode.stock,0);tickSurvival([resource],.1);assert.equal(resource.survivalNode.stock,2);
});
test('full inventory does not consume a resource and distance is checked',()=>{
 const a=actor(),resource=node();a.inventory.capacity=0;assert.equal(gatherSurvival(a,[resource]).ok,true);expire(a);a.inventory={capacity:1,items:[{id:'stone',count:2}],equipment:{}};resource.survivalNode.stock=2;assert.equal(gatherSurvival(a,[resource]).ok,false);assert.equal(resource.survivalNode.stock,2);resource.x=500;assert.equal(gatherSurvival(a,[resource]).ok,false);
});
test('crafting checks ingredients and station before charging, and healing consumes real fibers',()=>{
 const a=actor();assert.equal(craftSurvival(a,'bandage',[a]).ok,false);materials(a);a.stats.health=50;assert.equal(craftSurvival(a,'bandage',[a]).ok,true);assert.equal(a.stats.health,75);assert.equal(inventoryCount(a,'fiber'),6);expire(a);const before=structuredClone(a.inventory);assert.equal(craftSurvival(a,'meal',[a]).ok,false);assert.deepEqual(a.inventory,before);const fire={...node('campfire'),survivalNode:{kind:'campfire',enabled:true,fuel:20}};assert.equal(craftSurvival(a,'meal',[a,fire]).ok,true);assert.equal(inventoryCount(a,'berries'),2);
});
test('camp construction uses durable Kenney prefabs and places a real shared object',()=>{
 for(const mode of ['2d','3d']){const a=actor();materials(a);a.survival.buildTemplates=survivalBuildTemplates();const objects=[a];let id=8;assert.equal(craftSurvival(a,'campfire',objects,{mode,allocateId:()=>id++}).ok,true);assert.equal(objects.length,2);assert.equal(objects[1].survivalNode.kind,'campfire');assert.equal(objects[1].id,8);assert.equal(inventoryCount(a,'wood'),8);assert.equal(a.survivalState.builds.campfire,1);assert.ok(objects[1].assetId.includes('survival'));}
});
test('blocked construction or invalid identity never consumes materials',()=>{
 const a=actor();materials(a);a.survival.buildTemplates=survivalBuildTemplates();const before=structuredClone(a.inventory),wall={id:5,type:'object',x:-1000,y:-1000,w:2000,h:2000,depth3d:2000};assert.equal(craftSurvival(a,'shelter',[a,wall],{mode:'2d',allocateId:()=>4}).ok,false);assert.deepEqual(a.inventory,before);assert.equal(craftSurvival(a,'campfire',[a],{mode:'2d',allocateId:()=>1}).ok,false);assert.deepEqual(a.inventory,before);
});
test('fire fuel warms all nearby survivors and refueling consumes wood',()=>{
 const a=actor(),b=actor(3),fire={...node('campfire'),survivalNode:{kind:'campfire',enabled:true,fuel:.05},fxEmitter:{enabled:true}};materials(a);tickSurvival([a,b,fire],.1,{hour:22});assert.equal(fire.survivalNode.fuel,0);assert.equal(fire.fxEmitter.enabled,false);const cold=ensureSurvival(b).warmth;assert.equal(survivalAction(a,'refuel',[fire]).ok,true);assert.equal(inventoryCount(a,'wood'),11);tickSurvival([a,b,fire],.1,{hour:22});assert.ok(b.survivalState.warmth>cold);assert.equal(fire.fxEmitter.enabled,true);
});
test('provisions and shelter rest consume inventory or enforce a dedicated cooldown',()=>{
 const a=actor();materials(a);const s=ensureSurvival(a);s.water=20;s.rest=10;assert.equal(survivalAction(a,'drink',[]).ok,true);assert.equal(inventoryCount(a,'water'),1);assert.equal(s.water,55);expire(a);assert.equal(survivalAction(a,'rest',[]).ok,false);const shelter={...node('shelter'),survivalNode:{kind:'shelter',enabled:true}};assert.equal(survivalAction(a,'rest',[shelter]).ok,true);assert.equal(s.rest,45);expire(a);assert.equal(survivalAction(a,'rest',[shelter]).ok,false);assert.equal(survivalAction(a,'eat',[shelter]).ok,true);
});
test('day-night cycle strengthens threats at night and counts dawn for living survivors',()=>{
 const a=actor(),world={id:5,survivalWorld:{enabled:true,hour:23.99999,timeScale:3600,day:1}},foe={id:6,ai:{},survivalThreat:{speed:20,detection:100}};tickSurvival([a,world,foe],.1);assert.equal(world.survivalWorld.day,2);assert.equal(foe.ai.speed,34);assert.equal(a.survivalState.night,true);world.survivalWorld.hour=5.99999;tickSurvival([a,world,foe],.1);assert.equal(foe.ai.speed,20);assert.equal(a.survivalState.nights,1);
});
test('both Survival starters validate, export build models, and use real PNG sprites',()=>{
 for(const mode of ['2d','3d']){const scene=createSurvivalScene(mode),player=scene.entities.find(o=>o.survival);assert.ok(player);assert.ok(scene.entities.some(o=>o.survivalNode));assert.ok(scene.entities.some(o=>o.survivalThreat));assert.equal(scene.nextId,scene.entities.length+1);assert.deepEqual(inspectBlueprintGame(scene.entities).filter(i=>i.severity==='error'),[]);const models=gameRuntimeModels({project:{scenes:[scene]}}).map(o=>o.id);assert.ok(models.includes('free-survival-kit-campfire-pit'));assert.ok(models.includes('free-nature-kit-tent-smallclosed'));}
 assert.equal(survivalSprites2d.length,7);for(const s of survivalSprites2d){assert.equal(s.license,'CC0-1.0');assert.equal(s.author,'Kenney');assert.match(s.spriteUrl,/^data:image\/png;base64,/);const png=Buffer.from(s.spriteUrl.split(',')[1],'base64');assert.equal(png.toString('ascii',1,4),'PNG');assert.equal(png[25],6);}
});
test('Blueprint survival nodes use real runtime state and retain French labels',()=>{
 for(const op of ['survivalInteract','craftSurvivalItem','consumeSurvivalItem']){assert.ok(sequenceInstructions.includes(op));assert.ok(instructionLabels[op])}for(const op of ['survivalNeedBelow','survivalBuilt','survivalNightsAtLeast']){assert.ok(sequenceConditions.includes(op));assert.ok(conditionLabels[op])}const a=actor();ensureSurvival(a).water=10;a.survivalState.builds.shelter=1;assert.equal(conditionPass({type:'survivalNeedBelow',key:'water',value:20},a,{entities:[a],player:a}),true);assert.equal(conditionPass({type:'survivalBuilt',key:'shelter'},a,{entities:[a],player:a}),true);
});

test('survival fatigue also reduces platformer horizontal speed without altering jump settings',()=>{
 const a=actor();a.controller2d={mode:'platformer',walkSpeed:190,jumpSpeed:430};a.rigidbody2d={enabled:true,bodyType:'dynamic',gravity:0,vx:0,vy:0};ensureSurvival(a).rest=10;walkPlatformer2d(a,.1,new Set(['d']),[a]);assert.equal(a.rigidbody2d.vx,114);assert.equal(a.controller2d.jumpSpeed,430);
});
