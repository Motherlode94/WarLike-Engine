import test from 'node:test';
import assert from 'node:assert/strict';
import {roadSplineEntity,createRoadSpline,roadSurfaceBuffers3d} from '../js/core/gaia-road-spline.js';
import {portableGaiaSceneEntity} from '../js/core/gaia-scene-portability.js';
import {initializeEditableTerrain} from '../js/core/gaia-terrain-sculpt.js';
import {previewRoadGrade,applyRoadGradePlan} from '../js/core/gaia-road-grading.js';
import {validEntities,captureGameScene,freshGameProject,restoreGameProject,gameProject} from '../js/core/game-project.js';
import {canonicalScene,runtimeEntities} from '../js/core/scene-contract.js';

const fixture=()=>{
 const terrain={id:1,name:'Gaia',type:'terrain3d',x:-640,y:-640,w:1280,h:512,depth3d:1280,color:'#54734b',enabled:true,collision3d:true};
 initializeEditableTerrain(terrain,{resolution:17,maxHeight:8});
 const t=terrain.terrainHeightfield;
 for(let iz=0;iz<t.resolution;iz++)for(let ix=0;ix<t.resolution;ix++)t.heights[iz*t.resolution+ix]=.2+.025*iz;
 const road=roadSplineEntity(2,createRoadSpline([{x:-5,z:0},{x:0,z:1},{x:5,z:2}],{width:3}));
 const grade=previewRoadGrade(road.roadSpline,[terrain],{shoulderWidth:2});
 applyRoadGradePlan(grade,[terrain]);
 return {terrain,road};
};

test('WB road factory creates entities satisfying project scene requirements',()=>{
 const {terrain,road}=fixture();
 assert(validEntities([terrain,road]));
 for(const key of ['x','y','w','h'])assert(Number.isFinite(road[key]));
 assert(road.w>0&&road.h>0);
 assert.match(road.color,/^#[0-9a-f]{6}$/i);
});
test('legacy road without transform, dimensions or color reopens without modifying its spline',()=>{
 const {road}=fixture();
 const legacy={id:2,name:'Legacy WB Road',type:'road',roadSpline:road.roadSpline};
 assert(validEntities([legacy]),'historic WB road should pass project scene validation');
 const restored=portableGaiaSceneEntity(JSON.parse(JSON.stringify(legacy)),2);
 assert(validEntities([restored]));
 assert.deepEqual(restored.roadSpline,road.roadSpline);
 assert.equal(restored.name,'Legacy WB Road');
});
test('a graded Gaia road remains byte-for-byte equivalent after project save and restore',()=>{
 const {terrain,road}=fixture(),original=[terrain,road];
 const source=canonicalScene(original,{id:'gaia-road-test'});
 const runtime=runtimeEntities(JSON.parse(JSON.stringify(source)));
 assert.deepEqual(runtime[0].terrainHeightfield,terrain.terrainHeightfield);
 assert.deepEqual(runtime[1].roadSpline,road.roadSpline);
 const saved=runtime.map(e=>portableGaiaSceneEntity(e,e.id));
 const before=roadSurfaceBuffers3d(road.roadSpline,[terrain]);
 const after=roadSurfaceBuffers3d(saved[1].roadSpline,[saved[0]]);
 assert.deepEqual([...after.positions],[...before.positions]);
 assert.deepEqual([...after.indices],[...before.indices]);
});
test('project capture and reload preserve WB road plus graded Gaia heightfield',()=>{
 const {terrain,road}=fixture();
 const old=structuredClone(gameProject);
 try{
  restoreGameProject(freshGameProject());
  const scene=captureGameScene([terrain,road],{x:0,y:0,zoom:1},{id:'main'});
  const payload=JSON.parse(JSON.stringify({...gameProject,scenes:[scene]}));
  restoreGameProject(payload);
  const recovered=gameProject.scenes.find(s=>s.id==='main');
  assert(recovered);
  assert.deepEqual(recovered.entities[0].terrainHeightfield,terrain.terrainHeightfield);
  assert.deepEqual(recovered.entities[1].roadSpline,road.roadSpline);
 }finally{restoreGameProject(old)}
});
test('malformed Gaia data are rejected instead of silently replacing road or terrain',()=>{
 const {terrain,road}=fixture();
 assert.throws(()=>portableGaiaSceneEntity({...road,roadSpline:{schema:'bad'}},2),/Invalid saved Gaia road/);
 assert.throws(()=>portableGaiaSceneEntity({...terrain,terrainHeightfield:{schema:'bad'}},1),/Invalid saved Gaia terrain/);
});
