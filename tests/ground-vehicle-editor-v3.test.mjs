import test from 'node:test';
import assert from 'node:assert/strict';
import {componentChoices,addObjectComponent,removeObjectComponent,componentRemovalBlockers} from '../js/core/component-definitions.js';
import {genericComponentDefinitions} from '../js/ui/generic-component-inspector.js';
import {componentMenuPath} from '../js/ui/component-menu-tree.js';
import {validateGroundVehiclePhysics} from '../js/core/ground-vehicle-rapier.js';
import {canonicalScene,runtimeEntities} from '../js/core/scene-contract.js';
import {isDriveable3d,updateDriving3d,driving3d,resetDriving3d} from '../js/core/vehicle-3d.js';

test('3D Add Component exposes native ground vehicle physics under Vehicles / Physics',()=>{
 const choices=componentChoices('3d');
 const choice=choices.find(x=>x.id==='groundVehiclePhysics');
 assert.ok(choice);assert.equal(choices.filter(x=>x.id===choice.id).length,1);
 assert.equal(componentChoices('2d').some(x=>x.id===choice.id),false);
 assert.deepEqual(componentMenuPath(choice,'Vehicles'),['Vehicles','Physics']);
});
test('adding a ground chassis creates required real physics components without removing unrelated object data',()=>{
 const entity={id:2,name:'Car',type:'mesh3d',x:10,y:20,elevation3d:0,w:140,h:60,depth3d:80,stats:{health:20}};
 assert.equal(addObjectComponent(entity,'groundVehiclePhysics','3d'),true);
 assert.ok(entity.collider3d.enabled);assert.equal(entity.collision3d,true);
 assert.equal(entity.rigidbody3d.enabled,true);assert.equal(entity.rigidbody3d.kinematic,false);
 assert.equal(entity.rigidbody3d.lockRotations,false);assert.equal(entity.rigidbody3d.mass,entity.groundVehiclePhysics.mass);
 assert.deepEqual(validateGroundVehiclePhysics(entity.groundVehiclePhysics),[]);
 assert.equal(entity.stats.health,20);
 assert.equal(addObjectComponent(entity,'groundVehiclePhysics','3d'),false);
 assert.ok(componentRemovalBlockers(entity,'rigidbody3d').includes('groundVehiclePhysics'));
 assert.equal(removeObjectComponent(entity,'rigidbody3d'),false);
 assert.ok(genericComponentDefinitions(entity,'3d').some(x=>x.id==='groundVehiclePhysics'));
 const restored=runtimeEntities(canonicalScene([entity]))[0];
 assert.deepEqual(restored.groundVehiclePhysics,entity.groundVehiclePhysics);
});
test('ground vehicles receive keyboard input without arcade movement and stop on exit',()=>{
 resetDriving3d();
 const player={id:1,type:'player',x:100,y:100,w:35,h:90,depth3d:32,elevation3d:0,animation:'idle'};
 const car={id:2,type:'mesh3d',x:150,y:110,w:140,h:64,depth3d:80,elevation3d:0,collision3d:true};
 assert.equal(addObjectComponent(car,'groundVehiclePhysics','3d'),true);
 assert.equal(isDriveable3d(car),true);
 const entities=[player,car];
 assert.equal(updateDriving3d(entities,player,new Set(['e']),1/60),true);
 const start={x:car.x,y:car.y};
 assert.equal(driving3d.vehicleId,car.id);
 for(let i=0;i<5;i++)assert.equal(updateDriving3d(entities,player,new Set(['w','d']),1/60),true);
 assert.equal(car.x,start.x);assert.equal(car.y,start.y,'Rapier owns the chassis pose');
 assert.equal(car.groundVehicleInput.throttle,1);assert.equal(car.groundVehicleInput.steer,1);
 updateDriving3d(entities,player,new Set(),1/60);
 updateDriving3d(entities,player,new Set(['e']),1/60);
 assert.equal(driving3d.vehicleId,null);assert.equal(car.groundVehicleInput.throttle,0);
 resetDriving3d();
});
