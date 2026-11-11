import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createChambre07Scene} from '../js/core/chambre-07-scene.js';

test('point and spot lights contribute to specular shading in existing GLB shader',()=>{
 const source=readFileSync(new URL('../js/core/viewport-3d.js',import.meta.url),'utf8');
 const shader=source.slice(source.indexOf('const program3d=gl=>'),source.indexOf('const face=(corners,n)=>'));
 assert.match(shader,/vec3 localSpecular=vec3\(0\.\)/);
 assert.match(shader,/vec3 halfVector=normalize\(L\+viewDir\)/);
 assert.match(shader,/specularTint\*localSpecular/);
 assert.match(shader,/if\(uUnlit\)/);
 assert.match(shader,/uRoughness/);
 assert.match(shader,/uMetallic/);
 assert.match(shader,/uLightSpot\[i\]/);
 assert.equal((shader.match(/vec3 viewDir=normalize\(uEye-vWorld\)/g)||[]).length,1);
});
test('CHAMBRE 07 uses editable roughness/metalness and preserves visual object identity',()=>{
 const scene=createChambre07Scene('3d');
 const floor=scene.entities.find(e=>e.name==='Plancher · appartement');
 const table=scene.entities.find(e=>e.name==='Table basse');
 const door=scene.entities.find(e=>e.name==='Porte de sortie');
 assert.equal(floor.materialRoughness,.88);
 assert.equal(table.materialRoughness,.52);
 assert.equal(door.materialMetallic,.5);
 assert.ok(scene.entities.every(e=>Number.isSafeInteger(e.id)));
 assert.equal(new Set(scene.entities.map(e=>e.id)).size,scene.entities.length);
});
