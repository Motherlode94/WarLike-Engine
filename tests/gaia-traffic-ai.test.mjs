import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoadSpline,roadSplineEntity} from '../js/core/gaia-road-spline.js';
import {findGaiaRoadJunctions,roadJunctionEntity} from '../js/core/gaia-road-junctions.js';
import {buildGaiaTrafficNetwork,controlGaiaTrafficVehicle,gaiaTrafficLight,gaiaJunctionSignalPositions,setGaiaTrafficSignalSeconds,gaiaTrafficSignalSeconds} from '../js/core/gaia-traffic-ai.js';

const fixture=()=>{
 const a=roadSplineEntity(1,createRoadSpline([{x:0,z:-40},{x:0,z:40}],{width:6}));
 const b=roadSplineEntity(2,createRoadSpline([{x:-40,z:0},{x:40,z:0}],{width:6}));
 const j=roadJunctionEntity(3,findGaiaRoadJunctions([a,b])[0]);
 return {a,b,j};
};
test('WB 2.5 builds two distinct forward/reverse driving lanes from one Gaia road',()=>{
 const {a}=fixture(),before=structuredClone(a),network=buildGaiaTrafficNetwork([a]);
 assert.equal(network.lanes.length,2);
 assert.deepEqual(network.lanes.map(x=>x.id),['1:1','1:-1']);
 assert(network.lanes[0].points[0].x<0,'road direction +Z drives right hand at -X');
 assert(network.lanes[1].points[0].x>0,'reverse direction uses opposite traffic lane');
 assert(network.lanes[0].points[0].z<network.lanes[0].points.at(-1).z);
 assert(network.lanes[1].points[0].z>network.lanes[1].points.at(-1).z);
 assert.deepEqual(a,before,'network construction must not alter existing road');
});
test('WB 2.5 controller follows lane with forward throttle and no reverse forces',()=>{
 const {a}=fixture(),network=buildGaiaTrafficNetwork([a]);
 const forward=controlGaiaTrafficVehicle(network,{position:{x:-1.5,z:-25},forward:{x:0,z:1},speedMps:2});
 assert.equal(forward.roadId,1);
 assert(forward.throttle>0&&forward.brake===0);
 assert(Math.abs(forward.steer)<.2,'straight road should not require a hard turn');
 const reverse=controlGaiaTrafficVehicle(network,{position:{x:1.5,z:25},forward:{x:0,z:-1},speedMps:2});
 assert.equal(reverse.laneId,'1:-1');
 assert(reverse.throttle>0&&Math.abs(reverse.steer)<.2);
 assert(forward.throttle>=0&&reverse.throttle>=0,'traffic should not drive backwards to follow a lane');
});
test('junction signals stop conflicting approaches with an all-red clearance',()=>{
 const {a,b,j}=fixture(),n=buildGaiaTrafficNetwork([a,b,j]);
 assert.equal(n.junctions.length,1);
 const s=j.roadJunction3d;
 assert.equal(gaiaTrafficLight(s,1,3),'green');
 assert.equal(gaiaTrafficLight(s,2,3),'red');
 assert.equal(gaiaTrafficLight(s,1,14),'red');
 assert.equal(gaiaTrafficLight(s,2,14),'red');
 assert.equal(gaiaTrafficLight(s,1,20),'red');
 assert.equal(gaiaTrafficLight(s,2,20),'green');
});
test('red light reduces target speed and stops a vehicle on its approach',()=>{
 const {a,b,j}=fixture(),network=buildGaiaTrafficNetwork([a,b,j]);
 const inputs={position:{x:-1.5,z:-13},forward:{x:0,z:1},speedMps:6};
 const green=controlGaiaTrafficVehicle(network,{...inputs,seconds:3});
 const red=controlGaiaTrafficVehicle(network,{...inputs,seconds:20});
 assert.equal(green.roadId,1);assert.equal(red.roadId,1);
 assert(red.targetSpeedMps<green.targetSpeedMps,'red light should reduce allowed speed');
 assert(red.brake>0);
});
test('vehicles in front create a safety gap without touching actual vehicle transform',()=>{
 const {a}=fixture(),network=buildGaiaTrafficNetwork([a]);
 const vehicle={id:7,position:{x:-1.5,z:-15}};
 const state={position:{x:-1.5,z:-21},forward:{x:0,z:1},speedMps:5,vehicleId:8};
 const before=structuredClone({vehicle,state});
 const free=controlGaiaTrafficVehicle(network,state);
 const blocked=controlGaiaTrafficVehicle(network,{...state,vehicles:[vehicle]});
 assert(blocked.targetSpeedMps<free.targetSpeedMps);
 assert(blocked.brake>0);
 assert.deepEqual({vehicle,state},before);
});
test('network and controller fail safe if no road is available or vehicle is off road',()=>{
 const n=buildGaiaTrafficNetwork([]);
 const result=controlGaiaTrafficVehicle(n,{position:{x:0,z:0},forward:{x:0,z:-1}});
 assert.equal(result.status,'off-road');assert.equal(result.brake,1);
 const {a}=fixture(),network=buildGaiaTrafficNetwork([a]);
 const distant=controlGaiaTrafficVehicle(network,{position:{x:400,z:400},forward:{x:0,z:-1}});
 assert.equal(distant.throttle,0);assert.equal(distant.brake,1);
});
test('road network survives save/reopen without changing the lane geometry',()=>{
 const {a,b,j}=fixture(),all=[a,b,j];
 const before=buildGaiaTrafficNetwork(all);
 const after=buildGaiaTrafficNetwork(JSON.parse(JSON.stringify(all)));
 assert.deepEqual(after,before);
});

test('WB 2.8a road signal meshes use the same legal phases as autonomous driving',()=>{
 const {a,b,j}=fixture(),junction=j.roadJunction3d;
 for(const seconds of [0,3,14,20,29]){
  const signals=gaiaJunctionSignalPositions(junction,[a,b],seconds);
  assert.equal(signals.length,4,'two signals per incoming road');
  assert(signals.every(s=>Number.isFinite(s.x)&&Number.isFinite(s.z)));
  for(const signal of signals){
   assert.equal(signal.color,gaiaTrafficLight(junction,signal.roadId,seconds));
  }
 }
 assert.deepEqual(gaiaJunctionSignalPositions(junction,[a,b],14).map(s=>s.color),
  ['red','red','red','red'],'all-red clearance must illuminate red for every approach');
});
test('WB 2.8a signal layout does not mutate authored Gaia roads or junctions',()=>{
 const {a,b,j}=fixture(),snapshot=structuredClone([a,b,j]);
 const first=gaiaJunctionSignalPositions(j.roadJunction3d,[a,b],3);
 const after=gaiaJunctionSignalPositions(JSON.parse(JSON.stringify(j.roadJunction3d)),
  JSON.parse(JSON.stringify([a,b])),3);
 assert.deepEqual(first,after);
 assert.deepEqual([a,b,j],snapshot);
 setGaiaTrafficSignalSeconds(20);
 assert.equal(gaiaTrafficSignalSeconds(),20);
 assert(gaiaJunctionSignalPositions(j.roadJunction3d,[a,b]).some(s=>s.color==='green'));
 setGaiaTrafficSignalSeconds(0);
});
