import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRoadSpline,roadSplineEntity} from '../js/core/gaia-road-spline.js';
import {buildGaiaTrafficNetwork,gaiaTrafficParkingSpots} from '../js/core/gaia-traffic-ai.js';
import {evaluateGaiaParkingRuntime,commitGaiaParkingSeatAction} from '../js/core/ground-vehicle-rapier.js';
const network=()=>buildGaiaTrafficNetwork([roadSplineEntity(1,createRoadSpline([{x:0,z:-70},{x:0,z:70}],{width:6}))]);
test('WB 2.9f a game runtime can obtain finite physical wheel controls with no editor services',()=>{
 const n=network(),spot=gaiaTrafficParkingSpots(n).find(x=>x.laneId==='1:1'&&x.progressM>40);
 const state={vehicleId:99,position:{x:-1.5,z:-70+spot.progressM-9},forward:{x:0,z:1},speedMps:4,vehicles:[]};
 const snapshot=structuredClone({n,state});
 const plan=evaluateGaiaParkingRuntime(n,state,{parkingSpotId:spot.id});
 assert(['approaching','stopped'].includes(plan.status));
 for(const name of ['throttle','steer','brake','handbrake'])assert(Number.isFinite(plan.inputs[name])&&Math.abs(plan.inputs[name])<=1);
 assert.deepEqual({n,state},snapshot);
 assert.deepEqual(JSON.parse(JSON.stringify(plan)),plan);
});
test('WB 2.9f seat commands produce explicit events, maintain passenger state and reject unsafe entries',()=>{
 const n=network(),spot=gaiaTrafficParkingSpots(n)[0];
 const vehicle={id:99,position:spot.position,speedMps:0,
  vehicleSystems:{seats:{capacity:4,driverId:null}}};
 const actor={id:27,position:{x:spot.position.x+.5,z:spot.position.z}};
 const before=structuredClone(vehicle);
 const entered=commitGaiaParkingSeatAction(vehicle,actor,spot,'enter');
 assert.equal(entered.allowed,true);assert.equal(entered.event,'vehicle:driver-enter');
 assert.equal(entered.vehicle.vehicleSystems.seats.driverId,27);
 assert.deepEqual(vehicle,before);
 const refused=commitGaiaParkingSeatAction(entered.vehicle,{id:28,position:actor.position},spot,'enter');
 assert.equal(refused.allowed,false);assert.equal(refused.reason,'driver-occupied');
 const exit=commitGaiaParkingSeatAction(entered.vehicle,actor,spot,'exit');
 assert.equal(exit.allowed,true);assert.equal(exit.vehicle.vehicleSystems.seats.driverId,null);
 const moving=commitGaiaParkingSeatAction({...vehicle,speedMps:3},actor,spot,'enter');
 assert.equal(moving.allowed,false);assert.equal(moving.reason,'vehicle-moving');
});
test('WB 2.9f export manifest source and runtime dependency chain include parking modules',()=>{
 const entry=readFileSync(new URL('../js/core/ground-vehicle-rapier.js',import.meta.url),'utf8');
 assert.match(entry,/export \{evaluateGaiaParkingRuntime,commitGaiaParkingSeatAction\}/);
 const runtime=readFileSync(new URL('../js/core/gaia-parking-runtime.js',import.meta.url),'utf8');
 assert.match(runtime,/from '\.\/gaia-vehicle-seat-interactions\.js'/);
 assert.match(runtime,/from '\.\/gaia-parking-steering\.js'/);
 const build=readFileSync(new URL('../scripts/build-player-manifest.mjs',import.meta.url),'utf8');
 assert(build.includes('game-build-player.js'));
});
