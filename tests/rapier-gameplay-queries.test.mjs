import test from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import {createRapierScene,activateRapierQueries3d,disposeRapierScene,stepRapierScene,synchronizeRapierScene} from '../js/core/rapier-physics-3d.js';
import {moveBody3d,raycastScene3d} from '../js/core/collision-3d.js';
import {collisionBackend3d} from '../js/core/collision-backend-3d.js';
import {hasLineOfSight} from '../js/core/ai-perception.js';
import {updateAi,defaultAi} from '../js/core/gameplay-components.js';
import {updateDriving3d,resetDriving3d,driving3d} from '../js/core/vehicle-3d.js';
await RAPIER.init();
const box=(id,x,y,w=32,h=96,d=32,extra={})=>({id,type:'mesh3d',x,y,w,h,depth3d:d,elevation3d:0,solid3d:true,collision3d:true,...extra});
const ground=()=>box(99,-1000,-1000,2000,16,2000,{elevation3d:-.25,tags:['ai-walkable']});
const run=(entities,fn)=>{const s=createRapierScene(RAPIER,entities);activateRapierQueries3d(s);stepRapierScene(s,1/60);try{fn(s)}finally{disposeRapierScene(s);assert.equal(collisionBackend3d(),null)}};
test('shared movement sweeps a vehicle box and AI capsule against an oriented wall',()=>{
 for(const extra of [{vehicleConfig:{driveable:true}},{type:'character',ai:defaultAi()}]){
  const mover=box(1,0,80,32,96,32,extra),wall=box(2,100,0,16,256,192,{rotation:45});
  run([mover,wall,ground()],()=>{for(let i=0;i<35;i++)moveBody3d(mover,4,0,-.05,[mover,wall]);assert.ok(mover.x<140);assert.ok(mover.y<70,'slides on the rotated face instead of the unrotated AABB')});
 }
});
test('real driving and AI updates use the active Rapier world',()=>{
 const car=box(1,0,0,40,48,80,{vehicleConfig:{driveable:true},rotation:90}),p=box(2,-30,0,24,80,24,{type:'player',playable3d:true}),wall=box(3,140,-100,16,256,300),entities=[car,p,wall,ground()];
 run(entities,s=>{resetDriving3d();updateDriving3d(entities,p,new Set(['e']),1/60);assert.equal(driving3d.vehicleId,1);for(let i=0;i<180;i++){stepRapierScene(s,1/60);updateDriving3d(entities,p,new Set(['w']),1/60)}assert.ok(car.x>0&&car.x+car.w<141);resetDriving3d()});
 const enemy=box(1,0,0,32,96,32,{type:'character',ai:{...defaultAi(),speed:200,pathfinding:false,detection:2000}}),target=box(2,300,0,32,96,32,{playable3d:true}),barrier=box(3,100,-100,16,256,300),all=[enemy,target,barrier,ground()];
 run(all,()=>{for(let i=0;i<120;i++)updateAi(all,target,1/60);assert.ok(enemy.x>0&&enemy.x+enemy.w<101);});
});
test('ray queries use rotated collider geometry, offsets and nearest occlusion',()=>{
 const wall=box(1,100,0,16,128,192,{rotation:45}),target=box(2,240,80),all=[wall,target];
 run(all,()=>{const hit=raycastScene3d([0,.75,1.5],[1,0,0],all,{target:o=>o===target});assert.equal(hit.entity,wall);assert.ok(hit.distance>1&&hit.distance<2);wall.sequenceEnabled=false;assert.equal(raycastScene3d([0,.75,1.5],[1,0,0],all,{target:o=>o===target}).entity,target);});
 const offset=box(3,100,0,32,64,32,{collider3d:{shape:'box',offsetZ:2}});
 run([offset],()=>{assert.equal(raycastScene3d([0,.5,.25],[1,0,0],[offset]),null);assert.equal(raycastScene3d([0,.5,2.25],[1,0,0],[offset]).entity,offset)});
});
test('AI visibility and shots agree when a door opens in the same frame',()=>{
 const actor=box(1,0,0),target=box(2,300,0),door=box(3,140,-40,16,160,110),all=[actor,target,door];
 run(all,()=>{assert.equal(hasLineOfSight(actor,target,all),false);door.collision3d=false;assert.equal(hasLineOfSight(actor,target,all),true);assert.equal(raycastScene3d([.25,.9,.25],[1,0,0],all,{exclude:actor,target:o=>o===target}).entity,target)});
});
test('disposing Play restores built-in collision ownership and leaves independent scenes untouched',()=>{
 const actor=box(1,0,0),wall=box(2,80,-40,16,128,120);
 run([actor,wall],()=>{const foreign={...actor};moveBody3d(foreign,100,0,0,[foreign,wall]);assert.equal(foreign.x,48);assert.equal(actor.x,0)});
});
test('vehicle orientation and exit placement use the actual collider volume',()=>{
 const car=box(1,0,0,32,64,128),wall=box(2,75,-40,16,200,210);
 run([car,wall,ground()],()=>{const backend=collisionBackend3d();assert.equal(backend.canPlace(car,{rotation:0}),true);assert.equal(backend.canPlace(car,{rotation:90}),false);assert.equal(backend.canPlace(car,{x:150,rotation:90}),true)});
});
test('an idle AI loses support and falls under the shared Rapier controller',()=>{
 const enemy=box(1,0,0,32,96,32,{type:'character',elevation3d:2,ai:{...defaultAi(),patrolRadius:0,speed:0,detection:0}}),all=[enemy,ground()];
 run(all,()=>{for(let i=0;i<120;i++)updateAi(all,null,1/60);assert.ok(enemy.elevation3d<.05);assert.equal(enemy._aiVerticalVelocity3d,0)});
});
test('filtered collision sets preserve allied pass-through without bypassing scenery',()=>{
 const mover=box(1,0,0),ally=box(2,50,0),wall=box(3,140,-40,16,128,120),all=[mover,ally,wall,ground()];
 run(all,()=>{for(let i=0;i<40;i++)moveBody3d(mover,4,0,0,[mover,wall]);assert.ok(mover.x>75&&mover.x+mover.w<141)});
});
