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
