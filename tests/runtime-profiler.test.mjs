import test from 'node:test';import assert from 'node:assert/strict';
import {createRuntimeProfiler,runtimeProfiler,startProfiler,stopProfiler,createGpuProfiler} from '../js/core/runtime-profiler.js';
test('real frame intervals retain long frames independently from clamped simulation deltas',()=>{
 let time=0;const p=createRuntimeProfiler({now:()=>time,capacity:3});p.start();p.frame(0,{mode:'3d',entities:108})();p.frame(200,{mode:'3d',entities:108})();p.frame(220,{mode:'3d',entities:108})();const r=p.report();assert.equal(r.frameMs.max,200);assert.equal(r.frameMs.p95,200);assert.ok(Math.abs(r.averageFps-2000/220)<1e-10);
 p.frame(240,{phase:'paused'})();assert.equal(p.report().frames,2);assert.equal(p.report().samples.length,3);
});
test('exclusive CPU measurements avoid double counting nested physics and survive exceptions',()=>{
 let t=0;const p=createRuntimeProfiler({now:()=>t});p.start();const finish=p.frame(0);const parent=p.scope('gameplay');t=1;const child=p.scope('physics');t=4;child();t=6;parent();finish();const r=p.report();assert.equal(r.last.cpuMeasuredMs,6);assert.equal(r.stages.gameplay.exclusiveMs,3);assert.equal(r.stages.physics.inclusiveMs,3);
});
test('disabled profiling is inert and reports return defensive, bounded snapshots',()=>{
 const p=createRuntimeProfiler({capacity:2,now:()=>1});p.frame(1)();assert.equal(p.report().frames,0);p.start();for(let i=0;i<10;i++){const finish=p.frame(i*10);p.draw(6,'triangles');finish()}const r=p.report();assert.equal(r.samples.length,2);assert.equal(r.last.triangles,2);assert.equal(r.last.drawCalls,1);r.last.triangles=999;assert.equal(p.report().last.triangles,2);p.stop();p.frame(999)();assert.equal(p.report().samples.length,2);
});
test('GPU profiler never waits for a result and rejects disjoint timings',()=>{
 let available=false,disjoint=false,deletes=0;const ext={GPU_DISJOINT_EXT:1,TIME_ELAPSED_EXT:2,QUERY_RESULT_AVAILABLE_EXT:3,QUERY_RESULT_EXT:4,createQueryEXT:()=>({}),deleteQueryEXT:()=>deletes++,beginQueryEXT(){},endQueryEXT(){},getQueryObjectEXT:(q,p)=>p===3?available:9000000};const gl={getExtension:n=>n==='EXT_disjoint_timer_query'?ext:null,getParameter:()=>disjoint};const timer=createGpuProfiler(gl);startProfiler();let finish=runtimeProfiler.frame(10);timer.begin()();finish();assert.equal(runtimeProfiler.report().gpu.samples,0);available=true;finish=runtimeProfiler.frame(20);timer.begin()();finish();assert.equal(runtimeProfiler.report().gpu.p95Ms,9);disjoint=true;timer.begin();assert.equal(runtimeProfiler.gpuStatus,'disjoint');assert.ok(deletes>=2);stopProfiler();
 const noGpu=createGpuProfiler({getExtension:()=>null});assert.equal(runtimeProfiler.gpuStatus,'unsupported');noGpu.begin()();
});
