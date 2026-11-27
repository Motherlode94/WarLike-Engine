import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlueprintPreset,presetsForWorkspace} from '../js/core/blueprint-presets.js';
import {sequenceInstructions,sequenceEvents} from '../js/core/logic-sequences.js';
test('racing kit is 3D only and uses native instructions',()=>{const racing=presetsForWorkspace('3d').filter(p=>p.id.startsWith('BP_Racing_'));assert.equal(racing.length,8);assert.ok(!presetsForWorkspace('2d').some(p=>p.id.startsWith('BP_Racing_')));for(const p of racing){const s=createBlueprintPreset(p.id,'3d');assert.ok(sequenceEvents.includes(s.event));for(const a of s.instructions)assert.ok(sequenceInstructions.includes(a.type));}});
test('ordered lap gates require A then B then finish',()=>{const a=createBlueprintPreset('BP_Racing_Checkpoint_A','3d'),b=createBlueprintPreset('BP_Racing_Checkpoint_B','3d'),lap=createBlueprintPreset('BP_Racing_Lap','3d');assert.equal(a.conditions[1].value,0);assert.equal(b.conditions[1].value,1);assert.equal(lap.conditions[1].value,2);assert.equal(lap.instructions[0].value,0);assert.equal(lap.instructions[2].type,'addObjectiveProgress');});
