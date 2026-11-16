import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'.validation-tools/script-security');await mkdir(out,{recursive:true});
const traffic=[];
const server=createServer(async(req,res)=>{
 const url=new URL(req.url,'http://local');if(url.pathname==='/probe'){traffic.push(req.url);res.end('secret');return}
 if(url.pathname==='/harness'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Script isolation QA</title><h1>WarLike script isolation</h1><p>Sandbox security acceptance</p>');return}
 const file=path.resolve(root,'.'+url.pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':'application/octet-stream');res.end(await readFile(file))}catch{res.writeHead(404).end()}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
let browser;const checks=[];
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1100,height:760}});page.setDefaultTimeout(15000);await page.goto(origin+'/harness');
 const setup=async(mode,source,enabled=true)=>page.evaluate(async({mode,source,enabled})=>{
  window.qa?.runtime.stop();const {WebScriptRuntime}=await import('/js/core/web-script-runtime.js'),{revokeScriptTrust}=await import('/js/core/script-trust.js');revokeScriptTrust();
  localStorage.setItem('warlike.qa.secret','parent-secret');sessionStorage.setItem('warlike.qa.token','launch-token');
  const component={scriptId:'hostile',name:'Imported.js',language:'javascript',source,enabled,values:{}};
  const ctx={entities:[{id:1,name:'Old GameObject',type:'object',x:0,y:0,w:32,h:32,rotation:0,hp:100,webScripts:[component]}],mode,project:{id:'old-'+mode,scripts:[],trusted:true},globals:{},keys:new Set(),pressedKeys:new Set(),log(){},signal(){}};
  window.qa={ctx,component,runtime:new WebScriptRuntime(),error:null};window.qa.promise=qa.runtime.prepare(ctx).catch(e=>{qa.error=e.message});
 },{mode,source,enabled});
 const settle=()=>page.evaluate(async()=>{await qa.promise;return {error:qa.error,active:qa.runtime.isolated,entity:qa.ctx.entities[0],globals:qa.ctx.globals,local:localStorage.getItem('warlike.qa.secret'),session:sessionStorage.getItem('warlike.qa.token')}});
 const frame=()=>page.evaluate(async()=>{try{await qa.runtime.update(.02,qa.ctx);await qa.runtime.late();return {entity:qa.ctx.entities[0],globals:qa.ctx.globals}}catch(e){return {error:e.message,entity:qa.ctx.entities[0]}}});
 for(const mode of ['2d','3d']){
  await setup(mode,'throw Error("disabled module executed");export function Update(){}',false);let result=await settle();assert.equal(result.error,null);assert.equal(result.active,false);assert.equal(await page.locator('#scriptTrustDialog').count(),0);
  await setup(mode,'globalThis.compromised=true;export function Update(ctx){ctx.entity.hp=0}');await page.locator('#scriptTrustDeny').click();result=await settle();assert.match(result.error,/non autorisés/);assert.equal(result.entity.hp,100);assert.equal(result.local,'parent-secret');assert.equal(result.session,'launch-token');
  const attack=`let network=false,db=false;try{await fetch(${JSON.stringify(origin+'/probe')})}catch{network=true}try{await new Promise((resolve,reject)=>{const r=indexedDB.open('warlike-qa');r.onsuccess=resolve;r.onerror=reject})}catch{db=true}
export const fields={network,db,local:typeof localStorage,session:typeof sessionStorage,document:typeof document,parent:typeof parent};
export function Start(ctx){ctx.Move(1,0,0);ctx.Rotate(5);ctx.entity.hp=50;ctx.Set('executed',1)}
export function Update(ctx){ctx.fields.frames=(ctx.fields.frames||0)+1}`;
  await setup(mode,attack);await page.locator('#scriptTrustAllow').click();result=await settle();assert.equal(result.error,null);assert.equal(result.active,true);result=await frame();assert.ok(!result.error,result.error);assert.equal(result.entity.x,64);assert.equal(result.entity.rotation,5);assert.equal(result.entity.hp,50);assert.equal(result.globals.executed,1);const fields=result.entity.webScripts[0].runtime.fields;assert.equal(fields.network,true);assert.equal(fields.db,true);for(const key of ['local','session','document','parent'])assert.equal(fields[key],'undefined');assert.deepEqual(traffic,[]);
  await page.screenshot({path:path.join(out,'sandbox-'+mode+'.png')});checks.push({mode,disabled:true,denied:true,storageBlocked:true,networkBlocked:true,gameCommands:true});
 }
 await setup('3d','export function Update(){while(true){}}');await page.locator('#scriptTrustAllow').click();assert.equal((await settle()).error,null);
 const pending=frame();await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>({responsive:true})).then(v=>v.responsive),true);const interrupted=await pending;assert.match(interrupted.error,/Délai/);assert.equal(await page.locator('iframe').count(),0);checks.push({infiniteLoopTerminated:true,editorResponsive:true});
 await setup('2d','export function Update(ctx){ctx.entity.rotation=99;while(true){}}');await page.locator('#scriptTrustAllow').click();await settle();const stopped=frame();await page.waitForTimeout(50);await page.evaluate(()=>qa.runtime.stop());await stopped;assert.equal(await page.evaluate(()=>qa.ctx.entities[0].rotation),0);checks.push({staleRepliesDiscarded:true});
 await writeFile(path.join(out,'report.json'),JSON.stringify({result:'PASS',checks},null,2));console.log('PASS script security',JSON.stringify(checks));
}finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r))}
