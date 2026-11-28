import test from 'node:test';
import assert from 'node:assert/strict';
import {applyAdventureActorKit} from '../js/core/component-definitions.js';
test('slime kit assembles native components without resetting existing configuration',()=>{const o={id:1};assert.equal(applyAdventureActorKit(o,'slime'),true);assert.equal(o.playable3d,true);assert.ok(o.controller3d&&o.collider3d&&o.stats&&o.inventory&&o.rpgProgression&&o.cameraRig&&o.animatorGraph);o.controller3d.walkSpeed=3;assert.equal(applyAdventureActorKit(o,'slime'),true);assert.equal(o.controller3d.walkSpeed,3);});
test('racing kit assembles dynamic vehicle and camera',()=>{const o={id:2};assert.equal(applyAdventureActorKit(o,'racing'),true);assert.ok(o.groundVehiclePhysics&&o.vehicleController&&o.collider3d&&o.cameraRig);assert.equal(o.rigidbody3d.kinematic,false);assert.equal(o.rigidbody3d.mass,o.groundVehiclePhysics.mass);});
test('unsupported mode or kit does not mutate scene object',()=>{const o={id:3};assert.equal(applyAdventureActorKit(o,'slime','2d'),false);assert.equal(applyAdventureActorKit(o,'unknown'),false);assert.deepEqual(o,{id:3});});
