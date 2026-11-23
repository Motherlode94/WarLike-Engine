import test from 'node:test';import assert from 'node:assert/strict';
import {aircraftPilotInput,releaseAircraftControls,canSafelyExitAircraft} from '../js/core/aircraft-pilot-input.js';
test('airplane throttle latches while pitch, roll and yaw are momentary',()=>{
 const one=aircraftPilotInput('airplane',{},new Set(['w','arrowup','arrowright','d']),.1);
 assert.ok(one.throttle>0&&one.throttle<.1);
 assert.equal(one.pitch,1);assert.equal(one.roll,1);assert.equal(one.yaw,1);
 const idle=aircraftPilotInput('airplane',one,new Set(),.1);
 assert.equal(idle.throttle,one.throttle);assert.equal(idle.pitch,0);
 const neutral=releaseAircraftControls(one);
 assert.equal(neutral.throttle,one.throttle);assert.equal(neutral.yaw,0);
});
test('helicopter uses collective, and negative inputs reduce it with clamps',()=>{
 let p=aircraftPilotInput('helicopter',{collective:.6},new Set(['s','arrowdown','arrowleft','q']),.1);
 assert.ok(p.collective<.6);assert.equal(p.pitch,-1);assert.equal(p.roll,-1);assert.equal(p.yaw,-1);
 for(let i=0;i<100;i++)p=aircraftPilotInput('helicopter',p,new Set(['s']),.1);
 assert.equal(p.collective,0);
 for(let i=0;i<100;i++)p=aircraftPilotInput('helicopter',p,new Set(['z']),.1);
 assert.equal(p.collective,1);
});
test('untrusted timing and unknown kind cannot create invalid input',()=>{
 const r=aircraftPilotInput('airplane',{throttle:1.5},new Set(['w']),Infinity);
 assert.equal(r.throttle,1);assert.ok(Object.values(r).every(Number.isFinite));
 assert.throws(()=>aircraftPilotInput('zeppelin'),/Unknown aircraft/);
});
test('airborne pilot cannot teleport to the ground with Exit',()=>{
 assert.equal(canSafelyExitAircraft({elevation3d:15}),false);
 assert.equal(canSafelyExitAircraft({elevation3d:0}),true);
 assert.equal(canSafelyExitAircraft({elevation3d:2}),true);
});
