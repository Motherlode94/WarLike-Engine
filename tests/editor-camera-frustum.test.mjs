import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cameraFrustumCorners3d,nativeCameraFrustumSettings} from '../js/core/editor-camera-frustum-3d.js';
import {componentChoices} from '../js/core/component-definitions.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('native Main Camera 3D remains the only Game camera component',()=>{
 assert.ok(componentChoices('3d').some(c=>c.id==='sceneCamera3d'));
 assert.ok(!componentChoices('3d').some(c=>c.id==='cameraView3d'));
});
test('frustum follows actual Game Camera FOV and near/far clipping',()=>{
 const lens={fieldOfView:60,nearClip:.1,farClip:300,showFrustum:true};
 const narrow=cameraFrustumCorners3d([0,0,0],[0,0,0],{...lens,fieldOfView:35},1);
 const wide=cameraFrustumCorners3d([0,0,0],[0,0,0],{...lens,fieldOfView:85},1);
 assert.ok(wide.far[0][0]<narrow.far[0][0]);
 assert.equal(narrow.near.length,4);assert.equal(wide.far.length,4);
 assert.equal(nativeCameraFrustumSettings(lens).near,.1);
 assert.equal(nativeCameraFrustumSettings(lens).far,300);
 assert.ok(cameraFrustumCorners3d([0,0,0],[0,90,0],lens).far[0][0]<0);
 assert.throws(()=>cameraFrustumCorners3d([0,NaN,0],[0,0,0],lens),/invalides/);
});
test('PR59 UI is merged into current Inspector and Scene without losing native camera',()=>{
 const inspector=read('js/ui/inspector.js'),ui=read('js/ui/editor-camera-inspector.js');
 const gizmos=read('js/core/gizmos-3d.js'),components=read('js/core/component-definitions.js');
 const generic=read('js/ui/generic-component-inspector.js'),manifest=JSON.parse(read('runtime-files.json'));
 assert.ok(inspector.includes('renderEditorCameraInspector(root,o)'));
 assert.ok(ui.includes('object.sceneCamera3d')&&!ui.includes('object.cameraView3d'));
 assert.ok(gizmos.includes('data-scene-camera-frustum')&&gizmos.includes('o.sceneCamera3d'));
 assert.ok(components.includes("id:'sceneCamera3d'"));
 assert.ok(generic.includes("'sceneCamera3d'"));
 assert.ok(read('index.html').includes('editor-camera-frustum.css'));
 for(const name of ['css/editor-camera-frustum.css','js/core/editor-camera-frustum-3d.js','js/ui/editor-camera-inspector.js'])assert.ok(manifest.files.includes(name),name);
});
