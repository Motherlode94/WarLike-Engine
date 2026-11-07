import test from 'node:test';
import assert from 'node:assert/strict';
import {affineBoxHull3d,affineHullSignature3d} from '../js/core/collider-3d.js';
import {createRapierScene,synchronizeRapierScene,disposeRapierScene} from '../js/core/rapier-physics-3d.js';
import {legacyReferenceMatrix3d,multiplyMatrix4,updateAffineEditorPose3d} from '../js/core/scene-graph-v2.js';

const near=(x,y)=>assert.ok(Math.abs(x-y)<1e-5,`${x} != ${y}`);
const shear=[1,0,0,0,.5,1,0,0,0,0,1,0,0,0,0,1];
const makeEntity=(shape='box')=>{
 const e={id:17,name:'Affine crate',type:'mesh3d',x:0,y:0,elevation3d:2,w:128,h:128,depth3d:128,rotation:0,
  collider3d:{shape},rigidbody3d:{enabled:true,lockRotations:true}};
 const ref=legacyReferenceMatrix3d(e);
 e.matrixReference3d=ref;
 e.worldMatrix3d=multiplyMatrix4(shear,ref);
 return e;
};
const hull={w:2,h:2,d:2,offset:{x:0,y:0,z:0}};
test('an affine box produces all eight EXACT sheared corners in Rapier local metres',()=>{
 const points=affineBoxHull3d(shear,hull,{x:0,y:0,z:0},{x:0,y:0,z:0,w:1});
 assert.ok(points instanceof Float32Array);
 assert.equal(points.length,24);
 const corners=Array.from({length:8},(_,i)=>[points[3*i],points[3*i+1],points[3*i+2]]);
 const expected=[];
 for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])expected.push([x+.5*y,y,z]);
 for(let i=0;i<8;i++)for(let k=0;k<3;k++)near(corners[i][k],expected[i][k]);
 assert.equal(affineHullSignature3d(points),affineHullSignature3d(new Float32Array(points)));
});
test('the affine hull stays exact under rigid body rotation and collider offsets',()=>{
 const q={x:0,y:Math.sin(Math.PI/4),z:0,w:Math.cos(Math.PI/4)};
 const p={x:3,y:4,z:5};
 const points=affineBoxHull3d([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],
  {w:2,h:4,d:6,offset:{x:.3,y:.4,z:-.5}},p,q);
 const xs=new Set(),ys=new Set(),zs=new Set();
 for(let i=0;i<24;i+=3){xs.add(points[i].toFixed(4));ys.add(points[i+1].toFixed(4));zs.add(points[i+2].toFixed(4));}
 assert.deepEqual([...xs].sort(),['-0.7000','1.3000']);
 assert.deepEqual([...ys].sort(),['-1.6000','2.4000']);
 assert.deepEqual([...zs].sort(),['-3.5000','2.5000']);
});
test('singular sheared box is rejected, never silently approximated',()=>{
 const singular=[0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
 assert.throws(()=>affineBoxHull3d(singular,hull,{x:0,y:0,z:0},{x:0,y:0,z:0,w:1}),/volume nul/);
});
const physics=()=>{
 const calls=[],shapes=[];
 const descriptor=()=>({setTranslation(x,y,z){this.p={x,y,z};return this},
  setLinvel(x,y,z){this.v={x,y,z};return this},
  setRotation(q){this.r=q;return this},
  setCcdEnabled(){return this},setGravityScale(){return this},lockRotations(){return this}});
 const collider=kind=>({kind,setTranslation(){return this},setFriction(){return this},setRestitution(){return this},setMass(){return this}});
 const api={
  RigidBodyDesc:{dynamic:descriptor,fixed:descriptor},
  ColliderDesc:{
   cuboid:()=>collider('box'),
   convexHull:points=>{shapes.push(points);return collider('hull')},
   capsule:()=>collider('capsule'),
   ball:()=>collider('sphere')
  },
  World:class{constructor(){this.timestep=0}
   createRigidBody(desc){return {p:desc.p||{x:0,y:0,z:0},rotation:()=>desc.r||{x:0,y:0,z:0,w:1},translation(){return this.p},
    linvel:()=>desc.v||{x:0,y:0,z:0},setTranslation(p){this.p=p},setRotation(){},setLinvel(){}}}
   createCollider(desc){calls.push(desc.kind);return {kind:desc.kind}}
   propagateModifiedBodyPositionsToColliders(){}
   free(){}
  }
 };
 return {api,calls,shapes};
};
test('Rapier creates a convexHull instead of a cuboid, then rebuilds only on shape changes',()=>{
 const {api,calls,shapes}=physics(),e=makeEntity(),scene=createRapierScene(api,[e]);
 assert.equal(scene.errors.length,0);
 assert.equal(scene.actors.get(e.id).collider.kind,'hull');
 assert.equal(shapes.length,1);
 assert.deepEqual(calls,['box','hull']); // first box is the shared floor
 assert.equal(synchronizeRapierScene(scene,[e]),true);
 const old=[...e.worldMatrix3d],ref=[...e.matrixReference3d];
 e.x+=64;updateAffineEditorPose3d(e,old,ref);
 assert.equal(synchronizeRapierScene(scene,[e]),true,'pure translation does not change body-local convex hull');
 e.worldMatrix3d[4]+=0.2;
 assert.equal(synchronizeRapierScene(scene,[e]),false,'changing shear requires a collider rebuild');
 disposeRapierScene(scene);
});
test('unsupported sheared capsules have explicit collision-disabled diagnostics without rebuild loops',()=>{
 const {api}=physics(),e=makeEntity('capsule'),scene=createRapierScene(api,[e]);
 assert.equal(scene.actors.has(e.id),false);
 assert.equal(scene.skipped.has(e.id),true);
 assert.match(scene.errors[0],/collision désactivée/);
 assert.equal(synchronizeRapierScene(scene,[e]),true);
 e.collider3d.shape='box';
 assert.equal(synchronizeRapierScene(scene,[e]),false);
 disposeRapierScene(scene);
});

test('real Rapier ray contact follows the sheared face instead of the original AABB',async()=>{
 const module=await import('@dimforge/rapier3d-compat');
 const rapier=module.default||module;
 await rapier.init();
 const world=new rapier.World({x:0,y:0,z:0});
 try{
  const body=world.createRigidBody(rapier.RigidBodyDesc.fixed().setTranslation(0,3,0));
  const points=affineBoxHull3d([
   1,0,0,0,.5,1,0,0,0,0,1,0,-1.5,0,0,1
  ],{w:2,h:2,d:2,offset:{x:0,y:0,z:0}},
  {x:0,y:3,z:0},{x:0,y:0,z:0,w:1});
  const shape=rapier.ColliderDesc.convexHull(points);
  assert.ok(shape,'Rapier must construct the convex polyhedron');
  world.createCollider(shape,body);
  world.updateSceneQueries?.();
  const ray=new rapier.Ray({x:4,y:3.8,z:0},{x:-1,y:0,z:0});
  const hit=world.castRay(ray,10,true);
  assert.ok(hit,'ray must hit the sheared collider');
  // x limit is 1 + 0.5 * (3.8 - 3.0) = 1.4.
  assert.ok(Math.abs(hit.timeOfImpact-2.6)<.03,`expected 2.6m, got ${hit.timeOfImpact}`);
 }finally{world.free()}
});
