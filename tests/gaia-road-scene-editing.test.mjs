import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoadSpline,editRoadSpline,sampleRoadSpline,roadSplineEntity} from '../js/core/gaia-road-spline.js';
import {initializeEditableTerrain} from '../js/core/gaia-terrain-sculpt.js';

const original=()=>createRoadSpline([{x:-4,z:0},{x:4,z:0}],{width:6});
const terrain=()=>{const entity={id:2,x:-640,y:-640,w:1280,depth3d:1280};initializeEditableTerrain(entity);return entity};

test('Scene road edit appends control points without corrupting authored road',()=>{
 const road=original(),next=editRoadSpline(road,{action:'append',point:{x:6,z:3}});
 assert.equal(next.points.length,3);
 assert.equal(road.points.length,2);
 assert.deepEqual(sampleRoadSpline(next).at(-1),{x:6,z:3});
});
test('road point dragging updates exact selected control point and survives JSON serialization',()=>{
 const road=editRoadSpline(original(),{action:'append',point:{x:6,z:3}});
 const next=editRoadSpline(road,{action:'move',index:1,point:{x:1,z:2}});
 assert.deepEqual(next.points,[{x:-4,z:0},{x:1,z:2},{x:6,z:3}]);
 assert.deepEqual(JSON.parse(JSON.stringify(roadSplineEntity(8,next))).roadSpline,next);
});
test('Inspector-style road width editing is bounded and non-destructive',()=>{
 const road=original();
 const next=editRoadSpline(road,{action:'width',width:10.5});
 assert.equal(next.width,10.5);
 assert.equal(road.width,6);
 assert.throws(()=>editRoadSpline(road,{action:'width',width:0}),/Invalid road edit/);
 assert.throws(()=>editRoadSpline(road,{action:'width',width:61}),/Invalid road edit/);
});
test('degenerate route edits are rejected without modifying any existing entity',()=>{
 const road=original();
 assert.throws(()=>editRoadSpline(road,{action:'move',index:1,point:{x:-4,z:0}}),/Invalid road edit/);
 assert.throws(()=>editRoadSpline(road,{action:'append',point:{x:4,z:0}}),/Invalid road edit/);
 assert.throws(()=>editRoadSpline(road,{action:'move',index:3,point:{x:0,z:0}}),/Invalid control point/);
 assert.deepEqual(road,original());
});
test('route mutations never modify the shared Gaia heightfield',()=>{
 const tile=terrain(),before=tile.terrainHeightfield.heights.slice();
 let road=original();
 road=editRoadSpline(road,{action:'append',point:{x:5,z:3}});
 road=editRoadSpline(road,{action:'width',width:4});
 assert.deepEqual(tile.terrainHeightfield.heights,before);
 assert.equal(tile.terrainRevision3d,1);
});
