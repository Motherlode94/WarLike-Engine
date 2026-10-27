import test from 'node:test';
import assert from 'node:assert/strict';
import {stepArcadeVehicle,moveVehicleWithCollision,defaultArcadeTuning} from '../js/core/arcade-driving.js';
import {isDriveable3d,updateDriving3d,driving3d,resetDriving3d} from '../js/core/vehicle-3d.js';
import {readFileSync} from 'node:fs';

test('Throttle progressively accelerates, coasts, then brakes without instant reverse',()=>{
 let state={speed:0,steer:0,rotation:0};
 for(let i=0;i<45;i++)state={...stepArcadeVehicle(state,{throttle:1},1/60)};
 assert.ok(state.speed>70&&state.speed<310);
 const coasting=stepArcadeVehicle(state,{throttle:0},1/60);
 assert.ok(coasting.speed<state.speed&&coasting.speed>0);
 const braking=stepArcadeVehicle(state,{throttle:-1},1/60);
 assert.ok(braking.speed<state.speed&&braking.speed>=0);
});
test('Brake, handbrake, reversing and steering behave consistently',()=>{
 let state={speed:180,steer:0,rotation:0};
 const brake=stepArcadeVehicle(state,{throttle:0,handbrake:true},.1);
 assert.ok(brake.speed<state.speed);
 for(let i=0;i<100;i++)state={...stepArcadeVehicle(state,{throttle:-1,steer:1},1/60)};
 assert.ok(state.speed<0);
 assert.ok(state.speed>=-defaultArcadeTuning().maxSpeed*.45-.01);
 assert.ok(state.rotation<0);
});
test('Swept collision prevents high-speed tunneling',()=>{
 const car={x:0,y:0};
 const result=moveVehicleWithCollision(car,{dx:100,dy:0},(x,y)=>x>=30&&x<45,{maxStep:5});
 assert.equal(result.collision,true);
 assert.ok(car.x<30,'vehicle must stop before wall');
});
test('3D car entry, drive and safe exit reuse same vehicle physics',()=>{
 resetDriving3d();
 const player={id:1,type:'player',x:100,y:100,w:35,h:90,depth3d:32,elevation3d:0,animation:'idle'};
 const vehicle={id:2,type:'mesh3d',x:150,y:110,w:130,h:65,depth3d:75,rotation:0,tags:['race-vehicle'],collision3d:true};
 const actors=[player,vehicle];
 assert.equal(isDriveable3d(vehicle),true);
 assert.equal(updateDriving3d(actors,player,new Set(['e']),1/60),true);
 assert.equal(driving3d.vehicleId,2);
 assert.equal(player._hiddenInVehicle,true);
 for(let i=0;i<20;i++)updateDriving3d(actors,player,new Set(['z']),1/60);
 assert.ok(vehicle.y<110,'forward must move vehicle along negative ground Y');
 assert.equal(player.animation,'drive');
 updateDriving3d(actors,player,new Set(),1/60);
 updateDriving3d(actors,player,new Set(['e']),1/60);
 assert.equal(driving3d.vehicleId,null);
 assert.equal(player._hiddenInVehicle,false);
});
test('3D vehicle selection excludes ordinary scene meshes',()=>{
 const ordinary={id:3,type:'mesh3d',assetId:'missing-id'};
 assert.equal(isDriveable3d(ordinary),false);
});
test('viewport binds vehicle physics and HUD to 3D Play',()=>{
 const source=readFileSync(new URL('../js/core/viewport-3d.js',import.meta.url),'utf8');
 assert.match(source,/updateDriving3d\(state\.entities,p,state\.keys,dt\)/);
 assert.match(source,/if\(!inVehicle\)updateController3d/);
 assert.match(source,/drivingHud\.id='warlikeVehicle3dHud'/);
});
