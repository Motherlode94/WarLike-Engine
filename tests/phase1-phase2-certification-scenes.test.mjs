import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {updateEditorEntityHierarchy3d,placeEntityOnSurface3d} from '../js/core/scene-graph-v2.js';
import {colliderGeometry3d} from '../js/core/collider-3d.js';
import {glbVisualScale3d} from '../js/core/glb-visual-transform-3d.js';
import {supportBody3d} from '../js/core/collision-3d.js';
import {canGrab3d} from '../js/core/grab-physics-3d.js';
import {ContactEvents2d} from '../js/core/physics-contact-events-2d.js';
import {collisionLayersAllow2d} from '../js/core/physics-2d.js';
const load=name=>JSON.parse(readFileSync(new URL('./fixtures/'+name+'.scene.json',import.meta.url),'utf8'));
const phase1=load('phase1-transform-gizmos'),phase2=load('phase2-physics-fps-tps'),phase2d=load('phase2-physics-2d');
const near=(actual,expected,tolerance=1e-6)=>assert.ok(Math.abs(actual-expected)<tolerance,`${actual} differs from ${expected}`);
test('certification fixtures are importable native scene JSON with unique object IDs',()=>{
 for(const fixture of [phase1,phase2]){
  assert.equal(fixture.version,5);assert.equal(fixture.mode,'3d');
  assert.ok(fixture.entities.length>5);
  assert.equal(new Set(fixture.entities.map(e=>e.id)).size,fixture.entities.length);
  for(const e of fixture.entities){
   assert.ok(['player','prefab','mesh3d','object','character'].includes(e.type));
   assert.match(e.color,/^#[\da-f]{6}$/i);
   assert.ok(e.w>0&&e.h>0&&e.depth3d>0);
   for(const key of ['x','y','elevation3d','rotation'])assert.ok(Number.isFinite(e[key]),key);
  }
 }
});
test('Phase 1 retains GLB scale and automatic BoxCollider alignment for all axes',()=>{
 const scene=structuredClone(phase1.entities),o=scene.find(e=>e.id===6);
 const visual=()=>glbVisualScale3d({w:o.w/64,h:o.h/64,d:o.depth3d/64},[1,1,1]);
 let g=colliderGeometry3d(o);
 assert.deepEqual(visual(),[g.w,g.h,g.d]);
 o.w=169.3;o.h=215.2;o.depth3d=124.5;
 g=colliderGeometry3d(o);
 assert.deepEqual(visual(),[g.w,g.h,g.d]);
 assert.match(o.assetId,/^kaykit-/);
});
test('Phase 1 hierarchy parent -> child -> grandchild stays local when parent moves',()=>{
 const objects=structuredClone(phase1.entities);
 const first=updateEditorEntityHierarchy3d(objects),local1=[...objects.find(e=>e.id===3).localMatrix3d],local2=[...objects.find(e=>e.id===4).localMatrix3d];
 const childBefore=first.get(3)[12],grandBefore=first.get(4)[12],parent=objects.find(e=>e.id===2);
 parent.x+=37.375;
 const second=updateEditorEntityHierarchy3d(objects);
 near(second.get(3)[12],childBefore+37.375/64);
 near(second.get(4)[12],grandBefore+37.375/64);
 assert.deepEqual(objects.find(e=>e.id===3).localMatrix3d,local1);
 assert.deepEqual(objects.find(e=>e.id===4).localMatrix3d,local2);
});
test('Phase 1 unsnapped placement retains subpixel accuracy',()=>{
 const o=structuredClone(phase1.entities.find(e=>e.id===7));
 placeEntityOnSurface3d(o,{point:[2.123456,0.76543,-1.012345]},{snap:0});
 near(o.x/64+o.w/128,2.123456);
 near(o.y/64+o.depth3d/128,-1.012345);
 near(o.elevation3d,.76543);
});
test('Phase 2 has a physically supported player, ramp, walls and two distinct step heights',()=>{
 const entities=structuredClone(phase2.entities),p=entities.find(e=>e.type==='player');
 assert.ok(p.playable3d);assert.ok(p.controller3d);
 assert.equal(supportBody3d(p,entities)?.id,1);
 assert.ok(entities.some(e=>e.rotationZ3d===18));
 assert.ok(entities.some(e=>e.name.includes('Marche basse')&&e.h<=16));
 assert.ok(entities.some(e=>e.name.includes('Marche haute')&&e.h>=64));
 assert.ok(entities.some(e=>e.rigidbody3d?.kinematic===true));
});
test('Phase 2 has an actual dynamic pickable GLB while the control crate is not pickable',()=>{
 const objects=structuredClone(phase2.entities);
 const crate=objects.find(e=>e.id===8),control=objects.find(e=>e.id===9);
 assert.ok(canGrab3d(crate));
 assert.equal(canGrab3d(control),false);
 assert.equal(crate.grab3d.throwSpeed,8);
 assert.equal(crate.rigidbody3d.mass,2);
 assert.ok(crate.collider3d.enabled);
});

test('2D certification fixture filters walls and triggers with reciprocal masks',()=>{
 assert.equal(phase2d.mode,'2d');
 const entities=structuredClone(phase2d.entities),player=entities.find(e=>e.id===1);
 const wall=entities.find(e=>e.id===2),allowed=entities.find(e=>e.id===3),blocked=entities.find(e=>e.id===4);
 assert.equal(collisionLayersAllow2d(player,wall),true);
 assert.equal(collisionLayersAllow2d(player,allowed),true);
 assert.equal(collisionLayersAllow2d(player,blocked),false);
 assert.equal(entities.find(e=>e.id===5).collider2d.enabled,false);
 player.x=allowed.x+10;player.y=allowed.y+10;
 const contacts=new ContactEvents2d();
 const entries=contacts.update(entities);
 assert.ok(entries.some(e=>e.kind==='trigger'&&e.stage==='enter'&&e.ownerId===3));
 assert.ok(!entries.some(e=>e.ownerId===4),'masked trigger must never fire');
 player.x=60;player.y=130;
 const leaves=contacts.update(entities);
 assert.ok(leaves.some(e=>e.kind==='trigger'&&e.stage==='exit'&&e.ownerId===3));
});
