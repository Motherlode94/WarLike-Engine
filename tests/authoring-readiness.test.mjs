import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeModelReadiness,analyzeComponentReadiness,inspectGameObjectAuthoring} from '../js/core/authoring-readiness.js';
import {readFileSync} from 'node:fs';
test('GLB diagnostic reports actual surfaces, materials and missing animation, without inventing clips',()=>{
 const result=analyzeModelReadiness({parts:[{vertices:new Float32Array(18)}],triangleCount:1,normalizationScale:1,normalizedSize:[1,1,1],materialWarnings:['Texture externe introuvable'],rig:null});
 assert.equal(result.usableMesh,true);
 assert.equal(result.triangles,1);
 assert.equal(result.clips.length,0);
 assert(result.issues.some(x=>x.category==='Matériaux'));
 assert(result.issues.some(x=>x.category==='Animation'));
});
test('humanoid audit identifies an incomplete skeleton instead of treating it as playable',()=>{
 const rig={nodes:[{name:'Hips',children:[]}],parents:new Int32Array([-1]),skins:[{joints:[0]}],animations:[]};
 const result=analyzeModelReadiness({parts:[{}],triangleCount:12,normalizationScale:1,rig});
 assert.equal(result.validHumanoid,false);
 assert(result.humanoidMapped<result.humanoidRequired);
 assert(result.issues.some(x=>x.category==='Avatar humanoïde'));
});
test('model reference errors and component compatibility are actionable',async()=>{
 const obj={id:41,name:'Ma création',type:'mesh3d',model3dId:'missing-user-glb',animatorGraph:{states:[]}};
 const result=await inspectGameObjectAuthoring(obj,{mode:'3d'});
 assert.equal(result.name,'Ma création');
 assert(result.errors>0);
 assert(result.issues.some(x=>x.message.includes('Référence de modèle introuvable')));
 const components=analyzeComponentReadiness({controller3d:{},inputActions:{}},'2d');
 assert(components.issues.some(x=>x.message.includes('controller3d')));
});
test('Inspector exposes manual audit without changing scenes or adding demos',()=>{
 const src=readFileSync(new URL('../js/ui/inspector.js',import.meta.url),'utf8');
 assert.match(src,/mountAuthoringAudit\(root,o\)/);
 assert.match(src,/inspectGameObjectAuthoring\(object/);
 assert.match(src,/Analyser le GameObject/);
});
