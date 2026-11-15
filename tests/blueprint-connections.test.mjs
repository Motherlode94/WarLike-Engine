import test from 'node:test';
import assert from 'node:assert/strict';
import {connectBlueprintPorts} from '../js/core/blueprint-connections.js';
import {createGraph,applyGraph} from '../js/core/blueprint-graph.js';
import {resetSequences,updateSequences,sequenceRuntime} from '../js/core/logic-sequences.js';
const exec=(id,port='next')=>({nodeId:id,kind:'exec',port}),input=id=>exec(id,'in');
test('rewiring execution preserves typed data wires from the same source',()=>{
 const graph=createGraph({event:'start',instructions:[{type:'message',value:'A'},{type:'setHealth',value:20}]});
 // An independent data edge must never be removed by an execution-port edit.
 const data={kind:'data',from:'action1',fromPort:'result',to:'action2',toPort:'value'};graph.links.push(data);
 assert.equal(connectBlueprintPorts(graph,exec('action1'),input('action2')).ok,true);assert.ok(graph.links.includes(data));assert.equal(graph.links.filter(e=>e.kind!=='data'&&e.from==='action1').length,1);
});
test('invalid drops and execution cycles leave the existing graph intact',()=>{
 const graph=createGraph({instructions:[{type:'message',value:'A'},{type:'message',value:'B'}]});const before=structuredClone(graph);
 for(const [from,to] of [[exec('action2'),input('action1')],[exec('event'),input('event')],[exec('missing'),input('action1')],[exec('action1','false'),input('action2')],[exec('event'),{nodeId:'action1',kind:'data',port:'value'}]]){assert.equal(connectBlueprintPorts(graph,from,to).ok,false);assert.deepEqual(graph,before);}
});
test('typed data drops replace one input and reject incompatible values',()=>{
 const graph=createGraph({event:'start',instructions:[{type:'setHealth',value:10}]});graph.version=3;for(const [id,valueType,value] of [['number','number',75],['other','number',50],['text','string','x']])graph.nodes.push({id,kind:'data',op:'constant',valueType,value});
 const from=id=>({nodeId:id,kind:'data',port:'value'}),to={nodeId:'action1',kind:'data',port:'value'};assert.equal(connectBlueprintPorts(graph,from('number'),to).ok,true);assert.equal(connectBlueprintPorts(graph,from('other'),to).ok,true);assert.equal(graph.links.filter(e=>e.kind==='data').length,1);const before=structuredClone(graph);assert.equal(connectBlueprintPorts(graph,from('text'),to).ok,false);assert.deepEqual(graph,before);
});
test('a graph wired through editor port commands executes after portable round trip',()=>{
 const graph=createGraph({event:'start',instructions:[{type:'setVariable',key:'score',value:2},{type:'addVariable',key:'score',value:5}]});graph.links=[];
 assert.equal(connectBlueprintPorts(graph,exec('event'),input('action1')).ok,true);assert.equal(connectBlueprintPorts(graph,exec('action1'),input('action2')).ok,true);
 const sequence={event:'start',graph:JSON.parse(JSON.stringify(graph))};applyGraph(sequence);resetSequences();const actor={id:1,x:0,y:0,w:20,h:20,sequence};updateSequences(.016,{playing:true,entities:[actor],player:actor,keys:new Set()});assert.equal(sequenceRuntime.globals.score,7);assert.equal(sequenceRuntime.errors.length,0);
});
