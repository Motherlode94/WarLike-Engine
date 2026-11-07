// Real ZIP + isolated browser test. Run `npm run test:export` after installing Chromium.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createAnimationDemo} from '../js/core/animation-demo.js';
import {exportGamePackage} from '../js/core/game-build.js';
import {freshGameProject} from '../js/core/game-project.js';
import {registerLocalModel} from '../js/assets/real-models-3d.js';
import {prefab3d} from '../js/assets/catalog-3d.js';
const root=path.resolve(import.meta.dirname,'..');
const output=await mkdtemp(path.join(tmpdir(),'warlike-export-'));
const playwright=await import(process.env.WARLIKE_PLAYWRIGHT_MODULE||'playwright');
const demo=createAnimationDemo(),project=freshGameProject();
Object.assign(project,{id:'export-verification',title:'Atelier du mouvement',genre:'adventure'});
const bytes=await readFile(path.join(root,'assets/free/kenney/mini-characters/character-male-a.glb'));
const asset=registerLocalModel(new File([bytes],'Imported-Hero.glb'),{id:'library-'+createHash('sha256').update(bytes).digest('hex').slice(0,24)});
const local=registerLocalModel(new File([bytes],'Local-Performer.glb'));
const performer=demo.entities.find(o=>o.name.startsWith('01 · Pose'));performer.assetId=performer.model3dId=local.id;
const hero=demo.entities.find(o=>o.playable3d);
hero.assetId=hero.model3dId=asset.id;
hero.webScripts=[{scriptId:'export-smoke-js',name:'export-smoke.js',language:'javascript',source:'export function Update(ctx){ctx.Set("jsFrames",ctx.Get("jsFrames")+1);}',values:{}}];
const barrier=prefab3d('free-survival-kit-box-open',Math.max(...demo.entities.map(o=>o.id))+1,550,850);
Object.assign(barrier,{name:'Collision verification',w:128,h:96,depth3d:128,collision3d:true});demo.entities.push(barrier);
const fetcher=async url=>{
 const filename=decodeURIComponent(url.pathname);
 try{const data=await readFile(filename);return {ok:true,json:async()=>JSON.parse(data),text:async()=>data.toString(),arrayBuffer:async()=>data.buffer.slice(data.byteOffset,data.byteOffset+data.length)};}catch{return {ok:false};}
};
const build=await exportGamePackage({entities:demo.entities,camera:demo.camera,mode:'3d',project},{fetcher});
const zip=await build.blob.arrayBuffer(),view=new DataView(zip);let offset=0;
while(view.getUint32(offset,true)===0x04034b50){
 const size=view.getUint32(offset+18,true),length=view.getUint16(offset+26,true),extra=view.getUint16(offset+28,true);
 const name=new TextDecoder().decode(new Uint8Array(zip,offset+30,length)),start=offset+30+length+extra;
 assert(!name.includes('..'));const file=path.join(output,name);await mkdir(path.dirname(file),{recursive:true});await writeFile(file,new Uint8Array(zip,start,size));offset=start+size;
}
const mime={'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.wasm':'application/wasm','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const server=createServer(async(req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname),source=pathname.startsWith('/editor/'),base=source?root:output;
 const file=path.resolve(base,'.'+(source?pathname.slice(7):pathname));
 if(!file.startsWith(base+'/')&&file!==base){res.writeHead(403).end();return;}
 const target=path.extname(file)?file:path.join(file,'index.html');
 try{const data=await readFile(target);res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream'});res.end(data);}catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
let browser;
try{
 browser=await playwright.chromium.launch({headless:true,...(process.env.WARLIKE_CHROMIUM?{executablePath:process.env.WARLIKE_CHROMIUM}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--in-process-gpu']});
 const context=await browser.newContext({viewport:{width:1280,height:800}}),errors=[],failed=[],external=[];
 await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin===origin||['blob:','data:'].includes(url.protocol))return route.continue();external.push(url.href);return route.abort();});
 const open=async(url=origin)=>{const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push([r.status(),r.url()]);});await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});return page;};
 let page=await open();
 const snapshot=()=>page.evaluate(async()=>{
  const {state}=await import('/js/core/state.js'),{view3d}=await import('/js/core/viewport-3d.js'),{sequenceRuntime}=await import('/js/core/logic-sequences.js'),{rapierStatus}=await import('/js/core/rapier-physics-3d.js');
  const hero=state.entities.find(o=>o.playable3d),walker=state.entities.find(o=>o.name.startsWith('03 · Root'));
  return {playing:state.playing,hero:{x:hero.x,y:hero.y,assetId:hero.assetId,animator:hero._animatorFrame?.stateId},walker:{x:walker.x,y:walker.y,rotation:walker.rotation},jsFrames:sequenceRuntime.globals.jsFrames,scriptErrors:[...(hero.warScripts||[]),...(hero.webScripts||[])].map(s=>s.runtime?.error).filter(Boolean),glError:view3d.gl?.getError(),renderError:view3d.error,rapier:rapierStatus()};
 });
 await page.getByRole('button',{name:'Jouer',exact:true}).waitFor();
 await page.screenshot({path:path.join(output,'menu.png'),timeout:20000});
 await page.getByRole('button',{name:'Jouer',exact:true}).click();
 await page.waitForFunction(async()=>{const {runtimeSession}=await import('/js/core/runtime-session.js');return runtimeSession.phase==='ready';});
 await page.waitForTimeout(300);const initial=await snapshot();assert(initial.playing);assert(initial.rapier.ready);assert.equal(initial.glError,0);
 await page.keyboard.down('w');await page.waitForTimeout(1400);await page.keyboard.up('w');
 const moved=await snapshot();assert(Math.hypot(moved.hero.x-initial.hero.x,moved.hero.y-initial.hero.y)>1);
 assert(moved.hero.y<850-40,'Rapier must stop the character in front of the crate');
 await page.keyboard.press('f');await page.waitForTimeout(80);const attacked=await snapshot();
 assert(attacked.jsFrames>0);assert.deepEqual(attacked.scriptErrors,[]);assert.notEqual(attacked.walker.rotation,initial.walker.rotation);
 await page.screenshot({path:path.join(output,'playing.png'),timeout:20000});
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'Sauvegarder',exact:true}).click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('warlike.save.v1:export-verification:quick'))),savedHero=saved.entities.find(o=>o.playable3d);
 assert.equal(savedHero.model3dId,initial.hero.assetId);
 await page.getByRole('button',{name:'Reprendre la partie',exact:true}).click();await page.keyboard.down('s');await page.waitForTimeout(300);await page.keyboard.up('s');
 await page.close();page=await open();await page.getByRole('button',{name:'Continuer la sauvegarde',exact:true}).click();
 await page.waitForFunction(async()=>{const {state}=await import('/js/core/state.js'),{runtimeSession}=await import('/js/core/runtime-session.js');return state.playing&&runtimeSession.phase==='ready';});
 await page.waitForTimeout(150);await page.keyboard.press('Escape');const loaded=await snapshot();
 assert(Math.hypot(loaded.hero.x-savedHero.x,loaded.hero.y-savedHero.y)<.1);assert.equal(loaded.hero.assetId,initial.hero.assetId);assert.equal(loaded.glError,0);
 await page.screenshot({path:path.join(output,'restored.png'),timeout:20000});
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);assert.deepEqual(external,[]);
 // Verify IndexedDB conservation and project JSON on a fresh editor startup.
 await page.close();page=await open(origin+'/editor/');
 const persisted=await page.evaluate(async()=>{
  const {registerLocalModel}=await import('/editor/js/assets/real-models-3d.js'),{persistLocalModel}=await import('/editor/js/core/local-asset-library.js');
  const response=await fetch('/assets/imported/'+JSON.parse(await (await fetch('/game.json')).text()).importedModels[0].id+'.glb');
  const asset=registerLocalModel(new File([await response.arrayBuffer()],'durable.glb'));await persistLocalModel(asset);return asset.id;
 });
 await page.close();page=await open(origin+'/editor/');
 await page.waitForFunction(async id=>{const {importedModels3d}=await import('/editor/js/assets/real-models-3d.js');return importedModels3d.has(id);},persisted);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({result:'passed',files:build.files,bytes:build.blob.size,checks:['imported GLB','offline Rapier','keyboard movement and collision','WarScript and JavaScript','root motion turn','save and reopen','IndexedDB restore'],initial,moved,loaded,output},null,2));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
