import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectProject} from '../js/core/project-diagnostics.js';

test('valid game scene is eligible for scene export but not standalone build',()=>{
 const result=inspectProject({type:'3d',entities:[{id:1,type:'player',x:0,y:0,w:32,h:64}]});
 assert.equal(result.summary.errors,0);
 assert.equal(result.summary.readyForSceneExport,true);
 assert.equal(result.summary.readyForStandaloneBuild,false);
});
test('invalid objects, duplicate ids and missing resources are reported',()=>{
 const result=inspectProject({type:'3d',entities:[{id:1,type:'player',x:0,y:0,w:32,h:64,modelId:'not-found'},{id:1,x:'NaN',y:10,w:0,h:10}],assetLookup:()=>null});
 assert.ok(result.issues.some(i=>i.code==='ID_DUPLICATE'));
 assert.ok(result.issues.some(i=>i.code==='POSITION_INVALID'));
 assert.ok(result.issues.some(i=>i.code==='ASSET_MISSING'));
 assert.equal(result.summary.readyForSceneExport,false);
});

test('WarLike 3D prefab assetId is resolved against real catalog',()=>{
 const entity={id:11,type:'mesh3d',assetId:'vehicle-jeep',x:0,y:0,w:100,h:55,elevation3d:0};
 const result=inspectProject({type:'3d',entities:[entity],assetLookup:id=>id==='vehicle-jeep'?{name:'Jeep',shape:'car'}:null});
 assert.equal(result.issues.some(i=>i.code==='ASSET_MISSING'),false);
});
test('missing model3dId and broken heights prevent exporting scene',()=>{
 const result=inspectProject({type:'3d',entities:[{id:8,type:'mesh3d',assetId:'vehicle-jeep',model3dId:'missing-glb',x:5,y:6,w:90,h:100,elevation3d:NaN}],assetLookup:id=>id==='vehicle-jeep'?{name:'Jeep'}:null});
 assert.equal(result.summary.readyForSceneExport,false);
 assert.ok(result.issues.some(i=>i.code==='ASSET_MISSING'));
 assert.ok(result.issues.some(i=>i.code==='ELEVATION_INVALID'));
});
