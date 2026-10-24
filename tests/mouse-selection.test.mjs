import test from 'node:test';
import assert from 'node:assert/strict';
import {rectFromPoints,touchesSelection,selectInRect} from '../js/core/input.js';

const objects=[
 {id:1,x:10,y:10,w:30,h:30},
 {id:2,x:65,y:65,w:30,h:30},
 {id:3,x:120,y:120,w:20,h:20}
];

test('drag in either direction yields positive rectangle',()=>{
 assert.deepEqual(rectFromPoints({x:80,y:90},{x:10,y:20}),{x:10,y:20,w:70,h:70});
});
test('left-to-right containment selects only fully enclosed objects',()=>{
 assert.deepEqual(selectInRect(objects,{x:0,y:0,w:80,h:80},true),[1]);
});
test('right-to-left crossing selection includes partially intersecting objects',()=>{
 assert.deepEqual(selectInRect(objects,{x:0,y:0,w:80,h:80}),[1,2]);
});
test('outside objects are not selected',()=>{
 assert.equal(touchesSelection(objects[2],{x:0,y:0,w:80,h:80}),false);
});
