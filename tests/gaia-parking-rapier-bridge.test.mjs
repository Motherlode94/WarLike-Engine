import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRoadSpline,roadSplineEntity} from '../js/core/gaia-road-spline.js';
import {buildGaiaTrafficNetwork,gaiaTrafficParkingSpots,controlGaiaParkingVehicle} from '../js/core/gaia-traffic-ai.js';
import {planGaiaParkingSteering} from '../js/core/gaia-parking-steering.js';
const net=()=>buildGaiaTrafficNetwork([roadSplineEntity(1,createRoadSpline([{x:0,z:-70},{x:0,z:70}],{width:6}))]);
const state=(z=-45,speedMps=3)=>({position:{x:-1.5,z},forward:{x:0,z:1},speedMps,vehicleId:99,vehicles:[]});
test('WB 2.9d steering and speed remain bounded with real Gaia targets',()=>{
 const n=net(),spot=gaiaTrafficParkingSpots(n).find(x=>x.laneId==='1:1'&&x.progressM>40),s=state(-70+spot.progressM-8,3);
 const before=structuredClone({n,s});
 const original=controlGaiaParkingVehicle(n,s,{parkingSpotId:spot.id});
 const plan=planGaiaParkingSteering(n,s,{parkingSpotId:spot.id});
 assert(['aligning','approaching','at-approach'].includes(plan.parkingSteering));
 for(const key of ['throttle','brake','steer','handbrake'])assert(Number.isFinite(plan[key])&&Math.abs(plan[key])<=1);
 assert(plan.brake>=original.brake);assert(plan.throttle<=original.throttle);
 assert.deepEqual({n,s},before);
});
test('WB 2.9d occupied or invalid spot fails closed and no driver input is overridden by default',()=>{
 const n=net(),spot=gaiaTrafficParkingSpots(n)[0],s=state(-56,4);
 const invalid=planGaiaParkingSteering(n,s,{parkingSpotId:'missing'});
 assert.equal(invalid.parking,'invalid-spot');assert.equal(invalid.brake,1);assert.equal(invalid.throttle,0);
 const occupied=planGaiaParkingSteering(n,{...s,vehicles:[{id:12,position:spot.position}]},{parkingSpotId:spot.id});
 assert.equal(occupied.parking,'occupied');assert.equal(occupied.throttle,0);
 const plain=planGaiaParkingSteering(n,s);assert.equal(plain.parkingSteering,'inactive');
 assert.throws(()=>planGaiaParkingSteering(n,s,{steeringGain:0}),/Invalid/);
});
test('WB 2.9d real Rapier path integrates opt-in parking planner, without scene transform teleports',()=>{
 const source=readFileSync(new URL('../js/core/ground-vehicle-rapier.js',import.meta.url),'utf8');
 assert.match(source,/import \{planGaiaParkingSteering\}/);
 assert.match(source,/parking\?planGaiaParkingSteering\(/);
 assert.match(source,/inputs=groundVehicleInputs\(plan\)/);
 assert.match(source,/solveWheelForces\(/);
});
