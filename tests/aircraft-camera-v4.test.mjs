import test from 'node:test';import assert from 'node:assert/strict';
import {defaultAircraftCamera,aircraftCameraSettings,aircraftCameraView,aircraftFlightInstruments,nextAircraftCameraMode} from '../js/core/aircraft-camera.js';
import {canonicalScene,runtimeEntities} from '../js/core/scene-contract.js';
const make=()=>({id:7,x:64,y:128,w:128,h:64,depth3d:256,elevation3d:120,rotation:0,rotationX3d:0,rotationZ3d:0,
 aircraftPhysics:{kind:'airplane',enabled:true},rigidbody3d:{vx:128,vy:3,vz:-256},
 aircraftInput:{throttle:.8},aircraftCamera:defaultAircraftCamera()});
test('aircraft cockpit aligns with its true forward direction, chase stays behind',()=>{
 const plane=make(),cockpit=aircraftCameraView(plane,{mode:'cockpit'}),chase=aircraftCameraView(plane);
 assert.ok(cockpit.forward[2]<-.99);
 assert.ok(chase.eye[2]>cockpit.eye[2]);
 assert.equal(chase.mode,'chase');
 assert.equal(nextAircraftCameraMode('chase'),'cockpit');
 assert.equal(nextAircraftCameraMode('cockpit'),'chase');
});
test('aircraft camera follows body bank/pitch and never produces NaN',()=>{
 const e=make();e.rotation=40;e.rotationX3d=25;e.rotationZ3d=-30;
 for(const mode of ['chase','cockpit']){
  const pose=aircraftCameraView(e,{mode});
  for(const k of ['eye','forward','right','up'])assert.ok(pose[k].every(Number.isFinite));
  assert.ok(Math.abs(Math.hypot(...pose.forward)-1)<1e-9);
 }
 assert.equal(aircraftCameraView({},{}),null);
});
test('speed, altitude, vertical speed and throttle use authored 3D units',()=>{
 const e=make(),i=aircraftFlightInstruments(e);
 assert.equal(i.altitudeMeters,120);assert.equal(i.verticalSpeedMs,3);
 assert.ok(i.speedKmh>17&&i.speedKmh<20);assert.equal(i.powerPercent,80);
 e.aircraftPhysics.kind='helicopter';e.aircraftInput.collective=.55;
 assert.equal(aircraftFlightInstruments(e).powerPercent,55);
});
test('camera settings clamp unsafe values and persist through canonical scene',()=>{
 const e=make();e.aircraftCamera={mode:'cockpit',distance:999,height:-2,cockpitForward:2};
 const restored=runtimeEntities(canonicalScene([e]))[0];
 assert.deepEqual(restored.aircraftCamera,e.aircraftCamera);
 assert.equal(aircraftCameraSettings(restored).distance,35);
 assert.equal(aircraftCameraSettings(restored).mode,'cockpit');
});
