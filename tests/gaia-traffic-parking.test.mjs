import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoadSpline,roadSplineEntity} from '../js/core/gaia-road-spline.js';
import {findGaiaRoadJunctions,roadJunctionEntity} from '../js/core/gaia-road-junctions.js';
import {buildGaiaTrafficNetwork,controlGaiaStopGoTrafficVehicle,gaiaTrafficParkingSpots,gaiaTrafficParkingOccupancy,controlGaiaParkingVehicle,gaiaVehicleParkingInteraction} from '../js/core/gaia-traffic-ai.js';

const road=()=>roadSplineEntity(1,createRoadSpline([{x:0,z:-70},{x:0,z:70}],{width:6}));
const network=()=>buildGaiaTrafficNetwork([road()]);
const car=(position,speedMps=0,id=33)=>({id,position,speedMps,laneId:'1:1'});
const driving=(z,speedMps=4,vehicles=[])=>({vehicleId:99,position:{x:-1.5,z},
 forward:{x:0,z:1},speedMps,vehicles,maxSpeedMps:10});

test('WB 2.9c curb spots derive from the authoritative Gaia road and persist across JSON roundtrip',()=>{
 const entity=road(),before=structuredClone(entity),net=buildGaiaTrafficNetwork([entity]);
 const spots=gaiaTrafficParkingSpots(net,{spacingM:14});
 assert(spots.length>6);
 assert.equal(new Set(spots.map(s=>s.id)).size,spots.length);
 assert(spots.every(s=>s.laneId&&Number.isFinite(s.position.x)&&Number.isFinite(s.position.z)));
 assert(spots.some(s=>s.laneId==='1:1'&&s.position.x<-1.5));
 assert(spots.some(s=>s.laneId==='1:-1'&&s.position.x>1.5));
 assert.deepEqual(entity,before);
 assert.deepEqual(gaiaTrafficParkingSpots(buildGaiaTrafficNetwork(JSON.parse(JSON.stringify([entity])))),gaiaTrafficParkingSpots(net));
});

test('WB 2.9c intersections do not generate parking spaces inside junction clearances',()=>{
 const a=road(),b=roadSplineEntity(2,createRoadSpline([{x:-70,z:0},{x:70,z:0}],{width:6}));
 const j=roadJunctionEntity(3,findGaiaRoadJunctions([a,b])[0]),net=buildGaiaTrafficNetwork([a,b,j]);
 const spots=gaiaTrafficParkingSpots(net);
 assert(spots.length>0);
 assert(spots.every(s=>Math.hypot(s.approach.x-j.roadJunction3d.center.x,s.approach.z-j.roadJunction3d.center.z)>=j.roadJunction3d.radius+12-1e-8));
});

test('WB 2.9c occupancy reports parked vehicles without mutating the source and rejects collisions',()=>{
 const net=network(),spot=gaiaTrafficParkingSpots(net)[0];
 const parked=car({...spot.position},0,50),snapshot=structuredClone({net,parked});
 const occupied=gaiaTrafficParkingOccupancy([spot],[parked]);
 assert.equal(occupied[0].occupiedBy,50);assert.equal(occupied[0].available,false);
 assert.equal(gaiaTrafficParkingOccupancy([spot],[])[0].available,true);
 assert.deepEqual({net,parked},snapshot);
 const blocked=controlGaiaParkingVehicle(net,driving(-55,3,[parked]),{parkingSpotId:spot.id});
 assert.equal(blocked.parking,'occupied');assert.equal(blocked.brake,1);assert.equal(blocked.throttle,0);
});

test('WB 2.9c stopping at a target never increases existing traffic speed or reduces brake',()=>{
 const net=network(),spot=gaiaTrafficParkingSpots(net).find(s=>s.laneId==='1:1'&&s.progressM>25);
 assert(spot);
 const state=driving(-70+spot.progressM-9,5);
 const baseline=controlGaiaStopGoTrafficVehicle(net,state);
 const plan=controlGaiaParkingVehicle(net,state,{parkingSpotId:spot.id});
 assert.equal(plan.parking,'approaching');
 assert(plan.targetSpeedMps<=baseline.targetSpeedMps);
 assert(plan.brake>=baseline.brake);
 assert(plan.throttle<=baseline.throttle);
 const stopped=controlGaiaParkingVehicle(net,driving(-70+spot.progressM-1.5,0),{parkingSpotId:spot.id});
 assert.equal(stopped.parking,'stopped');
 assert.equal(stopped.status,'parked');assert.equal(stopped.handbrake,1);assert.equal(stopped.throttle,0);
 assert.equal(stopped.brake,1);
});

test('WB 2.9c off-road, invalid, wrong-lane and moving-vehicle interactions fail closed',()=>{
 const net=network(),spot=gaiaTrafficParkingSpots(net).find(s=>s.laneId==='1:1');
 const missing=controlGaiaParkingVehicle(net,driving(-50),{parkingSpotId:'missing'});
 assert.equal(missing.parking,'invalid-spot');assert.equal(missing.brake,1);
 const wrong=controlGaiaParkingVehicle(net,{...driving(-45),position:{x:1.5,z:-45},forward:{x:0,z:-1}},
  {parkingSpotId:spot.id});
 assert.equal(wrong.parking,'wrong-lane');assert.equal(wrong.throttle,0);
 const off=controlGaiaParkingVehicle(net,{...driving(-45),position:{x:300,z:300}},{parkingSpotId:spot.id});
 assert.equal(off.throttle,0);assert.equal(off.brake,1);
 const vehicle=car({...spot.position},0);
 const near={position:{x:spot.position.x+1,z:spot.position.z}};
 assert.equal(gaiaVehicleParkingInteraction(spot,near,vehicle).allowed,true);
 assert.equal(gaiaVehicleParkingInteraction(spot,near,{...vehicle,speedMps:4}).reason,'vehicle-moving');
 assert.equal(gaiaVehicleParkingInteraction(spot,{position:{x:500,z:500}},vehicle).reason,'out-of-range');
 assert.equal(gaiaVehicleParkingInteraction(spot,near,{...vehicle,position:{x:80,z:80}}).reason,'not-parked');
 assert.equal(gaiaVehicleParkingInteraction(spot,near,vehicle,{action:'exit'}).allowed,true);
 assert.throws(()=>gaiaVehicleParkingInteraction(spot,near,vehicle,{action:'drive'}),/Invalid/);
 assert.throws(()=>gaiaTrafficParkingSpots(net,{spacingM:0}),/Invalid/);
});
