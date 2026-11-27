import test from 'node:test';
import assert from 'node:assert/strict';
import {updateSequences,resetSequences,sequenceRuntime,sequenceEvents} from '../js/core/logic-sequences.js';
import {restoreGameProject} from '../js/core/game-project.js';
import {createGraph,applyGraph} from '../js/core/blueprint-graph.js';
const events=["aiStateChanged","aiTargetAcquired","aiTargetLost"];
function actor(extra){return {id:1,type:'player',x:0,y:0,w:20,h:20,hp:100,...extra,blueprintComponents:events.map((event,i)=>{const sequence={event,instructions:[{type:'addVariable',key:'count'+i,value:1}]};sequence.graph=createGraph(sequence);applyGraph(sequence);return {id:'event'+i,sequence}})}}
function tick(o){updateSequences(.1,{playing:true,entities:[o],player:o,keys:new Set()})}
test('native enemy-ai transition events drive attached graphs once per observed transition',()=>{restoreGameProject({id:'wgc-enemy-ai',title:'WGC'});resetSequences();const o=actor({ai:{enabled:true,state:'idle',targetId:null}});tick(o);o.ai.state='chase';o.ai.targetId=9;tick(o);o.ai.state='return';o.ai.targetId=null;tick(o);tick(o);assert.deepEqual(events.map((e,i)=>{assert.ok(sequenceEvents.includes(e));return sequenceRuntime.globals['count'+i]}),[2,1,1]);});
