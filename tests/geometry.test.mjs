import test from 'node:test';
import assert from 'node:assert/strict';
import {clamp,collisionCircleRect,overlapAabb,sanitizeVehicle,validateScene} from '../js/typed/systems.js';
test('clamp and stable overlap checks',()=>{
 assert.equal(clamp(10,0,5),5);
 assert.equal(overlapAabb({x:0,y:0,w:10,h:10},{x:9,y:9,w:10,h:10}),true);
 assert.equal(overlapAabb({x:0,y:0,w:10,h:10},{x:10,y:10,w:10,h:10}),false);
 assert.equal(collisionCircleRect(11,5,2,{x:0,y:0,w:10,h:10}),true);
 assert.equal(collisionCircleRect(20,5,2,{x:0,y:0,w:10,h:10}),false);
});
test('vehicle settings reject invalid extremes',()=>{
 assert.deepEqual(sanitizeVehicle({maxSpeed:-12,drag:NaN}),{maxSpeed:40,acceleration:210,brakeForce:310,turnRate:140,drag:1.4,collisionRadius:25});
});
test('scene schema rejects duplicate IDs and invalid dimensions',()=>{
 const basic={version:4,camera:{x:0,y:0,zoom:1},entities:[{id:1,name:'Hero',type:'character',x:0,y:0,w:32,h:56,color:'#33aabb'}]};
 assert.equal(validateScene(basic),true);
 assert.equal(validateScene({...basic,entities:[basic.entities[0],basic.entities[0]]}),false);
 assert.equal(validateScene({...basic,entities:[{...basic.entities[0],w:-10}]}),false);
});
