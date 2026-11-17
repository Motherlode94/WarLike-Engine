import test from 'node:test';
import assert from 'node:assert/strict';
import {genreTemplates} from '../js/core/game-genres.js';
import {createGenreScene} from '../js/core/genre-templates.js';
import {createBundledTestScene} from '../js/core/bundled-test-scene.js';
import {inspectBundledGame} from '../js/core/demo-playability-audit.js';
import {ensureDemoGameCamera} from '../js/core/demo-native-camera.js';

test('all engine genre demos create an editable scene with valid goals and camera',()=>{
 let checked=0;
 for(const [genre,template] of Object.entries(genreTemplates)){
  if(genre==='sandbox')continue;
  for(const mode of template.modes){
   const scene=createGenreScene(genre,mode);
   const issues=inspectBundledGame(scene,mode,{genre});
   assert.deepEqual(issues.filter(i=>i.severity==='error'),[],genre+' / '+mode+': '+JSON.stringify(issues));
   assert.ok(scene.entities.length>2,genre+' '+mode+' should contain real game entities');
   assert.ok(Number.isSafeInteger(scene.nextId),'nextId missing: '+genre);
   const nativeCamera=mode==='3d'?'sceneCamera3d':'camera2d';
   if(!(mode==='3d'&&['rts','company','battlefield'].includes(genre))){
    const cameras=scene.entities.filter(o=>o[nativeCamera]);
    assert.equal(cameras.length,1,genre+' '+mode+' must have exactly one active native Game Camera');
    const actor=scene.entities.find(o=>o.id===scene.playerId)||scene.entities.find(o=>o.playable3d||o.type==='player'||o.controller2d);
    assert.equal(cameras[0][nativeCamera].targetId,actor.id,genre+' '+mode+' camera target');
   }
   checked++;
  }
 }
 assert.ok(checked>=25,'cover all supported native 2D and 3D modes');
});
test('all original bundled authored 3D games have a genuine Camera and preserve editable entities',()=>{
 for(const genre of ['town','nature','garage']){
  const scene=createBundledTestScene(genre);
  const camera=scene.entities.find(o=>o.sceneCamera3d);
  assert.ok(camera,'Camera missing in '+genre);
  assert.ok(scene.entities.some(o=>o.id===scene.playerId),'player missing in '+genre);
  assert.equal(camera.sceneCamera3d.targetId,scene.playerId);
 }
});
test('Field Lab victory is a real Blueprint action conditional on completed tasks',()=>{
 for(const mode of ['2d','3d']){
  const scene=createGenreScene('fieldlab',mode);
  const final=scene.entities.find(o=>o.name==='05 · Diagnostic final');
  assert.ok(final);
  assert.ok(final.sequence.branches[0].conditions.some(c=>c.key==='labWalk'));
  assert.ok(final.sequence.branches[0].conditions.some(c=>c.key==='labInteract'));
  assert.ok(final.sequence.branches[0].conditions.some(c=>c.key==='labDrive'));
  assert.ok(final.sequence.branches[0].instructions.some(i=>i.type==='winGame'));
 }
});
test('diagnostics detect orphan mission targets, invalid IDs and missing player',()=>{
 const scene={entities:[{id:1,name:'Sample',type:'object',x:0,y:0,sequence:{enabled:true,event:'start'},adventure:{demo:{steps:[{goal:'missing',targetId:20}]}}}]};
 const issues=inspectBundledGame(scene,'2d',{genre:'rpg'});
 assert.ok(issues.some(i=>i.code==='target'));
 assert.ok(issues.some(i=>i.code==='player'));
 assert.ok(issues.some(i=>i.code==='camera'));
});
test('adding a game camera is idempotent and does not modify the selected player',()=>{
 const scene=createGenreScene('rpg','3d');
 const size=scene.entities.length,selection=[...scene.selected];
 ensureDemoGameCamera(scene,'3d',{genre:'rpg'});
 assert.equal(scene.entities.length,size);
 assert.deepEqual(scene.selected,selection);
});
