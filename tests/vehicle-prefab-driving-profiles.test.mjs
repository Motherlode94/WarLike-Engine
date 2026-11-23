import test from 'node:test';
import assert from 'node:assert/strict';
import {prefab3d} from '../js/assets/catalog-3d.js';
import {defaultArcadeTuning,stepArcadeVehicle} from '../js/core/arcade-driving.js';

test('native 3D vehicle prefabs inherit their real catalog driving profiles',()=>{
 for(const id of ['vehicle-jeep','vehicle-sports','vehicle-truck','vehicle-tank','vehicle-buggy','vehicle-bike','vehicle-dirtbike','vehicle-tractor','vehicle-forklift','vehicle-bulldozer','vehicle-snowmobile']){
  const vehicle=prefab3d(id,7);
  assert.ok(vehicle,id+' prefab exists');
  assert.equal(vehicle.vehicleConfig?.driveable,true,id+' driveable');
  for(const key of ['maxSpeed','acceleration','turnRate','brakeForce','drag','reverseRatio'])
   assert.ok(Number.isFinite(vehicle[key])&&vehicle[key]>0,id+' valid '+key);
  assert.equal(defaultArcadeTuning(vehicle).maxSpeed,vehicle.maxSpeed,id+' tuning respected');
 }
});
test('native motorcycle and tractor do not silently inherit the same default speed',()=>{
 const motorcycle=prefab3d('vehicle-bike'),tractor=prefab3d('vehicle-tractor');
 assert.ok(motorcycle.maxSpeed>tractor.maxSpeed);
 const fast=stepArcadeVehicle({speed:0,steer:0,rotation:0},{throttle:1,steer:0},.1,motorcycle);
 const slow=stepArcadeVehicle({speed:0,steer:0,rotation:0},{throttle:1,steer:0},.1,tractor);
 assert.ok(fast.speed>slow.speed);
});
test('non-vehicle objects do not inherit vehicle controls',()=>{
 for(const id of ['primitive-cube','building-house','nature-oak']){
  const object=prefab3d(id);
  assert.equal(object?.vehicleConfig,undefined);
  assert.equal(object?.maxSpeed,undefined);
 }
});
