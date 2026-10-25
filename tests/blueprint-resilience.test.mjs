import test from 'node:test';
import assert from 'node:assert/strict';
import {resetSequences,updateSequences,chooseSequenceBranch,sequenceRuntime} from '../js/core/logic-sequences.js';
const context=objects=>({playing:true,entities:objects,player:{id:99,x:0,y:0,w:20,h:20},keys:new Set()});
test('malformed Blueprint graph has bounded safe branch evaluation',()=>{
 assert.deepEqual(chooseSequenceBranch({branches:[null,{conditions:[],instructions:'invalid'}],elseInstructions:'invalid'},{id:1},context([])),[]);
});
test('invalid step collections cannot terminate the shared game loop',()=>{
 resetSequences();
 const entity={id:1,x:0,y:0,w:20,h:20,sequence:{event:'start',conditions:'broken',instructions:{type:'message'}}};
 assert.doesNotThrow(()=>updateSequences(.016,context([entity])));
 assert.equal(sequenceRuntime.messages.length,0);
});
test('normal Blueprint messages still work with hardened runtime',()=>{
 resetSequences();
 const entity={id:1,x:0,y:0,w:20,h:20,sequence:{event:'start',conditions:[],instructions:[{type:'message',value:'OK'}]}};
 updateSequences(.016,context([entity]));
 assert.equal(sequenceRuntime.messages[0]?.text,'OK');
});
