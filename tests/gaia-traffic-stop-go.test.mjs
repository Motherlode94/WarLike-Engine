import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoadSpline,roadSplineEntity} from '../js/core/gaia-road-spline.js';
import {findGaiaRoadJunctions,roadJunctionEntity} from '../js/core/gaia-road-junctions.js';
import {buildGaiaTrafficNetwork,controlGaiaCongestedTrafficVehicle,controlGaiaStopGoTrafficVehicle} from '../js/core/gaia-traffic-ai.js';
const straight=()=>roadSplineEntity(1,createRoadSpline([{x:0,z:-60},{x:0,z:60}],{width:6}));
const network=()=>buildGaiaTrafficNetwork([straight()]);
const car=(z,speedMps=0,id=1)=>({id,position:{x:-1.5,z},laneId:'1:1',speedMps});
const driving=(vehicles=[],speedMps=4)=>({vehicleId:99,position:{x:-1.5,z:-45},forward:{x:0,z:1},speedMps,vehicles,maxSpeedMps:12});
test('WB 2.9b smooth acceleration starts gently without weakening baseline safety limits',()=>{
 const net=network(),state=driving([],0),base=controlGaiaCongestedTrafficVehicle(net,state);
 const first=controlGaiaStopGoTrafficVehicle(net,state,{deltaSeconds:.1,previousTargetSpeedMps:0,maxAccelerationMps2:2});
 const second=controlGaiaStopGoTrafficVehicle(net,state,{deltaSeconds:.1,previousTargetSpeedMps:first.nextTargetSpeedMps,maxAccelerationMps2:2});
 assert(first.targetSpeedMps>0&&first.targetSpeedMps<=.2+1e-9);
 assert(second.targetSpeedMps<=.4+1e-9&&second.targetSpeedMps>=first.targetSpeedMps);
 assert(first.targetSpeedMps<=base.targetSpeedMps);
 assert.equal(first.brake,0);
 assert.deepEqual(first,controlGaiaStopGoTrafficVehicle(net,state,{deltaSeconds:.1,previousTargetSpeedMps:0,maxAccelerationMps2:2}));
});
test('WB 2.9b queue safety keeps brake priority and never asks acceleration into a stopped leader',()=>{
 const net=network(),state=driving([car(-38,0),car(-24,0,2)],7);
 const base=controlGaiaCongestedTrafficVehicle(net,state);
 const plan=controlGaiaStopGoTrafficVehicle(net,state,{previousTargetSpeedMps:8,deltaSeconds:.1});
 assert.equal(plan.stopGo,'queued');
 assert(plan.leaderGapM<=standstillOrZero());
 assert.equal(plan.throttle,0);
 assert(plan.brake>=base.brake);
 assert(plan.targetSpeedMps<=base.targetSpeedMps);
 for(const key of ['throttle','steer','brake','handbrake'])assert(Number.isFinite(plan[key])&&Math.abs(plan[key])<=1);
});
const standstillOrZero=()=>5;
test('WB 2.9b same-lane leader only, no wrong-way traffic hijacking',()=>{
 const net=network(),state=driving([car(-38,0,1),{...car(-37,0,2),laneId:'1:-1',position:{x:1.5,z:-37}}],4);
 const plan=controlGaiaStopGoTrafficVehicle(net,state);
 assert(plan.leaderGapM!==null);
 const opposite=controlGaiaStopGoTrafficVehicle(net,driving([{...car(-37,0),position:{x:1.5,z:-37},laneId:'1:-1'}],4));
 assert.equal(opposite.leaderGapM,null);
});
test('WB 2.9b red signal and off-road retain existing hard braking',()=>{
 const a=straight(),b=roadSplineEntity(2,createRoadSpline([{x:-60,z:0},{x:60,z:0}],{width:6}));
 const junction=roadJunctionEntity(3,findGaiaRoadJunctions([a,b])[0]),net=buildGaiaTrafficNetwork([a,b,junction]);
 const state={position:{x:-1.5,z:-14},forward:{x:0,z:1},speedMps:7,seconds:20,vehicleId:99};
 const baseline=controlGaiaCongestedTrafficVehicle(net,state);
 const plan=controlGaiaStopGoTrafficVehicle(net,state);
 assert(plan.brake>=baseline.brake);
 assert(plan.targetSpeedMps<=baseline.targetSpeedMps);
 const off=controlGaiaStopGoTrafficVehicle(net,{position:{x:500,z:500},forward:{x:0,z:1},speedMps:4});
 assert.equal(off.status,'off-road');assert.equal(off.brake,1);assert.equal(off.throttle,0);
});
test('WB 2.9b options reject unsafe timestep and settings; inputs stay immutable and JSON-compatible',()=>{
 const net=network(),state=driving([car(-30,1)],3),snapshot=structuredClone({net,state});
 for(const opts of [{deltaSeconds:0},{deltaSeconds:2},{reactionSeconds:-1},{standstillGapM:-1},{comfortableBrakeMps2:0},{maxAccelerationMps2:0}])
  assert.throws(()=>controlGaiaStopGoTrafficVehicle(net,state,opts),/Invalid stop-and-go/);
 const result=controlGaiaStopGoTrafficVehicle(net,state);
 assert.deepEqual({net,state},snapshot);
 assert.deepEqual(JSON.parse(JSON.stringify(result)),result);
});
