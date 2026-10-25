import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../js/core/viewport-3d.js',import.meta.url),'utf8');
test('3D shader handles non-uniform scales correctly',()=>{
 assert.match(source,/aNormal\/max\(abs\(uScale\),vec3\(\.0001\)\)/);
});
test('3D shader maps HDR lighting into display output with gamma conversion',()=>{
 assert.match(source,/vec3 mapped=exposed\/\(vec3\(1\.\)\+exposed\)/);
 assert.match(source,/vec3\(1\.\/2\.2\)/);
});
test('3D renderer handles two-sided mesh faces',()=>{
 assert.match(source,/if\(!gl_FrontFacing\)normal=-normal/);
 assert.match(source,/gl\.disable\(gl\.CULL_FACE\)/);
});
