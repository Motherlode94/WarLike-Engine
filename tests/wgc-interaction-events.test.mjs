import test from 'node:test';
import assert from 'node:assert/strict';
import {updateSequences,resetSequences,sequenceRuntime,queueSequenceInteraction} from '../js/core/logic-sequences.js';
import {restoreGameProject} from '../js/core/game-project.js';
import {createGraph,applyGraph} from '../js/core/blueprint-graph.js';
test('explicit interaction triggers only a valid reachable target',()=>{
 restoreGameProject({id:'wgc-interaction',title:'WGC'});resetSequences();
 const p={id:1,type:'player',x:0,y:0,w:20,h:20,hp:100,adventure:{}};
 const sequence={event:'interactionRequested',instructions:[{type:'addVariable',key:'used',value:1}]};sequence.graph=createGraph(sequence);applyGraph(sequence);
 const o={id:2,type:'object',x:25,y:0,w:20,h:20,adventureInteractable:{enabled:true,radius:100},blueprintComponents:[{id:'interact',sequence}]};
 const tick=()=>updateSequences(.1,{playing:true,mode:'2d',entities:[p,o],player:p,keys:new Set()});
 tick();assert.equal(sequenceRuntime.globals.used,undefined);queueSequenceInteraction(1,2);tick();assert.equal(sequenceRuntime.globals.used,1);tick();assert.equal(sequenceRuntime.globals.used,1);
 o.x=1000;queueSequenceInteraction(1,2);tick();assert.equal(sequenceRuntime.globals.used,1);
});
