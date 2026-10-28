import test from 'node:test';
import assert from 'node:assert/strict';
import {vehicleComponents,canDriveVehicle,tickVehicleSystems,impactVehicle,repairVehicle,refuelVehicle} from '../js/core/vehicle-components.js';

test('default vehicle stays driveable without mandatory fuel',()=>{
 const car={};const systems=vehicleComponents(car);
 assert.equal(systems.seats.capacity,2);
 assert.equal(canDriveVehicle(car),true);
});
test('fuel-enabled vehicle consumes fuel and stops when empty',()=>{
 const car={vehicleSystems:{fuel:{enabled:true,capacity:10,amount:1,burnPerSecond:1}}};
 tickVehicleSystems(car,.1,{speed:10,throttle:1});
 assert.ok(car.vehicleSystems.fuel.amount<1);
 car.vehicleSystems.fuel.amount=0;
 assert.equal(canDriveVehicle(car),false);
 refuelVehicle(car,5);
 assert.equal(canDriveVehicle(car),true);
});
test('collision damage disables and repair re-enables engine',()=>{
 const car={vehicleSystems:{engine:{enabled:true,health:2,maxHealth:100},damage:{collisionScale:1,disabledAtZero:true}}};
 const impact=impactVehicle(car,80);
 assert.equal(impact.disabled,true);
 assert.equal(canDriveVehicle(car),false);
 repairVehicle(car,30);
 assert.equal(canDriveVehicle(car),true);
});
