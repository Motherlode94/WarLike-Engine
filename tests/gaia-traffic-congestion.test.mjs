import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoadSpline,roadSplineEntity} from '../js/core/gaia-road-spline.js';
import {findGaiaRoadJunctions,roadJunctionEntity} from '../js/core/gaia-road-junctions.js';
import {buildGaiaTrafficNetwork,controlGaiaTrafficVehicle,gaiaTrafficLaneDensity,controlGaiaCongestedTrafficVehicle} from '../js/core/gaia-traffic-ai.js';
const road=()=>roadSplineEntity(1,createRoadSpline([{x:0,z:-60},{x:0,z:60}],{width:6}));
const scene=()=>{
 const a=road(),b=roadSplineEntity(2,createRoadSpline([{x:-60,z:0},{x:60,z:0}],{width:6}));
 return [a,b,roadJunctionEntity(3,findGaiaRoadJunctions([a,b])[0])];
};
const fixture=()=>buildGaiaTrafficNetwork([road()]);
test('WB 2.9a lane density counts exact direction without mutating vehicles or network',()=>{
 const net=fixture(),vehicles=Array.from({length:12},(_,id)=>({id,laneId:'1:1',position:{x:-1.5,z:-48+id*8},speedMps:id%3?0:3}));
 const before=structuredClone({net,vehicles});
 const dense=gaiaTrafficLaneDensity(net,vehicles);
 assert.equal(dense.length,2);
 assert.equal(dense[0].vehicles,12);assert.equal(dense[1].vehicles,0);
 assert.equal(dense[0].queued,8);
 assert(dense[0].occupiedRatio>.45&&dense[0].occupiedRatio<.55);
 assert.equal(dense[1].vehiclesPerKm,0);
 assert.deepEqual({net,vehicles},before);
 assert.deepEqual(gaiaTrafficLaneDensity(JSON.parse(JSON.stringify(net)),JSON.parse(JSON.stringify(vehicles))),dense);
});
test('WB 2.9a congestion reduces throttle and target speed but never overrides red light or brake',()=>{
 const net=fixture(),state={position:{x:-1.5,z:-52},forward:{x:0,z:1},speedMps:7,vehicleId:50,maxSpeedMps:12};
 const normal=controlGaiaTrafficVehicle(net,state);
 const empty=controlGaiaCongestedTrafficVehicle(net,state);
 assert.equal(empty.targetSpeedMps,normal.targetSpeedMps);
 const vehicles=Array.from({length:15},(_,i)=>({id:i,position:{x:-1.5,z:-20+i*4.4},laneId:'1:1',speedMps:.2}));
 const dense=controlGaiaCongestedTrafficVehicle(net,{...state,vehicles});
 const legacy=controlGaiaTrafficVehicle(net,{...state,vehicles});
 assert(dense.targetSpeedMps<=legacy.targetSpeedMps);
 assert(dense.brake>=legacy.brake);
 assert(dense.throttle<=legacy.throttle);
 assert(dense.laneOccupancy>.5);
 assert.equal(dense.congestion,'dense');
 for(const field of ['throttle','steer','brake','handbrake'])assert(Number.isFinite(dense[field])&&Math.abs(dense[field])<=1);
});
test('WB 2.9a an off-road car fails safe and stationary queues cannot force acceleration',()=>{
 const net=fixture(),off=controlGaiaCongestedTrafficVehicle(net,{position:{x:500,z:500},forward:{x:0,z:1},speedMps:6,vehicles:[]});
 assert.equal(off.status,'off-road');assert.equal(off.brake,1);
 const jam=Array.from({length:18},(_,i)=>({id:i,laneId:'1:1',position:{x:-1.5,z:-56+i*6},speedMps:0}));
 const stopped=controlGaiaCongestedTrafficVehicle(net,{position:{x:-1.5,z:-58},forward:{x:0,z:1},speedMps:0,vehicleId:99,vehicles:jam});
 assert(stopped.targetSpeedMps>=0);
 assert(stopped.throttle>=0&&stopped.throttle<=1);
 assert(stopped.brake>=0&&stopped.brake<=1);
 assert.throws(()=>gaiaTrafficLaneDensity(net,null),/Invalid/);
});
test('WB 2.9a congestion never increases a red-light limit at urban junctions',()=>{
 const net=buildGaiaTrafficNetwork(scene()),state={position:{x:-1.5,z:-14},forward:{x:0,z:1},speedMps:6,seconds:20,vehicleId:99};
 const red=controlGaiaTrafficVehicle(net,state);
 const controlled=controlGaiaCongestedTrafficVehicle(net,{...state,vehicles:[]});
 assert(controlled.targetSpeedMps<=red.targetSpeedMps);
 assert(controlled.brake>=red.brake);
});
