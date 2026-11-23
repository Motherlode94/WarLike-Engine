import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeEditableTerrain,applyTerrainBrush} from '../js/core/gaia-terrain-sculpt.js';
import {heightfieldAt3d} from '../js/core/gaia-terrain-physics.js';
import {ROAD_SPLINE_SCHEMA,createRoadSpline,validRoadSpline,sampleRoadSpline,roadSurfaceGeometry3d,roadPolyline2d,roadSplineEntity} from '../js/core/gaia-road-spline.js';

const terrain=()=>{const entity={id:1,type:'terrain3d',x:-640,y:-640,w:1280,depth3d:1280};
 initializeEditableTerrain(entity,{resolution:33,maxHeight:8});return entity;};

test('road spline is a versioned, JSON-serializable scene object',()=>{
 const road=createRoadSpline([{x:-4,z:-2},{x:2,z:0},{x:5,z:4}],{width:5});
 assert.equal(road.schema,ROAD_SPLINE_SCHEMA);assert(validRoadSpline(road));
 const entity=roadSplineEntity(12,road);
 assert.deepEqual(JSON.parse(JSON.stringify(entity)).roadSpline,road);
 entity.roadSpline.points[0].x=100;
 assert.equal(road.points[0].x,-4,'scene entity must not mutate the source asset');
});
test('road interpolation preserves endpoints and bends without invalid numbers',()=>{
 const road=createRoadSpline([{x:-8,z:0},{x:-2,z:0},{x:1,z:3},{x:6,z:3}]);
 const sampled=sampleRoadSpline(road,{segmentsPerSpan:8});
 assert.deepEqual(sampled[0],road.points[0]);
 assert.deepEqual(sampled.at(-1),road.points.at(-1));
 assert.equal(sampled.length,25);
 assert(sampled.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.z)));
});
test('road surface follows Gaia height at both shoulders, without altering terrain',()=>{
 const tile=terrain();applyTerrainBrush(tile,{mode:'raise',x:0,z:0,radius:6,strength:2});
 const before=tile.terrainHeightfield.heights.slice();
 const road=createRoadSpline([{x:-5,z:0},{x:5,z:0}],{width:3});
 const geometry=roadSurfaceGeometry3d(road,[tile],{segmentsPerSpan:5});
 assert.equal(geometry.vertices.length,12);
 assert.equal(geometry.triangles.length,10);
 for(const vertex of geometry.vertices){
  assert.ok(Math.abs(vertex.y-heightfieldAt3d(tile.terrainHeightfield,vertex.x,vertex.z)-.05)<1e-8);
 }
 assert.deepEqual(tile.terrainHeightfield.heights,before,'geometry generation must not sculpt Gaia implicitly');
});
test('the same surface triangles share vertices without gaps between segments',()=>{
 const road=createRoadSpline([{x:-6,z:-2},{x:0,z:1},{x:6,z:3}]);
 const surface=roadSurfaceGeometry3d(road,[terrain()],{segmentsPerSpan:3});
 assert.equal(surface.vertices.length,14);
 assert.equal(surface.triangles.length,12);
 for(const tri of surface.triangles){
  assert.equal(tri.length,3);
  assert(tri.every(i=>Number.isInteger(i)&&i>=0&&i<surface.vertices.length));
 }
});
test('2D uses WarLike scene scale of 64 units per metre',()=>{
 const road=createRoadSpline([{x:-1,z:0},{x:1,z:2}]);
 const points=roadPolyline2d(road,{segmentsPerSpan:1});
 assert.deepEqual(points,[{x:-64,y:0},{x:64,y:128}]);
});
test('road cannot silently cross outside an existing Gaia tile',()=>{
 const road=createRoadSpline([{x:8,z:0},{x:15,z:0}],{width:4});
 assert.throws(()=>roadSurfaceGeometry3d(road,[terrain()]),/outside Gaia terrain coverage/);
});
test('invalid road widths and non-finite control points are rejected',()=>{
 assert.throws(()=>createRoadSpline([{x:0,z:0},{x:1,z:0}],{width:0}),/Invalid/);
 assert.throws(()=>createRoadSpline([{x:0,z:0},{x:Infinity,z:0}]),/Invalid/);
 assert.throws(()=>createRoadSpline([{x:0,z:0},{x:0,z:0}]),/Invalid/);
 assert.throws(()=>sampleRoadSpline(createRoadSpline([{x:0,z:0},{x:1,z:0}]),{segmentsPerSpan:0}),/density/);
});
