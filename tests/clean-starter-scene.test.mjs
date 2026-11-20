import test from 'node:test';
import assert from 'node:assert/strict';
import {createCleanStarterScene3d} from '../js/core/clean-starter-scene.js';
import {sunAt} from '../js/core/lighting.js';
import {sceneCameraView} from '../js/core/scene-camera-3d.js';
import {readFileSync} from 'node:fs';
test('new 3D project starts with exactly Main Camera, Terrain and Directional Light',()=>{
 const objects=createCleanStarterScene3d();
 assert.deepEqual(objects.map(o=>o.name),['Main Camera','Terrain','Directional Light']);
 assert.deepEqual(objects.map(o=>o.id),[1,2,3]);
 assert.ok(objects[0].sceneCamera3d?.enabled);
 assert.equal(objects[1].collision3d,true);
 assert.equal(objects[1].solid3d,true);
 assert.ok(objects[1].w>=1280&&objects[1].depth3d>=1280);
 assert.equal(objects[2].lightType,'directional');
 const cameraView=sceneCameraView(objects[0],objects);
 assert.ok(cameraView?.forward[1]<-.4,'Starter camera must look downward toward terrain');
 const groundCenter=[0,0,0],toCenter=groundCenter.map((n,i)=>n-cameraView.eye[i]);
 assert.ok(cameraView.forward.reduce((sum,n,i)=>sum+n*toCenter[i],0)>0,'Terrain must be in front of starter camera');
});
test('directional scene light controls actual daylight intensity',()=>{
 const scene=createCleanStarterScene3d();
 assert.ok(sunAt(12,scene).intensity>0);
 scene[2].lightEnabled=false;
 assert.equal(sunAt(12,scene).intensity,0);
});
test('editor ships clean default and no demo gallery startup',()=>{
 const state=readFileSync(new URL('../js/core/state.js',import.meta.url),'utf8');
 const work=readFileSync(new URL('../js/core/workspaces.js',import.meta.url),'utf8');
 const editor=readFileSync(new URL('../js/editor.js',import.meta.url),'utf8');
 assert.match(state,/createCleanStarterScene3d\(\)/);
 assert.match(work,/mode:'3d'/);
 assert.doesNotMatch(editor,/^initDemoBrowser\(\);/m);
});
