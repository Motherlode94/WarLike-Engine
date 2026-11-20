import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeEditableTerrain,applyTerrainBrush,terrainSurfaceMesh3d} from '../js/core/gaia-terrain-sculpt.js';
import {heightfieldAt3d,validTerrainHeightfield} from '../js/core/gaia-terrain-physics.js';
const sample=()=>({id:2,name:'Terrain',type:'mesh3d',x:-640,y:-640,w:1280,depth3d:1280,h:16,elevation3d:0,collision3d:true});
test('Gaia editable terrain stays in native collision schema and starts flat',()=>{
 const o=sample(),t=initializeEditableTerrain(o);
 assert.equal(t.resolution,33);
 assert(validTerrainHeightfield(t));
 assert.equal(heightfieldAt3d(t,0,0),0);
 assert.equal(initializeEditableTerrain(o),t);
});
test('raise, lower, smooth, flatten and layer painting retain serializable terrain data',()=>{
 const o=sample(),t=initializeEditableTerrain(o,{resolution:9,maxHeight:8});
 assert(applyTerrainBrush(o,{x:0,z:0,mode:'raise',radius:4,strength:2})>0);
 assert(heightfieldAt3d(t,0,0)>0);
 const raised=heightfieldAt3d(t,0,0);
 applyTerrainBrush(o,{x:0,z:0,mode:'lower',radius:3,strength:.4});
 assert(heightfieldAt3d(t,0,0)<raised);
 applyTerrainBrush(o,{x:0,z:0,mode:'smooth',radius:5,strength:.8});
 applyTerrainBrush(o,{x:0,z:0,mode:'flatten',radius:2,strength:1,targetHeight:3});
 assert.equal(heightfieldAt3d(t,0,0),3);
 assert(applyTerrainBrush(o,{x:0,z:0,mode:'paint',radius:3,layer:'rock'})>0);
 const restored=JSON.parse(JSON.stringify(o));
 assert(validTerrainHeightfield(restored.terrainHeightfield));
 assert.equal(heightfieldAt3d(restored.terrainHeightfield,0,0),3);
 assert(restored.terrainHeightfield.paint.includes('rock'));
});
test('terrain mesh emits finite vertex geometry and paint colors for shared PBR renderer',()=>{
 const o=sample(),t=initializeEditableTerrain(o,{resolution:5});
 applyTerrainBrush(o,{mode:'raise',x:0,z:0,strength:1,radius:7});
 applyTerrainBrush(o,{mode:'paint',x:0,z:0,layer:'sand',radius:7});
 const mesh=terrainSurfaceMesh3d(t);
 assert.equal(mesh.vertices.length,(5-1)*(5-1)*6*6);
 assert.equal(mesh.colors.length,(5-1)*(5-1)*6*4);
 assert(mesh.vertices.every(Number.isFinite));
 assert(mesh.colors.every(Number.isFinite));
});
