import test from 'node:test';import assert from 'node:assert/strict';
import {defaultGroundVehiclePhysics,validateGroundVehiclePhysics,groundVehicleInputs,wheelDriveInput,applyGroundVehicleForces} from '../js/core/ground-vehicle-rapier.js';
test('car, truck and tracked profiles have 4, 6 and 12 wheels and sane configs',()=>{
 for(const [kind,count] of [['car',4],['truck',6],['tracked',12]]){
  const c=defaultGroundVehiclePhysics(kind);assert.equal(c.wheels.length,count);assert.deepEqual(validateGroundVehiclePhysics(c),[]);
 }
 assert.throws(()=>defaultGroundVehiclePhysics('boat'),/unknown/);
});
test('input bounds and differential steering',()=>{
 const c=defaultGroundVehiclePhysics('tracked'),i=groundVehicleInputs({throttle:0,steer:1.8,brake:-2});
 assert.equal(i.steer,1);assert.equal(i.brake,0);
 assert.equal(wheelDriveInput(c,c.wheels[0],i),1);assert.equal(wheelDriveInput(c,c.wheels[1],i),-1);
});
test('no contact produces no impulses',()=>{
 const calls=[],body={rotation:()=>({x:0,y:0,z:0,w:1}),translation:()=>({x:0,y:1,z:0}),linvel:()=>({x:0,y:0,z:0}),angvel:()=>({x:0,y:0,z:0}),applyImpulseAtPoint:(...args)=>calls.push(args)};
 const scene={api:{Ray:class{constructor(origin,direction){Object.assign(this,{origin,direction})}},QueryFilterFlags:{EXCLUDE_SENSORS:8}},world:{castRayAndGetNormal:()=>null},actors:new Map([[1,{body,entity:{id:1,rigidbody3d:{lockRotations:false},groundVehiclePhysics:defaultGroundVehiclePhysics()},isDynamic:true}]])};
 const result=applyGroundVehicleForces(scene,1/60);assert.equal(result[0].contacts,0);assert.equal(calls.length,0);
});
test('real contact applies suspension force impulses at contact points',()=>{
 const calls=[];const body={rotation:()=>({x:0,y:0,z:0,w:1}),translation:()=>({x:0,y:1,z:0}),linvel:()=>({x:0,y:0,z:0}),angvel:()=>({x:0,y:0,z:0}),applyImpulseAtPoint:(...args)=>calls.push(args)};
 const scene={api:{Ray:class{constructor(origin,direction){Object.assign(this,{origin,direction})}},QueryFilterFlags:{EXCLUDE_SENSORS:8}},world:{castRayAndGetNormal:()=>({timeOfImpact:.55,normal:{x:0,y:1,z:0}})},actors:new Map([[1,{body,entity:{id:1,rigidbody3d:{lockRotations:false},groundVehiclePhysics:defaultGroundVehiclePhysics()},isDynamic:true}]])};
 const result=applyGroundVehicleForces(scene,1/60);assert.equal(result[0].contacts,4);assert.equal(calls.length,4);
 for(const [impulse,point,wake] of calls){assert.ok(impulse.y>0);assert.ok(Number.isFinite(point.x));assert.equal(wake,true);}
});
test('disabled, invalid and locked chassis do not modify physics',()=>{
 const ground=defaultGroundVehiclePhysics();const body={applyImpulseAtPoint:()=>{throw Error('unexpected')}};
 const base={api:{Ray:class{}},world:{castRayAndGetNormal:()=>null}};
 const make=(config,locked=false)=>({...base,actors:new Map([[1,{isDynamic:true,entity:{id:1,groundVehiclePhysics:config,rigidbody3d:{lockRotations:locked}},body}]])});
 assert.deepEqual(applyGroundVehicleForces(make({...ground,enabled:false}),.01),[]);
 assert.ok(applyGroundVehicleForces(make({...ground,mass:-1}),.01)[0].error);
 assert.ok(applyGroundVehicleForces(make(ground,true),.01)[0].error);
});
