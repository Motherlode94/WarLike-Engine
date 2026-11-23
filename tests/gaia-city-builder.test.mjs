import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeEditableTerrain} from '../js/core/gaia-terrain-sculpt.js';
import {createRoadSpline,roadSplineEntity} from '../js/core/gaia-road-spline.js';
import {cityBuildingsAlongRoad} from '../js/core/gaia-city-builder.js';

function fixture(){
 const tile={id:1,name:'Gaia',type:'terrain3d',x:-3200,y:-3200,w:6400,depth3d:6400,enabled:true};
 initializeEditableTerrain(tile,{resolution:33,maxHeight:10});
 const road=roadSplineEntity(2,createRoadSpline([{x:-25,z:0},{x:25,z:0}],{width:6}));
 return {tile,road};
}
test('City Builder generates real collision-enabled 3D prefabs along an authored road',()=>{
 const {tile,road}=fixture();
 const buildings=cityBuildingsAlongRoad(road,[tile],[tile,road],{firstId:40,spacing:12,assets:['building-house'],maxBuildings:10});
 assert(buildings.length>0);
 for(const [i,b] of buildings.entries()){
  assert.equal(b.id,40+i);
  assert.equal(b.type,'mesh3d');
  assert.equal(b.assetId,'building-house');
  assert.equal(b.collision3d,true);
  assert.equal(b.citySourceRoadId,2);
  assert(Number.isFinite(b.x)&&Number.isFinite(b.y)&&Number.isFinite(b.elevation3d));
  assert(Math.abs((b.y+b.depth3d/2)/64)>road.roadSpline.width/2,'building cannot occupy the road centre');
 }
});
test('city generation is deterministic and does not mutate Gaia or road entities',()=>{
 const {tile,road}=fixture(),snapshot=structuredClone([tile,road]);
 const first=cityBuildingsAlongRoad(road,[tile],[tile,road],{firstId:10});
 const second=cityBuildingsAlongRoad(road,[tile],[tile,road],{firstId:10});
 assert.deepEqual(first,second);
 assert.deepEqual([tile,road],snapshot);
});
test('generator avoids overlapping existing buildings and respects caps',()=>{
 const {tile,road}=fixture();
 const first=cityBuildingsAlongRoad(road,[tile],[tile,road],{firstId:10,spacing:12});
 const second=cityBuildingsAlongRoad(road,[tile],[tile,road,...first],{firstId:10+first.length,spacing:12});
 assert(second.length<first.length);
 assert(cityBuildingsAlongRoad(road,[tile],[tile,road],{firstId:10,maxBuildings:1}).length<=1);
});
test('without Gaia terrain or with invalid road, no artificial buildings are produced',()=>{
 const {tile,road}=fixture();
 assert.deepEqual(cityBuildingsAlongRoad(road,[],[road],{}),[]);
 assert.throws(()=>cityBuildingsAlongRoad({...road,roadSpline:{schema:'invalid'}},[tile],[]),/valid Gaia road/);
 assert.throws(()=>cityBuildingsAlongRoad(road,[tile],[],{spacing:0}),/settings/);
});
