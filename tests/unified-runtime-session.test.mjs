import {webScriptRuntime} from '../js/core/web-script-runtime.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {state} from '../js/core/state.js';
import {restoreGameProject} from '../js/core/game-project.js';
import {runtimeSession,startRuntimeSession,stopRuntimeSession,runRuntimeFrame,setRuntimeTransport} from '../js/core/runtime-session.js';
globalThis.document??={dispatchEvent(){}};globalThis.CustomEvent??=class extends Event{constructor(name,options){super(name);this.detail=options?.detail}};
const setup=(backend='native')=>{stopRuntimeSession();restoreGameProject({runtimeBackend:backend});state.entities=[{id:1,x:0,y:0,w:32,h:64,hp:90,csharpComponents:[{kind:'AutoRotate',speed:90},{kind:'Health',regen:5}]}];state.playing=true;startRuntimeSession()};
const finish=()=>{stopRuntimeSession();state.playing=false;setRuntimeTransport()};
for(const scenario of [
 {name:'cold native compilation may take longer than a normal frame request',path:'/scripts/compile',elapsed:5000,complete:true},
 {name:'unresponsive native compilation still stops Play after its extended deadline',path:'/scripts/compile',elapsed:30001,complete:false},
 {name:'ordinary native requests retain their short deadline',path:'/health',elapsed:4501,complete:false}
])test(scenario.name,async t=>{
 setup();setRuntimeTransport();state.entities[0].csharpScript={name:'Spinner',source:'public class Spinner : MonoBehaviour {}'};
 let heldSignal,release;
 t.mock.timers.enable({apis:['setTimeout']});
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  const path=new URL(url).pathname;
  if(path===scenario.path){heldSignal=options.signal;return new Promise((resolve,reject)=>{release=()=>resolve(Response.json({ok:true}));options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true})});}
  if(path==='/health')return Response.json({protocol:3,capabilities:['shared-play-frame','native-script-compiler']});
  if(path==='/scene')return Response.json({revision:4});
  const input=JSON.parse(options.body);return Response.json({revision:4,frame:input.frame,actors:input.actors});
 });
 try{
  runRuntimeFrame(.02,{canRun:()=>true});await new Promise(resolve=>setImmediate(resolve));assert.ok(heldSignal);
  t.mock.timers.tick(scenario.elapsed);
  if(scenario.complete){assert.equal(heldSignal.aborted,false);release();await runtimeSession.completion;assert.equal(runtimeSession.phase,'ready');}
  else {await runtimeSession.completion;assert.equal(heldSignal.aborted,true);assert.equal(runtimeSession.phase,'error');}
 }finally{finish()}
});
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

test('native source compilation precedes scene load and WarScript shares the completed frame',async()=>{
 setup();state.entities[0].csharpComponents=[];state.entities[0].csharpScript={name:'Spinner',source:'public class Spinner : MonoBehaviour {}'};state.entities[0].warScripts=[{scriptId:'wls',name:'Test.wls',source:'Update(){ Rotate(1); } LateUpdate(){ Set("after",transform.rotation.y); }',values:{}}];
 const paths=[];setRuntimeTransport(async(path,input)=>{paths.push(path);if(path==='/health')return {protocol:3,capabilities:['shared-play-frame','native-script-compiler','mono-behaviour']};if(path==='/scripts/compile')return {ok:true};if(path==='/scene')return {revision:4};if(path==='/stop')return {ok:true};return {revision:4,frame:input.frame,actors:input.actors.map(a=>({...a,rotation:20}))}});
 runRuntimeFrame(.02,{canRun:()=>true});await runtimeSession.completion;assert.deepEqual(paths.slice(0,4),['/health','/scripts/compile','/scene','/frame']);assert.equal(state.entities[0].rotation,21);finish();
});

test('Web modules load before a frame and JS, WarScript and gameplay share one writer',async()=>{
 setup('web');state.entities[0].csharpComponents=[];state.entities[0].webScripts=[{scriptId:'js',name:'Test.js',language:'javascript',source:'export function Update(ctx){ctx.Rotate(2)}',values:{}}];state.entities[0].warScripts=[{scriptId:'wls',name:'Test.wls',source:'Update(){Rotate(1);}',values:{}}];
 const previous=webScriptRuntime.load;webScriptRuntime.load=source=>import('data:text/javascript,'+encodeURIComponent(source));let seen;
 try{runRuntimeFrame(.02,{canRun:()=>true,update(){seen=state.entities[0].rotation}});assert.equal(seen,undefined);await runtimeSession.completion;runRuntimeFrame(.02,{canRun:()=>true,update(){seen=state.entities[0].rotation}});assert.equal(seen,3);runRuntimeFrame(.02,{canRun:()=>false});assert.equal(state.entities[0].rotation,3);}finally{finish();webScriptRuntime.load=previous}
});

test('a scene containing only disabled Web scripts can activate them during Play',async()=>{
 setup('web');const entity=state.entities[0];entity.csharpComponents=[];entity.webScripts=[{scriptId:'disabled',name:'Disabled.js',language:'javascript',enabled:false,source:'export function OnEnable(ctx){ctx.Rotate(10)} export function Update(ctx){ctx.Rotate(1)}',values:{}}];
 const previous=webScriptRuntime.load;webScriptRuntime.load=source=>import('data:text/javascript,'+encodeURIComponent(source));
 try{runRuntimeFrame(.02,{canRun:()=>true});await runtimeSession.completion;runRuntimeFrame(.02,{canRun:()=>true});assert.equal(entity.rotation,undefined);entity.webScripts[0].enabled=true;runRuntimeFrame(.02,{canRun:()=>true});assert.equal(entity.rotation,11);entity.webScripts[0].enabled=false;runRuntimeFrame(.02,{canRun:()=>true});assert.equal(entity.rotation,11);}finally{finish();webScriptRuntime.load=previous}
});

test('gameplay filtering does not reload surviving Web modules or repeat activation',async()=>{
 setup('web');state.entities[0].csharpComponents=[];const component={scriptId:'stable',name:'Stable.js',language:'javascript',source:'export const fields={enabled:0,steps:0,destroyed:0}; export function OnEnable(ctx){ctx.fields.enabled++;} export function Update(ctx){ctx.fields.steps++;} export function OnDestroy(ctx){ctx.fields.destroyed++;}',values:{}};state.entities[0].webScripts=[component];
 const previous=webScriptRuntime.load;let loads=0;webScriptRuntime.load=source=>{loads++;return import('data:text/javascript,'+encodeURIComponent(source))};
 try{runRuntimeFrame(.02,{canRun:()=>true});await runtimeSession.completion;for(let i=0;i<6;i++)assert.equal(runRuntimeFrame(.02,{canRun:()=>true,update(){state.entities=state.entities.filter(e=>!e._logicDestroyed)}}),true);assert.equal(loads,1);assert.deepEqual(component.runtime.fields,{enabled:1,steps:6,destroyed:0});}finally{finish();webScriptRuntime.load=previous}
});

test('removing an object cleans only its module while other scripts keep their instance',async()=>{
 setup('web');const first=state.entities[0];first.csharpComponents=[];first.webScripts=[{scriptId:'a',name:'A.js',language:'javascript',source:'export const fields={destroyed:0}; export function Update(ctx){ctx.Rotate(1)} export function OnDestroy(ctx){ctx.fields.destroyed++;}',values:{}}];const second=structuredClone(first);second.id=2;second.webScripts[0].scriptId='b';state.entities.push(second);
 const previous=webScriptRuntime.load;let loads=0;webScriptRuntime.load=source=>{loads++;return import('data:text/javascript,'+encodeURIComponent(source))};
 try{runRuntimeFrame(.02,{canRun:()=>true});await runtimeSession.completion;runRuntimeFrame(.02,{canRun:()=>true,update(){state.entities=state.entities.filter(e=>e!==first)}});runRuntimeFrame(.02,{canRun:()=>true});assert.equal(loads,1);assert.equal(first.webScripts[0].runtime.fields.destroyed,1);assert.equal(second.webScripts[0].runtime.fields.destroyed,0);assert.equal(second.rotation,2);}finally{finish();webScriptRuntime.load=previous}
});

test('native scene initialization survives a fresh collection containing the same actors',async()=>{
 setup();let scenes=0;setRuntimeTransport(async(path,input)=>{if(path==='/health')return {protocol:3,capabilities:['shared-play-frame']};if(path==='/scene'){scenes++;return {revision:4}}return {revision:4,frame:input.frame,actors:input.actors}});
 try{for(let i=0;i<3;i++){runRuntimeFrame(.02,{canRun:()=>true,update(){state.entities=[...state.entities]}});await runtimeSession.completion;}assert.equal(scenes,1);assert.equal(runtimeSession.phase,'ready');}finally{finish()}
});

test('animation and WarScript LateUpdate share one accepted frame and pause freezes both',()=>{
 setup('web');const actor=state.entities[0];actor.csharpComponents=[];
 actor.animationStudio={playOnStart:true,clips:[{name:'Move',duration:1,speed:1,keys:[{time:0,x:0},{time:1,x:100}],events:[]}]};
 actor.warScripts=[{scriptId:'animation-observer',name:'Observer.wls',source:'LateUpdate(){ transform.rotation.z = transform.position.x * 64; }',values:{}}];
 try{runRuntimeFrame(.1,{canRun:()=>true});assert.equal(actor.x,10);assert.equal(actor.rotation,10);runRuntimeFrame(.1,{canRun:()=>false});assert.equal(actor.x,10);runRuntimeFrame(.1,{canRun:()=>true});assert.equal(actor.x,20);assert.equal(actor.rotation,20);stopRuntimeSession();startRuntimeSession();runRuntimeFrame(.1,{canRun:()=>true});assert.equal(actor.x,10);}finally{finish()}
});

test('native animation waits for accepted responses and never advances for an in-flight frame',async()=>{
 setup();const actor=state.entities[0];actor.csharpComponents=[];actor.animationStudio={playOnStart:true,clips:[{name:'Move',duration:1,keys:[{time:0,x:0},{time:1,x:100}],events:[]}]};let resolveFrame;
 setRuntimeTransport(transport(input=>new Promise(resolve=>{resolveFrame=()=>resolve({revision:4,frame:input.frame,actors:input.actors})})));
 try{runRuntimeFrame(.1,{canRun:()=>true});await new Promise(resolve=>setImmediate(resolve));runRuntimeFrame(.1,{canRun:()=>true});assert.equal(actor.x,0);resolveFrame();await runtimeSession.completion;assert.equal(actor.x,10);}finally{finish()}
});
