import test from 'node:test';
import assert from 'node:assert/strict';
import {vehicleComponents,canDriveVehicle,tickVehicleSystems,impactVehicle,repairVehicle,refuelVehicle,setVehicleEngine,setVehicleGear,vehicleSnapshot} from '../js/core/vehicle-components.js';

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

test('automatic gear and odometer reflect movement',()=>{
 const car={maxSpeed:200};
 tickVehicleSystems(car,.1,{speed:150,throttle:1});
 const status=vehicleSnapshot(car);
 assert.ok(status.gear>=3);
 assert.ok(status.distance>0);
});
test('manual gear and engine toggle are configurable',()=>{
 const car={vehicleSystems:{transmission:{mode:'manual',gear:0,gears:6}}};
 assert.equal(setVehicleGear(car,-1),true);
 assert.equal(setVehicleGear(car,9),false);
 setVehicleEngine(car,false);
 assert.equal(canDriveVehicle(car),false);
 setVehicleEngine(car,true);
 assert.equal(canDriveVehicle(car),true);
});
