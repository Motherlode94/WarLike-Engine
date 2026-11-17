import test from 'node:test';
import assert from 'node:assert/strict';
import {allowedWvcOrigin,checkIncomingFile,validSession,WVC_MAIN_ORIGIN} from '../script-editor/wvc-protocol.js';
import {setupWvcBridge} from '../script-editor/wvc-bridge.js';
const session='11111111-2222-4333-8444-555555555555',origin=WVC_MAIN_ORIGIN;
test('origin allowlist rejects unrelated hosts, tricks and insecure HTTP',()=>{
 assert.equal(allowedWvcOrigin(origin),true);
 assert.equal(allowedWvcOrigin('http://localhost:8000'),true);
 for(const url of ['https://evil.example','https://w-visual-code.pages.dev.evil.com','http://w-visual-code.pages.dev','https://w-visual-code.pages.dev/path','javascript:alert(1)'])assert.equal(allowedWvcOrigin(url),false,url);
});
test('protocol bounds scripts and accepts only supported source formats',()=>{
 const valid=checkIncomingFile({path:'Scripts/Hero.wls',source:'Update() {}',language:'warscript'});
 assert.equal(valid.name,'Hero.wls');assert.equal(valid.path,'Scripts/Hero.wls');
 for(const file of [
  {path:'../bad.wls',source:'',language:'warscript'},
  {path:'bad.cs',source:'',language:'javascript'},
  {path:'evil.html',source:'',language:'html'},
  {path:'evil.wls',source:'x'.repeat(262145),language:'warscript'}
 ])assert.throws(()=>checkIncomingFile(file));
 assert.equal(validSession(session),true);assert.equal(validSession('abc'),false);
});
test('WVC connection must be approved and origin/source/session must match',()=>{
 const sends=[],imports=[],handlers=new Map(),status=[];
 const opener={postMessage:(message,target)=>sends.push({message,target})};
 const environment={opener,location:{search:'?wvcOrigin='+encodeURIComponent(origin)},confirm(){return true},
  addEventListener:(name,handler)=>handlers.set(name,handler),removeEventListener:(name)=>handlers.delete(name)};
 const teardown=setupWvcBridge({environment,importSource:data=>imports.push(data),status:t=>status.push(t)});
 assert.equal(sends[0].message.type,'wvc:ready');
 const dispatch=(data,{source=opener,from=origin}={})=>handlers.get('message')({data,source,origin:from});
 dispatch({type:'wvc:push',protocol:1,session,requestId:session,file:{path:'Test.wls',source:'Update(){}',language:'warscript'}});
 assert.equal(imports.length,0,'must reject push before consent');
 dispatch({type:'wvc:hello',protocol:1,session},{from:'https://evil.example'});
 assert.equal(imports.length,0);
 dispatch({type:'wvc:hello',protocol:1,session});
 assert.equal(sends.at(-1).message.type,'wvc:connected');
 dispatch({type:'wvc:push',protocol:1,session:'33333333-4444-4555-8666-777777777777',requestId:session,file:{path:'Test.wls',source:'',language:'warscript'}});
 assert.equal(imports.length,0,'session must match');
 dispatch({type:'wvc:push',protocol:1,session,requestId:session,file:{path:'Test.wls',source:'Update(){}',language:'warscript'}});
 assert.equal(imports.length,1);assert.equal(sends.at(-1).message.type,'wvc:ack');assert.equal(sends.at(-1).message.ok,true);
 teardown();assert.equal(handlers.has('message'),false);
});
test('denied consent prevents sending files to Engine',()=>{
 const messages=[],listeners={};const opener={postMessage:m=>messages.push(m)};
 const env={opener,location:{search:'?wvcOrigin='+encodeURIComponent(origin)},confirm:()=>false,addEventListener:(n,f)=>listeners[n]=f,removeEventListener:(n)=>delete listeners[n]};
 let imports=0;
 setupWvcBridge({environment:env,importSource:()=>imports++});
 listeners.message({source:opener,origin,data:{type:'wvc:hello',protocol:1,session}});
 listeners.message({source:opener,origin,data:{type:'wvc:push',protocol:1,session,requestId:session,file:{path:'Hero.cs',source:'x',language:'csharp'}}});
 assert.equal(imports,0);assert.equal(messages.some(x=>x.type==='wvc:connected'),false);
});
