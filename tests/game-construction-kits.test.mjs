import test from 'node:test';
import assert from 'node:assert/strict';
import {applyAdventureActorKit} from '../js/core/component-definitions.js';
import {resolveInputKeys} from '../js/core/input-actions.js';
import {horror,beginHorrorSession,resetHorror,updateHorror,updateHorrorPerception} from '../js/core/horror-survival.js';
import {startRuntimeSession,stopRuntimeSession} from '../js/core/runtime-session.js';
import {state} from '../js/core/state.js';
import {gameProject} from '../js/core/game-project.js';

test('all three authoring kits attach independent, serialized controls and preserve user settings on reapply',()=>{
 for(const kit of ['slime','racing','horror']){
  const actor={id:1,name:kit};assert.equal(applyAdventureActorKit(actor,kit),true);
  assert(actor.inputActions.enabled);actor.inputActions.forward='i';
  const saved=JSON.parse(JSON.stringify(actor));assert.equal(applyAdventureActorKit(actor,kit),true);assert.deepEqual(actor,saved);
  const other={id:2};applyAdventureActorKit(other,kit);assert.notEqual(actor.inputActions,other.inputActions);
  assert(resolveInputKeys(actor,new Set(['i'])).has('w'));
 }
});
test('horror kit separates stealth from dodge and remaps the real flashlight',()=>{
 const player={id:1,x:0,y:0};applyAdventureActorKit(player,'horror');
 assert.equal(player.cameraRig.mode,'firstPerson');assert.equal(player.playable3d,true);
 const crouched=resolveInputKeys(player,new Set(['control']));assert(crouched.has('c'));assert(!crouched.has('control'),'stealth must not spend dodge stamina');
 player.inputActions.flashlight='f';beginHorrorSession([player]);assert.equal(horror.flashlight,true);
 updateHorror(.1,player,[player],new Set(['f']));assert.equal(horror.flashlight,false);
 updateHorror(.1,player,[player],new Set(['f']));assert.equal(horror.flashlight,false,'holding F must not repeatedly toggle');resetHorror();
});
test('authored horror components activate actual runtime perception without a transient editor switch',()=>{
 const player={id:1,x:0,y:0},enemy={id:2,x:100,y:0,horrorAiConfig:{enabled:true,visionRange:200,hearingRange:120,chaseSpeed:40}};
 const authored=JSON.stringify([player,enemy]);beginHorrorSession([player,enemy]);assert.equal(horror.enabled,true);assert.equal(JSON.stringify([player,enemy]),authored);
 for(let i=0;i<12;i++)updateHorrorPerception(.1,player,[player,enemy]);assert.equal(enemy.horrorAI.state,'chase');
 beginHorrorSession([{id:3,type:'player',horrorSettings:{enabled:true,flashlight:false,battery:27}}]);assert.equal(horror.flashlight,false);assert.equal(horror.battery,27);
 beginHorrorSession([{id:4}]);assert.equal(horror.enabled,false);assert.equal(horror.battery,100);assert.equal(horror.fear,0);
 beginHorrorSession([{id:1,playable3d:true,horrorSettings:{enabled:false}},enemy]);assert.equal(horror.enabled,false,'saved player opt-out wins over enemy components');resetHorror();
});
test('actual Play lifecycle restores horror settings and clears them on Stop across project changes',()=>{
 const previousEntities=state.entities,previousGenre=gameProject.genre;
 try{
  gameProject.genre='sandbox';state.entities=[{id:1,playable3d:true,horrorSettings:{enabled:true,flashlightOn:false,battery:35}}];
  const authored=JSON.stringify(state.entities);startRuntimeSession();assert.equal(horror.enabled,true);assert.equal(horror.flashlight,false);assert.equal(horror.battery,35);assert.equal(JSON.stringify(state.entities),authored);
  horror.fear=90;stopRuntimeSession();assert.equal(horror.enabled,false);assert.equal(horror.fear,0);
  state.entities=[{id:2}];startRuntimeSession();assert.equal(horror.enabled,false);assert.equal(horror.battery,100);stopRuntimeSession();
 }finally{state.entities=previousEntities;gameProject.genre=previousGenre;resetHorror()}
});

test('an explicit game-camera link follows its actor and preserves authored optics and other cameras',async()=>{
 const {linkActorSceneCamera,sceneCameraView}=await import('../js/core/scene-camera-3d.js');
 const player={id:3,x:0,y:0,w:64,h:128,depth3d:64};applyAdventureActorKit(player,'horror');
 const main={id:1,x:0,y:600,elevation3d:8,sceneCamera3d:{enabled:true,mode:'free',fieldOfView:75,nearClip:.2,farClip:120}},disabled={id:2,sceneCamera3d:{enabled:false,mode:'free'}};
 const original=JSON.stringify(disabled);assert.equal(linkActorSceneCamera([main,disabled,player],player),main);
 assert.equal(main.sceneCamera3d.targetId,3);assert.equal(main.sceneCamera3d.mode,'firstPerson');assert.equal(main.sceneCamera3d.fieldOfView,75);assert.equal(main.sceneCamera3d.nearClip,.2);assert.equal(JSON.stringify(disabled),original);
 const before=sceneCameraView(main,[main,player]);player.x=64;const after=sceneCameraView(main,[main,player]);assert.equal(after.eye[0]-before.eye[0],1);
 assert.equal(linkActorSceneCamera([player],player),null);
 const driver={id:4};applyAdventureActorKit(driver,'driver');assert.equal(driver.playable3d,true);assert(driver.controller3d&&driver.inputActions&&driver.stats);assert.equal(driver.groundVehiclePhysics,undefined);
});
