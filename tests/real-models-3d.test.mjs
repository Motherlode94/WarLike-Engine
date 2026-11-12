import test from 'node:test';
import assert from 'node:assert/strict';
import {parseGlb,resolveGlbTextureUrl,realModels3d,registerLocalModel,model3dById} from '../js/assets/real-models-3d.js';
import {prefab3d,get3dAsset,allAssets3d} from '../js/assets/catalog-3d.js';
test('real GLB prefabs are referenced in 3D catalog',()=>{
 assert.ok(realModels3d.length>=7);
 for(const asset of realModels3d){
  assert.ok(asset.url.startsWith('https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/')||asset.url.startsWith('./assets/free/kenney/')||asset.url.startsWith('./assets/free/quaternius/')||asset.url.startsWith('./assets/free/kaykit/'));
  assert.equal(get3dAsset(asset.id)?.shape,'glb');
  const p=prefab3d(asset.id,1,180,200);
  assert.equal(p.type,'mesh3d');assert.equal(p.model3dId,asset.id);
 }
 assert.ok(allAssets3d().length>=50);
});
test('accept locally imported weapons via GLB asset registration',()=>{
 const weapon=registerLocalModel({name:'test-rifle.glb',size:16});
 weapon.category='Weapons';
 assert.equal(model3dById(weapon.id).category,'Weapons');
 assert.equal(prefab3d(weapon.id).model3dId,weapon.id);
 assert.throws(()=>registerLocalModel({name:'bad.fbx',size:16}),/\.glb/);
});
test('parse real glTF 2.0 indexed triangle from a binary GLB',()=>{
 const json={asset:{version:'2.0'},scenes:[{nodes:[0]}],nodes:[{mesh:0}],
  meshes:[{primitives:[{attributes:{POSITION:0},indices:1}]}],
  accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3'},{bufferView:1,componentType:5123,count:3,type:'SCALAR'}],
  bufferViews:[{buffer:0,byteOffset:0,byteLength:36},{buffer:0,byteOffset:36,byteLength:6}]};
 const bytes=new TextEncoder().encode(JSON.stringify(json)),jsonSize=Math.ceil(bytes.length/4)*4,binSize=44;
 const buffer=new ArrayBuffer(12+8+jsonSize+8+binSize),view=new DataView(buffer);
 view.setUint32(0,0x46546c67,true);view.setUint32(4,2,true);view.setUint32(8,buffer.byteLength,true);
 view.setUint32(12,jsonSize,true);view.setUint32(16,0x4e4f534a,true);
 new Uint8Array(buffer,20,jsonSize).fill(32);new Uint8Array(buffer,20,bytes.length).set(bytes);
 const body=20+jsonSize;view.setUint32(body,binSize,true);view.setUint32(body+4,0x004e4942,true);
 const start=body+8;[0,0,0,1,0,0,0,1,0].forEach((n,i)=>view.setFloat32(start+i*4,n,true));
 [0,1,2].forEach((n,i)=>view.setUint16(start+36+i*2,n,true));
 const result=parseGlb(buffer);assert.equal(result.triangleCount,1);assert.equal(result.parts[0].vertices.length,18);
});

// More than three vertices is essential here: a single triangle cannot catch an
// accessor's element count being confused with its VEC3 component count.
function meshGlb(positions,{indices,stride=12,offset=0,mode=4}={}){
 const count=positions.length/3,positionBytes=count*stride,indexOffset=positionBytes;
 const binary=new Uint8Array(Math.ceil((positionBytes+(indices?.length||0)*2)/4)*4),data=new DataView(binary.buffer);
 for(let vertex=0;vertex<count;vertex++)for(let component=0;component<3;component++)data.setFloat32(vertex*stride+offset+component*4,positions[vertex*3+component],true);
 const primitive={attributes:{POSITION:0},mode},accessors=[{bufferView:0,byteOffset:offset,componentType:5126,count,type:'VEC3'}];
 const bufferViews=[{buffer:0,byteLength:positionBytes,byteStride:stride}];
 if(indices){primitive.indices=1;indices.forEach((value,i)=>data.setUint16(indexOffset+i*2,value,true));accessors.push({bufferView:1,componentType:5123,count:indices.length,type:'SCALAR'});bufferViews.push({buffer:0,byteOffset:indexOffset,byteLength:indices.length*2})}
 const json={asset:{version:'2.0'},scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[primitive]}],accessors,bufferViews};
 const encoded=new TextEncoder().encode(JSON.stringify(json)),length=Math.ceil(encoded.length/4)*4;
 const glb=new ArrayBuffer(28+length+binary.length),view=new DataView(glb);
 view.setUint32(0,0x46546c67,true);view.setUint32(4,2,true);view.setUint32(8,glb.byteLength,true);
 view.setUint32(12,length,true);view.setUint32(16,0x4e4f534a,true);
 new Uint8Array(glb,20,length).fill(32);new Uint8Array(glb,20,encoded.length).set(encoded);
 view.setUint32(20+length,binary.length,true);view.setUint32(24+length,0x004e4942,true);new Uint8Array(glb,28+length).set(binary);
 return glb;
}
test('indexed meshes retain all faces whose indices exceed the VEC3 component count',()=>{
 const mesh=parseGlb(meshGlb([0,0,0, 1,0,0, 1,1,0, 0,1,0],{indices:[0,1,2,0,2,3]}));
 assert.equal(mesh.triangleCount,2);assert.equal(mesh.parts[0].vertices.length,36);
 assert.ok([...mesh.parts[0].vertices].every(Number.isFinite));
});
test('non-indexed meshes retain every triangle beyond the first three positions',()=>{
 const mesh=parseGlb(meshGlb([0,0,0, 1,0,0, 0,1,0, 0,0,1, 1,0,1, 0,1,1]));
 assert.equal(mesh.triangleCount,2);
});
test('interleaved position accessor counts and byte offsets preserve the complete mesh',()=>{
 const mesh=parseGlb(meshGlb([0,0,0, 1,0,0, 1,1,0, 0,1,0],{indices:[0,1,2,0,2,3],stride:20,offset:4}));
 assert.equal(mesh.triangleCount,2);
});
test('invalid indices discard only the affected face after valid higher-index faces',()=>{
 const mesh=parseGlb(meshGlb([0,0,0, 1,0,0, 1,1,0, 0,1,0],{indices:[0,1,2,0,2,3,0,3,4]}));
 assert.equal(mesh.triangleCount,2);
});

test('GLB non-indexed TRIANGLE_STRIP renders both faces of a quad with consistent orientation',()=>{
 const quad=meshGlb([0,0,0,1,0,0,0,1,0,1,1,0],{mode:5});
 const result=parseGlb(quad),vertices=result.parts[0].vertices;
 assert.equal(result.triangleCount,2);
 assert.equal(vertices.length,36);
 // The winding of odd strip triangles must alternate before triangulation.
 const first=[vertices[3],vertices[4],vertices[5]],second=[vertices[21],vertices[22],vertices[23]];
 assert.ok(first.every((v,i)=>Math.abs(v-second[i])<1e-6),'Strip faces must share their outward normal');
});
test('GLB indexed TRIANGLE_FAN reconstructs all three connected triangles',()=>{
 const pentagon=meshGlb([0,0,0,1,0,0,1,1,0,0,2,0,-1,1,0],{indices:[0,1,2,3,4],mode:6});
 const result=parseGlb(pentagon);
 assert.equal(result.triangleCount,3);
 assert.equal(result.parts[0].vertices.length,54);
});
test('GLB strip safely removes degenerates and preserves unaffected surfaces',()=>{
 const positions=[0,0,0,1,0,0,0,1,0,1,1,0];
 const result=parseGlb(meshGlb(positions,{indices:[0,1,2,2,3,1],mode:5}));
 assert.equal(result.triangleCount,2);
 assert.ok(result.parts[0].vertices.every(Number.isFinite));
});

function texturedGlb({uri='textures/albedo.png?rev=3',uv=true,texCoord=0}={}){
 const binary=new Uint8Array(60),view=new DataView(binary.buffer);
 [0,0,0,1,0,0,0,1,0].forEach((n,i)=>view.setFloat32(i*4,n,true));
 [0,0,1,0,0,1].forEach((n,i)=>view.setFloat32(36+i*4,n,true));
 const attributes={POSITION:0};if(uv)attributes.TEXCOORD_0=1;
 const gltf={asset:{version:'2.0'},scenes:[{nodes:[0]}],nodes:[{mesh:0}],
  meshes:[{primitives:[{attributes,material:0}]}],
  accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3'},
   {bufferView:1,componentType:5126,count:3,type:'VEC2'}],
  bufferViews:[{buffer:0,byteLength:36},{buffer:0,byteOffset:36,byteLength:24}],
  materials:[{pbrMetallicRoughness:{baseColorFactor:[.5,.25,1,1],baseColorTexture:{index:0,texCoord},roughnessFactor:.4,metallicFactor:.2}}],
  textures:[{source:0,sampler:0}],samplers:[{wrapS:10497,wrapT:33071}],images:[{uri}]};
 const encoded=new TextEncoder().encode(JSON.stringify(gltf)),pad=Math.ceil(encoded.byteLength/4)*4;
 const out=new ArrayBuffer(28+pad+binary.length),result=new DataView(out);
 result.setUint32(0,0x46546c67,true);result.setUint32(4,2,true);result.setUint32(8,out.byteLength,true);
 result.setUint32(12,pad,true);result.setUint32(16,0x4e4f534a,true);
 new Uint8Array(out,20,pad).fill(32);new Uint8Array(out,20,encoded.length).set(encoded);
 result.setUint32(20+pad,binary.length,true);result.setUint32(24+pad,0x004e4942,true);
 new Uint8Array(out,28+pad).set(binary);
 return out;
}
test('relative GLB texture URIs with query or fragment remain valid and same-origin',()=>{
 const url='https://example.org/models/furniture/chair.glb';
 assert.equal(resolveGlbTextureUrl('../textures/Wood%20Oak.PNG?rev=4#base',url),
  'https://example.org/models/textures/Wood%20Oak.PNG?rev=4#base');
 assert.equal(resolveGlbTextureUrl('javascript:alert(1)',url),null);
 assert.equal(resolveGlbTextureUrl('https://untrusted.example/image.png',url),null);
 assert.equal(resolveGlbTextureUrl('//untrusted.example/image.png',url),null);
 assert.equal(resolveGlbTextureUrl('normal.exe',url),null);
});
test('GLB PBR base-color texture, UV, sampler and material factors survive parsing',()=>{
 const model=parseGlb(texturedGlb(),{baseUrl:'https://example.org/models/chair.glb'});
 const part=model.parts[0];
 assert.equal(model.materialWarnings.length,0);
 assert.equal(part.texture.url,'https://example.org/models/textures/albedo.png?rev=3');
 assert.equal(part.texture.wrapS,10497);assert.equal(part.texture.wrapT,33071);
 assert.deepEqual(part.color,[.5,.25,1,1]);
 assert.equal(part.roughness,.4);assert.equal(part.metallic,.2);
 assert.deepEqual([...part.texcoords],[0,0,1,0,0,1]);
});
test('missing texture UV set produces explicit diagnostic rather than silent white model',()=>{
 const model=parseGlb(texturedGlb({texCoord:1}),{baseUrl:'https://example.org/models/chair.glb'});
 assert.equal(model.parts[0].texture,undefined);
 assert.match(model.materialWarnings.join(' '),/TEXCOORD_1/);
});
test('unpackaged relative texture of imported GLB is diagnosed before rendering',()=>{
 const model=parseGlb(texturedGlb(),{});
 assert.ok(model.parts.length===1);
 assert.match(model.materialWarnings.join(' '),/image externe/);
});
