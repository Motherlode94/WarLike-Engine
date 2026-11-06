import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectGraph,compileGraph,applyGraph} from '../js/core/blueprint-graph.js';
import {resetSequences,updateSequences,sequenceRuntime} from '../js/core/logic-sequences.js';
import {restoreGameProject} from '../js/core/game-project.js';
import {resolveBlueprintValue} from '../js/core/blueprint-data.js';
const data=(id,op,rest={})=>({id,kind:'data',op,valueType:'number',...rest});
const wire=(from,to,toPort)=>({kind:'data',from,fromPort:'value',to,toPort});
const base=()=>({version:3,nodes:[{id:'event',kind:'event',event:'start'},{id:'action',kind:'action',action:{type:'setHealth'}}],links:[{from:'event',to:'action'}]});
function run(graph,entities){restoreGameProject({});resetSequences();const sequence={event:'start',graph};applyGraph(sequence);entities[0].sequence=sequence;const ctx={playing:true,entities,keys:new Set(),player:entities[0]};updateSequences(.01,ctx);return ctx}
const actor=(id=1)=>({id,name:'Actor',type:'player',x:0,y:0,w:32,h:64,hp:100});
test('a saved health-minus-damage graph reads the object and executes in the shared runtime',()=>{
 const graph=base();graph.nodes.push(data('self','entity',{role:'self'}),data('hp','property',{property:'hp'}),data('damage','constant',{value:25}),data('sub','subtract'));
 graph.links.push(wire('self','hp','source'),wire('hp','sub','a'),wire('damage','sub','b'),wire('sub','action','value'));
 assert.deepEqual(inspectGraph(graph),[]);const entity=actor();run(JSON.parse(JSON.stringify(graph)),[entity]);assert.equal(entity.hp,75);assert.equal(sequenceRuntime.errors.length,0);
});
test('data links reject incompatible types, duplicate inputs, missing ports and data cycles',()=>{
 for(const alter of [g=>g.nodes[2].valueType='string',g=>g.links.push(wire('n','action','value')),g=>g.links[1].toPort='missing']){
  const g=base();g.nodes.push(data('n','constant',{value:5}));g.links.push(wire('n','action','value'));alter(g);assert.ok(inspectGraph(g).length);assert.throws(()=>compileGraph(g));
 }
 const g=base();g.nodes.push(data('a','add',{inputs:{a:0,b:0}}),data('b','add',{inputs:{a:0,b:0}}));g.links.push(wire('a','b','a'),wire('b','a','b'),wire('b','action','value'));assert.ok(inspectGraph(g).some(e=>/Boucle de données/.test(e)));
});
test('values are read after a Wait, rather than captured when the event fired',()=>{
 const g=base();g.nodes.push({id:'wait',kind:'action',action:{type:'wait',value:.1}},data('hp','property',{property:'hp',inputs:{source:{entityId:1}}}));g.links=[{from:'event',to:'wait'},{from:'wait',to:'action'},wire('hp','action','value')];
 const e=actor(),ctx=run(g,[e]);e.hp=62;updateSequences(.1,ctx);assert.equal(e.hp,62);assert.equal(sequenceRuntime.errors.length,0);
});
test('object and component ports remain portable references and resolve real target entities',()=>{
 const g=base();g.nodes[1].action={type:'setHealth',value:55};g.nodes.push(data('other','entity',{entityId:2}),data('component','component',{componentKind:'Health',inputs:{object:{entityId:2}}}),data('amount','property',{sourceType:'component',property:'regen'}));
 g.links.push(wire('other','action','target'),wire('component','amount','source'),wire('amount','action','value'));
 const a=actor(),b={...actor(2),csharpComponents:[{kind:'Health',regen:7}]};run(g,[a,b]);assert.equal(a.hp,100);assert.equal(b.hp,7);
 b.csharpComponents=[];run(g,[a,b]);assert.ok(sequenceRuntime.errors.some(e=>/Composant absent/.test(e.message)));
});
test('vector ports feed typed variables and boolean data ports choose control branches',()=>{
 const g=base();g.nodes[1].action={type:'setLocal',key:'direction',valueType:'vector3'};g.nodes.push(data('v','vector3',{inputs:{x:1,y:2,z:3}}));g.links.push(wire('v','action','value'));const a=actor();run(g,[a]);assert.deepEqual(a.sequenceLocal.direction,[1,2,3]);
 const branch=base();branch.nodes[1]={id:'action',kind:'condition',conditions:[]};branch.nodes.push(data('yes','constant',{valueType:'boolean',value:true}),{id:'finish',kind:'action',action:{type:'setVariable',key:'passed',value:1}});branch.links.push(wire('yes','action','test'),{from:'action',to:'finish',port:'true'});run(branch,[actor()]);assert.equal(sequenceRuntime.globals.passed,1);
});
test('data evaluation rejects missing references, unsafe property access and division by zero',()=>{
 const expr=($expr,type,rest={})=>({$expr,type,...rest});
 assert.throws(()=>resolveBlueprintValue(expr('entity','object',{entityId:99}),{entities:[actor()]}),/absent/);
 assert.throws(()=>resolveBlueprintValue(expr('property','number',{property:'__proto__',inputs:{source:{entityId:1}}}),{entities:[actor()]}),/non accessible/);
 assert.throws(()=>resolveBlueprintValue(expr('divide','number',{inputs:{a:10,b:0}})),/Division par zéro/);
});

test('control flow cannot enter a data-only node and default player health resolves consistently',()=>{
 const g=base();g.nodes.push(data('d','constant',{value:1}));g.links.push({from:'action',to:'d'});assert.throws(()=>compileGraph(g),/Connexion invalide/);
 const entity=actor();delete entity.hp;const expr={$expr:'property',type:'number',property:'hp',inputs:{source:{entityId:1}}};assert.equal(resolveBlueprintValue(expr,{entities:[entity]}),100);
});
