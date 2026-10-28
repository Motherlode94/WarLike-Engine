import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {quaterniusModels3d} from '../js/assets/quaternius-game-assets.js';
import {freeModels3d} from '../js/assets/free-game-assets.js';
import {parseGlb} from '../js/assets/real-models-3d.js';
import {get3dAsset,prefab3d} from '../js/assets/catalog-3d.js';
import {gameRuntimeFiles,gameRuntimeModels,gameBuildModelCatalog} from '../js/core/game-build.js';
import {sampleRigPose,deformGlbParts} from '../js/core/gltf-animation.js';
const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root));
const geometry=a=>{const b=read(a.url);return parseGlb(b.buffer.slice(b.byteOffset,b.byteOffset+b.length),{baseUrl:new URL(a.url,root).href})};
test('complete Quaternius packs contain real geometry, original clips, local textures and source hashes',()=>{
 assert.equal(quaterniusModels3d.length,2910);assert.equal(new Set(quaterniusModels3d.map(a=>a.pack)).size,55);
 for(const asset of JSON.parse(read('assets/free/quaternius/models.json'))){
  assert.equal(createHash('sha256').update(read(asset.url)).digest('hex'),asset.sha256,asset.id);
  const g=geometry(asset);assert.equal(g.triangleCount,asset.triangles,asset.id);assert.ok(g.parts.every(p=>p.vertices.every(Number.isFinite)),asset.id);
  assert.deepEqual(g.rig?.animations.map(a=>a.name)||[],asset.animationClips,asset.id);assert.equal(get3dAsset(asset.id).url,asset.url);assert.equal(prefab3d(asset.id).model3dId,asset.id);
  assert.equal(asset.author,'Quaternius');assert.match(asset.sourceUrl,/^https:\/\/quaternius.com\/packs\//);assert.equal(asset.license,'CC0-1.0');
  for(const texture of asset.textureFiles||[])assert.ok(existsSync(new URL(texture,root)),texture);
 }
});
test('FBX conversion retains every dinosaur take and fixes fully transparent legacy FBX materials',()=>{
 const asset=quaterniusModels3d.find(a=>a.id==='quaternius-animateddinosaurs-velociraptor'),g=geometry(asset);
 assert.equal(g.rig.animations.length,6);assert.ok(g.rig.animations.some(a=>/Walk/.test(a.name)));
 assert.ok(g.parts.some(p=>p.color[3]>0));
 for(const clip of g.rig.animations){const posed=deformGlbParts(g,sampleRigPose(g.rig,clip,.2));assert.ok(posed.every(vertices=>vertices.every(Number.isFinite)),clip.name)}
 const skins=freeModels3d.filter(a=>a.pack.startsWith('animated-characters-'));assert.equal(skins.length,12);for(const a of skins){assert.ok(a.animationClips.some(n=>/idle/i.test(n)),a.id);assert.ok(a.animationClips.some(n=>/run/i.test(n)),a.id)}
});
test('models across every requested family are included with source previews',()=>{
 const all=[...freeModels3d,...quaterniusModels3d];assert.equal(new Set(all.map(a=>a.id)).size,all.length);
 for(const category of ['Characters','Weapons','Vehicles','Monsters','Animals','Buildings','Nature','Props','Food'])assert.ok(all.filter(a=>a.category===category).length>=10,category);
 for(const asset of all)assert.ok(existsSync(new URL(asset.thumbnailUrl,root)),asset.id);
 for(const texture of JSON.parse(read('assets/free/textures.json')))assert.equal(createHash('sha256').update(read(texture.url)).digest('hex'),texture.sha256,texture.url);
});
test('game export includes models referenced in any scene or Blueprint and their shared textures only',()=>{
 const used=quaterniusModels3d.find(a=>a.textureFiles?.length),unused=freeModels3d.find(a=>!a.textureFiles?.length);
 const files=['index.html','js/editor.js',used.url.slice(2),unused.url.slice(2),...used.textureFiles.map(p=>p.slice(2)),'assets/free/textures/unused.png',used.thumbnailUrl.slice(2),'assets/free/quaternius/'+used.pack+'/CREDITS.txt','assets/free/kenney/ui-pack/menu.png','assets/free/kenney/rpg-audio/door.ogg'];
 const selected=gameRuntimeFiles(files,{project:{scenes:[{entities:[]},{entities:[{sequence:{actions:[{assetId:used.id}]}}]}]}});
 assert.ok(selected.includes(used.url.slice(2)));for(const texture of used.textureFiles)assert.ok(selected.includes(texture.slice(2)));
 assert.ok(!selected.includes(unused.url.slice(2)));assert.ok(!selected.includes('assets/free/textures/unused.png'));assert.ok(!selected.some(p=>p.includes('/previews/')));assert.ok(selected.includes('assets/free/kenney/ui-pack/menu.png'));assert.ok(selected.includes('assets/free/kenney/rpg-audio/door.ogg'));
});

test('game catalogs keep model aliases and Blueprint dependencies without shipping the editor library',()=>{
 const data={project:{scenes:[{entities:[{sequence:{actions:[{assetId:'character-hero'}]}}]}]}};
 const models=gameRuntimeModels(data);assert.equal(models.length,1);assert.equal(models[0].id,'free-mini-characters-character-male-a');
 const source=read('js/assets/free-game-assets.js').toString();const output=gameBuildModelCatalog('js/assets/free-game-assets.js',source,data);
 assert.ok(output.includes('free-mini-characters-character-male-a'));assert.ok(!output.includes('free-car-kit-sedan'));assert.ok(output.includes('export const freeSprites2d='));assert.ok(output.includes('export const freeAudioAssets='));
 assert.equal(gameBuildModelCatalog('js/assets/quaternius-game-assets.js','',data),'export const quaterniusModels3d=[];\n');
});
