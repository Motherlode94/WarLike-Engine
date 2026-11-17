import test from 'node:test';
import assert from 'node:assert/strict';
import {activeSceneCamera2d,defaultSceneCamera2d,cameraView2d,targetForCamera2d} from '../js/core/scene-camera-2d.js';
import {readFileSync} from 'node:fs';
const camera=(id=2)=>({id,type:'object',x:50,y:70,w:32,h:24,camera2d:defaultSceneCamera2d()});
const player={id:1,type:'player',x:100,y:140,w:32,h:40};
test('Camera2D selection honors priority and disabled state',()=>{
 const a=camera(2),b=camera(3);b.camera2d.priority=5;
 assert.equal(activeSceneCamera2d([a,b]),b);
 b.camera2d.enabled=false;
 assert.equal(activeSceneCamera2d([a,b]),a);
 assert.equal(activeSceneCamera2d([]),null);
});
test('2D camera follows player center at a zoom independent of editor camera',()=>{
 const cam=camera();cam.camera2d.zoom=2;
 assert.equal(targetForCamera2d(cam,[cam,player]),player);
 const view=cameraView2d(cam,[cam,player],{width:800,height:600},1,{snap:true});
 assert.deepEqual(view,{x:400-116*2,y:300-160*2,zoom:2});
 assert.deepEqual(cam.camera2d,{...defaultSceneCamera2d(),zoom:2});
});
test('Camera2D fixed uses scene position and smooth follow interpolates',()=>{
 const cam=camera();cam.camera2d.mode='fixed';cam.camera2d.zoom=1;
 const view=cameraView2d(cam,[cam,player],{width:800,height:600},.016,{snap:true});
 assert.equal(view.x,400-(50+16));
 cam.camera2d.mode='follow';cam.camera2d.followSharpness=5;
 const smooth=cameraView2d(cam,[cam,player],{width:800,height:600},.016,{previous:{x:0,y:0,zoom:1}});
 assert.ok(smooth.x>0&&smooth.x<400-116);
});
test('2D menu exposes native camera, player, sprite, collider and trigger choices',()=>{
 const catalog=readFileSync(new URL('../js/core/editor-create-catalog.js',import.meta.url),'utf8');
 for(const key of ['camera-2d','player-2d','sprite-2d','platform-2d','trigger-2d','physics-2d'])assert.ok(catalog.includes("['"+key+"',"),key);
});
