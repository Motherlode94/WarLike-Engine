import test from 'node:test';
import assert from 'node:assert/strict';
import {presetsForWorkspace,createBlueprintPreset} from '../js/core/blueprint-presets.js';
import {renderQuality,applyHorrorAtmosphere} from '../js/core/render-quality.js';
test('legacy horror Blueprints remain executable but hidden in both workspaces',()=>{
 for(const mode of ['2d','3d']){
  const horror=presetsForWorkspace(mode).filter(p=>p.category==='Horreur');
  assert.equal(horror.length,0);
  for(const id of ["horror-whisper","horror-jumpscare","horror-flicker","horror-chase","horror-locked","horror-clue","horror-search","horror-hide","horror-sound"]){const s=createBlueprintPreset(id,mode);assert.ok(s.event);assert.ok(s.instructions?.length||s.branches?.length)}
 }
});
test('horror lighting settings remain in renderer limits',()=>{
 applyHorrorAtmosphere();
 assert.ok(renderQuality.ambient2d<=.3);
 assert.ok(renderQuality.fog3d>=.03);
 assert.ok(renderQuality.exposure3d<1);
});
