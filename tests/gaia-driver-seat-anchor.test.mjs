import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gaiaDriverSeatPose,placeGaiaDriverAtSeat} from '../js/core/gaia-parking-runtime.js';

const actor=()=>({id:7,w:16,h:24,depth3d:24,x:-99,y:-99,elevation3d:-5});
const vehicle=()=>({id:9,x:100,y:200,w:80,h:96,depth3d:96,rotation:0,elevation3d:2,
 vehicleSystems:{seats:{capacity:4,driverId:7}}});
test('WB 2.9g.2 defaults to existing vehicle-center placement without changing the vehicle',()=>{
 const v=vehicle(),p=actor(),before=structuredClone(v);
 const pose=gaiaDriverSeatPose(v,p);
 assert.deepEqual(pose,{x:132,y:236,elevation3d:2});
 assert.deepEqual(v,before);
 assert.deepEqual(JSON.parse(JSON.stringify(pose)),pose);
 placeGaiaDriverAtSeat(v,p);
 assert.equal(p.x,132);assert.equal(p.y,236);
 assert.equal(p._hiddenInVehicle,true);assert.equal(p.animation,'drive');
});
test('WB 2.9g.2 supports author-defined driver anchors rotated with the chassis',()=>{
 const v=vehicle(),p=actor();
 v.vehicleSystems.seats.driverAnchor={x:12,y:4,elevation3d:1.5};
 assert.deepEqual(gaiaDriverSeatPose(v,p),{x:144,y:240,elevation3d:3.5});
 v.rotation=90;
 const pose=gaiaDriverSeatPose(v,p);
 assert(Math.abs(pose.x-128)<1e-9);
 assert(Math.abs(pose.y-248)<1e-9);
 assert.equal(pose.elevation3d,3.5);
});
test('WB 2.9g.2 placement is shared by enter, aircraft, Rapier and arcade runtime',()=>{
 const source=readFileSync(new URL('../js/core/vehicle-3d.js',import.meta.url),'utf8');
 // WB 2.9g.2b adds a fifth call when the authored entry transition finishes.
 assert.ok(source.split('placeGaiaDriverAtSeat(').length-1>=5);
 assert.match(source,/transition.action==='exit'&&!canExitAt/);
 assert.match(source,/gaiaDriverSeatAccess\(nearest\.o,player\.id,'enter'\)/);
 assert.match(source,/gaiaDriverSeatAccess\(car,player\?\.id,'exit'\)/);
 assert.match(source,/drivingCar\.groundVehicleInput=\{throttle,steer,brake,handbrake/);
});
