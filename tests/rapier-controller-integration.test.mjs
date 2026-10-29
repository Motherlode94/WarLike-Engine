import test from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import {createRapierScene,synchronizeRapierScene,stepRapierScene,moveRapierCharacter3d,disposeRapierScene} from '../js/core/rapier-physics-3d.js';
import {updateController3d,defaultController} from '../js/core/gameplay-components.js';
import {defaultRigidbody3d,applyImpulse3d} from '../js/core/physics-3d.js';
await RAPIER.init();
const player=()=>({id:1,type:'player',playable3d:true,x:0,y:0,w:32,h:96,depth3d:32,elevation3d:0,controller3d:defaultController()});
const box=(id,x,y,w,h,d,extra={})=>({id,type:'mesh3d',x,y,w,h,depth3d:d,elevation3d:0,...extra});
const simulate=(scene,p,entities,frames=120,keys=new Set(['d']))=>{for(let i=0;i<frames;i++){assert.equal(synchronizeRapierScene(scene,entities),true);stepRapierScene(scene,1/60);updateController3d(p,keys,1/60,0,entities,{moveCharacter:(o,x,y,z,options)=>moveRapierCharacter3d(scene,o,x,y,z,options)})}};
test('real Rapier capsule shares contacts with the character controller and solid walls',()=>{
 const p=player(),wall=box(2,96,-64,16,256,192),entities=[p,wall],s=createRapierScene(RAPIER,entities);try{simulate(s,p,entities);assert.equal(s.actors.get(1).collider.shape.type,RAPIER.ShapeType.Capsule);assert.ok(p.x>40&&p.x+p.w<97);assert.ok(p.grounded3d)}finally{disposeRapierScene(s)}
});
test('an oriented thin wall blocks its rotated footprint instead of its unrotated AABB',()=>{
 const p=player();p.y=80;const wall=box(2,100,0,16,256,192,{rotation:45}),entities=[p,wall],s=createRapierScene(RAPIER,entities);try{simulate(s,p,entities,35);assert.ok(p.x<120,'rotated wall corrects forward movement');assert.ok(p.x>75,'the character slides along the actual rotated face');assert.ok(p.y<60,'contact redirects motion along the rotated face');assert.notEqual(s.actors.get(2).body.rotation().y,0)}finally{disposeRapierScene(s)}
});
test('a capsule climbs a gentle tilted ramp and stays grounded walking downhill',()=>{
 const p=player();p.x=-60;p.y=40;const ramp=box(2,0,0,256,16,128,{elevation3d:.6,rotationZ3d:18}),entities=[p,ramp],s=createRapierScene(RAPIER,entities);try{simulate(s,p,entities,60);assert.ok(p.elevation3d>.7,JSON.stringify(p));assert.ok(p.grounded3d);simulate(s,p,entities,35,new Set(['a']));assert.ok(p.grounded3d);assert.ok(p.elevation3d<1.3)}finally{disposeRapierScene(s)}
});
test('jump is edge-triggered and lands through the same Rapier capsule',()=>{
 const p=player(),entities=[p],s=createRapierScene(RAPIER,entities);let peak=0;try{for(let i=0;i<180;i++){simulate(s,p,entities,1,new Set([' ']));peak=Math.max(peak,p.elevation3d)}assert.ok(peak>.5);assert.ok(p.elevation3d<.03);assert.ok(p.grounded3d)}finally{disposeRapierScene(s)}
});
test('sphere geometry, scripted collider changes and impulses synchronize with native bodies',()=>{
 const o=box(2,0,0,64,64,64,{elevation3d:2,collider3d:{shape:'sphere',radius:.5},rigidbody3d:defaultRigidbody3d()}),s=createRapierScene(RAPIER,[o]);try{assert.equal(s.actors.get(2).collider.shape.type,RAPIER.ShapeType.Ball);applyImpulse3d(o,128,2,0);assert.ok(synchronizeRapierScene(s,[o]));stepRapierScene(s,1/60);assert.ok(o.x>0);o.collider3d.radius=.7;assert.equal(synchronizeRapierScene(s,[o]),false)}finally{disposeRapierScene(s)}
});
test('hinge, ball and fixed joints constrain real Rapier bodies after stepping',()=>{
 for(const kind of ['hinge','ball','fixed']){const anchor=box(2,0,0,32,32,32,{elevation3d:3}),body=box(3,0,0,32,64,32,{elevation3d:2.5,rigidbody3d:{...defaultRigidbody3d(),lockRotations:false},joint3d:{enabled:true,kind,targetId:2,anchorY:.5,limitsEnabled:true,minAngle:-30,maxAngle:30}}),s=createRapierScene(RAPIER,[anchor,body]);try{assert.equal(s.errors.length,0);assert.equal(s.joints.size,1);for(let i=0;i<120;i++)stepRapierScene(s,1/60);assert.ok(body.elevation3d>2,'joint prevents free fall')}finally{disposeRapierScene(s)}}
});

test('native autostep climbs a low step but refuses a high obstacle',()=>{
 for(const [height,climbs] of [[12,true],[64,false]]){const p=player(),step=box(2,70,-40,190,height,120),entities=[p,step],s=createRapierScene(RAPIER,entities);try{simulate(s,p,entities,40);if(climbs){assert.ok(p.x>90);assert.ok(p.elevation3d>.15)}else assert.ok(p.x<40)}finally{disposeRapierScene(s)}}
});
test('slope limits reject a steep ramp and moving supports carry the capsule',()=>{
 const p=player();p.x=-60;p.y=40;const ramp=box(2,0,0,160,16,128,{elevation3d:1,rotationZ3d:60}),entities=[p,ramp],s=createRapierScene(RAPIER,entities);try{simulate(s,p,entities,60);assert.ok(p.elevation3d<.4,'a 60 degree slope cannot be climbed')}finally{disposeRapierScene(s)}
 const rider=player();rider.x=30;rider.y=20;rider.elevation3d=1.01;const platform=box(2,0,0,200,64,150,{rigidbody3d:{enabled:true,kinematic:true}}),all=[rider,platform],world=createRapierScene(RAPIER,all);try{simulate(world,rider,all,10,new Set());const x=rider.x;platform.x+=20;simulate(world,rider,all,1,new Set());assert.ok(rider.x>x+19);platform.elevation3d=.2;simulate(world,rider,all,1,new Set());assert.ok(rider.elevation3d>1.19)}finally{disposeRapierScene(world)}
});
