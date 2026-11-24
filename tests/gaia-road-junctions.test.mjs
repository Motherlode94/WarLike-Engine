import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeEditableTerrain} from '../js/core/gaia-terrain-sculpt.js';
import {createRoadSpline,roadSplineEntity} from '../js/core/gaia-road-spline.js';
import {findGaiaRoadJunctions,roadJunctionEntity,roadJunctionBuffers3d,validRoadJunction} from '../js/core/gaia-road-junctions.js';
import {portableGaiaSceneEntity} from '../js/core/gaia-scene-portability.js';
import {loadRapier3d,createRapierScene,disposeRapierScene} from '../js/core/rapier-physics-3d.js';

function fixture(){
 const t={id:1,name:'Gaia',type:'terrain3d',x:-3200,y:-3200,w:6400,h:640,depth3d:6400,enabled:true,visible:true,collision3d:true,color:'#557755'};
 initializeEditableTerrain(t,{resolution:33,maxHeight:10});
 const a=roadSplineEntity(2,createRoadSpline([{x:-22,z:0},{x:22,z:0}],{width:6,elevationOffset:.08}));
 const b=roadSplineEntity(3,createRoadSpline([{x:0,z:-22},{x:0,z:22}],{width:6,elevationOffset:.08}));
 return {t,a,b};
}
test('WB 2.3 finds one crossing for perpendicular native Gaia roads',()=>{
 const {t,a,b}=fixture(),before=structuredClone([t,a,b]);
 const hits=findGaiaRoadJunctions([a,b]);
 assert.equal(hits.length,1);
 assert.deepEqual(hits[0].roadIds,[2,3]);
 assert(Math.hypot(hits[0].center.x,hits[0].center.z)<1e-6);
 assert(validRoadJunction(hits[0]));
 assert.deepEqual([t,a,b],before,'crossing discovery must not mutate authored terrain or roads');
});
test('crossroads surfaces are identical for WebGL vertices and Rapier indexed triangles',()=>{
 const {t,a,b}=fixture();
 const junction=findGaiaRoadJunctions([a,b])[0];
 const mesh=roadJunctionBuffers3d(junction,[a,b],[t]);
 assert.equal(mesh.triangleCount,junction.sides);
 assert.equal(mesh.indices.length,junction.sides*3);
 assert.equal(mesh.renderVertices.length,mesh.indices.length*6);
 for(let i=0;i<mesh.indices.length;i++){
  const v=mesh.indices[i]*3,r=i*6;
  for(let j=0;j<3;j++)assert(Math.abs(mesh.positions[v+j]-mesh.renderVertices[r+j])<1e-6);
  assert.equal(mesh.renderVertices[r+4],1,'junction triangle must face up');
 }
 const a0=mesh.indices[1]*3,b0=mesh.indices[2]*3;
 const dx=mesh.positions[a0]-mesh.positions[0],dz=mesh.positions[a0+2]-mesh.positions[2],ex=mesh.positions[b0]-mesh.positions[0],ez=mesh.positions[b0+2]-mesh.positions[2];
 assert(dx*ez-dz*ex<0,'crossroad winding must face positive Y');
});
test('native junction entities persist through project JSON and standalone scene import',()=>{
 const {t,a,b}=fixture(),j=roadJunctionEntity(4,findGaiaRoadJunctions([a,b])[0]);
 const restored=portableGaiaSceneEntity(JSON.parse(JSON.stringify(j)),4);
 assert.deepEqual(restored.roadJunction3d,j.roadJunction3d);
 assert.equal(restored.type,'road-junction');
 assert(restored.w>0&&restored.h>0);
 assert.throws(()=>portableGaiaSceneEntity({...j,roadJunction3d:{schema:'bad'}},4),/Invalid saved Gaia road junction/);
});
test('parallel and near-parallel roads are not silently converted into junctions',()=>{
 const a=roadSplineEntity(2,createRoadSpline([{x:-20,z:0},{x:20,z:0}]));
 const b=roadSplineEntity(3,createRoadSpline([{x:-20,z:3},{x:20,z:3}]));
 assert.deepEqual(findGaiaRoadJunctions([a,b]),[]);
});
test('grade-separated roads require explicit bridge rather than a false crossing',()=>{
 const {t,a,b}=fixture();
 b.roadSpline.elevationOffset=2;
 const crossing=findGaiaRoadJunctions([a,b])[0];
 assert.throws(()=>roadJunctionBuffers3d(crossing,[a,b],[t]),/overpass/);
});
test('Rapier raycast contacts the generated physical crossroads above the Gaia base',async()=>{
 const api=await loadRapier3d();assert(api);
 const {t,a,b}=fixture();
 const j=roadJunctionEntity(4,findGaiaRoadJunctions([a,b])[0]);
 const scene=createRapierScene(api,[t,a,b,j]);
 try{
  assert.deepEqual(scene.errors,[]);
  const actor=scene.actors.get(j.id);
  assert(actor?.collider,'native junction collider must exist');
  const ray=new api.Ray({x:0,y:12,z:0},{x:0,y:-1,z:0});
  const junctionHit=actor.collider.castRay(ray,20,true);
  const groundHit=scene.actors.get(t.id).collider.castRay(ray,20,true);
  assert(junctionHit!==null&&groundHit!==null&&junctionHit<groundHit,'crossroad contact must be above Gaia');
 }finally{disposeRapierScene(scene)}
});
