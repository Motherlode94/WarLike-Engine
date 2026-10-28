import test from 'node:test';
import assert from 'node:assert/strict';
import {sequenceInstructions,sequenceConditions,sequenceEvents} from '../js/core/logic-sequences.js';
import {instructionLabels,conditionLabels,eventLabels,actionGroup,conditionFields} from '../js/core/blueprint-catalog.js';
import {createGraph,inspectGraph,inspectGraphDetailed} from '../js/core/blueprint-graph.js';
import {inspectBlueprintGame} from '../js/core/blueprint-validation.js';
import {gameProject} from '../js/core/game-project.js';

test('every runtime opcode has a French label and a real group',()=>{
 assert.deepEqual(sequenceInstructions.filter(t=>!instructionLabels[t]),[]);
 assert.deepEqual(sequenceConditions.filter(t=>!conditionLabels[t]),[]);
 assert.deepEqual(sequenceEvents.filter(t=>!eventLabels[t]),[]);
 for(const t of sequenceInstructions)assert.notEqual(actionGroup(t),'Gameplay avancé',t+' doit avoir un groupe dédié');
});
test('point-distance conditions expose their coordinates',()=>{
 for(const type of ['distanceToPointLess','distanceToPointGreater'])assert.deepEqual(conditionFields(type).map(f=>f.key),['x','y','value']);
});
test('graph issues point at the faulty node and keep the string API',()=>{
 const g=createGraph({event:'start',instructions:[{type:'message',value:'a'},{type:'message',value:'b'}]});
 g.links=g.links.filter(e=>e.to!=='action2');
 const issues=inspectGraphDetailed(g);
 assert.ok(issues.some(i=>i.nodeId==='action2'));
 assert.deepEqual(inspectGraph(g),[...new Set(issues.map(i=>i.message))]);
 assert.deepEqual(inspectGraphDetailed(createGraph({event:'start',instructions:[{type:'message',value:'ok'}]})),[]);
});
const base=(sequence)=>[{id:1,type:'player',x:0,y:0,w:10,h:10,sequence}];
test('validation warns about missing keys and signals nobody sends',()=>{
 const msgs=inspectBlueprintGame(base({enabled:true,event:'start',instructions:[{type:'setVariable',key:'',value:1},{type:'winGame'}]}),{project:gameProject}).filter(i=>i.severity==='warning').map(i=>i.message);
 assert.ok(msgs.some(m=>m.includes('setVariable')));
 const listener=inspectBlueprintGame(base({enabled:true,event:'signal',signal:'porte',instructions:[{type:'winGame'}]}),{project:gameProject});
 assert.ok(listener.some(i=>i.severity==='warning'&&i.message.includes('porte')));
 const paired=[{id:1,type:'player',x:0,y:0,w:10,h:10,sequence:{enabled:true,event:'signal',signal:'porte',instructions:[{type:'winGame'}]}},{id:2,type:'box',x:0,y:0,w:10,h:10,sequence:{enabled:true,event:'start',instructions:[{type:'emitSignal',value:'porte'}]}}];
 assert.ok(!inspectBlueprintGame(paired,{project:gameProject}).some(i=>i.message.includes('porte')));
 assert.ok(!inspectBlueprintGame(base({enabled:true,event:'signal',signal:'game:saved',instructions:[{type:'winGame'}]}),{project:gameProject}).some(i=>i.message.includes('game:saved')));
});
