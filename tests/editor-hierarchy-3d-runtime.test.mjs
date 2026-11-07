import test from 'node:test';
import assert from 'node:assert/strict';
import {updateEditorEntityHierarchy3d,legacyReferenceMatrix3d,affineCorrection3d,updateAffineEditorPose3d} from '../js/core/scene-graph-v2.js';
const near=(a,b,tol=1e-6)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
const setup=()=>[
 {id:1,name:'Vehicle',x:64,y:64,elevation3d:0,rotation:0},
 {id:2,parentId:1,name:'Turret',x:128,y:64,elevation3d:0,rotation:0}
];
test('moving a root follows its child with stable stored local coordinates',()=>{
 const es=setup();updateEditorEntityHierarchy3d(es);
 const local=[...es[1].localMatrix3d];
 es[0].x+=64;
 const worlds=updateEditorEntityHierarchy3d(es);
 near(es[1].x,192);near(worlds.get(2)[12],3);
 assert.deepEqual(es[1].localMatrix3d,local);
});
test('moving a child in world space changes its relative local matrix',()=>{
 const es=setup();updateEditorEntityHierarchy3d(es);
 const child=es[1],prevWorld=[...child.worldMatrix3d],prevReference=[...child.matrixReference3d];
 child.x+=64;updateAffineEditorPose3d(child,prevWorld,prevReference);
 updateEditorEntityHierarchy3d(es,{worldOverrideIds:new Set([2])});
 near(child.x,192);
 es[0].x+=64;updateEditorEntityHierarchy3d(es);near(child.x,256);
});
test('a dynamic child remains world-authoritative in physics mode',()=>{
 const es=setup();es[1].rigidbody3d={enabled:true,kinematic:false};updateEditorEntityHierarchy3d(es);
 const child=es[1],prevWorld=[...child.worldMatrix3d],prevReference=[...child.matrixReference3d];
 child.x=300;updateAffineEditorPose3d(child,prevWorld,prevReference);
 updateEditorEntityHierarchy3d(es,{physicsOwnsDynamics:true});
 near(child.x,300);
 es[0].x+=64;updateEditorEntityHierarchy3d(es,{physicsOwnsDynamics:true});near(child.x,300);
 assert.ok(affineCorrection3d(child));
});
test('legacy roots do not obtain spurious affine or local matrices',()=>{
 const es=setup().slice(0,1);
 const matrices=updateEditorEntityHierarchy3d(es);
 assert.equal(es[0].worldMatrix3d,undefined);
 assert.equal(es[0].localMatrix3d,undefined);
 near(matrices.get(1)[12],1);
 near(legacyReferenceMatrix3d(es[0])[12],1);
});

test('direct Inspector edits to parent and child survive hierarchy propagation',()=>{
 const es=setup();updateEditorEntityHierarchy3d(es);
 es[0].x=128;
 updateEditorEntityHierarchy3d(es);
 near(es[1].x,192);
 es[1].x=256; // inspector changes world-space x directly
 updateEditorEntityHierarchy3d(es);
 near(es[1].x,256);
 es[0].x=192;
 updateEditorEntityHierarchy3d(es);
 near(es[1].x,320);
});
