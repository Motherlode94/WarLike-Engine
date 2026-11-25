import test from 'node:test';
import assert from 'node:assert/strict';
import {planGaiaVehicleSeatTransition,applyGaiaVehicleSeatTransition} from '../js/core/gaia-vehicle-seat-interactions.js';
const spot={id:'spot1',position:{x:10,z:10}};
const vehicle=(driverId=null,speedMps=0)=>({id:21,position:{x:10,z:10},speedMps,
 vehicleSystems:{seats:{capacity:4,driverId},engine:{enabled:true}}});
const actor={id:17,position:{x:11,z:10}};
test('WB 2.9e enter/exit is a deterministic transaction and retains all vehicle state',()=>{
 const original=vehicle(),snapshot=structuredClone(original);
 const enter=planGaiaVehicleSeatTransition({spot,actor,vehicle:original,action:'enter'});
 assert.equal(enter.allowed,true);assert.equal(enter.nextDriverId,17);
 const occupied=applyGaiaVehicleSeatTransition(original,enter);
 assert.equal(occupied.vehicleSystems.seats.driverId,17);
 assert.equal(occupied.vehicleSystems.seats.capacity,4);
 assert.deepEqual(original,snapshot);
 const exit=planGaiaVehicleSeatTransition({spot,actor,vehicle:occupied,action:'exit'});
 assert.equal(exit.allowed,true);
 assert.equal(applyGaiaVehicleSeatTransition(occupied,exit).vehicleSystems.seats.driverId,null);
 assert.equal(occupied.vehicleSystems.seats.driverId,17);
});
test('WB 2.9e rejects moving vehicles, distant actors, other drivers and stale commits',()=>{
 const moving=planGaiaVehicleSeatTransition({spot,actor,vehicle:vehicle(null,3)});
 assert.equal(moving.allowed,false);assert.equal(moving.reason,'vehicle-moving');
 const distant=planGaiaVehicleSeatTransition({spot,actor:{id:17,position:{x:100,z:100}},vehicle:vehicle()});
 assert.equal(distant.allowed,false);assert.equal(distant.reason,'out-of-range');
 const taken=planGaiaVehicleSeatTransition({spot,actor,vehicle:vehicle(88)});
 assert.equal(taken.reason,'driver-occupied');
 const notDriver=planGaiaVehicleSeatTransition({spot,actor,vehicle:vehicle(88),action:'exit'});
 assert.equal(notDriver.reason,'not-driver');
 const valid=planGaiaVehicleSeatTransition({spot,actor,vehicle:vehicle()});
 assert.throws(()=>applyGaiaVehicleSeatTransition(vehicle(88),valid),/changed/);
 assert.throws(()=>applyGaiaVehicleSeatTransition(vehicle(),{...valid,vehicleId:99}),/Invalid/);
});
test('WB 2.9e decision survives project JSON and never silently takes control of AI chassis',()=>{
 const v=vehicle(),decision=planGaiaVehicleSeatTransition({spot,actor,vehicle:v});
 assert.deepEqual(JSON.parse(JSON.stringify(decision)),decision);
 const copy=applyGaiaVehicleSeatTransition(v,decision);
 assert.equal(copy.vehicleSystems.seats.driverId,actor.id);
 assert.equal(v.vehicleSystems.seats.driverId,null);
});
