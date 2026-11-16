import test from 'node:test';
import assert from 'node:assert/strict';
import {parseGlb} from '../js/assets/real-models-3d.js';
import {materialProbeGlb,rewriteProbe} from './material-probe-fixture.mjs';
test('glTF material maps keep linear data, normal scale, occlusion strength and per-map UVs',()=>{
 const data=parseGlb(materialProbeGlb({normalScale:.4})),part=data.parts[0];
 assert.equal(data.materialWarnings.length,0);assert.equal(part.normalScale,.4);assert.equal(part.occlusionStrength,.7);
 for(const map of Object.values(part.materialMaps)){assert.equal(map.texcoords.length,part.vertices.length/3);assert.ok(map.texture.bytes.length>0);}
 assert.deepEqual(Object.keys(part.materialMaps),['normal','metallicRoughness','occlusion','emissive']);
 const changed=parseGlb(rewriteProbe(j=>{j.materials[0].normalTexture.extensions={KHR_texture_transform:{texCoord:1,scale:[2,3],offset:[.25,.5]}}})).parts[0];
 assert.equal(changed.materialMaps.normal.texcoords[0],.25);assert.equal(changed.materialMaps.normal.texcoords[1],.5);assert.equal(changed.texcoords[0],0);
});
test('a missing material-map UV or image produces a diagnostic without discarding geometry',()=>{
 const data=parseGlb(rewriteProbe(j=>{j.materials[0].normalTexture.texCoord=7;j.materials[0].occlusionTexture.index=99;}));
 assert.ok(data.triangleCount>0);assert.equal(data.parts[0].materialMaps.normal,undefined);assert.equal(data.parts[0].materialMaps.occlusion,undefined);assert.equal(data.materialWarnings.length,2);
});
test('unsupported optional material extensions are reported and required ones rejected',()=>{
 assert.match(parseGlb(rewriteProbe(j=>{j.materials[0].extensions={KHR_materials_transmission:{transmissionFactor:1}}})).materialWarnings[0],/KHR_materials_transmission/);
 assert.throws(()=>parseGlb(rewriteProbe(j=>{j.extensionsRequired=['KHR_materials_transmission']})),/Extension GLB requise/);
});
test('legacy untextured GLBs retain their material factors and no new map requirements',()=>{
 const p=parseGlb(materialProbeGlb({maps:false})).parts[0];assert.deepEqual(p.materialMaps,{});assert.equal(p.metallic,.8);assert.equal(p.roughness,.65);assert.equal(p.texture,undefined);
});
