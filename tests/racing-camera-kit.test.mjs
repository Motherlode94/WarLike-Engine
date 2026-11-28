import test from 'node:test';
import assert from 'node:assert/strict';
import {applyAdventureActorKit} from '../js/core/component-definitions.js';
import {cameraRigFor} from '../js/core/play-camera.js';
import {validateGroundVehiclePhysics} from '../js/core/ground-vehicle-rapier.js';
test('racing kit uses valid native chassis and dedicated chase camera',()=>{const o={id:1};assert.ok(applyAdventureActorKit(o,'racing'));assert.deepEqual(validateGroundVehiclePhysics(o.groundVehiclePhysics),[]);assert.equal(cameraRigFor(o,true).distance,7.5);o.cameraRig.distance=12;applyAdventureActorKit(o,'racing');assert.equal(cameraRigFor(o,true).distance,12);});
