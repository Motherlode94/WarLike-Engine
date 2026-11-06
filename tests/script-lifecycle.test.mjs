import test from 'node:test';
import assert from 'node:assert/strict';
import {WarScriptRuntime} from '../js/core/war-script-runtime.js';
import {WebScriptRuntime} from '../js/core/web-script-runtime.js';
const hooks=['Awake','OnEnable','Start','FixedUpdate','Update','LateUpdate','OnDisable','OnDestroy'];
const load=source=>import('data:text/javascript,'+encodeURIComponent(source)+'#'+Math.random());
async function setup(language,{disabled=false,inactive=false,bodies={}}={}){
 const source=hooks.map(h=>language==='WarScript'?`${h}(){Log("${h}");${bodies[h]||''}}`:`export function ${h}(ctx){ctx.Log("${h}");${bodies[h]||''}}`).join('\n');
 const component={scriptId:'lifecycle',name:language==='WarScript'?'Lifecycle.wls':'Lifecycle.js',language:'javascript',source,enabled:!disabled,values:{}};
 const key=language==='WarScript'?'warScripts':'webScripts',entity={id:1,name:'Lifecycle',x:0,y:0,w:32,h:32,enabled:!inactive,visible:false,[key]:[component]},events=[];
 const ctx={entities:[entity],mode:'2d',project:{scripts:[]},keys:new Set(),pressedKeys:new Set(),globals:{},log(message,level){if(level!=='error')events.push(message)},signal(){}};
 const runtime=language==='WarScript'?new WarScriptRuntime():new WebScriptRuntime({load});
 if(runtime.prepare)await runtime.prepare(ctx);
 const frame=()=>{runtime.update(.02,ctx);runtime.late()};
 return {runtime,entity,component,key,ctx,events,frame};
}
for(const language of ['WarScript','JavaScript']){
 test(language+' activates and disables components without repeating Awake or Start',async()=>{
  const q=await setup(language,{disabled:true});q.frame();assert.deepEqual(q.events,['Awake']);
  q.component.enabled=true;q.frame();assert.deepEqual(q.events,['Awake','OnEnable','Start','FixedUpdate','Update','LateUpdate']);
  q.events.length=0;q.component.enabled=false;q.frame();assert.deepEqual(q.events,['OnDisable']);
  q.events.length=0;q.component.enabled=true;q.frame();assert.deepEqual(q.events,['OnEnable','FixedUpdate','Update','LateUpdate']);
  q.events.length=0;q.runtime.stop();q.runtime.stop();assert.deepEqual(q.events,['OnDisable','OnDestroy']);
 });
 test(language+' defers inactive objects and destroys awakened disabled components',async()=>{
  const q=await setup(language,{inactive:true});q.frame();assert.deepEqual(q.events,[]);q.runtime.stop();assert.deepEqual(q.events,[]);
  const r=await setup(language,{inactive:true});r.frame();r.entity.enabled=true;r.frame();assert.deepEqual(r.events,['Awake','OnEnable','Start','FixedUpdate','Update','LateUpdate']);
  const d=await setup(language,{disabled:true});d.frame();d.runtime.stop();assert.deepEqual(d.events,['Awake','OnDestroy']);
 });
 for(const hook of ['Awake','OnEnable','Start','FixedUpdate','Update'])test(language+' stops phases when '+hook+' disables its own component',async()=>{
  const q=await setup(language,{bodies:{[hook]:language==='WarScript'?'enabled = false;':'ctx.enabled = false;'}});q.frame();
  const expected=['Awake','OnEnable','Start','FixedUpdate','Update'].slice(0,['Awake','OnEnable','Start','FixedUpdate','Update'].indexOf(hook)+1);
  if(hook!=='Awake')expected.push('OnDisable');assert.deepEqual(q.events,expected);assert.equal(q.component.enabled,false);
  q.runtime.stop();assert.equal(q.events.at(-1),'OnDestroy');
 });
 test(language+' SetActive preserves renderer visibility and suppresses late callbacks',async()=>{
  const q=await setup(language,{bodies:{Update:language==='WarScript'?'gameObject.SetActive(false);':'ctx.gameObject.SetActive(false);'}});q.frame();assert.equal(q.entity.enabled,false);assert.equal(q.entity.visible,false);assert.deepEqual(q.events,['Awake','OnEnable','Start','FixedUpdate','Update','OnDisable']);
  q.events.length=0;q.runtime.stop();assert.deepEqual(q.events,['OnDestroy']);
 });
 test(language+' removes callbacks and cleans up before LateUpdate when detached',async()=>{
  for(const removeObject of [false,true]){const q=await setup(language);q.runtime.update(.02,q.ctx);q.events.length=0;if(removeObject)q.ctx.entities.length=0;else q.entity[q.key]=[];q.runtime.late();q.frame();q.runtime.stop();assert.deepEqual(q.events,['OnDisable','OnDestroy']);}
 });
 test(language+' still cleans up components after an Update error',async()=>{
  const q=await setup(language,{bodies:{Update:language==='WarScript'?'float bad=1/0;':'throw Error("broken script");'}});q.frame();assert.match(q.component.runtime.error,/zéro|broken script/);assert.deepEqual(q.events,['Awake','OnEnable','Start','FixedUpdate','Update','OnDisable']);q.runtime.stop();assert.equal(q.events.at(-1),'OnDestroy');
 });
 test(language+' bounds callbacks that toggle activation in a loop',async()=>{
  const q=await setup(language,{bodies:{OnEnable:language==='WarScript'?'enabled=false;':'ctx.enabled=false;',OnDisable:language==='WarScript'?'enabled=true;':'ctx.enabled=true;'}});q.frame();assert.match(q.component.runtime.error,/boucle/);assert.ok(q.events.length<16);q.runtime.stop();assert.equal(q.events.at(-1),'OnDestroy');
 });
 test(language+' restores saved fields without repeating Awake or Start',async()=>{
  const q=await setup(language);q.frame();q.runtime.stop();q.component.runtime.fields={};
  if(q.runtime.prepare)await q.runtime.prepare(q.ctx);q.events.length=0;q.frame();assert.deepEqual(q.events,['OnEnable','FixedUpdate','Update','LateUpdate']);q.runtime.stop();
 });
}

for(const language of ['WarScript','JavaScript'])test(language+' initializes every loaded object before the first Start',async()=>{
 const q=await setup(language);const second=structuredClone(q.entity);second.id=2;second[q.key][0].scriptId='second';q.ctx.entities.push(second);if(q.runtime.prepare)await q.runtime.prepare(q.ctx);q.frame();assert.deepEqual(q.events.slice(0,6),['Awake','OnEnable','Awake','OnEnable','Start','Start']);q.runtime.stop();
});

test('disabled invalid JavaScript does not abort the scene and reports its own error',async()=>{
 const q=await setup('JavaScript',{disabled:true});q.component.source='invalid javascript {{{';await q.runtime.prepare(q.ctx);q.frame();assert.ok(q.component.runtime.error);q.component.enabled=true;q.frame();assert.equal(q.component.runtime.started,false);q.runtime.stop();
});
