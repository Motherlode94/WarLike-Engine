import test from 'node:test';
import assert from 'node:assert/strict';
import {createTownDemo,createGarageDemo} from '../js/core/authored-demo-scenes.js';
import {createBundledPhysicsScene2d} from '../js/core/bundled-physics-scene.js';
import {state} from '../js/core/state.js';
import {walkPlayer} from '../js/core/player-controller.js';
import {walkPlatformer2d,stepPhysics2d} from '../js/core/physics-2d.js';
import {interactionCenter} from '../js/core/interaction-range.js';
import {adventureTarget} from '../js/core/adventure-runtime.js';
import {resetSequences,updateSequences,chooseSequenceDialogue,sequenceRuntime} from '../js/core/logic-sequences.js';
import {gameSession} from '../js/core/game-session.js';
import {restoreGameProject} from '../js/core/game-project.js';
import {demoGuidance} from '../js/core/demo-guidance.js';
import {updateVehicles,resetDriving,driving} from '../js/core/vehicle.js';

function boot(factory,genre){
 restoreGameProject({id:'playability',genre});resetSequences();resetDriving();
 const scene=factory('2d');state.entities=scene.entities;state.playing=true;state.keys.clear();state.keyPresses.clear();
 const actor=()=>state.entities.find(o=>o.id===(scene.playerId||scene.selected[0]));
 const tick=(keys=[])=>updateSequences(1/60,{playing:true,entities:state.entities,player:actor(),mode:'2d',keys:new Set(keys)});
 tick();return {scene,actor,tick};
}

test('Canal mission is completable by walking through colliders, without teleporting between interactions',()=>{
 const f=boot(createTownDemo,'adventure'),p=f.actor();
 function go(x,y){
  for(let i=0;i<1200;i++){
   const c=interactionCenter(p),dx=x-c.x,dy=y-c.y;if(Math.hypot(dx,dy)<4)return;
   const keys=new Set();if(Math.abs(dx)>2)keys.add(dx>0?'d':'q');if(Math.abs(dy)>2)keys.add(dy>0?'s':'z');
   walkPlayer(p,1/60,keys);f.tick();
  }
  assert.fail('Walking route blocked at '+x+', '+y);
 }
 function interact(name){assert.equal(adventureTarget(p,state.entities)?.name,name);f.tick(['e']);f.tick()}
 assert.match(demoGuidance(p,state.entities,gameSession.objectives),/Mara/);
 go(510,850);interact('Mara · responsable du quartier');
 chooseSequenceDialogue(0,{id:gameSession.dialogue.id,actorId:p.id});f.tick();f.tick();
 assert.match(demoGuidance(p,state.entities,gameSession.objectives),/Caisse/);
 go(760,850);interact('Caisse de maintenance');
 go(450,850);go(450,430);go(540,430);interact('Tableau du relais');
 go(600,600);go(1050,600);go(1050,720);go(1380,720);interact('Éclaireur · accès bloqué');
 go(1000,720);go(650,720);interact('Mara · responsable du quartier');assert.equal(gameSession.phase,'won');
});

test('Rooftops is completable with walking and jumps, including all three parcels and delivery',()=>{
 const f=boot(createBundledPhysicsScene2d,'platformer');
 function run(frames,keys=[]){for(let i=0;i<frames;i++){
  const p=f.actor();stepPhysics2d(state.entities,1/60,{exclude:p});walkPlatformer2d(p,1/60,new Set(keys),state.entities);f.tick(keys);
  assert.ok(f.actor().y<700,'Recorded route must not fall or use a checkpoint restore');
 }}
 run(30);run(35,['d']);run(50,['d',' ']);run(2);run(45,['d',' ']);run(30);
 run(35,['d',' ']);run(13,['d']);run(45);assert.equal(sequenceRuntime.globals.roofParcels,1);
 run(82,['d']);run(30);run(5,['d']);run(50,['d',' ']);run(35,['d']);
 run(50,['d',' ']);run(2);run(50,['d',' ']);run(30);run(2);run(50,['d',' ']);run(30);
 assert.equal(sequenceRuntime.globals.roofParcels,2);
 run(25,['d']);run(2);run(50,['d',' ']);run(70,['d']);run(40);run(5,['d']);
 run(50,['d',' ']);run(35,['d']);run(50,['d',' ']);run(2);run(50,['d',' ']);run(30);run(50,['d']);run(1,['e']);
 assert.equal(sequenceRuntime.globals.roofParcels,3);assert.equal(gameSession.phase,'won');
});

test('Driving collides with authored tile barriers and respects disabled colliders',()=>{
 const f=boot(createGarageDemo,'racing'),p=f.actor(),car=state.entities.find(o=>o.name==='Prototype · véhicule d’essai');
 const barrier=state.entities.find(o=>o.name==='Barrière intérieure'&&o.y<600);
 // Fixture starts the car facing a barrier, then only accelerator input moves it.
 car.x=barrier.x+40;car.y=barrier.y-170;car.rotation=180;
 state.entities=[p,car,barrier];driving.vehicleId=car.id;
 for(let i=0;i<180;i++)updateVehicles(1/60,p,new Set(['z']));
 assert.ok(car.y+car.h/2<barrier.y,'The vehicle must not cut through the circuit centre');
 barrier.collider2d.enabled=false;
 for(let i=0;i<180;i++)updateVehicles(1/60,p,new Set(['z']));
 assert.ok(car.y>barrier.y+barrier.h,'A disabled collider must allow driving through');
});
