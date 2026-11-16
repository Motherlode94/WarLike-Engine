import test from 'node:test';
import assert from 'node:assert/strict';
import {WebScriptRuntime} from '../js/core/web-script-runtime.js';
import {authorizeScripts,revokeScriptTrust} from '../js/core/script-trust.js';
import {validateScriptReply,boundedScriptData} from '../js/core/web-script-sandbox.js';
import {nativeBridgeRequest,setNativeBridgeToken,clearNativeBridgeToken} from '../js/core/native-bridge-client.js';

test('disabled and inactive JS modules have no import-time effects',async()=>{
 let imports=0;const disabled={id:1,webScripts:[{scriptId:'side-effect',language:'javascript',source:'globalThis.compromised=true;export function Update(){}',enabled:false}]};
 const inactive={id:2,enabled:false,webScripts:[{scriptId:'inactive',language:'javascript',source:'broken source'}]};
 const runtime=new WebScriptRuntime({load:async()=>{imports++;return {Update(){}}}});
 await runtime.prepare({entities:[disabled,inactive],project:{scripts:[]}});runtime.update(.02,{entities:[disabled,inactive]});assert.equal(imports,0);assert.equal(runtime.instances.length,0);
 disabled.webScripts[0].enabled=true;assert.equal(runtime.needsPrepare({entities:[disabled,inactive]}),true);runtime.stop();
});
test('trust is refused by default, local to a session, and invalidated by exact source changes',async()=>{
 revokeScriptTrust();const sources=[{project:'imported',source:'export function Update(){}',trusted:true}];let asks=0;
 await assert.rejects(authorizeScripts(sources,{ask:async()=>{asks++;return false}}),/non autorisés/);
 await authorizeScripts(sources,{ask:async()=>{asks++;return true}});await authorizeScripts(sources,{ask:()=>assert.fail('Already authorized')});assert.equal(asks,2);
 await assert.rejects(authorizeScripts([{...sources[0],source:sources[0].source+';throw 1'}],{ask:async()=>false}),/non autorisés/);
 revokeScriptTrust();await assert.rejects(authorizeScripts(sources,{ask:async()=>false}),/non autorisés/);
});
test('sandbox accepts game capabilities and refuses forged component, prototype and editor writes',()=>{
 const entries=[{}],reply={commands:[{index:0,op:'call',name:'Rotate',args:[10]}],states:[{index:0,fields:{score:1},started:true,awakened:true,error:''}]};assert.equal(validateScriptReply(reply,entries),reply);
 for(const command of [{index:9,op:'call',name:'Rotate',args:[1]},{index:0,op:'entity',name:'webScripts',args:[[]]},{index:0,op:'entity',name:'rotation',args:[Infinity]},{index:0,op:'call',name:'fetch',args:['https://example.org']},{index:0,op:'write',name:'project.token',args:['secret']}])assert.throws(()=>validateScriptReply({...reply,commands:[command]},entries));
 assert.throws(()=>boundedScriptData(JSON.parse('{"__proto__":{"x":1}}')),/réservé/);assert.throws(()=>validateScriptReply({...reply,states:[...reply.states,...reply.states]},entries));
});
test('native requests use the launch token on mutations and never reveal it in health URLs',async t=>{
 const requests=[];t.mock.method(globalThis,'fetch',async(url,options)=>{requests.push({url,options});return Response.json({ok:true})});
 setNativeBridgeToken('test-session-secret');await nativeBridgeRequest('/scene',{entities:[]});await nativeBridgeRequest('/health');clearNativeBridgeToken();await nativeBridgeRequest('/stop',{revision:1});
 assert.equal(requests[0].options.headers['X-WarLike-Token'],'test-session-secret');assert.deepEqual(requests[1].options.headers,{});assert.equal(requests[2].options.headers['X-WarLike-Token'],'');assert.ok(requests.every(r=>!r.url.includes('secret')));
});

test('sandbox deadline terminates the worker and propagates an explicit frame error',async t=>{
 const {IsolatedWebScripts}=await import('../js/core/web-script-sandbox.js');t.mock.timers.enable({apis:['setTimeout']});
 const sandbox=new IsolatedWebScripts();sandbox.active=true;sandbox.port={postMessage(){},close(){}};sandbox.ctx={entities:[],globals:{},keys:new Set(),pressedKeys:new Set()};
 const pending=sandbox.phase('update',.02,sandbox.ctx);t.mock.timers.tick(2001);await assert.rejects(pending,/Délai/);assert.equal(sandbox.active,false);assert.ok(sandbox.failure);assert.equal(sandbox.port,null);
});

test('paused sandbox replies are held and committed once when simulation resumes',async()=>{
 const {IsolatedWebScripts}=await import('../js/core/web-script-sandbox.js');const sandbox=new IsolatedWebScripts();sandbox.active=true;sandbox.ctx={entities:[],globals:{},keys:new Set(),pressedKeys:new Set()};let resolve,commits=0,canApply=true;
 sandbox.request=()=>new Promise(r=>resolve=r);sandbox.apply=()=>commits++;
 const pending=sandbox.phase('update',.02,sandbox.ctx,{canApply:()=>canApply});canApply=false;resolve({commands:[],states:[]});assert.equal(await pending,null);assert.equal(commits,0);
 canApply=true;const resumed=await sandbox.phase('update',.03,sandbox.ctx,{canApply:()=>canApply});assert.equal(resumed.dt,.02);assert.equal(resumed.reused,true);assert.equal(commits,1);assert.equal(sandbox.held,null);sandbox.stop();
});
