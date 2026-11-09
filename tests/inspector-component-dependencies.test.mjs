import test from 'node:test';
import assert from 'node:assert/strict';
import {componentRemovalBlockers,removeObjectComponent,inspectorComponentGroup} from '../js/core/component-definitions.js';

test('Inspector groups physics and extension components through stable IDs',()=>{
 assert.equal(inspectorComponentGroup('collider3d'),'physics');
 assert.equal(inspectorComponentGroup('cameraRig'),'render');
 assert.equal(inspectorComponentGroup('stats'),'extension');
 assert.equal(inspectorComponentGroup('inventory'),'extension');
});

test('Collider 3D cannot be deleted while a dependent physics component uses it',()=>{
 const object={collider3d:{enabled:true},rigidbody3d:{mass:1}};
 assert.deepEqual(componentRemovalBlockers(object,'collider3d'),['rigidbody3d']);
 assert.equal(removeObjectComponent(object,'collider3d'),false);
 assert.ok(object.collider3d);
 delete object.rigidbody3d;
 assert.equal(removeObjectComponent(object,'collider3d'),true);
 assert.equal(object.collider3d,undefined);
});

test('Joint requires its Rigidbody and Collider until removed',()=>{
 const object={collider3d:{enabled:true},rigidbody3d:{mass:1},joint3d:{kind:'hinge'}};
 assert.equal(removeObjectComponent(object,'rigidbody3d'),false);
 assert.equal(removeObjectComponent(object,'collider3d'),false);
 assert.equal(removeObjectComponent(object,'joint3d'),true);
 assert.equal(removeObjectComponent(object,'rigidbody3d'),true);
 assert.equal(removeObjectComponent(object,'collider3d'),true);
});

test('Collider 2D can be removed independently from Rigidbody 2D',()=>{
 const object={collider2d:{enabled:true},rigidbody2d:{enabled:true}};
 assert.equal(removeObjectComponent(object,'collider2d'),true);
 assert.ok(object.rigidbody2d);
 assert.equal(removeObjectComponent(object,'rigidbody2d'),true);
});
