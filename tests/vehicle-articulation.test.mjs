import test from 'node:test';
import assert from 'node:assert/strict';
import {vehicleConfiguration,tickVehicleArticulation,vehicleRigPose} from '../js/core/vehicle-articulation.js';
import {isDriveable3d} from '../js/core/vehicle-3d.js';
import {readFileSync} from 'node:fs';
test('a Library vehicle prefab is driveable with physical collision and wheel simulation',()=>{
 const entity={id:42,type:'mesh3d',libraryConfig:{vehicle:{enabled:true,steeringAngle:30,parts:{wheelFL:'WheelFL',doorL:'Door',turret:'Turret'}}}};
 assert.equal(isDriveable3d(entity),true);
 let state=tickVehicleArticulation(entity,.1,{speed:100,steer:1,doorToggle:true,turretYaw:1});
 assert.ok(state.wheelAngle>0&&state.steer>0&&state.doors>0&&state.turretYaw>0);
 state=tickVehicleArticulation(entity,.1,{speed:0,steer:0});
 assert.equal(state.doorOpen,true);
});
test('only named GLB nodes rotate, without deforming unrelated body',()=>{
 const rig={nodes:[
  {name:'Body',translation:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1],children:[1,2,3]},
  {name:'WheelFL',translation:[1,0,1],rotation:[0,0,0,1],scale:[1,1,1],children:[]},
  {name:'Door',translation:[1,1,0],rotation:[0,0,0,1],scale:[1,1,1],children:[]},
  {name:'Turret',translation:[0,2,0],rotation:[0,0,0,1],scale:[1,1,1],children:[]}
 ],parents:Int32Array.from([-1,0,0,0]),skins:[],animations:[]};
 const entity={libraryConfig:{vehicle:{enabled:true,parts:{wheelFL:'WheelFL',doorL:'Door',turret:'Turret'}}}};
 tickVehicleArticulation(entity,.1,{speed:100,steer:1,doorToggle:true,turretYaw:1});
 const pose=vehicleRigPose(rig,entity);
 assert.ok(pose&&pose.world.length===4);
 assert.deepEqual(pose.nodes[0].rotation,[0,0,0,1]);
 assert.notDeepEqual(pose.nodes[1].rotation,[0,0,0,1]);
 assert.notDeepEqual(pose.nodes[2].rotation,[0,0,0,1]);
 assert.notDeepEqual(pose.nodes[3].rotation,[0,0,0,1]);
 assert.equal(vehicleRigPose(rig,{libraryConfig:{vehicle:{enabled:true,parts:{doorL:'missing'}}},vehicleArticulation:entity.vehicleArticulation}),null);
});
test('3D viewport integrates native vehicle GLB mesh pose and existing collision solver',()=>{
 const viewport=readFileSync(new URL('../js/core/viewport-3d.js',import.meta.url),'utf8');
 const driving=readFileSync(new URL('../js/core/vehicle-3d.js',import.meta.url),'utf8');
 const transfer=readFileSync(new URL('../js/core/library-transfer.js',import.meta.url),'utf8');
 assert.ok(viewport.includes('vehicleRigPose(rig,o)'));
 assert.ok(driving.includes('moveBody3d(drivingCar,state.dx,state.dy,0,entities'));
 assert.ok(transfer.includes("registered.category='Vehicles'"));
 assert.ok(transfer.includes('kinematic:true'));
});
