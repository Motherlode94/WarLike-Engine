import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCsharpValue,parseSquadMembers,persistCsharpProperty} from '../js/core/csharp-inspector.js';
import {createCsharpSquadDemo} from '../js/core/csharp-tactical-scene.js';
import {get3dAsset} from '../js/assets/catalog-3d.js';

test('tactical example uses bundled real GLB characters and a vehicle with distinct IDs',()=>{
 const actors=createCsharpSquadDemo(50);
 assert.equal(actors.length,6);assert.equal(new Set(actors.map(a=>a.id)).size,6);
 assert.deepEqual(actors[0].csharpComponents[0].memberIds,[51,52,53,54]);
 assert.equal(actors[5].csharpComponents[0].kind,'VehicleController');
 for(const actor of actors){const model=get3dAsset(actor.model3dId);assert.equal(actor.meshShape,'glb');assert.ok(model?.url.startsWith('./assets/free/kenney/'));}
});

test('C# typed edits preserve booleans, integers and vectors and reject invalid numbers',()=>{
 assert.equal(parseCsharpValue('bool',false),false);
 assert.equal(parseCsharpValue('int','42'),42);
 assert.deepEqual(parseCsharpValue('vector3',{x:'1.5',y:'0',z:'-3'}),{x:1.5,y:0,z:-3});
 for(const value of ['',Infinity,'NaN','1e999'])assert.throws(()=>parseCsharpValue('float',value));
 assert.throws(()=>parseCsharpValue('int','2.5'));
 assert.throws(()=>parseCsharpValue('string','42'));
});
test('squad member IDs support comma and whitespace lists without duplicates or invalid IDs',()=>{
 assert.deepEqual(parseSquadMembers('2, 3; 4\n5'),[2,3,4,5]);
 assert.deepEqual(parseSquadMembers(''),[]);
 for(const input of ['2,2','0','-1','1.5','soldat',Array.from({length:65},(_,i)=>i+1).join(',')])assert.throws(()=>parseSquadMembers(input));
});
test('C# parameter changes persist to the correct scene definition and survive JSON round trips',()=>{
 const entities=[{id:7,csharpComponents:[{kind:'Unknown'},{kind:'LinearMotion',vx:0,vy:0,vz:0}]}];
 const component={sourceIndex:1,type:'LinearMotionComponent'};
 assert.equal(persistCsharpProperty(entities,7,component,{type:'vector3',sceneKeys:['vx','vy','vz'],value:{x:2,y:0,z:-1}}),true);
 assert.equal(persistCsharpProperty(entities,7,component,{type:'bool',sceneKeys:['enabled'],value:false}),true);
 const restored=JSON.parse(JSON.stringify(entities));
 assert.deepEqual(restored[0].csharpComponents[1],{kind:'LinearMotion',vx:2,vy:0,vz:-1,enabled:false});
 assert.deepEqual(restored[0].csharpComponents[0],{kind:'Unknown'});
});
test('runtime-only, stale, mismatched and malformed fields cannot overwrite a scene',()=>{
 const entities=[{id:7,csharpComponents:[{kind:'VehicleController',maxSpeed:300}]}];
 const before=JSON.stringify(entities),property={type:'float',sceneKeys:['maxSpeed'],value:200};
 for(const component of [{sourceIndex:null,type:'VehicleControllerComponent'},{sourceIndex:1,type:'VehicleControllerComponent'},{sourceIndex:0,type:'HealthComponent'}])
  assert.equal(persistCsharpProperty(entities,7,component,property),false);
 for(const sceneKeys of [['__proto__'],['constructor'],['prototype']])assert.equal(persistCsharpProperty(entities,7,{sourceIndex:0,type:'VehicleControllerComponent'},{...property,sceneKeys}),false);
 assert.equal(JSON.stringify(entities),before);
});
