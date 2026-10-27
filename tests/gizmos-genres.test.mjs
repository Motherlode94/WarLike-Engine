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
