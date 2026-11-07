import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {kaykitModels3d} from '../js/assets/kaykit-game-assets.js';
import {parseGlb} from '../js/assets/real-models-3d.js';
import {get3dAsset} from '../js/assets/catalog-3d.js';
import {gameBuildModelCatalog,gameRuntimeFiles} from '../js/core/game-build.js';
import {toStoreAsset} from '../asset-store/catalog-bundled.js';
import {prefabFromBundledAsset} from '../asset-store/prefab-store.js';
import {recommendedGenres} from '../asset-store/genre-relevance.js';
const read=p=>readFileSync(new URL('../'+p.replace(/^\.\//,''),import.meta.url));
test('all 151 official KayKit meshes decode with original embedded textures, UVs and bounded geometry',()=>{
 assert.equal(kaykitModels3d.length,151);assert.equal(new Set(kaykitModels3d.map(a=>a.id)).size,151);
 const previews=new Set();
 for(const a of kaykitModels3d){
  const bytes=read(a.url);assert.equal(createHash('sha256').update(bytes).digest('hex'),a.sha256);
  const g=parseGlb(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length));
  assert.equal(g.triangleCount,a.triangles,a.id);assert.ok(g.parts.length>0);
  for(const part of g.parts){assert.ok(part.texture?.bytes?.length>8,a.id);assert.ok(part.texcoords?.length>0);assert.ok(part.vertices.every(Number.isFinite))}
  for(let i=0;i<3;i++)assert.ok(Math.abs(g.normalizedSize[i]-a.normalizedSize[i])<1e-5,a.id);
  assert.equal(get3dAsset(a.id)?.url,a.url);
  const png=read(a.thumbnailUrl);assert.equal(png.subarray(1,4).toString(),'PNG');previews.add(createHash('sha256').update(png).digest('hex'));
  const store=toStoreAsset(a,'KayKit');assert.equal(store.bundled,true);assert.equal(prefabFromBundledAsset({...store,url:new URL(a.url,'https://warlike-engine.pages.dev/').href}).components.model3dId,a.id);
 }
 assert.ok(previews.size>140);
});
test('genre suggestions prioritize urban tactical scenes and survival bases, keeping furniture in interiors',()=>{
 const city=kaykitModels3d.find(a=>a.pack==='city-builder-bits');const space=kaykitModels3d.find(a=>a.pack==='space-base-bits');const furniture=kaykitModels3d.find(a=>a.pack==='furniture-bits');
 assert.ok(recommendedGenres(city).includes('tactical'));assert.ok(recommendedGenres(space).includes('survival'));assert.ok(!recommendedGenres(furniture).includes('tactical'));
 assert.ok(recommendedGenres({pack:'animatedtanks'}).includes('tactical'));
 assert.equal(toStoreAsset({...city,url:'./assets/free/kaykit/../outside.glb'},'KayKit'),null);
});
test('playable exports include referenced KayKit models and trim the rest of the new catalog',()=>{
 const used=kaykitModels3d.find(a=>a.id.includes('car-police')),unused=kaykitModels3d.find(a=>a.pack==='space-base-bits');
 const data={project:{scenes:[{entities:[{model3dId:used.id}]}]}};
 const files=gameRuntimeFiles([used.url.slice(2),unused.url.slice(2),used.thumbnailUrl.slice(2)],data);
 assert.deepEqual(files,[used.url.slice(2)]);
 const output=gameBuildModelCatalog('js/assets/kaykit-game-assets.js','',data);assert.ok(output.includes(used.id));assert.ok(!output.includes(unused.id));
});
