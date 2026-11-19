import {walkPlayer} from '../js/core/player-controller.js';
import {state} from '../js/core/state.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {colliderShape2d,colliderSeparation2d} from '../js/core/collider-shapes-2d.js';
import {moveBody2d,stepPhysics2d,defaultCollider2d,defaultRigidbody2d} from '../js/core/physics-2d.js';
import {ContactEvents2d} from '../js/core/physics-contact-events-2d.js';
import {defaultJoint2d,defaultEffector2d,physicsDiagnostics2d} from '../js/core/physics-tools-2d.js';
import {addObjectComponent,removeObjectComponent,componentChoices} from '../js/core/component-definitions.js';
import {canonicalScene,runtimeEntities} from '../js/core/scene-contract.js';
import {prepareGameDefinition} from '../js/core/game-build.js';
import {drawPhysicsOverlay2d} from '../js/core/physics-overlay-2d.js';
const box=(id,x,y,w=20,h=20)=>({id,type:'object',name:'Body '+id,x,y,w,h,collider2d:defaultCollider2d()});
const body=(...args)=>({...box(...args),rigidbody2d:{...defaultRigidbody2d(),gravity:0,friction:0}});
const close=(a,b,t=1e-5)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);

test('old rectangle dimensions remain exact and automatic circles/capsules fit the sprite',()=>{
 const old={id:1,x:7,y:9,w:40,h:20,collider2d:{offsetX:3,offsetY:-2}},before=structuredClone(old);
 assert.deepEqual(colliderShape2d(old),{x:10,y:7,w:40,h:20,r:0,cx:30,cy:17});assert.deepEqual(old,before);
 old.collider2d.shape='circle';assert.deepEqual(colliderShape2d(old),{x:20,y:7,w:20,h:20,r:10,cx:30,cy:17});
 old.collider2d.shape='capsule';assert.equal(colliderShape2d(old).r,10);
});
test('circles miss empty box corners while rounded trigger contacts use the actual shape',()=>{
 const circle=body(1,0,0);circle.collider2d.shape='circle';
 const corner=box(2,18,18,3,3);corner.collider2d.isTrigger=true;
 const events=new ContactEvents2d();assert.equal(events.update([circle,corner]).length,0);
 corner.x=15;corner.y=15;assert.equal(events.update([circle,corner]).filter(e=>e.stage==='enter').length,2);
 corner.x=18;corner.y=18;assert.equal(events.update([circle,corner]).filter(e=>e.stage==='exit').length,2);
});
for(const shape of ['circle','capsule'])test(shape+' sweeps against a thin wall, slides and lands without tunnelling',()=>{
 const actor=body(1,0,0,20,shape==='capsule'?40:20);actor.collider2d.shape=shape;
 const wall=box(2,100,-100,1,400),floor=box(3,-100,100,400,1);
 const hit=moveBody2d(actor,2000,2000,[actor,wall,floor]);
 close(actor.x,80);close(actor.y,100-actor.h);assert.equal(hit.blockedX,true);assert.equal(hit.grounded,true);
 moveBody2d(actor,-10,0,[actor,wall,floor]);close(actor.x,70);
});
test('circle-circle sweeps use the round boundary and allow tangent travel',()=>{
 const a=body(1,0,0),b=box(2,100,12);a.collider2d.shape=b.collider2d.shape='circle';
 moveBody2d(a,500,0,[a,b]);close(a.x,84);
 a.x=0;a.y=32;moveBody2d(a,500,0,[a,b]);close(a.x,500);
});
test('rounded overlap recovery leaves shapes separated, and layers still filter sweeps',()=>{
 const a=body(1,15,15),b=box(2,25,25);a.collider2d.shape=b.collider2d.shape='circle';
 moveBody2d(a,0,0,[a,b]);assert.ok(colliderSeparation2d(colliderShape2d(a),colliderShape2d(b))>=-1e-6);
 a.x=0;a.y=25;a.collider2d.mask=0;moveBody2d(a,200,0,[a,b]);close(a.x,200);
});
test('force fields respect overlap, mass, layers, disable and static/kinematic body types',()=>{
 const a=body(1,10,10),b=body(2,50,10),outside=body(3,200,0),area=box(4,0,0,100,100);
 area.collider2d.isTrigger=true;area.effector2d={...defaultEffector2d(),forceX:120,forceY:0};b.rigidbody2d.mass=2;
 const objects=[a,b,outside,area];stepPhysics2d(objects,.1);close(a.rigidbody2d.vx,12);close(b.rigidbody2d.vx,6);close(outside.rigidbody2d.vx,0);
 area.effector2d.layerMask=0;const vx=a.rigidbody2d.vx;stepPhysics2d(objects,.1);close(a.rigidbody2d.vx,vx);
 area.effector2d.layerMask=4294967295;a.rigidbody2d.bodyType='kinematic';b.rigidbody2d.bodyType='static';stepPhysics2d(objects,.1);close(a.rigidbody2d.vx,vx);close(b.rigidbody2d.vx,6);
});
test('distance joint constrains the body to fixed and referenced anchors without changing the target',()=>{
 const a=body(1,90,-10),anchor=box(2,-10,-10);anchor.collider2d.enabled=false;
 a.joint2d={...defaultJoint2d(),targetId:2,distance:50};a.rigidbody2d.vx=100;
 stepPhysics2d([a,anchor],1/60);close(Math.hypot(a.x+10,a.y+10),50);close(a.rigidbody2d.vx,0);close(anchor.x,-10);
 a.joint2d.targetId=0;a.joint2d.anchorX=10;a.joint2d.distance=30;stepPhysics2d([a,anchor],1/60);close(Math.hypot(a.x,a.y+10),30);
});
test('joint correction cannot teleport a body through an obstacle',()=>{
 const a=body(1,90,-10),wall=box(2,45,-100,5,200);a.joint2d={...defaultJoint2d(),distance:10};
 stepPhysics2d([a,wall],1/60);assert.ok(a.x>=50);assert.ok(colliderSeparation2d(colliderShape2d(a),colliderShape2d(wall))>=-1e-6);
});
test('spring pulls toward its anchor with damping and ignores missing targets',()=>{
 const a=body(1,90,-10);a.joint2d={...defaultJoint2d(),kind:'spring',distance:40};
 stepPhysics2d([a],1/60);assert.ok(a.rigidbody2d.vx<0);assert.ok(a.x<90);
 a.joint2d.targetId=99;const vx=a.rigidbody2d.vx;stepPhysics2d([a],1/60);close(a.rigidbody2d.vx,vx);assert.ok(physicsDiagnostics2d([a]).warnings.some(s=>s.includes('absente')));
});
test('component dependencies and canonical/export round trips preserve physics and legacy fields',()=>{
 const a=box(1,90,0),area=box(2,0,0,200,200);a.type='player';a.oldCustom={nested:[1,2,3]};
 assert.equal(addObjectComponent(a,'joint2d','2d'),true);assert.equal(removeObjectComponent(a,'rigidbody2d'),false);
 assert.equal(addObjectComponent(area,'effector2d','2d'),true);area.collider2d.isTrigger=true;
 assert.ok(!componentChoices('3d').some(c=>['effector2d','joint2d'].includes(c.id)));
 const original=structuredClone([a,area]);const restored=runtimeEntities(canonicalScene(original));
 assert.deepEqual(restored[0].joint2d,a.joint2d);assert.deepEqual(restored[1].effector2d,area.effector2d);assert.deepEqual(restored[0].oldCustom,a.oldCustom);
 const exported=prepareGameDefinition({entities:original,mode:'2d'});
 assert.deepEqual(exported.project.scenes[0].entities[0].joint2d,a.joint2d);assert.deepEqual(exported.project.scenes[0].entities[1].effector2d,area.effector2d);assert.deepEqual([a,area],original);
});
test('debug overlay draws rounded collider, velocity and joint anchor without changing simulation',()=>{
 const a=body(1,90,0);a.collider2d.shape='capsule';a.joint2d=defaultJoint2d();a.rigidbody2d.vx=40;const before=structuredClone(a),calls=[];
 const ctx=new Proxy({}, {get(_,key){return (...args)=>calls.push([key,...args])},set(){return true}});
 drawPhysicsOverlay2d(ctx,a,[a],2);assert.equal(calls.filter(c=>c[0]==='arcTo').length,4);assert.ok(calls.some(c=>c[0]==='arc'));assert.deepEqual(a,before);
});

test('top-down controller receives new force fields while old scenes keep their movement',()=>{
 const before=state.entities,player=body(1,20,20),zone=box(2,0,0,200,200);player.type='player';
 zone.collider2d.isTrigger=true;zone.effector2d={...defaultEffector2d(),forceX:120,forceY:0};
 try{state.entities=[player,zone];walkPlayer(player,.1,new Set());assert.ok(player.x>20);close(player.rigidbody2d.vx,12);
  delete zone.effector2d;player.rigidbody2d.vx=500;const x=player.x;walkPlayer(player,.1,new Set());close(player.x,x);
 }finally{state.entities=before}
});
