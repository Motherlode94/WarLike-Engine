import test from 'node:test';import assert from 'node:assert/strict';
import {defaultAirplanePhysics,defaultHelicopterPhysics} from '../js/core/aircraft-flight-physics.js';
import {isDriveable3d,updateDriving3d,driving3d,resetDriving3d} from '../js/core/vehicle-3d.js';
import {canonicalScene,runtimeEntities} from '../js/core/scene-contract.js';
const pilot=()=>({id:1,type:'player',playable3d:true,x:0,y:0,w:32,h:96,depth3d:32,elevation3d:0});
const airframe=(kind)=>({id:2,name:'Aircraft',type:'mesh3d',x:45,y:15,w:196,h:70,depth3d:260,elevation3d:0,
 aircraftPhysics:{...(kind==='helicopter'?defaultHelicopterPhysics():defaultAirplanePhysics()),enabled:true},
 collider3d:{enabled:true},rigidbody3d:{enabled:true,vx:0,vy:0,vz:0},collision3d:true});
const update=(entities,player,keys)=>updateDriving3d(entities,player,new Set(keys),.1);
test('airplane enters with E; controls fly in Rapier without arcade translations',()=>{
 resetDriving3d();const p=pilot(),a=airframe('airplane'),entities=[p,a];
 const old={x:a.x,y:a.y};
 assert.equal(isDriveable3d(a),true);
 assert.equal(update(entities,p,['e']),true);assert.equal(driving3d.vehicleId,a.id);
 for(let i=0;i<4;i++)update(entities,p,['w','arrowup','arrowright','d']);
 assert.ok(a.aircraftInput.throttle>0);
 assert.equal(a.aircraftInput.pitch,1);assert.equal(a.aircraftInput.roll,1);assert.equal(a.aircraftInput.yaw,1);
 assert.deepEqual({x:a.x,y:a.y},old,'Rapier owns the aircraft pose');
 update(entities,p,[]);
 assert.equal(a.aircraftInput.pitch,0);assert.equal(a.aircraftInput.roll,0);
 update(entities,p,['e']);
 assert.equal(driving3d.vehicleId,null);assert.equal(a.aircraftInput.yaw,0);
 resetDriving3d();
});
test('helicopter collective responds to pilot and persists through scene serialization',()=>{
 resetDriving3d();const p=pilot(),h=airframe('helicopter'),entities=[p,h];
 update(entities,p,['e']);update(entities,p,[]);
 for(let i=0;i<3;i++)update(entities,p,['z','arrowup','q']);
 assert.ok(h.aircraftInput.collective>0);assert.equal(h.aircraftInput.yaw,-1);
 const restored=runtimeEntities(canonicalScene(entities)).find(x=>x.id===2);
 assert.deepEqual(restored.aircraftInput,h.aircraftInput);
 assert.equal(restored.aircraftPhysics.kind,'helicopter');resetDriving3d();
});
test('cannot exit aircraft while airborne and E key remains edge-triggered',()=>{
 resetDriving3d();const p=pilot(),a=airframe('airplane'),entities=[p,a];
 update(entities,p,['e']);update(entities,p,[]);
 a.elevation3d=15;update(entities,p,['e']);
 assert.equal(driving3d.vehicleId,a.id);
 update(entities,p,['e']);assert.equal(driving3d.vehicleId,a.id);
 update(entities,p,[]);a.elevation3d=0;
 update(entities,p,['e']);assert.equal(driving3d.vehicleId,null);
 resetDriving3d();
});
