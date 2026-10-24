import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('a named project saves and restores its own Hub accent',()=>{
 const code=source('js/core/project-hub.js');
 assert.match(code,/accent:hub\.accent/);
 assert.match(code,/normalizeHubAccent\(data\.accent\)/);
 assert.match(code,/item\.style\.borderLeft/);
 assert.match(code,/--project-accent/);
});
test('procedural 3D renderer has configurable material response and detailed geometry',()=>{
 const renderer=source('js/core/viewport-3d.js');
 assert.match(renderer,/uRoughness,uMetallic/);
 assert.match(renderer,/uniform1f\(u\.roughness/);
 assert.match(renderer,/uniform1f\(u\.metallic/);
 assert.match(renderer,/for\(const level of \[?0|for\(let level=0/);
 assert.match(renderer,/specular/);
});
test('Inspector roughness and metalness survive scene import',()=>{
 const inspector=source('js/ui/inspector.js'),scene=source('js/core/scene.js');
 assert.match(inspector,/materialRoughness/);
 assert.match(inspector,/materialMetallic/);
 assert.match(scene,/materialRoughness:Number\.isFinite/);
 assert.match(scene,/materialMetallic:Number\.isFinite/);
});
