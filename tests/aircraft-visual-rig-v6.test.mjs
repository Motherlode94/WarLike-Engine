import test from 'node:test';import assert from 'node:assert/strict';
import {aircraftRigPose} from '../js/core/aircraft-visual-rig.js';
import {defaultAircraftSystems} from '../js/core/aircraft-systems.js';
test('Aircraft V6 rig animation requires actual unambiguous GLB nodes',()=>{
 const systems=defaultAircraftSystems();
 const rig={nodes:[{name:'Rotor',rotation:[0,0,0,1]},{name:'Flap',rotation:[0,0,0,1]}]};
 const entity={aircraftSystems:systems};
 assert.equal(aircraftRigPose(rig,entity),null);
 systems.parts={rotor:'Missing'};assert.equal(aircraftRigPose(rig,entity),null);
 systems.parts.rotor='Rotor';systems.rotor.angle=90;
 const pose=aircraftRigPose(rig,entity);assert.ok(pose);
});
