import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultWheelPhysics,solveWheelForces} from '../js/core/vehicle-wheel-physics.js';
import {defaultGroundVehiclePhysics,applyGroundVehicleForces} from '../js/core/ground-vehicle-rapier.js';

const wheel=defaultWheelPhysics();
const contact={distance:.55,normal:{x:0,y:1,z:0},point:{x:0,y:-.55,z:0}};
const stationary={velocity:{x:0,y:0,z:0},angularVelocity:{x:0,y:0,z:0},
  forward:{x:0,y:0,z:-1},centerOfMass:{x:0,y:0,z:0}};
const solve=(args={})=>solveWheelForces({wheel,contact,state:stationary,dt:1/60,effectiveMass:362.5,...args});

test('lateral tire force opposes drift on a forward-aligned car',()=>{
 const sliding=solve({state:{...stationary,velocity:{x:2,y:0,z:0}}});
 assert.ok(sliding.force.x<0,'rightwards slide must produce leftwards friction');
 assert.ok(Math.abs(sliding.force.z)<1e-9,'side slip must not generate forward thrust');
 const reverse=solve({state:{...stationary,velocity:{x:-2,y:0,z:0}}});
 assert.ok(reverse.force.x>0,'leftwards slide must produce rightwards friction');
});
test('stationary wheel does not generate any lateral force',()=>{
 const still=solve();
 assert.ok(Math.abs(still.force.x)<1e-10);
 assert.ok(Math.abs(still.force.z)<1e-10);
});
test('fixed step and mass determine unsaturated lateral correction',()=>{
 const slow={...wheel,grip:100};
 const low=solve({wheel:slow,state:{...stationary,velocity:{x:.01,y:0,z:0}},effectiveMass:100,dt:1/30});
 const high=solve({wheel:slow,state:{...stationary,velocity:{x:.01,y:0,z:0}},effectiveMass:100,dt:1/60});
 assert.ok(Math.abs(high.force.x)>Math.abs(low.force.x)*1.99);
 const heavy=solve({wheel:slow,state:{...stationary,velocity:{x:.01,y:0,z:0}},effectiveMass:200,dt:1/30});
 assert.ok(Math.abs(heavy.force.x)>Math.abs(low.force.x)*1.99);
});
test('sideways friction cannot exceed available grip',()=>{
 const slick={...wheel,grip:.15};
 const result=solve({wheel:slick,state:{...stationary,velocity:{x:30,y:0,z:-10}},inputs:{throttle:1},driveForce:1e7,effectiveMass:2000});
 assert.ok(Math.hypot(result.force.x,result.force.z)<=result.normalForce*slick.grip+1e-6);
});
test('no wheel contact produces zero lateral force regardless of velocity',()=>{
 const result=solve({contact:null,state:{...stationary,velocity:{x:50,y:0,z:0}}});
 assert.equal(result.grounded,false);
 assert.deepEqual(result.force,{x:0,y:0,z:0});
});
test('ground Rapier adapter supplies wheel mass share to the lateral solver',()=>{
 const config=defaultGroundVehiclePhysics('car'), impulses=[];
 const body={rotation:()=>({x:0,y:0,z:0,w:1}),translation:()=>({x:0,y:1,z:0}),
  linvel:()=>({x:.01,y:0,z:0}),angvel:()=>({x:0,y:0,z:0}),
  applyImpulseAtPoint:(impulse)=>impulses.push(impulse)};
 const scene={api:{Ray:class{constructor(origin,direction){Object.assign(this,{origin,direction})}},
  QueryFilterFlags:{EXCLUDE_SENSORS:8}},
  world:{castRayAndGetNormal:()=>({timeOfImpact:.55,normal:{x:0,y:1,z:0}})},
  actors:new Map([[1,{body,isDynamic:true,entity:{id:1,rigidbody3d:{lockRotations:false},groundVehiclePhysics:config}}]])};
 const result=applyGroundVehicleForces(scene,1/60);
 assert.equal(result[0].contacts,4);
 assert.equal(impulses.length,4);
 assert.ok(impulses.every(i=>i.x<0),'all four grounded tires must counter sideways slide');
});
