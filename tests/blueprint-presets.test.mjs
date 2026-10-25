import test from 'node:test';
import assert from 'node:assert/strict';
import {presetsForWorkspace,createBlueprintPreset} from '../js/core/blueprint-presets.js';
import {resetSequences,updateSequences,sequenceRuntime} from '../js/core/logic-sequences.js';
test('2D and 3D both expose interactive and conditional Blueprint templates',()=>{
 for(const mode of ['2d','3d']){
  const options=presetsForWorkspace(mode);
  assert.ok(options.some(x=>x.id==='interact'));
  assert.ok(options.some(x=>x.id==='door'));
  assert.ok(options.every(x=>x.modes.includes(mode)));
  assert.equal(createBlueprintPreset('interact',mode).event,'interact');
 }
});
test('workspace-specific presets cannot leak between modes',()=>{
 assert.throws(()=>createBlueprintPreset('moving3d','2d'));
 assert.throws(()=>createBlueprintPreset('moving2d','3d'));
});
test('Blueprint preset instances do not share mutable actions',()=>{
 const a=createBlueprintPreset('door','3d'),b=createBlueprintPreset('door','3d');
 a.branches[0].instructions[0].value='Changed';
 assert.equal(b.branches[0].instructions[0].value,'Porte ouverte !');
});
test('Blueprint trigger uses the shared sequence runtime',()=>{
 resetSequences();
 const object={id:1,x:10,y:10,w:30,h:30,sequence:createBlueprintPreset('trigger','3d')};
 const player={id:2,x:20,y:20,w:30,h:30};
 updateSequences(.016,{playing:true,entities:[object,player],player,keys:new Set()});
 assert.equal(sequenceRuntime.messages[0]?.text,'Zone détectée !');
});
