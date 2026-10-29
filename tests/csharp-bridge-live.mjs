import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {applyCsharpFrame} from '../js/core/csharp-frame.js';
import {createCsharpSquadDemo} from '../js/core/csharp-tactical-scene.js';

test('real .NET bridge: typed parameters, tactical orders, revisions, origin and body limits',
 {skip:process.env.WARLIKE_DOTNET_BRIDGE!=='1',timeout:25000},async t=>{
 const base='http://127.0.0.1:8765',origin='https://warlike-engine.pages.dev';
 // Refuse to reuse an unrelated local bridge or test against an old process.
 try{await fetch(base+'/health',{signal:AbortSignal.timeout(300)});assert.fail('Port 8765 is already occupied.')}catch(error){if(error.code==='ERR_ASSERTION')throw error}
 const child=spawn(process.env.WARLIKE_DOTNET_CMD||'dotnet',['csharp/WarLike.Bridge/bin/Release/net8.0/WarLike.Bridge.dll'],{cwd:new URL('..',import.meta.url),env:process.env,stdio:['ignore','pipe','pipe']});
 let logs='';child.stdout.on('data',data=>{logs+=data});child.stderr.on('data',data=>{logs+=data});
 t.after(async()=>{child.kill();if(child.exitCode===null)await Promise.race([new Promise(resolve=>child.once('exit',resolve)),delay(2000).then(()=>child.kill('SIGKILL'))])});
 let spawnError;child.on('error',error=>{spawnError=error});
 let healthy=false;
 for(let i=0;i<120;i++){
  if(spawnError||child.exitCode!==null||child.signalCode!==null)throw Error('Bridge failed: '+(spawnError?.message||logs));
  // .NET 8 HttpListener must finish Start() before the first client connects.
  // Its listener-ready message is emitted only after the endpoint is initialized.
  if(!logs.includes('WarLike C# bridge listening on')){await delay(50);continue}
  try{const response=await fetch(base+'/health',{signal:AbortSignal.timeout(300)});if(response.ok){healthy=true;break}}catch{}
  await delay(50);
 }
 assert.ok(healthy,'Bridge did not start: '+logs);
 const call=async(path,data,expected=200)=>{
  const response=await fetch(base+path,{method:data===undefined?'GET':'POST',headers:{Origin:origin,...(data===undefined?{}:{'Content-Type':'application/json'})},...(data===undefined?{}:{body:JSON.stringify(data)}),signal:AbortSignal.timeout(3000)});
  const body=await response.json();assert.equal(response.status,expected,JSON.stringify(body));return body;
 };
 const health=await call('/health');assert.equal(health.protocol,2);assert.ok(health.capabilities.includes('tactical-squads'));
 const scene={entities:[
  {id:1,name:'Escouade',x:0,y:0,csharpComponents:[{kind:'TacticalSquad',memberIds:[2,3],speed:3,spacing:1.5}]},
  {id:2,name:'A',x:0,y:0},{id:3,name:'B',x:0,y:0},
  {id:4,name:'Vehicle',x:640,y:0,csharpComponents:[{kind:'VehicleController',maxSpeed:200}]}]};
 const sync=await call('/scene',scene),revision=sync.revision;
 let inspected=await call('/components/inspect',{id:1,revision});
 assert.equal(inspected.actor.components[0].type,'TacticalSquadComponent');
 assert.equal(inspected.actor.components[0].sourceIndex,0);
 const updated=await call('/components/set',{id:1,revision,index:0,property:'Speed',value:4});
 assert.equal(updated.actor.components[0].properties.find(p=>p.name==='Speed').value,4);
 await call('/components/set',{id:1,revision,index:0,property:'Speed',value:-3},400);
 await call('/components/set',{id:1,revision,index:0,property:'MemberCount',value:99},400);
 await call('/components/set',{id:1,revision,index:0,property:'Enabled',value:'true'},400);
 await call('/squad/command',{id:1,revision,action:'members',memberIds:[2,2]},400);
 await call('/squad/command',{id:1,revision,action:'members',memberIds:[999]},400);
 await call('/squad/command',{id:1,revision,action:'move',x:192,y:0});
 let frame;for(let i=0;i<16;i++)frame=await call('/tick',{dt:.25});
 assert.ok(Math.abs(frame.actors.find(a=>a.id===1).x-192)<.01);
 assert.equal(applyCsharpFrame(scene.entities,frame.actors),4);
 assert.ok(Math.abs(Math.hypot(scene.entities[1].x-scene.entities[2].x,scene.entities[1].y-scene.entities[2].y)-96)<.01);
 await call('/squad/command',{id:1,revision,action:'hold'});
 const before=frame.actors.find(a=>a.id===2);frame=await call('/tick',{dt:.25});
 assert.deepEqual(frame.actors.find(a=>a.id===2),before);
 await call('/squad/command',{id:1,revision,action:'follow',targetId:4});
 await call('/vehicle/input',{id:4,throttle:1,steer:0,handbrake:false});
 for(let i=0;i<4;i++)frame=await call('/tick',{dt:.25});
 assert.ok(frame.actors.find(a=>a.id===4).y<0,'C# vehicle did not move.');
 inspected=await call('/components/inspect',{id:1,revision});assert.equal(inspected.actor.components[0].started,true);
 const next=await call('/scene',scene);assert.ok(next.revision>revision);
 await call('/components/set',{id:1,revision,index:0,property:'Speed',value:20},409);
 await call('/components/inspect',{id:999,revision:next.revision},404);
 await call('/scene',{entities:[{id:1},{id:1}]},400);
 await call('/components/inspect',{id:1,revision:next.revision}); // Failed import kept the existing world.
 await call('/components/inspect',{id:1,revision:next.revision,padding:'x'.repeat(33000)},413);
 const denied=await fetch(base+'/health',{headers:{Origin:'https://unrelated.example'},signal:AbortSignal.timeout(1000)});
 assert.equal(denied.status,403);
 const demo=await call('/scene',{entities:createCsharpSquadDemo(20)});
 assert.equal(demo.count,6);
 const demoInspector=await call('/components/inspect',{id:20,revision:demo.revision});
 assert.equal(demoInspector.actor.components[0].properties.find(p=>p.name==='MemberCount').value,4);
 await call('/squad/command',{id:20,revision:demo.revision,action:'move',x:700,y:250});
 for(let i=0;i<4;i++)frame=await call('/tick',{dt:.25});
 assert.ok(frame.actors.find(a=>a.id===21).x>202,'The actual Studio example did not move.');
});
