import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {updateDriving3d,driving3d,resetDriving3d} from '../js/core/vehicle-3d.js';
import {gaiaSafeDriverExit} from '../js/core/gaia-parking-runtime.js';

const player=()=>({id:7,type:'player',x:100,y:100,w:35,h:90,depth3d:32,
 elevation3d:0,animation:'idle'});
const car=()=>({id:9,name:'Gaia certification vehicle',type:'mesh3d',
 x:150,y:110,w:130,h:65,depth3d:75,elevation3d:0,rotation:0,
 groundVehiclePhysics:{enabled:true},groundVehicleMotion:{signedSpeed:0},
 vehicleSystems:{seats:{capacity:4,driverId:null,transition:{
  enabled:true,enterSeconds:.2,exitSeconds:.2,enterClip:'get-in',exitClip:'get-out'
 }},engine:{enabled:true,health:100,maxHealth:100}}});
const update=(entities,actor,keys=[],dt=.1)=>
 updateDriving3d(entities,actor,new Set(keys),dt);

test('WB 2.9g.5: actual Play entry animates before seating, then transfers Rapier controls',()=>{
 resetDriving3d();
 try{
  const p=player(),v=car(),entities=[p,v];
  assert.equal(update(entities,p,['e']),true);
  assert.equal(driving3d.vehicleId,v.id);
  assert.equal(v.vehicleSystems.seats.driverId,p.id);
  assert.equal(driving3d.transition?.action,'enter');
  assert.equal(p.x,100,'no first-frame seat teleport');
  assert.equal(p._hiddenInVehicle,undefined);
  update(entities,p,[]);
  assert.equal(p.animation,'get-in');
  assert.equal(p._hiddenInVehicle,false);
  update(entities,p,[]);
  assert.equal(driving3d.transition,null);
  assert.equal(p._hiddenInVehicle,true);
  assert.equal(p.animation,'drive');
  update(entities,p,['w']);
  assert.equal(v.groundVehicleInput.throttle,1);
  assert.equal(v.groundVehicleInput.steer,0);
 }finally{resetDriving3d()}
});
test('WB 2.9g.5: moving obstacle cancels animated exit, then player can exit safely',()=>{
 resetDriving3d();
 try{
  const p=player(),v=car(),entities=[p,v];
  update(entities,p,['e']);update(entities,p,[]);update(entities,p,[]);
  assert.equal(driving3d.transition,null);
  const exit=gaiaSafeDriverExit(v,p,{canPlace:()=>true});
  assert.equal(exit.side,'left');
  update(entities,p,['e']);
  assert.equal(driving3d.transition?.action,'exit');
  const wall={id:50,type:'object',x:exit.x,y:exit.y,w:p.w,h:p.h,depth3d:p.depth3d,elevation3d:0,collision3d:true};
  entities.push(wall);
  update(entities,p,[]);
  update(entities,p,[]);
  assert.equal(driving3d.vehicleId,v.id,'driver stays in vehicle if exit becomes blocked');
  assert.equal(v.vehicleSystems.seats.driverId,p.id);
  assert.equal(p._hiddenInVehicle,true);
  assert.equal(driving3d.transition,null);
  entities.pop();
  update(entities,p,['e']);
  assert.equal(driving3d.transition?.action,'exit');
  update(entities,p,[]);
  update(entities,p,[]);
  assert.equal(driving3d.vehicleId,null);
  assert.equal(v.vehicleSystems.seats.driverId,null);
  assert.equal(p._hiddenInVehicle,false);
  assert.equal(p.animation,'idle');
  assert.deepEqual(v.groundVehicleInput,{throttle:0,steer:0,brake:0,handbrake:0});
 }finally{resetDriving3d()}
});
test('WB 2.9g.5: Player export retains Gaia parking and seat modules',()=>{
 const playerModules=readFileSync(new URL('../js/core/player-modules.js',import.meta.url),'utf8');
 const files=readFileSync(new URL('../runtime-files.json',import.meta.url),'utf8');
 for(const name of ['gaia-parking-runtime.js','gaia-parking-steering.js','gaia-vehicle-seat-interactions.js']){
  assert(playerModules.includes(name),`Player closure missing ${name}`);
  assert(files.includes(name),`Web runtime manifest missing ${name}`);
 }
});
