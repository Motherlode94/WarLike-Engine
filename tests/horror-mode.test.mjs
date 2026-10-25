import test from 'node:test';
import assert from 'node:assert/strict';
import {presetsForWorkspace,createBlueprintPreset} from '../js/core/blueprint-presets.js';
import {renderQuality,applyHorrorAtmosphere} from '../js/core/render-quality.js';
test('horror Blueprint library covers both 2D and 3D',()=>{
 for(const mode of ['2d','3d']){
  const horror=presetsForWorkspace(mode).filter(p=>p.category==='Horreur');
  assert.equal(horror.length,6);
  for(const p of horror){const s=createBlueprintPreset(p.id,mode);assert.ok(s.event);assert.ok(s.instructions?.length||s.branches?.length)}
 }
});
test('horror lighting settings remain in renderer limits',()=>{
 applyHorrorAtmosphere();
 assert.ok(renderQuality.ambient2d<=.3);
 assert.ok(renderQuality.fog3d>=.03);
 assert.ok(renderQuality.exposure3d<1);
});
