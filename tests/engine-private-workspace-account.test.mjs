import test from 'node:test';
import assert from 'node:assert/strict';
import {getToken,guardOrigin,validAccount,COOKIE,sessionCookie} from '../functions/_engine-session.js';
import {onRequest as proxy} from '../functions/api/engine/[[path]].js';

const token='A'.repeat(43);
const makeContext=(path,expected,identity='WL-ALICE')=>{
 const request=new Request('https://warlike-engine.pages.dev/api/engine/'+path,{headers:{Cookie:COOKIE+'='+token,'X-Warlike-Engine-Account':expected}});
 const calls=[];
 const env={WARLIKE_APP:{fetch:async req=>{calls.push(new URL(req.url).pathname);return Response.json(req.url.endsWith('/me')?{userId:identity,engineAccess:true}:{projects:[]});}}};
 return {context:{request,env,params:{path:path.split('/')}},calls};
};
test('private Engine session cookie is HttpOnly, Secure and scoped to its own host',()=>{
 assert.match(sessionCookie(token,100),/HttpOnly; SameSite=Strict/);
 assert.match(sessionCookie(token,100),/Secure/);
 assert.equal(getToken(new Request('https://warlike-engine.pages.dev/',{headers:{Cookie:COOKIE+'='+token}})),token);
 assert.equal(getToken(new Request('https://warlike-engine.pages.dev/',{headers:{Cookie:COOKIE+'='+token+'; '+COOKIE+'='+token}})),null);
 assert.equal(validAccount('WL-ALICE'),true);assert.equal(validAccount('../bob'),false);
 assert.equal(guardOrigin(new Request('https://warlike-engine.pages.dev/api/engine/session',{method:'POST',headers:{Origin:'https://evil.example'}})),false);
});
test('server-side account swap is rejected before any project query is forwarded',async()=>{
 const {context,calls}=makeContext('projects','WL-BOB','WL-ALICE');
 const response=await proxy(context);
 assert.equal(response.status,401);
 assert.deepEqual(calls,['/api/engine/me']);
});
test('verified account reaches only its private project endpoint',async()=>{
 const {context,calls}=makeContext('projects','WL-ALICE','WL-ALICE');
 const response=await proxy(context);
 assert.equal(response.status,200);assert.deepEqual(calls,['/api/engine/me','/api/engine/projects']);
});
