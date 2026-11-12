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

test('pressure plate opens, closes and reopens a linked door in both workspace modes',()=>{
 for(const mode of ['2d','3d']){
  resetSequences();const player={id:1,type:'player',x:0,y:0,w:20,h:20};
  const plate={id:2,name:'Plaque',x:0,y:0,w:20,h:20,sequence:createBlueprintPreset('pressure-plate-enter',mode),sequences:[createBlueprintPreset('pressure-plate-exit',mode)]};
  const door={id:3,name:'Porte',x:500,y:0,w:20,h:20,visible:true,collision3d:true,collider2d:{enabled:true},sequence:createBlueprintPreset('mechanism-door-open',mode),sequences:[createBlueprintPreset('mechanism-door-close',mode)]};
  const context={playing:true,mode,entities:[player,plate,door],player,keys:new Set()};
  const tick=()=>{updateSequences(.016,context);updateSequences(.016,context);};
  tick();assert.equal(door.visible,false,mode+' opens');assert.equal(door.collision3d,false);assert.equal(door.collider2d.enabled,false);
  player.x=250;tick();assert.equal(door.visible,true,mode+' closes');assert.equal(door.collision3d,true);assert.equal(door.collider2d.enabled,true);
  player.x=0;tick();assert.equal(door.visible,false,mode+' repeats');assert.equal(sequenceRuntime.errors.length,0);
 }
});
