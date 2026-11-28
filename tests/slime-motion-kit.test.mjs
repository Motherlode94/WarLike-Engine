import test from 'node:test';
import assert from 'node:assert/strict';
import {applyAdventureActorKit} from '../js/core/component-definitions.js';
import {cameraRigFor} from '../js/core/play-camera.js';
test('slime native kit has adventure movement and camera defaults without overwriting user edits',()=>{const o={id:1};assert.ok(applyAdventureActorKit(o,'slime'));assert.equal(o.controller3d.walkSpeed,3);assert.equal(o.controller3d.sprintSpeed,5);assert.equal(cameraRigFor(o).distance,4.2);assert.equal(cameraRigFor(o).mode,'thirdPerson');o.controller3d.walkSpeed=8;o.cameraRig.distance=9;applyAdventureActorKit(o,'slime');assert.equal(o.controller3d.walkSpeed,8);assert.equal(cameraRigFor(o).distance,9);});
