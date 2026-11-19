import test from 'node:test';
import assert from 'node:assert/strict';
import {createProductionValidationScene} from '../js/core/production-validation-scene.js';
import {prepareGameDefinition} from '../js/core/game-build.js';
import {freshGameProject} from '../js/core/game-project.js';
import {inspectRuntimeCompatibility} from '../js/core/runtime-capabilities.js';
test('production lab contains editable physical bodies, GGX materials and a portable humanoid/mask example',()=>{
 const demo=createProductionValidationScene(),before=structuredClone(demo.entities);
 assert.equal(demo.entities.filter(o=>o.rigidbody3d).length,108);
 assert.equal(demo.entities.filter(o=>o.hierarchyGroup==='Reflets GGX').length,6);
 const avatar=demo.entities.find(o=>o.animationRig?.avatar);assert.ok(avatar);assert.equal(avatar.animatorGraph.layers[0].avatarMask,'upperBody');
 assert.deepEqual(inspectRuntimeCompatibility(demo.entities),[]);
 const exported=prepareGameDefinition({entities:demo.entities,mode:'3d',project:{...freshGameProject(),physics3d:'rapier'}});
 assert.deepEqual(exported.project.scenes[0].entities,demo.entities);assert.deepEqual(demo.entities,before);
 assert.throws(()=>createProductionValidationScene('2d'),/3D/);
});
