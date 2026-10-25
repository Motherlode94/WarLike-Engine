import test from 'node:test';
import assert from 'node:assert/strict';
import {createGraph,inspectGraph,compileGraph,applyGraph,coerceVariable} from '../js/core/blueprint-graph.js';
import {updateSequences,resetSequences,sequenceRuntime} from '../js/core/logic-sequences.js';
test('graph compilation follows connected ports rather than visual position',()=>{
 const s={event:'start',instructions:[{type:'setVariable',key:'a',value:1},{type:'addVariable',key:'a',value:2}]};
 s.graph=createGraph(s);s.graph.nodes[1].x=600;s.graph.nodes[2].x=200;
 assert.deepEqual(compileGraph(s.graph).instructions,s.instructions);
 applyGraph(s);resetSequences();const obj={id:1,x:0,y:0,w:20,h:20,sequence:s};
 updateSequences(.016,{playing:true,entities:[obj],keys:new Set(),player:obj});
 assert.equal(sequenceRuntime.globals.a,3);
});
test('invalid graph connections and cyclic graphs are rejected',()=>{
 const g=createGraph({event:'start',instructions:[{type:'message',value:'ok'}]});
 g.links.push({from:'action1',to:'event'});
 assert.ok(inspectGraph(g).length>0);
 assert.throws(()=>compileGraph(g));
});
test('typed variables are initialized for 2D and 3D runtime alike',()=>{
 for(const mode of ['2d','3d']){
  resetSequences();const s={event:'start',instructions:[{type:'message',value:'hello'}]};
  s.graph=createGraph(s);s.graph.variables=[{name:'speed',type:'number',value:'3.5'},{name:'enabled',type:'boolean',value:'true'}];
  const obj={id:1,x:0,y:0,w:30,h:30,sequence:s};
  updateSequences(.016,{playing:true,entities:[obj],player:obj,keys:new Set(),mode});
  assert.equal(sequenceRuntime.globals.speed,3.5);assert.equal(sequenceRuntime.globals.enabled,true);
 }
 assert.deepEqual(coerceVariable('vector3',['1','bad',3]),[1,0,3]);
});
