import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlueprintPreset,presetsForWorkspace} from '../js/core/blueprint-presets.js';
import {sequenceInstructions,sequenceEvents,conditionPass} from '../js/core/logic-sequences.js';
test('new survival horror library uses supported native instructions',()=>{for(const mode of ['2d','3d']){const list=presetsForWorkspace(mode).filter(p=>p.category==='Survival Horror');assert.equal(list.length,9);for(const p of list){const s=createBlueprintPreset(p.id,mode);assert.ok(sequenceEvents.includes(s.event));for(const a of s.instructions)assert.ok(sequenceInstructions.includes(a.type));}}});
test('locked door tests real player inventory',()=>{const s=createBlueprintPreset('BP_Horror_LockedDoor','3d'),door={id:1},player={id:2,inventory:{capacity:16,items:[]}},ctx={entities:[door,player],player};const c=s.instructions[0].conditions[0];assert.equal(conditionPass(c,door,ctx),false);player.inventory.items.push({id:'horror-key',count:1});assert.equal(conditionPass(c,door,ctx),true);});
