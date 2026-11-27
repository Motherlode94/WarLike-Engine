import test from 'node:test';
import assert from 'node:assert/strict';
import {updateSequences,resetSequences,sequenceRuntime} from '../js/core/logic-sequences.js';
import {restoreGameProject} from '../js/core/game-project.js';
import {createGraph,applyGraph} from '../js/core/blueprint-graph.js';
test('vehicle graph observes driver entry exit and engine change',()=>{
 restoreGameProject({id:'wgc-vehicle',title:'WGC'});resetSequences();
 const o={id:1,type:'player',x:0,y:0,w:20,h:20,hp:100,vehicleSystems:{engine:{enabled:true},seats:{driverId:null}},blueprintComponents:['vehicleDriverEntered','vehicleDriverExited','vehicleEngineChanged'].map((event,i)=>{const sequence={event,instructions:[{type:'addVariable',key:'count'+i,value:1}]};sequence.graph=createGraph(sequence);applyGraph(sequence);return {id:'event'+i,sequence}})};
 const tick=()=>updateSequences(.1,{playing:true,entities:[o],player:o,keys:new Set()});
 tick();o.vehicleSystems.seats.driverId=9;tick();o.vehicleSystems.seats.driverId=null;o.vehicleSystems.engine.enabled=false;tick();tick();
 assert.deepEqual([0,1,2].map(i=>sequenceRuntime.globals['count'+i]),[1,1,1]);
});
