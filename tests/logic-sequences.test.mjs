import test from 'node:test';
import assert from 'node:assert/strict';
import {resetSequences,updateSequences,emitSequenceSignal,sequenceRuntime,newSequence,chooseSequenceBranch} from '../js/core/logic-sequences.js';
const obj=(id,x=100)=>({id,x,y:100,w:32,h:32,sequence:null,color:'#8195ef'});
const ctx=(entities,keys=new Set())=>({playing:true,entities,keys,player:{id:99,x:100,y:100,w:32,h:32}});
test('trigger enter fires once when player enters the range',()=>{
 resetSequences();const o=obj(1);o.sequence={...newSequence(),event:'enter',instructions:[{type:'addVariable',key:'visits',value:1}]};
 const c=ctx([o]);updateSequences(.016,c);updateSequences(.016,c);assert.equal(sequenceRuntime.globals.visits,1);
});
test('branches choose first matching AND branch, else as fallback',()=>{
 resetSequences();const o=obj(1);const c=ctx([o]);
 const s={branches:[{conditions:[{type:'variable',key:'score',operator:'>=',value:10}],instructions:[{type:'message',value:'won'}]}],elseInstructions:[{type:'message',value:'retry'}]};
 assert.equal(chooseSequenceBranch(s,o,c)[0].value,'retry');
 sequenceRuntime.globals.score=10;
 assert.equal(chooseSequenceBranch(s,o,c)[0].value,'won');
});
test('wait delays further instructions, then finishes after elapsed time',()=>{
 resetSequences();const o=obj(1);o.sequence={...newSequence(),event:'start',instructions:[{type:'setVariable',key:'phase',value:'first'},{type:'wait',value:1},{type:'setVariable',key:'phase',value:'second'}]};
 const c=ctx([o]);updateSequences(.016,c);assert.equal(sequenceRuntime.globals.phase,'first');for(let i=0;i<4;i++)updateSequences(.1,c);assert.equal(sequenceRuntime.globals.phase,'first');for(let i=0;i<7;i++)updateSequences(.1,c);assert.equal(sequenceRuntime.globals.phase,'second');
});
test('emit signal activates another object next update',()=>{
 resetSequences();const a=obj(1),b=obj(2,300);
 a.sequence={...newSequence(),event:'start',instructions:[{type:'emitSignal',value:'gate-open'}]};
 b.sequence={...newSequence(),event:'signal',signal:'gate-open',instructions:[{type:'setColor',value:'#42ab9e'}]};
 const c=ctx([a,b]);updateSequences(.016,c);updateSequences(.016,c);
 assert.equal(b.color,'#42ab9e');assert.equal(b.colorCustomized,true);
});
test('keyDown is edge triggered, reset restores original variables',()=>{
 resetSequences();const o=obj(1);o.sequence={...newSequence(),event:'keyDown',key:'f',instructions:[{type:'addVariable',key:'shots',value:1}]};
 const c=ctx([o],new Set(['f']));updateSequences(.016,c);updateSequences(.016,c);assert.equal(sequenceRuntime.globals.shots,1);
 c.keys.clear();updateSequences(.016,c);c.keys.add('f');updateSequences(.016,c);assert.equal(sequenceRuntime.globals.shots,2);
 resetSequences();assert.deepEqual(sequenceRuntime.globals,{});
});
test('IF ELSE fallback runs when first branch fails',()=>{
 resetSequences();const o=obj(1);o.sequence={...newSequence(),event:'start',conditions:[{type:'variable',key:'hasKey',operator:'==',value:1}],branches:[{conditions:[{type:'variable',key:'hasKey',operator:'==',value:1}],instructions:[{type:'message',value:'opened'}]}],elseInstructions:[{type:'message',value:'locked'}]};
 updateSequences(.016,ctx([o]));assert.equal(sequenceRuntime.messages[0]?.text,'locked');
});
test('runtime does nothing outside Play',()=>{
 resetSequences();const o=obj(1);o.sequence={...newSequence(),event:'start',instructions:[{type:'destroyObject'}]};
 const c=ctx([o]);c.playing=false;updateSequences(.016,c);assert.equal(c.entities.length,1);
});
