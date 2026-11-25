import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cameraHandoffStep} from '../js/core/play-camera.js';
const near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('Gaia WB 2.9g.3 blends a player-to-vehicle target and zoom without an instant cut',()=>{
 const pose=cameraHandoffStep([0,1,0],[12,3,6],4.8,7.5,1/60,{sharpness:10});
 assert(pose.target[0]>0&&pose.target[0]<12);
 assert(pose.target[1]>1&&pose.target[1]<3);
 assert(pose.distance>4.8&&pose.distance<7.5);
 assert.deepEqual(cameraHandoffStep([0,1,0],[12,3,6],4.8,7.5,1/60,{sharpness:10}),pose);
});
test('Gaia WB 2.9g.3 scene resets still snap, while zero delta stays unchanged',()=>{
 const snap=cameraHandoffStep([0,0,0],[8,2,4],4.8,7.5,.016,{snap:true});
 assert.deepEqual(snap,{target:[8,2,4],distance:7.5});
 const still=cameraHandoffStep([0,0,0],[8,2,4],4.8,7.5,0);
 assert.deepEqual(still,{target:[0,0,0],distance:4.8});
 assert.throws(()=>cameraHandoffStep([NaN,0,0],[0,0,0],4,5,.1),/Invalid/);
});
test('Gaia WB 2.9g.3 retains free mouse look when a vehicle is active',()=>{
 const source=readFileSync(new URL('../js/core/viewport-3d.js',import.meta.url),'utf8');
 assert.match(source,/cameraHandoffStep\(view3d\.target,pt,view3d\.radius,rig\.distance/);
 assert.match(source,/currentVehicle3d\(state\.entities\)\|\|playableActor\(state\.entities\)/);
 assert.match(source,/if\(cameraHandoffRemaining>0\)/);
 assert.match(source,/const activeVehicle=currentVehicle3d\(state\.entities\)/);
});
