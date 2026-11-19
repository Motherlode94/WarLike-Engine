import test from 'node:test';
import assert from 'node:assert/strict';
import {runPhysicsStress} from '../scripts/physics-stress-report.mjs';
import {createPhysicsValidationScene} from '../js/core/physics-validation-scene.js';
test('108 real Rapier bodies remain finite above the floor with matching editor/export trajectories',async()=>{
 const report=await runPhysicsStress({bodies:108,steps:600});
 assert.equal(report.passed,true,JSON.stringify(report));assert.equal(report.invalidSamples,0);
 assert.ok(report.maxEditorExportDelta<.001);assert.ok(report.minElevation>-.1);
});
test('the reproducible stress scene is editable and rejects unbounded allocations',()=>{
 const a=createPhysicsValidationScene(),b=createPhysicsValidationScene();assert.deepEqual(a,b);
 assert.equal(a.entities.filter(o=>o.rigidbody3d).length,108);
 assert.equal(new Set(a.entities.map(o=>o.id)).size,a.entities.length);
 assert.throws(()=>createPhysicsValidationScene({bodies:10000}),/512/);
});
