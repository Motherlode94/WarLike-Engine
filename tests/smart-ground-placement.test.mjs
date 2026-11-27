import test from 'node:test';
import assert from 'node:assert/strict';
import {placeEntityOnSurface3d} from '../js/core/scene-graph-v2.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8);
test('rotation preserves bottom contact',()=>{const e={w:128,h:64,depth3d:64,rotationZ3d:90};placeEntityOnSurface3d(e,{point:[0,3,0],normal:[0,1,0]},{smartContact:true});near(e.elevation3d,3.5)});
test('vertical contact is not rounded by grid snap',()=>{const e={w:64,h:64,depth3d:64};placeEntityOnSurface3d(e,{point:[1.2,-2.37,1.1],normal:[0,1,0]},{snap:.5,smartContact:true});near(e.elevation3d,-2.37)});
test('actual mesh vertex support differs from centered bounds',()=>{const e={w:64,h:64,depth3d:64};placeEntityOnSurface3d(e,{point:[0,0,0],normal:[0,1,0]},{smartContact:true,geometry:{box:{w:1,h:1,d:1},normalizedSize:[1,1,1],parts:[{vertices:new Float32Array([0,-.25,0,0,1,0,0,.5,0,0,1,0])}]}});near(e.elevation3d,-.25)});
