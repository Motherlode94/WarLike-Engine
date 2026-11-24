import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeEditableTerrain} from '../js/core/gaia-terrain-sculpt.js';
import {createRoadSpline} from '../js/core/gaia-road-spline.js';
import {createGaiaRoadAmenities,validGaiaRoadAmenities,gaiaRoadAmenitiesMeshes} from '../js/core/gaia-road-amenities.js';

const fixture=()=>{
 const terrain={id:1,type:'terrain3d',name:'Gaia',x:-640,y:-640,w:1280,depth3d:1280,enabled:true};
 initializeEditableTerrain(terrain);
 const road=createRoadSpline([{x:-4,z:0},{x:4,z:0}],{width:6});
 return {road,terrain};
};

test('WB 2.4 amenities schema rejects invalid sizes and can be serialized',()=>{
 const a=createGaiaRoadAmenities();
 assert.equal(validGaiaRoadAmenities(structuredClone(a)),true);
 assert.throws(()=>createGaiaRoadAmenities({curbHeight:-1}));
 assert.throws(()=>createGaiaRoadAmenities({sidewalkWidth:100}));
});

test('WB 2.4 sidewalks and curbs share longitudinal road sections',()=>{
 const {road,terrain}=fixture(),a=createGaiaRoadAmenities();
 const m=gaiaRoadAmenitiesMeshes(road,[terrain],a,{segmentsPerSpan:2});
 for(const key of ['leftSidewalk','rightSidewalk','leftCurb','rightCurb','centerLine']){
  assert.ok(m[key].triangleCount>0,key);
  assert.equal(m[key].indices.length,m[key].triangleCount*3);
  assert.ok([...m[key].positions].every(Number.isFinite));
 }
 // Check the footway rises above its curb base, not underneath the source road.
 assert.ok(m.leftSidewalk.positions[1]>m.leftCurb.positions[4]);
});

test('WB 2.4 centre markings can be disabled',()=>{
 const {road,terrain}=fixture();
 const m=gaiaRoadAmenitiesMeshes(road,[terrain],createGaiaRoadAmenities({centerLine:false}));
 assert.equal(m.centerLine,undefined);
});
