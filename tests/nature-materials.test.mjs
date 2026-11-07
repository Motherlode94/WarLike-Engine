import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parseGlb} from '../js/assets/real-models-3d.js';
import {toStoreAsset} from '../asset-store/catalog-bundled.js';
import {gameRuntimeFiles} from '../js/core/game-build.js';
const root=new URL('../',import.meta.url),models=JSON.parse(readFileSync(new URL('assets/free/quaternius/models.json',root)));
const fixed=models.filter(a=>a.materialRepair?.recipe==='ruins-original-textures-v1');
test('eleven Ruins nature models restore only verified original leaf and bark images',()=>{
 assert.equal(fixed.length,11);
 for(const a of fixed){
  const b=readFileSync(new URL(a.url,root));assert.equal(createHash('sha256').update(b).digest('hex'),a.sha256);assert.equal(b.length,a.bytes);
  const geometry=parseGlb(b.buffer.slice(b.byteOffset,b.byteOffset+b.length));assert.equal(geometry.triangleCount,a.triangles);
  for(let k=0;k<3;k++)assert.ok(Math.abs(geometry.normalizedSize[k]-a.normalizedSize[k])<1e-5);
  const textures=geometry.parts.filter(p=>p.texture);assert.ok(textures.length>0);
  for(const repair of a.materialRepair.textures){
   assert.ok(['Textures/Leaf_Texture.png','Textures/Bark_Texture.jpg'].includes(repair.sourceFile));
   const part=textures.find(p=>createHash('sha256').update(p.texture.bytes).digest('hex')===repair.sha256);assert.ok(part,a.id);assert.ok(part.texcoords.length>0);
   if(repair.sourceFile.endsWith('.png'))assert.equal(part.alphaMode,'MASK');
  }
  assert.equal(toStoreAsset(a,'Quaternius').size,b.length);
 }
});
test('repaired foliage exports as a self-contained model with original texture bytes',()=>{
 const a=fixed.find(a=>a.name==='Bush 1x1');assert.ok(a);
 const files=gameRuntimeFiles([a.url.slice(2),a.thumbnailUrl.slice(2)],{project:{scenes:[{entities:[{model3dId:a.id}]}]}});
 assert.deepEqual(files,[a.url.slice(2)]);
});
