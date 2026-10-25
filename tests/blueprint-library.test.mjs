import test from 'node:test';
import assert from 'node:assert/strict';
import {blueprintPresets,presetsForWorkspace,createBlueprintPreset} from '../js/core/blueprint-presets.js';
import {sequenceInstructions,sequenceEvents} from '../js/core/logic-sequences.js';
test('Blueprint library has distinct names and executable action types',()=>{
 assert.equal(new Set(blueprintPresets.map(p=>p.id)).size,blueprintPresets.length);
 for(const preset of blueprintPresets){
  const mode=preset.modes[0],s=createBlueprintPreset(preset.id,mode);
  assert.ok(sequenceEvents.includes(s.event),preset.id);
  const steps=[...(s.instructions||[]),...(s.elseInstructions||[]),...(s.branches||[]).flatMap(b=>b.instructions||[])];
  assert.ok(steps.length>0,preset.id);
  for(const step of steps)assert.ok(sequenceInstructions.includes(step.type),preset.id+' '+step.type);
 }
});
test('library differentiates 2D and 3D platform movement but shares gameplay',()=>{
 for(const mode of ['2d','3d']){
  const items=presetsForWorkspace(mode);
  assert.ok(items.length>=12);
  assert.ok(items.every(p=>p.category&&p.modes.includes(mode)));
  for(const id of ['pickup','trap','checkpoint','alarm','heal'])assert.ok(items.some(p=>p.id===id));
 }
 assert.ok(!presetsForWorkspace('2d').some(p=>p.id==='platform3d'));
 assert.ok(!presetsForWorkspace('3d').some(p=>p.id==='platform2d'));
});
