import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gaiaDriverSeatAccess} from '../js/core/gaia-driver-handoff.js';

const vehicle=driverId=>({id:31,vehicleSystems:{seats:{capacity:4,driverId}}});
test('WB 2.9g reserves the driver seat without changing the original vehicle',()=>{
 const v=vehicle(null),snapshot=structuredClone(v);
 assert.deepEqual(gaiaDriverSeatAccess(v,7,'enter'),{allowed:true,reason:'ready'});
 assert.deepEqual(v,snapshot);
 assert.equal(gaiaDriverSeatAccess(vehicle(8),7,'enter').reason,'driver-occupied');
 assert.equal(gaiaDriverSeatAccess(vehicle(7),7,'enter').allowed,true);
});
test('WB 2.9g prevents unauthorized exit and invalid transitions',()=>{
 assert.equal(gaiaDriverSeatAccess(vehicle(8),7,'exit').reason,'not-driver');
 assert.equal(gaiaDriverSeatAccess(vehicle(null),7,'exit').allowed,false);
 assert.equal(gaiaDriverSeatAccess(vehicle(7),7,'exit').allowed,true);
 assert.equal(gaiaDriverSeatAccess(null,7,'enter').allowed,false);
 assert.equal(gaiaDriverSeatAccess(vehicle(null),null,'enter').allowed,false);
 assert.equal(gaiaDriverSeatAccess(vehicle(null),7,'teleport').allowed,false);
});
test('WB 2.9g guards the existing 3D player/vehicle handoff, not a parallel controller',()=>{
 const source=readFileSync(new URL('../js/core/vehicle-3d.js',import.meta.url),'utf8');
 assert.match(source,/gaiaDriverSeatAccess\(car,player\?\.id,'exit'\)/);
 assert.match(source,/gaiaDriverSeatAccess\(nearest\.o,player\.id,'enter'\)/);
 assert.match(source,/drivingCar\.groundVehicleInput=\{throttle,steer,brake,handbrake/);
});
