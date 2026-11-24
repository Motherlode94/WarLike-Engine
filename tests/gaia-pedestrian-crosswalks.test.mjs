import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoadSpline,roadSplineEntity} from '../js/core/gaia-road-spline.js';
import {findGaiaRoadJunctions,roadJunctionEntity} from '../js/core/gaia-road-junctions.js';
import {buildGaiaTrafficNetwork,controlGaiaTrafficVehicle} from '../js/core/gaia-traffic-ai.js';
import {buildGaiaPedestrianCrosswalks,gaiaPedestrianYieldClearance} from '../js/core/gaia-pedestrian-crosswalks.js';
const fixture=()=>{
 const a=roadSplineEntity(1,createRoadSpline([{x:0,z:-40},{x:0,z:40}],{width:6}));
 const b=roadSplineEntity(2,createRoadSpline([{x:-40,z:0},{x:40,z:0}],{width:6}));
 const j=roadJunctionEntity(3,findGaiaRoadJunctions([a,b])[0]);
 return [a,b,j];
};
test('WB 2.8b reconstructs footprints from the saved Gaia roads',()=>{
 const entities=fixture(),snapshot=structuredClone(entities);
 const first=buildGaiaPedestrianCrosswalks(entities);
 assert.equal(first.length,4);
 assert(first.every(c=>Number.isFinite(c.center.x)&&Number.isFinite(c.center.z)));
 assert.deepEqual(buildGaiaPedestrianCrosswalks(JSON.parse(JSON.stringify(entities))),first);
 assert.deepEqual(entities,snapshot);
});
test('WB 2.8b approaching AI yields when a pedestrian is inside its crossing',()=>{
 const network=buildGaiaTrafficNetwork(fixture());
 const crossing=network.crosswalks.find(c=>c.roadId===1&&c.center.z<0);
 assert(crossing);
 const driving={position:{x:-1.5,z:crossing.center.z-10},forward:{x:0,z:1},speedMps:6,seconds:3};
 const clear=controlGaiaTrafficVehicle(network,driving);
 const blocked=controlGaiaTrafficVehicle(network,{...driving,
  pedestrians:[{id:17,position:{...crossing.center}}]});
 assert(blocked.targetSpeedMps<clear.targetSpeedMps);
 assert(blocked.brake>0);
 const clearance=gaiaPedestrianYieldClearance(network.crosswalks,[{position:crossing.center}],
  {roadId:1,position:driving.position,forward:driving.forward});
 assert(Number.isFinite(clearance));
});
test('WB 2.8b ignores distant sidewalks and unrelated roads',()=>{
 const network=buildGaiaTrafficNetwork(fixture());
 const crossing=network.crosswalks.find(c=>c.roadId===1&&c.center.z<0);
 const approach={position:{x:-1.5,z:crossing.center.z-10},forward:{x:0,z:1},speedMps:6,seconds:3};
 const free=controlGaiaTrafficVehicle(network,approach);
 const outside=controlGaiaTrafficVehicle(network,{...approach,pedestrians:[{
  position:{x:crossing.center.x+20,z:crossing.center.z}
 }]});
 assert.equal(outside.targetSpeedMps,free.targetSpeedMps);
 assert.equal(gaiaPedestrianYieldClearance(network.crosswalks,[{position:crossing.center}],{
  roadId:999,position:approach.position,forward:approach.forward}),Infinity);
});
