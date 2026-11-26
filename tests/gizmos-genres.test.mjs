import test from 'node:test';
import assert from 'node:assert/strict';
import {gizmoCenter,hitGizmo2d} from '../js/core/gizmos-2d.js';
import {isRtsUnit,orderRtsMove,updateRtsOrders} from '../js/core/rts-orders.js';
import {readFileSync} from 'node:fs';

test('2D gizmo center averages selected bounds',()=>{
 assert.deepEqual(gizmoCenter([{x:0,y:0,w:20,h:20},{x:40,y:20,w:20,h:20}]),{x:30,y:20});
});
test('2D transform handles detect axes independent of zoom',()=>{
 const objects=[{x:0,y:0,w:20,h:20}];
 assert.equal(hitGizmo2d({x:65,y:10},objects,'move',1),'x');
 assert.equal(hitGizmo2d({x:10,y:-45},objects,'move',1),'y');
 assert.equal(hitGizmo2d({x:10,y:10},objects,'hand',1),null);
});
test('RTS movement orders affect only tagged units and reach target',()=>{
 const objects=[{id:1,x:0,y:0,w:10,h:10,tags:['rts-unit'],ai:{speed:100}},{id:2,x:0,y:0,w:10,h:10,tags:[]}];
 assert.equal(isRtsUnit(objects[0]),true);
 assert.equal(orderRtsMove(objects,[1,2],{x:105,y:5}),1);
 for(let i=0;i<20;i++)updateRtsOrders(objects,.1,true);
 assert.equal(objects[0].rtsOrder,undefined);
 assert.equal(objects[1].x,0);
 assert.ok(Math.abs(objects[0].x-100)<3);
});
test('Blueprint presets contain FPS/TPS, RTS, Adventure and Race categories',()=>{
 const src=readFileSync(new URL('../js/core/blueprint-presets.js',import.meta.url),'utf8');
 for(const genre of ['FPS / TPS','RTS','Action / Aventure','Course / Sport'])assert.ok(src.includes('category:\''+genre+'\''));
});
test('3D gizmos are wired into the scene viewport',()=>{
 const src=readFileSync(new URL('../js/core/viewport-3d.js',import.meta.url),'utf8');
 assert.match(src,/initSceneGizmo3d\(/);
 assert.match(src,/updateGizmos\(\)/);
 assert.match(src,/updateRtsOrders\(/);
});

test('race clock and RTS unit HUD are connected to both render paths',()=>{
 for(const path of ['renderer.js','viewport-3d.js']){
  const source=readFileSync(new URL('../js/core/'+path,import.meta.url),'utf8');
  assert.match(source,/updateGenreHud\(state\)/);
 }
 const source=readFileSync(new URL('../js/core/logic-sequences.js',import.meta.url),'utf8');
 assert.match(source,/globals\.raceElapsed/);
});

import {projectedAxisDrag3d} from '../js/core/scene-editing-3d-tools.js';
test('E04.1 projected translation follows the visible axis without invalid jumps',()=>{
 const origin={x:100,y:100},right={x:150,y:100},left={x:50,y:100};
 assert.equal(projectedAxisDrag3d(origin,right,25,0,2),1);
 assert.equal(projectedAxisDrag3d(origin,left,25,0,2),-1);
 assert.equal(projectedAxisDrag3d(origin,right,0,25,2),0);
 assert.equal(projectedAxisDrag3d(origin,{x:101,y:100},100,0),0);
 assert.equal(projectedAxisDrag3d(origin,right,25,0,-2),0);
 assert.equal(projectedAxisDrag3d(origin,{x:Number.MAX_VALUE,y:100},Number.MAX_VALUE,0),0);
});

import {gizmoScaledDimension3d} from '../js/core/scene-editing-3d-tools.js';
import {colliderGeometry3d} from '../js/core/collider-3d.js';
test('E04.3 scale preserves fractional dimensions and automatic collider bounds',()=>{
 assert.equal(gizmoScaledDimension3d(63.5,1,.5),63.5);
 assert.equal(gizmoScaledDimension3d(63.5,2),127);
 assert.equal(gizmoScaledDimension3d(63.5,2,.5),128);
 assert.equal(colliderGeometry3d({w:127,h:64,depth3d:64}).w,127/64);
 assert.equal(colliderGeometry3d({w:127,h:64,depth3d:64,collider3d:{width:1}}).w,1);
});
