import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
let child,base,host,guest,code;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
before(async()=>{
 child=spawn('python3',['-u','python/lan_server.py','--host','127.0.0.1','--port','0','--key','LAN-TEST-OWNER'],{cwd:new URL('../',import.meta.url),stdio:['ignore','pipe','pipe']});
 base=await new Promise((resolve,reject)=>{let out='';const timeout=setTimeout(()=>reject(Error('LAN server startup timeout')),8000);child.stdout.on('data',data=>{out+=data;const match=out.match(/http:\/\/localhost:(\d+)\//);if(match){clearTimeout(timeout);resolve('http://127.0.0.1:'+match[1])}});child.on('error',reject);child.on('exit',code=>{if(!base)reject(Error('LAN startup exited '+code))})});
});
after(async()=>{child?.kill();if(child&&child.exitCode===null)await once(child,'exit')});
async function post(action,data){const r=await fetch(base+'/lan/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});return {status:r.status,data:await r.json()}}
const snapshot={mode:'3d',entities:[{id:1,type:'mesh3d',x:0,y:0,w:32,h:96,depth3d:32}],phase:'playing'};
test('LAN serves the engine and declares its protocol without leaking the owner key',async()=>{
 const info=await (await fetch(base+'/lan/info')).json();assert.equal(info.protocol,1);assert.equal(info.maxPlayers,4);assert.equal(JSON.stringify(info).includes('LAN-TEST-OWNER'),false);assert.equal((await fetch(base+'/')).status,200);assert.equal((await fetch(base+'/src/math/clamp.js')).status,200);assert.equal((await fetch(base+'/.git/config')).status,403);assert.equal((await fetch(base+'/.git/config',{method:'HEAD'})).status,403);
});
test('hosting requires the owner key and joining waits for an authoritative world',async()=>{
 assert.equal((await post('create',{key:'wrong'})).status,403);const created=await post('create',{key:'LAN-TEST-OWNER',name:'Hôte'});assert.equal(created.status,200);host=created.data;code=host.code;assert.equal(code.length,8);assert.equal((await post('join',{code,name:'Invité'})).status,400);assert.equal((await post('snapshot',{token:host.token,snapshot})).status,200);const joined=await post('join',{code,name:'Invité'});assert.equal(joined.status,200);guest=joined.data;assert.equal(guest.mode,'3d');assert.equal(guest.host,false);assert.notEqual(guest.token,host.token);
});
test('SSE sends the roster and latest world to a guest; guests cannot publish snapshots',async()=>{
 const abort=new AbortController(),response=await fetch(base+'/lan/events?token='+guest.token,{signal:abort.signal}),reader=response.body.getReader();assert.match(response.headers.get('content-type'),/text\/event-stream/);let text='';for(let i=0;i<5&&!text.includes('"snapshot"');i++){const value=await reader.read();text+=new TextDecoder().decode(value.value)}abort.abort();assert.match(text,/"roster"/);assert.match(text,/"snapshot"/);assert.equal((await post('snapshot',{token:guest.token,snapshot:{...snapshot,entities:[]}})).status,403);
});
test('LAN forwards bounded inputs and rejects arbitrary origins and invalid sessions',async()=>{
 await wait(20);assert.equal((await post('input',{token:guest.token,sequence:1,keys:['w','1','eval'],pressed:['1'],yaw:Infinity})).status,200);const forbidden=await fetch(base+'/lan/join',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://unrelated.invalid'},body:JSON.stringify({code})});assert.equal(forbidden.status,403);assert.equal((await post('ping',{token:'invalid'})).status,403);
});
test('LAN relays allowed survival actions without accepting arbitrary world commands',{timeout:8000},async()=>{
 const abort=new AbortController();try{const response=await fetch(base+'/lan/events?token='+host.token,{signal:abort.signal}),reader=response.body.getReader();await reader.read();await wait(20);assert.equal((await post('input',{token:guest.token,sequence:2,actions:['craft:campfire','setHealth','drink','destroy']})).status,200);let text='';for(let i=0;i<8&&!text.includes('"input"');i++){const next=await reader.read();text+=new TextDecoder().decode(next.value)}const event=text.split('\n').filter(s=>s.startsWith('data:')).map(s=>JSON.parse(s.slice(5))).find(e=>e.type==='input');assert.deepEqual(event.actions,['craft:campfire','drink']);assert.equal(event.peerId,guest.peerId)}finally{abort.abort()}
});
test('LAN accepts only bounded placement intentions and strips client-owned entity data',{timeout:8000},async()=>{
 const abort=new AbortController();try{const response=await fetch(base+'/lan/events?token='+host.token,{signal:abort.signal}),reader=response.body.getReader();await reader.read();await wait(20);
 const valid={type:'place',recipe:'shelter',x:100,y:90,rotation:90};assert.equal((await post('input',{token:guest.token,sequence:3,actions:[{...valid,entity:{id:777},cost:0},{...valid,x:true},{...valid,recipe:'tank'},{...valid,x:1000001}]})).status,200);
 let text='';for(let i=0;i<8&&!text.includes('"input"');i++){const next=await reader.read();text+=new TextDecoder().decode(next.value)}const event=text.split('\n').filter(s=>s.startsWith('data:')).map(s=>JSON.parse(s.slice(5))).find(e=>e.type==='input');assert.deepEqual(event.actions,[valid]);
 await wait(20);assert.equal((await post('input',{token:guest.token,sequence:4,actions:{type:'place'}})).status,200);
 }finally{abort.abort()}
});
test('Survival room names are trimmed and distinct so saved companions are unambiguous',async()=>{
 const h=(await post('create',{key:'LAN-TEST-OWNER',name:' Gardien '})).data;assert.ok(h.token);await post('snapshot',{token:h.token,snapshot:{...snapshot,genre:'survival',entities:[{...snapshot.entities[0],survival:{enabled:true}}]}});
 const duplicate=await post('join',{code:h.code,name:' Gardien '});assert.equal(duplicate.status,400);assert.match(duplicate.data.error,/nom/);assert.equal((await post('join',{code:h.code,name:'Ami'})).status,200);await post('leave',{token:h.token});
});
test('LAN forwards tool crafting and repair without accepting client durability overrides',{timeout:8000},async()=>{
 const abort=new AbortController();try{const response=await fetch(base+'/lan/events?token='+host.token,{signal:abort.signal}),reader=response.body.getReader();await reader.read();await wait(20);assert.equal((await post('input',{token:guest.token,sequence:5,actions:['craft:axe','craft:pickaxe','repair:axe',{type:'repair',tool:'axe',durability:999}]})).status,200);let text='';for(let i=0;i<8&&!text.includes('"input"');i++){const next=await reader.read();text+=new TextDecoder().decode(next.value)}const event=text.split('\n').filter(s=>s.startsWith('data:')).map(s=>JSON.parse(s.slice(5))).find(e=>e.type==='input');assert.deepEqual(event.actions,['craft:axe','craft:pickaxe','repair:axe']);assert.equal(event.peerId,guest.peerId)}finally{abort.abort()}
});
test('LAN relays only bounded adventure interactions and dialogue selections',{timeout:8000},async()=>{
 const created=(await post('create',{key:'LAN-TEST-OWNER',name:'Hôte aventure'})).data;await post('snapshot',{token:created.token,snapshot});const joined=(await post('join',{code:created.code,name:'Ami aventure'})).data;
 const abort=new AbortController();try{const response=await fetch(base+'/lan/events?token='+created.token,{signal:abort.signal});assert.equal(response.status,200);const reader=response.body.getReader();await reader.read();await wait(20);const interaction={type:'interact',targetId:23},choice={type:'dialogue',dialogueId:'dialogue-test',index:1};assert.equal((await post('input',{token:joined.token,sequence:1,actions:[{...interaction,signal:'win'},{...choice,signal:'win'},{...choice,index:6},{type:'interact',targetId:true}]})).status,200);
 let buffer='',event;for(let i=0;i<20&&!event;i++){const next=await reader.read();if(next.done)break;buffer+=new TextDecoder().decode(next.value);for(const frame of buffer.split('\n\n').slice(0,-1)){const line=frame.split('\n').find(s=>s.startsWith('data:'));if(line){const value=JSON.parse(line.slice(5));if(value.type==='input')event=value}}}assert.ok(event);assert.deepEqual(event.actions,[interaction,choice]);
 }finally{abort.abort();await post('leave',{token:created.token})}
});
test('a private room has at most four peers and leaving the host closes it',async()=>{
 const third=(await post('join',{code,name:'Trois'})).data,fourth=(await post('join',{code,name:'Quatre'})).data;assert.ok(third.token&&fourth.token);assert.equal((await post('join',{code,name:'Cinq'})).status,400);assert.equal((await post('leave',{token:host.token})).status,200);assert.equal((await post('ping',{token:guest.token})).status,403);assert.equal((await post('join',{code})).status,400);
});
