import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cameraFrustumCorners3d,editorCameraSettings3d,defaultEditorCamera3d} from '../js/core/editor-camera-frustum-3d.js';
import {componentChoices,addObjectComponent,removeObjectComponent} from '../js/core/component-definitions.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Camera component is available only in native 3D scene editing',()=>{
 assert.ok(componentChoices('3d').some(c=>c.id==='cameraView3d'));
 assert.equal(componentChoices('2d').some(c=>c.id==='cameraView3d'),false);
 const entity={id:7,type:'object'};
 assert.equal(addObjectComponent(entity,'cameraView3d','3d'),true);
 assert.deepEqual(entity.cameraView3d,defaultEditorCamera3d());
 assert.equal(addObjectComponent(entity,'cameraView3d','3d'),false);
 assert.equal(removeObjectComponent(entity,'cameraView3d'),true);
});
test('Frustum follows Field of View and clipping, with bounded geometry',()=>{
 const origin=[1,2,3],settings=defaultEditorCamera3d();
 const narrow=cameraFrustumCorners3d(origin,[0,0,0],{...settings,fieldOfView:35},1);
 const wide=cameraFrustumCorners3d(origin,[0,0,0],{...settings,fieldOfView:85},1);
 assert.equal(narrow.near.length,4);assert.equal(narrow.far.length,4);
 assert.ok(Math.abs(wide.far[0][0]-origin[0])>Math.abs(narrow.far[0][0]-origin[0]));
 assert.ok(Math.abs(narrow.far[0][2]-(origin[2]-16))<1e-8);
 assert.equal(narrow.previewFar,16);
 const short=cameraFrustumCorners3d(origin,[0,0,0],{...settings,far:4,near:.3,previewDistance:16},1);
 assert.equal(short.previewFar,4);
 const ortho=cameraFrustumCorners3d(origin,[0,0,0],{...settings,projection:'orthographic',orthographicSize:4},1);
 assert.ok(Math.abs(ortho.near[0][0]-ortho.far[0][0])<1e-8);
});
test('Camera frustum follows object rotation and rejects malformed coordinates',()=>{
 const facing=cameraFrustumCorners3d([0,0,0],[0,90,0],defaultEditorCamera3d(),1);
 assert.ok(facing.far.every(p=>p[0]<0),'Positive Y rotation points the camera along -X');
 assert.throws(()=>cameraFrustumCorners3d([0,NaN,0],[0,0,0],{},1));
 const cfg=editorCameraSettings3d({near:99,far:2,fieldOfView:500,previewDistance:-3});
 assert.ok(cfg.far>cfg.near);assert.equal(cfg.fieldOfView,179);assert.equal(cfg.previewDistance,.1);
});
test('Camera editing preserves scene files and does not alter player camera runtime',()=>{
 const inspector=read('js/ui/inspector.js'),ui=read('js/ui/editor-camera-inspector.js'),scene=read('js/core/scene.js');
 const gizmo=read('js/core/gizmos-3d.js'),manifest=JSON.parse(read('runtime-files.json'));
 assert.ok(inspector.includes('renderEditorCameraInspector(root,o)'));
 assert.ok(scene.includes("'cameraRig','cameraView3d','fpsController'"));
 assert.ok(gizmo.includes("data-scene-camera-frustum"));
 assert.ok(ui.includes('Ces valeurs ne pilotent pas encore la caméra du jeu en Play.'));
 for(const file of ['js/core/editor-camera-frustum-3d.js','js/ui/editor-camera-inspector.js','css/editor-camera-frustum.css'])assert.ok(manifest.files.includes(file),file);
 assert.match(read('index.html'),/editor-camera-frustum\.css/);
});
