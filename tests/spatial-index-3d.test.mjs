import test from 'node:test';
import assert from 'node:assert/strict';
import {createSpatialIndex3d} from '../js/core/spatial-index-3d.js';
import {stepPhysics3d,defaultRigidbody3d} from '../js/core/physics-3d.js';
const body=(x,y,other={})=>({x,y,w:32,h:32,depth3d:32,elevation3d:0,type:'mesh3d',collision3d:true,...other});
test('spatial index returns nearby objects without distant scene objects',()=>{
 const nearby=body(0,0),far=body(9999,9999);
 const index=createSpatialIndex3d([nearby,far],{cellSize:64});
 assert.ok(index.query(body(12,12)).includes(nearby));
 assert.ok(!index.query(body(12,12)).includes(far));
});
test('spatial hash correctly indexes an obstacle spanning multiple buckets',()=>{
 const wall=body(60,60,{w:300,depth3d:220});
 assert.ok(createSpatialIndex3d([wall],{cellSize:64}).query(body(315,220)).includes(wall));
});
test('spatial hash includes oversized scenery even when it spans many cells',()=>{
 const huge=body(-10000,-10000,{w:50000,depth3d:50000});
 assert.ok(createSpatialIndex3d([huge],{cellSize:64}).query(body(400,400)).includes(huge));
});
test('moving body cannot pass through static wall after broadphase integration',()=>{
 const mover=body(0,0,{rigidbody3d:{...defaultRigidbody3d(),vx:1000,gravity:0,restitution:0}});
 const wall=body(37,0,{solid3d:true});
 stepPhysics3d([mover,wall],.05);
 assert.ok(mover.x+32<=wall.x);
});
