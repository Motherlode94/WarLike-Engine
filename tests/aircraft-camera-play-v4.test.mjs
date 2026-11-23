import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {playerModules} from '../js/core/player-modules.js';
import {aircraftCameraView,defaultAircraftCamera} from '../js/core/aircraft-camera.js';
import {canonicalScene,runtimeEntities} from '../js/core/scene-contract.js';
const source=readFileSync(new URL('../js/core/viewport-3d.js',import.meta.url),'utf8');
test('Cockpit and external chase cameras are actually connected to the Play renderer',()=>{
 assert.match(source,/aircraftCameraView\(vehicle,/);
 assert.match(source,/aircraftViewMode=nextAircraftCameraMode\(aircraftViewMode\)/);
 assert.match(source,/aircraftFlightInstruments\(aircraft\)/);
 assert.match(source,/warlikeAircraft3dHud/);
 assert.match(source,/aircraftHud\.hidden=true/);
});
test('Aircraft camera and instruments are part of the standalone Web Player closure',()=>{
 const files=JSON.parse(readFileSync(new URL('../runtime-files.json',import.meta.url),'utf8')).files;
 assert.ok(playerModules.includes('js/core/aircraft-camera.js'));
 assert.ok(files.includes('js/core/aircraft-camera.js'));
 assert.ok(!playerModules.includes('js/editor.js'));
});
test('Cockpit retains real bank rather than horizon locking',()=>{
 const e={id:7,type:'mesh3d',x:0,y:0,w:128,h:64,depth3d:256,elevation3d:2,
  aircraftPhysics:{enabled:true,kind:'airplane'},rotation:0,rotationX3d:0,rotationZ3d:35,aircraftCamera:{...defaultAircraftCamera(),mode:'cockpit'}};
 const camera=aircraftCameraView(e);
 assert.equal(camera.mode,'cockpit');assert.ok(Math.abs(camera.right[1])>.2);
 const restored=runtimeEntities(canonicalScene([e]))[0];
 assert.deepEqual(restored.aircraftCamera,e.aircraftCamera);
});
