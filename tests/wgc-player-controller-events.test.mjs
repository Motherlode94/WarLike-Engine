import test from 'node:test';
import assert from 'node:assert/strict';
import {updateSequences,resetSequences,sequenceRuntime,sequenceEvents} from '../js/core/logic-sequences.js';
import {restoreGameProject} from '../js/core/game-project.js';
import {createGraph,applyGraph} from '../js/core/blueprint-graph.js';
const events=["playerLanded","playerAirborne"];
function actor(extra){return {id:1,type:'player',x:0,y:0,w:20,h:20,hp:100,...extra,blueprintComponents:events.map((event,i)=>{const sequence={event,instructions:[{type:'addVariable',key:'count'+i,value:1}]};sequence.graph=createGraph(sequence);applyGraph(sequence);return {id:'event'+i,sequence}})}}
function tick(o){updateSequences(.1,{playing:true,entities:[o],player:o,keys:new Set()})}
test('native player-controller transition events drive attached graphs once per observed transition',()=>{restoreGameProject({id:'wgc-player-controller',title:'WGC'});resetSequences();const o=actor({grounded3d:true});tick(o);o.grounded3d=false;tick(o);o.grounded3d=true;tick(o);tick(o);assert.deepEqual(events.map((e,i)=>{assert.ok(sequenceEvents.includes(e));return sequenceRuntime.globals['count'+i]}),[1,1]);});
