import test from 'node:test';
import assert from 'node:assert/strict';
import {state} from '../js/core/state.js';
import {restoreGameProject} from '../js/core/game-project.js';
import {runtimeSession,startRuntimeSession,stopRuntimeSession,runRuntimeFrame,setRuntimeTransport} from '../js/core/runtime-session.js';
globalThis.document??={dispatchEvent(){}};globalThis.CustomEvent??=class extends Event{constructor(name,options){super(name);this.detail=options?.detail}};
const setup=(backend='native')=>{stopRuntimeSession();restoreGameProject({runtimeBackend:backend});state.entities=[{id:1,x:0,y:0,w:32,h:64,hp:90,csharpComponents:[{kind:'AutoRotate',speed:90},{kind:'Health',regen:5}]}];state.playing=true;startRuntimeSession()};
const finish=()=>{stopRuntimeSession();state.playing=false;setRuntimeTransport()};
function transport(frame){return async(path,input)=>path==='/health'?{protocol:3,capabilities:['shared-play-frame']}:path==='/scene'?{ok:true,revision:4}:(await frame(input))}
test('native then browser components then Blueprint/gameplay observe the same object state',async()=>{
 setup();let seen;setRuntimeTransport(transport(async input=>({ok:true,revision:4,frame:input.frame,actors:input.actors.map(a=>({...a,x:64,rotation:45}))})));
 runRuntimeFrame(.05,{canRun:()=>true,update(){seen={x:state.entities[0].x,hp:state.entities[0].hp}}});await runtimeSession.completion;
 assert.equal(seen.x,64);assert.equal(seen.hp,90.25);assert.equal(runtimeSession.phase,'ready');finish();
});
test('only one native frame can be in flight and Stop rejects its late response',async()=>{
 setup();let resolveFrame,calls=0;setRuntimeTransport(transport(input=>new Promise(resolve=>{calls++;resolveFrame=()=>resolve({revision:4,frame:input.frame,actors:input.actors.map(a=>({...a,x:999}))})})));
 runRuntimeFrame(.02,{canRun:()=>true});await new Promise(resolve=>setImmediate(resolve));runRuntimeFrame(.02,{canRun:()=>true});assert.equal(calls,1);
 const completion=runtimeSession.completion;stopRuntimeSession();state.entities=[{id:1,x:7,y:0,w:32,h:64}];resolveFrame();await completion;assert.equal(state.entities[0].x,7);assert.equal(runtimeSession.phase,'stopped');finish();
});
test('stale native revisions stop simulation visibly without changing the scene',async()=>{
 setup();setRuntimeTransport(transport(async input=>({revision:999,frame:input.frame,actors:input.actors})));
 let updates=0;runRuntimeFrame(.02,{canRun:()=>true,update(){updates++}});await runtimeSession.completion;assert.equal(runtimeSession.phase,'error');assert.match(runtimeSession.error,/périmée/);assert.equal(updates,0);finish();
});
test('debugger pause holds completed native frames and preserves actions performed while paused',async()=>{
 setup();let running=true,resolveFrame;setRuntimeTransport(transport(input=>new Promise(resolve=>{resolveFrame=()=>resolve({revision:4,frame:input.frame,actors:input.actors.map(a=>({...a,hp:80,x:10}))})})));
 runRuntimeFrame(.02,{canRun:()=>running});await new Promise(resolve=>setImmediate(resolve));running=false;resolveFrame();await runtimeSession.completion;assert.equal(state.entities[0].x,0);state.entities[0].hp=55;
 running=true;runRuntimeFrame(.01,{canRun:()=>running});await runtimeSession.completion;assert.equal(state.entities[0].x,10);assert.equal(state.entities[0].hp,55.1);finish();
});
test('Web 2D and 3D frames run shared data components exactly once without contacting .NET',()=>{
 for(const mode of ['2d','3d']){setup('web');setRuntimeTransport(()=>{throw Error('Unexpected .NET request')});let updates=0;runRuntimeFrame(.1,{canRun:()=>true,update(){updates++}});assert.equal(updates,1,mode);assert.equal(state.entities[0].hp,90.5);finish()}
});
