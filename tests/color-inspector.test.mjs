import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('2D, 3D and lights expose reusable color palette',()=>{
 const src=read('js/ui/inspector.js');
 assert.match(src,/function colorPalette\(/);
 assert.match(src,/colorsPreset=\[/);
 assert.match(src,/type='color'/);
 assert.match(src,/maxLength=7/);
 assert.match(src,/Couleur du matériau/);
 assert.match(src,/Couleur de l’objet/);
 assert.match(src,/Couleur de la lumière/);
});
test('3D material custom tint survives JSON import',()=>{
 assert.match(read('js/core/viewport-3d.js'),/o\.colorCustomized===true/);
 assert.match(read('js/core/scene.js'),/colorCustomized:o\.colorCustomized===true/);
});
