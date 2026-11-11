// CHAMBRE 07 export smoke test in an isolated local browser.
// Requires Playwright + Chromium: node scripts/test-chambre07-export-browser.mjs
import assert from 'node:assert/strict';
import {readFile,mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createChambre07Scene} from '../js/core/chambre-07-scene.js';
import {exportGamePackage} from '../js/core/game-build.js';
import {freshGameProject} from '../js/core/game-project.js';
import {defaultRigidbody3d} from '../js/core/physics-3d.js';
import {defaultCollider3d} from '../js/core/collider-3d.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const output=process.env.WARLIKE_CHAMBRE07_OUTPUT_DIR?path.resolve(process.env.WARLIKE_CHAMBRE07_OUTPUT_DIR):await mkdtemp(path.join(tmpdir(),'chambre07-export-'));
await mkdir(output,{recursive:true});
const demo=createChambre07Scene('3d');
// Browser-only physics probe: never included in the authored CHAMBRE 07 demo.
demo.entities.push({id:Math.max(...demo.entities.map(o=>o.id))+1,name:'QA · Chute Rigidbody',
 type:'mesh3d',x:540,y:240,w:32,depth3d:32,h:32,elevation3d:2,
 color:'#d5ec80',collision3d:true,solid3d:true,
 rigidbody3d:{...defaultRigidbody3d(),restitution:0},collider3d:defaultCollider3d()});
const backend=process.env.WARLIKE_PHYSICS_BACKEND==='rapier'?'rapier':'builtin';
const project={...freshGameProject(),id:'chambre07-e2e',title:'CHAMBRE 07',genre:'horror',physics3d:backend};
const fetcher=async url=>{
 try {
  const bytes=await readFile(fileURLToPath(url));
  return {ok:true,json:async()=>JSON.parse(bytes.toString()),text:async()=>bytes.toString(),arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};
 }catch{return {ok:false};}
};
const packageResult=await exportGamePackage({mode:'3d',camera:demo.camera,entities:demo.entities,project},{fetcher});
const zip=new Uint8Array(await packageResult.blob.arrayBuffer()),view=new DataView(zip.buffer,zip.byteOffset,zip.byteLength);
let offset=0;
while(offset+30<=zip.byteLength&&view.getUint32(offset,true)===0x04034b50){
 const length=view.getUint16(offset+26,true),extra=view.getUint16(offset+28,true),size=view.getUint32(offset+18,true);
 const name=new TextDecoder().decode(zip.subarray(offset+30,offset+30+length));
 assert(!name.startsWith('/')&&!name.split('/').includes('..'),'Unsafe ZIP name: '+name);
 const file=path.join(output,name),start=offset+30+length+extra;
 assert(start+size<=zip.length,'Corrupt ZIP entry: '+name);
 await mkdir(path.dirname(file),{recursive:true});await writeFile(file,zip.subarray(start,start+size));
 offset=start+size;
}
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.glb':'model/gltf-binary','.wasm':'application/wasm','.svg':'image/svg+xml'};
const server=createServer(async(request,response)=>{
 const url=new URL(request.url,'http://127.0.0.1'),file=path.resolve(output,'.'+decodeURIComponent(url.pathname));
 if(file!==output&&!file.startsWith(output+path.sep)){response.writeHead(403).end();return;}
 try {const target=path.extname(file)?file:path.join(file,'index.html');const bytes=await readFile(target);response.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream'});response.end(bytes);}
 catch{response.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 const playwright=await import(process.env.WARLIKE_PLAYWRIGHT_MODULE||'playwright');
 browser=await playwright.chromium.launch({headless:true,...(process.env.WARLIKE_CHROMIUM?{executablePath:process.env.WARLIKE_CHROMIUM}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--in-process-gpu']});
 const context=await browser.newContext({viewport:{width:1440,height:900}}),errors=[],failed=[];
 const page=await context.newPage();
 page.on('pageerror',error=>errors.push(error.message));
 page.on('response',response=>{if(response.status()>=400)failed.push([response.status(),response.url()])});
 await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded',timeout:60000});
 await page.getByRole('button',{name:'Jouer',exact:true}).waitFor({timeout:45000});
 await page.getByRole('button',{name:'Jouer',exact:true}).click();
 await page.waitForFunction(async()=>{
  const {runtimeSession}=await import('/js/core/runtime-session.js');
  return runtimeSession.phase==='ready';
 },null,{timeout:45000});
 // Collect the trajectory in one Playwright page context. A single
 // waitForFunction observation may race against a different browser world.
 const physics=await page.evaluate(async()=>{
  const {state}=await import('/js/core/state.js');
  const {activeRapierScene3d}=await import('/js/core/rapier-physics-3d.js');
  const samples=[];
  for(let i=0;i<90;i++){
   const o=state.entities.find(e=>e.name==='QA · Chute Rigidbody');
   samples.push(o?{height:o.elevation3d,grounded:o.grounded3d===true,vy:o.rigidbody3d?.vy}:null);
   await new Promise(resolve=>setTimeout(resolve,50));
  }
  const id=state.entities.find(e=>e.name==='QA · Chute Rigidbody')?.id;
  return {samples,rapierActive:!!activeRapierScene3d()?.actors?.has(id)};
 });
 assert.ok(physics.samples[0]?.height>1,'Exported runtime did not initialize its physics probe correctly');
 assert.ok(physics.samples.some(s=>s?.height<.05),'The exported Rigidbody never reached the floor: '+JSON.stringify(physics.samples.filter((_,i)=>i%10===0)));
 const tail=physics.samples.slice(-10);
 assert.ok(tail.every(s=>s&&Math.abs(s.height)<.05&&s.grounded&&Math.abs(s.vy||0)<.2),
  'Exported Rigidbody is not resting on the floor: '+JSON.stringify(physics.samples.filter((_,i)=>i%10===0)));
 if(backend==='rapier')assert.equal(physics.rapierActive,true,'Browser fell back to built-in instead of Rapier');
 const state=await page.evaluate(async()=>{
  const {state}=await import('/js/core/state.js');
  const {gameSession}=await import('/js/core/game-session.js');
  const {view3d}=await import('/js/core/viewport-3d.js');
  return {playing:state.playing,count:state.entities.length,player:state.entities.find(o=>o.playable3d)?.name,
   memories:state.entities.filter(o=>o.tags?.includes('chambre07-memory')).length,
   floor:state.entities.some(o=>o.name==='Plancher · appartement'&&o.solid3d),
   physicsCube:state.entities.find(o=>o.name==='QA · Chute Rigidbody')?.elevation3d,
   phase:gameSession.phase,glError:view3d.gl?.getError(),renderError:view3d.error};
 });
 assert(state.playing,'Exported scene must be in Play');
 assert(state.count>=20&&state.floor&&state.memories===3,'Native scene objects missing in exported build');
 assert.match(state.player||'',/CHAMBRE 07/);
 assert.ok(Number.isFinite(state.physicsCube),'Exported browser lost the physics test object');
 assert.equal(state.glError||0,0,'WebGL runtime error');
 assert.equal(state.renderError||null,null,'3D render error');
 assert.equal(errors.length,0,'Unhandled page errors: '+errors.join('\n'));
 assert.equal(failed.length,0,'Missing runtime assets: '+JSON.stringify(failed.slice(0,10)));
 await page.screenshot({path:path.join(output,'chambre07-play.png'),timeout:20000});
 console.log(JSON.stringify({result:'PASS',backend,output,files:packageResult.files,state},null,2));
 await context.close();
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
