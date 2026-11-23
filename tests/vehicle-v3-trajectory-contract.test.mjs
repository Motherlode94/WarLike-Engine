import test from 'node:test';
import assert from 'node:assert/strict';
import {vehicleDefaults} from '../js/core/vehicle.js';
import {stepArcadeVehicle} from '../js/core/arcade-driving.js';
import {updateDriving3d,resetDriving3d,driving3d} from '../js/core/vehicle-3d.js';

test('2D preserves authored reverse ratio and steering/traction tuning',()=>{
 const tuned={vehicleController:{enabled:true,maxSpeed:200,acceleration:100,brakeForce:220,turnRate:90,drag:1,collisionRadius:20,reverseRatio:.2,traction:.5,steeringResponse:2}};
 const cfg=vehicleDefaults(tuned);
 assert.equal(cfg.reverseRatio,.2);assert.equal(cfg.traction,.5);assert.equal(cfg.steeringResponse,2);
 let s={speed:0,steer:0,rotation:0};
 for(let i=0;i<120;i++)s=stepArcadeVehicle(s,{throttle:-1,steer:1},1/60,cfg);
 assert.ok(s.speed<0&&s.speed>=-40.001,'reverse speed obeys authored ratio');
 const normal=stepArcadeVehicle({speed:100,steer:0,rotation:0},{throttle:0,steer:1},.1);
 const reduced=stepArcadeVehicle({speed:100,steer:0,rotation:0},{throttle:0,steer:1},.1,cfg);
 assert.ok(reduced.steer<normal.steer,'steering response must be honored');
});
test('3D Rapier animation distinguishes reverse, forward and lateral slip',()=>{
 const player={id:1,x:100,y:100,w:32,h:64,depth3d:32,elevation3d:0};
 const car={id:2,type:'mesh3d',x:110,y:110,w:120,h:64,depth3d:150,elevation3d:0,
   groundVehiclePhysics:{enabled:true},groundVehicleMotion:{signedSpeed:-120},
   rigidbody3d:{vx:0,vz:120},vehicleController:{enabled:true}};
 const entities=[player,car];resetDriving3d();
 try{
  updateDriving3d(entities,player,new Set(['e']),1/60);
  assert.equal(driving3d.vehicleId,car.id);
  updateDriving3d(entities,player,new Set(),1/60);
  assert.equal(car.animation,'reverse');
  car.groundVehicleMotion.signedSpeed=120;
  updateDriving3d(entities,player,new Set(),1/60);
  assert.equal(car.animation,'drive');
  car.groundVehicleMotion.signedSpeed=0;
  updateDriving3d(entities,player,new Set(),1/60);
  assert.equal(car.animation,'idle');
 }finally{resetDriving3d()}
});
