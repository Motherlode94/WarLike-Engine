import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {projectedAxisDrag3d} from '../js/core/scene-editing-3d-tools.js';

const read = file => readFileSync(new URL(file,import.meta.url),'utf8');

test('2D snapping is constrained to the selected gizmo axis',()=>{
 const source=read('../js/core/input.js');
 assert.match(source,/drag\.axis==='x'\?\['x'\]:drag\.axis==='y'\?\['y'\]:\['x','y'\]/);
 assert.match(source,/drag\.axis==='x'\?\['w'\]:drag\.axis==='y'\?\['h'\]:\['w','h'\]/);
 assert.doesNotMatch(source,/drag\.mode==='move'\?\['x','y'\]:drag\.mode==='rotate'/);
});

test('3D snapping leaves perpendicular coordinates untouched',()=>{
 const source=read('../js/core/gizmos-3d.js');
 assert.match(source,/Math\.abs\(component\)<1e-10\?base:quant\(base\+component\*amount\)/);
 assert.match(source,/o\.x=moveAxis\(start\.x\/64,direction\[0\]\)\*64/);
 assert.match(source,/o\.elevation3d=moveAxis\(start\.elevation3d,direction\[1\]\)/);
 assert.match(source,/o\.y=moveAxis\(start\.y\/64,direction\[2\]\)\*64/);
});

test('3D gizmo still follows the projected direction under reverse camera yaw',()=>{
 for(const endpoint of [{x:40,y:0},{x:-40,y:0},{x:0,y:40},{x:0,y:-40}]){
  const start={x:0,y:0};
  const out=projectedAxisDrag3d(start,endpoint,endpoint.x,endpoint.y);
  const back=projectedAxisDrag3d(start,endpoint,-endpoint.x,-endpoint.y);
  assert.ok(out>0);
  assert.ok(back<0);
 }
});
