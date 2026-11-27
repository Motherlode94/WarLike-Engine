import test from 'node:test';
import assert from 'node:assert/strict';
import {sequenceEntries,sequenceInstructions} from '../js/core/logic-sequences.js';
import {createGraph,applyGraph} from '../js/core/blueprint-graph.js';
test('generic component attachments use native graphs across gameplay families',()=>{
 const cases=[['health','setHealth',100],['interaction','setVisibility',false],['enemy','setAiState','patrol'],['vehicle','setVehicleEngine',true]];
 const owner={id:42,sequence:{event:'start'},blueprintComponents:cases.map(([id,type,value])=>({id,enabled:true,sequence:{event:'interact',graph:createGraph({event:'interact',instructions:[{type,value}]})}}))};
 const entries=sequenceEntries(owner);
 assert.equal(entries.length,5);
 for(const [i,[id,type,value]] of cases.entries()){
 const entry=entries[i+1];
 assert.equal(entry.key,'42:blueprint:'+id);
 assert.ok(sequenceInstructions.includes(type));
 applyGraph(entry.sequence);
 assert.equal(entry.sequence.instructions[0].type,type);
 assert.equal(entry.sequence.instructions[0].value,value);
 }
 const saved=JSON.parse(JSON.stringify(owner));
 saved.blueprintComponents.reverse();
 assert.deepEqual(sequenceEntries(saved).map(x=>x.key).sort(),entries.map(x=>x.key).sort());
 saved.blueprintComponents[0].enabled=false;
 assert.equal(sequenceEntries(saved).length,4);
 saved.blueprintComponents.push({id:'enemy',sequence:{event:'start'}});
 assert.equal(sequenceEntries(saved).length,4);
});
