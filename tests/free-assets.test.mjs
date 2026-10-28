import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {freeModels3d,freeSprites2d,freeUiAssets,freeAudioAssets} from '../js/assets/free-game-assets.js';
import {parseGlb} from '../js/assets/real-models-3d.js';
import {getAsset,urlFor} from '../js/assets/catalog.js';
import {get3dAsset,prefab3d} from '../js/assets/catalog-3d.js';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root));
const fileFor=a=>(a.url||a.spriteUrl).replace(/^\.\//,'');
test('every included asset has a real local file, publisher, CC0 license and official pack link',()=>{
 for(const asset of [...freeModels3d,...freeSprites2d,...freeUiAssets,...freeAudioAssets]){
  assert.equal(asset.author,'Kenney');assert.match(asset.license,/CC0/);assert.equal(asset.sourceUrl,'https://kenney.nl/assets/'+asset.pack);assert.ok(asset.packName);assert.ok(existsSync(new URL(fileFor(asset),root)),asset.id);
 }
 assert.equal(freeModels3d.length,31);assert.equal(freeSprites2d.length,100);assert.equal(freeUiAssets.length,40);assert.equal(freeAudioAssets.length,24);
});
test('vendored files match the recorded source hashes without substitutions',()=>{
 for(const manifest of ['models','sprites','ui','audio'])for(const asset of JSON.parse(read('assets/free/kenney/'+manifest+'.json'))){assert.equal(createHash('sha256').update(read(fileFor(asset))).digest('hex'),asset.sha256,asset.id)}
});
test('all bundled GLBs parse with complete geometry, proportions and embedded texture UVs',()=>{
 let textured=0;
 for(const asset of freeModels3d){const bytes=read(fileFor(asset)),geometry=parseGlb(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length));assert.equal(geometry.triangleCount,asset.triangles,asset.id);assert.ok(geometry.normalizedSize.every(v=>Number.isFinite(v)&&v>0&&v<=1));
  for(const part of geometry.parts){assert.ok([...part.vertices].every(Number.isFinite));if(part.texture){textured++;assert.equal(part.texcoords.length,part.vertices.length/3);assert.ok([...part.texcoords].every(Number.isFinite));assert.deepEqual([...part.texture.bytes.slice(0,8)],[137,80,78,71,13,10,26,10])}}
  assert.equal(get3dAsset(asset.id),asset);assert.equal(prefab3d(asset.id).model3dId,asset.id);
 }
 assert.ok(textured>20,'real color textures must be retained, rather than a flat gray replacement');
});
test('real 2D sprites, UI and animation frames resolve as PNG files in the catalog',()=>{
 for(const asset of [...freeSprites2d,...freeUiAssets]){assert.equal(getAsset(asset.id),asset);assert.equal(urlFor(asset.id),asset.spriteUrl);for(const path of [asset.spriteUrl,...Object.values(asset.frames||{}).flat()]){assert.deepEqual([...read(path.replace(/^\.\//,'')).slice(0,8)],[137,80,78,71,13,10,26,10])}}
 assert.ok(freeSprites2d.some(a=>a.frames?.walk?.length===11));
 for(const asset of freeAudioAssets)assert.equal(read(fileFor(asset)).subarray(0,4).toString(),'OggS');
});
