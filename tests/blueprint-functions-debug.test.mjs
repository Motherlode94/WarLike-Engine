import test from 'node:test';
import assert from 'node:assert/strict';
import {gameProject,restoreGameProject} from '../js/core/game-project.js';
import {resetSequences,updateSequences,sequenceRuntime} from '../js/core/logic-sequences.js';
import {createGraph,applyGraph} from '../js/core/blueprint-graph.js';
import {gameIsRunning,gameSession} from '../js/core/game-session.js';
import {blueprintDebugger,stepBlueprint,resumeBlueprint,pauseBlueprint} from '../js/core/blueprint-debugger.js';
import {resolveBlueprintValue,validateFunctionDefinitions} from '../js/core/blueprint-data.js';
const ref=(name,type='number',source='parameter')=>({$ref:source,name,type});
const setup=(instructions,functions=[],variables=[])=>{restoreGameProject({functions,variables});resetSequences();const o={id:1,x:0,y:0,w:32,h:32,sequence:{event:'start',instructions}};return {o,ctx:{playing:true,entities:[o],keys:new Set(),player:o}}};
const echo={id:'echo',parameters:[{name:'amount',type:'number',value:1}],returnType:'number',instructions:[{type:'wait',value:.2},{type:'returnFunction',value:ref('amount')}]};
test('functions pass typed parameters, suspend at Wait and return isolated results to callers',()=>{
 const {o,ctx}=setup([{type:'callFunction',functionId:'echo',arguments:{amount:3},resultKey:'result'},{type:'setVariable',key:'score',value:ref('result','number','local')}],[echo],[{name:'score',type:'number',value:0}]);
 updateSequences(.01,ctx);assert.equal(sequenceRuntime.globals.score,0);assert.equal(sequenceRuntime.jobs[0].frames[0].parameters.amount,3);
 updateSequences(.1,ctx);updateSequences(.1,ctx);assert.equal(sequenceRuntime.globals.score,3);assert.equal(o.sequenceLocal.result,3);assert.equal(sequenceRuntime.jobs.length,0);
});
test('two objects call one shared function without leaking parameter or local values',()=>{
 const fn={id:'award',parameters:[{name:'points',type:'number'}],returnType:'void',instructions:[{type:'addVariable',key:'score',value:ref('points')}]};
 const {o,ctx}=setup([{type:'callFunction',functionId:'award',arguments:{points:3}}],[fn],[{name:'score',type:'number',value:0}]);ctx.entities.push({...o,id:2,sequence:{event:'start',instructions:[{type:'callFunction',functionId:'award',arguments:{points:7}}]}});updateSequences(.01,ctx);assert.equal(sequenceRuntime.globals.score,10);assert.equal(sequenceRuntime.errors.length,0);
});
test('bad parameter types, return types and recursive calls produce runtime diagnostics',()=>{
 for(const [functionDef,args,pattern] of [[echo,{amount:'bad'},/number attendu/],[{...echo,instructions:[{type:'returnFunction',value:'bad'}]},{amount:1},/Retour.*number attendu/],[{id:'loop',parameters:[],returnType:'void',instructions:[{type:'callFunction',functionId:'loop'}]},{},/récursif/]]){
  const {ctx}=setup([{type:'callFunction',functionId:functionDef.id,arguments:args}],[functionDef]);updateSequences(.01,ctx);assert.ok(sequenceRuntime.errors.some(e=>pattern.test(e.message)),JSON.stringify(sequenceRuntime.errors));
 }
});
test('declared global types and vector bindings survive project serialization',()=>{
 const {ctx}=setup([{type:'setVariable',key:'direction',value:[1,2,3]},{type:'setVariable',key:'direction',value:'wrong'}],[],[{name:'direction',type:'vector3',value:[0,0,0]}]);updateSequences(.01,ctx);assert.deepEqual(sequenceRuntime.globals.direction,[1,2,3]);assert.match(sequenceRuntime.errors[0].message,/vector3 attendu/);
 restoreGameProject(JSON.parse(JSON.stringify({...gameProject,functions:[echo]})));assert.equal(gameProject.functions[0].parameters[0].type,'number');assert.equal(validateFunctionDefinitions(gameProject.functions).length,0);
 assert.throws(()=>resolveBlueprintValue(ref('__proto__'),{parameters:{}}),/introuvable/);
});
test('breakpoint pauses before side effects, stepping executes exactly one action and freezes game time',()=>{
 const {o,ctx}=setup([{type:'setVariable',key:'score',value:1},{type:'addVariable',key:'score',value:2},{type:'addVariable',key:'score',value:4}]);o.sequence.graph=createGraph(o.sequence);o.sequence.graph.nodes[1].breakpoint=true;applyGraph(o.sequence);
 updateSequences(.016,ctx);assert.equal(blueprintDebugger.paused,true);assert.equal(sequenceRuntime.globals.score,undefined);assert.equal(gameIsRunning(),false);const elapsed=gameSession.elapsed;
 updateSequences(.1,ctx);assert.equal(gameSession.elapsed,elapsed);
 stepBlueprint();updateSequences(.1,ctx);assert.equal(sequenceRuntime.globals.score,1);assert.equal(blueprintDebugger.paused,true);assert.equal(blueprintDebugger.current.nodeId,'action2');assert.equal(gameSession.elapsed,elapsed);
 stepBlueprint();updateSequences(.1,ctx);assert.equal(sequenceRuntime.globals.score,3);
 resumeBlueprint();updateSequences(.01,ctx);assert.equal(sequenceRuntime.globals.score,7);assert.equal(sequenceRuntime.jobs.length,0);assert.equal(gameSession.phase,'playing');
});
test('step enters reusable functions and displays their typed call stack',()=>{
 const f={id:'award',parameters:[{name:'amount',type:'number'}],returnType:'void',instructions:[{type:'addVariable',key:'score',value:ref('amount')}]};const {ctx}=setup([{type:'callFunction',functionId:'award',arguments:{amount:8},breakpoint:true}],[f]);
 updateSequences(.01,ctx);stepBlueprint();updateSequences(.01,ctx);assert.equal(blueprintDebugger.current.stack[0].parameters.amount,8);assert.equal(sequenceRuntime.globals.score,undefined);
 stepBlueprint();updateSequences(.01,ctx);assert.equal(sequenceRuntime.globals.score,8);resumeBlueprint();updateSequences(.01,ctx);assert.equal(sequenceRuntime.jobs.length,0);
 pauseBlueprint();assert.equal(gameIsRunning(),false);resetSequences();assert.equal(gameIsRunning(),true);assert.equal(blueprintDebugger.current,null);
});

test('a breakpoint preserves start events queued on the other objects',()=>{
 const {o,ctx}=setup([{type:'setVariable',key:'a',value:1,breakpoint:true}]);ctx.entities.push({...o,id:2,sequence:{event:'start',instructions:[{type:'setVariable',key:'b',value:2}]}});updateSequences(.01,ctx);assert.equal(sequenceRuntime.jobs.length,2);assert.equal(sequenceRuntime.globals.b,undefined);resumeBlueprint();updateSequences(.01,ctx);assert.equal(sequenceRuntime.globals.a,1);assert.equal(sequenceRuntime.globals.b,2);
});
test('typed global references also work in trigger conditions',()=>{
 const {o,ctx}=setup([{type:'setVariable',key:'result',value:1}],[],[{name:'threshold',type:'number',value:5},{name:'score',type:'number',value:8}]);o.sequence.conditions=[{type:'variable',key:'score',operator:'>=',value:ref('threshold','number','global')}];updateSequences(.01,ctx);assert.equal(sequenceRuntime.globals.result,1);
});
test('manual pause can step the first pending trigger and a void function can finish implicitly',()=>{
 const f={id:'noop',parameters:[],returnType:'void',instructions:[]};const {ctx}=setup([{type:'callFunction',functionId:'noop'},{type:'setVariable',key:'done',value:1}],[f]);pauseBlueprint();stepBlueprint();updateSequences(.1,ctx);assert.equal(blueprintDebugger.paused,true);assert.equal(sequenceRuntime.globals.done,undefined);stepBlueprint();updateSequences(.1,ctx);assert.equal(sequenceRuntime.globals.done,1);assert.equal(blueprintDebugger.step,false);
});
