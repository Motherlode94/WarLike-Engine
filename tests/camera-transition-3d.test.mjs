import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sceneCameraTargets3d,CameraTransition3d,blendCameraPose3d} from '../js/core/camera-transition-3d.js';
import {sceneCameraView,defaultSceneCamera} from '../js/core/scene-camera-3d.js';
const camera={id:10,type:'object',name:'Main Camera',x:0,y:0,w:32,h:32,sceneCamera3d:{...defaultSceneCamera(),transitionDuration:1}};
const player={id:20,type:'player',name:'Héros',x:80,y:0,w:32,h:80,depth3d:40};
test('target picker lists real scene entities, excludes own Camera and supports automatic player',()=>{
 const list=sceneCameraTargets3d([camera,player,{id:25,name:'Porte',type:'object'}],camera);
 assert.deepEqual(list.map(item=>item.id),[0,20,25]);
 assert.equal(list[1].name,'Héros');
 assert.equal(list.some(item=>item.id===camera.id),false);
});
test('camera blend transitions smoothly and retains orthonormal direction',()=>{
 const a=sceneCameraView({...camera,sceneCamera3d:{...camera.sceneCamera3d,mode:'firstPerson'}},[camera,player],{yaw:0,pitch:0});
 const b=sceneCameraView(camera,[camera,player],{yaw:1,pitch:.2});
 const middle=blendCameraPose3d(a,b,.5);
 assert.notDeepEqual(middle.eye,a.eye);assert.notDeepEqual(middle.eye,b.eye);
 assert.ok(Math.abs(Math.hypot(...middle.forward)-1)<1e-8);
 assert.deepEqual(blendCameraPose3d(a,b,0).eye,a.eye);
 assert.deepEqual(blendCameraPose3d(a,b,1).eye,b.eye);
});
test('switching between cameras and FPS/TPS enters timed blend then completes',()=>{
 const a={...camera,sceneCamera3d:{...camera.sceneCamera3d,mode:'firstPerson'}};
 const b={...camera,id:11,sceneCamera3d:{...camera.sceneCamera3d,mode:'thirdPerson'}};
 const viewA=sceneCameraView(a,[a,player],{yaw:0,pitch:0});
 const viewB=sceneCameraView(b,[b,player],{yaw:0,pitch:0});
 const transition=new CameraTransition3d();
 assert.equal(transition.update(a,viewA,.01),viewA);
 const blended=transition.update(b,viewB,.1);
 assert.notDeepEqual(blended.eye,viewB.eye);
 assert.deepEqual(transition.update(b,viewB,.1).eye,blendCameraPose3d(viewA,viewB,.104).eye===undefined?[]:transition.last.eye);
 for(let i=0;i<14;i++)transition.update(b,viewB,.1);
 assert.deepEqual(transition.last.eye,viewB.eye);
 transition.reset();assert.equal(transition.last,null);
});
test('Scene preview is editor-only and native camera inspector exposes target dropdown',()=>{
 const inspector=readFileSync(new URL('../js/ui/editor-camera-inspector.js',import.meta.url),'utf8');
 const gizmos=readFileSync(new URL('../js/core/gizmos-3d.js',import.meta.url),'utf8');
 const viewport=readFileSync(new URL('../js/core/viewport-3d.js',import.meta.url),'utf8');
 assert.ok(inspector.includes('sceneCameraTargets3d(state.entities,object)'));
 assert.ok(inspector.includes('targetSelect.onchange'));
 assert.ok(inspector.includes('transitionDuration'));
 assert.ok(gizmos.includes('CADRAGE FILAIRE'));
 assert.ok(gizmos.includes('state.playing||!view3d.enabled'));
 assert.ok(viewport.includes('cameraTransition.update'));
});
