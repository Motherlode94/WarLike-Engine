import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeEditableTerrain,applyTerrainBrush} from '../js/core/gaia-terrain-sculpt.js';
import {createRoadSpline,roadSplineEntity,roadSurfaceBuffers3d} from '../js/core/gaia-road-spline.js';
import {loadRapier3d,createRapierScene,disposeRapierScene} from '../js/core/rapier-physics-3d.js';

function fixture(){
 const terrain={id:1,name:'Gaia',type:'terrain3d',x:-640,y:-640,w:1280,h:16,depth3d:1280,visible:true,enabled:true,collision3d:true,solid3d:true};
 initializeEditableTerrain(terrain,{resolution:33,maxHeight:8});
 applyTerrainBrush(terrain,{x:0,z:0,radius:7,mode:'raise',strength:1.3});
 const road=roadSplineEntity(2,createRoadSpline([{x:-5,z:0},{x:0,z:0},{x:5,z:0}],{width:3,elevationOffset:.08}));
 road.collision3d=true;
 return {terrain,road};
}
test('WebGL triangles and Rapier triangle mesh contain identical road coordinates',()=>{
 const {terrain,road}=fixture();
 const mesh=roadSurfaceBuffers3d(road.roadSpline,[terrain],{segmentsPerSpan:5});
 assert.equal(mesh.renderVertices.length,mesh.indices.length*6);
 assert.equal(mesh.positions.length/3,12*1 /* six sections, two shoulders */);
 assert.equal(mesh.triangleCount,10);
 for(let i=0;i<mesh.indices.length;i++){
  const vertex=mesh.indices[i]*3,render=i*6;
  for(let axis=0;axis<3;axis++)assert.ok(Math.abs(mesh.positions[vertex+axis]-mesh.renderVertices[render+axis])<1e-6);
  assert(mesh.renderVertices[render+4]>.1,'top face should point upwards');
 }
});
test('generated road preserves all Gaia height samples and survives JSON roundtrip',()=>{
 const {terrain,road}=fixture(),before=terrain.terrainHeightfield.heights.slice();
 const a=roadSurfaceBuffers3d(road.roadSpline,[terrain]);
 const b=roadSurfaceBuffers3d(JSON.parse(JSON.stringify(road)).roadSpline,[JSON.parse(JSON.stringify(terrain))]);
 assert.deepEqual([...a.positions],[...b.positions]);
 assert.deepEqual([...a.indices],[...b.indices]);
 assert.deepEqual(terrain.terrainHeightfield.heights,before);
});
test('Rapier can raycast the exact static road collider above Gaia terrain',async()=>{
 const api=await loadRapier3d();assert(api,'Rapier available');
 const {terrain,road}=fixture();
 const scene=createRapierScene(api,[terrain,road]);
 try{
  assert.deepEqual(scene.errors,[],'Road collider must build without errors');
  const roadActor=scene.actors.get(road.id);
  assert(roadActor?.collider,'Road must own a native Rapier collider');
  const ray=new api.Ray({x:0,y:12,z:0},{x:0,y:-1,z:0});
  const roadHit=roadActor.collider.castRay(ray,20,true);
  const terrainHit=scene.actors.get(terrain.id).collider.castRay(ray,20,true);
  assert(roadHit!==null&&terrainHit!==null);
  assert(roadHit<terrainHit,'road surface should sit above Gaia terrain for wheel contact');
 }finally{disposeRapierScene(scene)}
});
test('out-of-tile road cannot silently create a fake Rapier collider',async()=>{
 const api=await loadRapier3d();assert(api);
 const {terrain,road}=fixture();
 road.roadSpline.points[1].x=50;
 const scene=createRapierScene(api,[terrain,road]);
 try{
  assert(!scene.actors.has(road.id));
  assert(scene.errors.some(error=>error.includes('route sans collision')));
 }finally{disposeRapierScene(scene)}
});
