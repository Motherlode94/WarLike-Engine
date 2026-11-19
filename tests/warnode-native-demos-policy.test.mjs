import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGraph,inspectGraph,applyGraph} from '../js/core/blueprint-graph.js';
import {duplicateWarNode,removeWarNode,summarizeWarNodeGraph} from '../js/core/warnode-editor-operations.js';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('WarNode duplicates metadata without cloning wiring, IDs, or debug breakpoints',()=>{
 const graph=createGraph({event:'start',instructions:[{type:'message',value:'A'}]});
 const original=graph.nodes[1];original.breakpoint=true;
 const links=structuredClone(graph.links);
 const result=duplicateWarNode(graph,original.id);
 assert.equal(result.ok,true);
 assert.notEqual(result.id,original.id);
 assert.equal(result.node.action.value,'A');
 assert.equal(result.node.breakpoint,undefined);
 assert.deepEqual(graph.links,links);
 assert.notEqual(result.node,original);
 assert.equal(summarizeWarNodeGraph(graph).disconnected,1);
 assert.ok(inspectGraph(graph).length>0,'Disconnected copy must be flagged, not silently executed');
});
test('WarNode protects Event, removes incident data and exec edges, and keeps copies unique',()=>{
 const g=createGraph({instructions:[{type:'message',value:'A'},{type:'message',value:'B'}]});
 assert.equal(duplicateWarNode(g,'event').ok,false);
 const a=duplicateWarNode(g,'action1'),b=duplicateWarNode(g,'action1');
 assert.equal(a.ok,true);assert.equal(b.ok,true);assert.notEqual(a.id,b.id);
 assert.equal(removeWarNode(g,'action1').ok,true);
 assert.ok(g.links.every(link=>link.from!=='action1'&&link.to!=='action1'));
 assert.equal(removeWarNode(g,'event').ok,false);
});
test('valid native WarNode graphs still compile to their executable sequence',()=>{
 const sequence={event:'start',instructions:[{type:'message',value:'ok'}]};sequence.graph=createGraph(sequence);
 assert.deepEqual(inspectGraph(sequence.graph),[]);
 applyGraph(sequence);assert.equal(sequence.instructions[0].value,'ok');
 assert.equal(summarizeWarNodeGraph(sequence.graph).disconnected,0);
});
test('Engine official demos are backed by native scene loaders, not iframe prototypes',()=>{
 const browser=source('js/ui/demo-browser.js'),menu=source('index.html'),scene=source('js/core/scene.js');
 assert.doesNotMatch(browser,/externalUrl:/);
 assert.doesNotMatch(browser,/iframe\.src/);
 assert.doesNotMatch(browser,/warlikeStandaloneGame/);
 assert.doesNotMatch(browser,/id:'worldforge'/);
 assert.doesNotMatch(browser,/id:'chambre07',/);
 assert.doesNotMatch(menu,/href="\.\/examples\/(?:iron-defiance|worldforge|chambre-07)\/index\.html"/);
 assert.match(browser,/loadAuthoredDemo\(scene.id\)/);
 const registered=new Set(['productionlab','lastlightnative','chambre07native','irondefiancetraining','animation','town','nature','garage','platformer']);
 const company=/\.\.\.Object\.fromEntries\(\['rdc','china','russia','usa','france','ukraine','japan'\]/.test(scene);
 assert.equal(company,true,'All faction scenes must be registered through the native builder');
 const catalog=browser.slice(browser.indexOf('const scenes=['),browser.indexOf('];',browser.indexOf('const scenes=[')));
 const listed=[...catalog.matchAll(/\{id:'([^']+)'/g)].map(m=>m[1]);
 assert.ok(listed.length>=10,'Native demo catalog unexpectedly empty');
 for(const id of listed)assert.ok(registered.has(id)||/^ironcompany-(rdc|china|russia|usa|france|ukraine|japan)$/.test(id),'Missing native builder for '+id);

 for(const id of ['productionlab','irondefiancetraining','chambre07native','lastlightnative'])assert.ok(scene.includes(id+':'),id);
});
