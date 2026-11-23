import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeEditableTerrain} from '../js/core/gaia-terrain-sculpt.js';
import {heightfieldAt3d} from '../js/core/gaia-terrain-physics.js';
import {createRoadSpline} from '../js/core/gaia-road-spline.js';
import {previewRoadGrade,applyRoadGradePlan} from '../js/core/gaia-road-grading.js';

function fixture(){
 const terrain={id:11,type:'terrain3d',name:'Gaia',x:-640,y:-640,w:1280,depth3d:1280,enabled:true};
 const t=initializeEditableTerrain(terrain,{resolution:33,maxHeight:8});
 // An off-axis ridge, with a strong centre bump that road grading must level.
 const n=t.resolution;
 for(let z=0;z<n;z++)for(let x=0;x<n;x++){
  const wx=t.offsetX-t.size/2+x*t.size/(n-1),wz=t.offsetZ-t.size/2+z*t.size/(n-1);
  t.heights[z*n+x]=Math.min(1,(1.0+.9*Math.exp(-(wx*wx+wz*wz)/8)+.04*wx)/t.height);
 }
 const road=createRoadSpline([{x:-6,z:0},{x:0,z:0},{x:6,z:0}],{width:3});
 return {terrain,road};
}
test('preview is non-destructive and only contains road and shoulder samples',()=>{
 const {terrain,road}=fixture(),before=terrain.terrainHeightfield.heights.slice(),revision=terrain.terrainRevision3d;
 const preview=previewRoadGrade(road,[terrain],{shoulderWidth:2});
 assert(preview.changedSamples>0);
 assert.deepEqual(terrain.terrainHeightfield.heights,before);
 assert.equal(terrain.terrainRevision3d,revision);
 const t=terrain.terrainHeightfield,n=t.resolution;
 for(const patch of preview.patches)for(const sample of patch.changes){
  const x=sample.index%n,z=Math.floor(sample.index/n),wx=t.offsetX-t.size/2+x*t.size/(n-1),wz=t.offsetZ-t.size/2+z*t.size/(n-1);
  assert.ok(Math.abs(wx)<=8.000001&&Math.abs(wz)<=3.500001,'only road footprint and shoulder can change');
 }
});
test('commit modifies road corridor but preserves distant Gaia samples and increments revision',()=>{
 const {terrain,road}=fixture(),t=terrain.terrainHeightfield,before=t.heights.slice(),rev=terrain.terrainRevision3d;
 const plan=previewRoadGrade(road,[terrain],{shoulderWidth:2});
 assert.equal(applyRoadGradePlan(plan,[terrain]),plan.changedSamples);
 assert.equal(terrain.terrainRevision3d,rev+1);
 assert.notDeepEqual(t.heights,before);
 assert.equal(t.heights[0],before[0]);
 assert.equal(t.heights.at(-1),before.at(-1));
});
test('previewed road grade restores exactly on reverse without replacing tile objects',()=>{
 const {terrain,road}=fixture(),original=terrain.terrainHeightfield.heights.slice();
 const plan=previewRoadGrade(road,[terrain],{shoulderWidth:1.5});
 applyRoadGradePlan(plan,[terrain]);
 const heightAfter=heightfieldAt3d(terrain.terrainHeightfield,0,0);
 assert(Number.isFinite(heightAfter));
 assert.equal(applyRoadGradePlan(plan,[terrain],{reverse:true}),plan.changedSamples);
 assert.deepEqual(terrain.terrainHeightfield.heights,original);
});
test('stale plans fail atomically, including when one of multiple Gaia tiles changed',()=>{
 const {terrain,road}=fixture(),plan=previewRoadGrade(road,[terrain]);
 assert(plan.changedSamples>0);
 const t=terrain.terrainHeightfield,patch=plan.patches[0];
 const changedIndex=patch.changes.at(-1).index,firstIndex=patch.changes[0].index,firstBefore=t.heights[firstIndex];
 t.heights[changedIndex]+=.01;
 assert.throws(()=>applyRoadGradePlan(plan,[terrain]),/Stale Gaia road grade sample/);
 assert.equal(t.heights[firstIndex],firstBefore,'no partial sample edits before precondition validation');
});
test('road grade refuses missing Gaia, crossing tile boundaries and invalid shoulders',()=>{
 const {terrain,road}=fixture();
 assert.throws(()=>previewRoadGrade(road,[]),/No Gaia terrain/);
 assert.throws(()=>previewRoadGrade(road,[terrain],{shoulderWidth:33}),/Invalid shoulder/);
 assert.throws(()=>previewRoadGrade(createRoadSpline([{x:-30,z:0},{x:5,z:0}]),[terrain]),/outside Gaia terrain/);
});
test('road grade previews survive JSON save/reload and yield matching deterministic patches',()=>{
 const {terrain,road}=fixture();
 const p=previewRoadGrade(road,[terrain],{shoulderWidth:2});
 const roundtrip=JSON.parse(JSON.stringify({terrain,road}));
 const again=previewRoadGrade(roundtrip.road,[roundtrip.terrain],{shoulderWidth:2});
 assert.deepEqual(p,again);
});
