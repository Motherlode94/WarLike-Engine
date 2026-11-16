import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {complete3dRoute} from '../tests/complete-3d-route-fixture.mjs';
import {materialProbeGlb} from '../tests/material-probe-fixture.mjs';
import {registerLocalModel} from '../js/assets/real-models-3d.js';
import {prefab3d} from '../js/assets/catalog-3d.js';
import {exportGamePackage} from '../js/core/game-build.js';
import {freshGameProject} from '../js/core/game-project.js';
const root=path.resolve(import.meta.dirname,'..'),output=path.join(root,'.validation-tools/complete-3d');
await mkdir(output,{recursive:true});
const fetcher=async url=>{try{const b=await readFile(url);return {ok:true,json:async()=>JSON.parse(b),text:async()=>b.toString(),arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.length)}}catch{return {ok:false}}};
async function build(name,input){
 const before=JSON.stringify(input),result=await exportGamePackage(input,{fetcher});assert.equal(JSON.stringify(input),before,'Export mutated authored scene');
 const zip=await result.blob.arrayBuffer(),v=new DataView(zip),directory=path.join(output,name);let offset=0;
 while(v.getUint32(offset,true)===0x04034b50){const size=v.getUint32(offset+18,true),len=v.getUint16(offset+26,true),extra=v.getUint16(offset+28,true),name=new TextDecoder().decode(new Uint8Array(zip,offset+30,len)),start=offset+30+len+extra;assert(!name.startsWith('/')&&!name.split('/').includes('..'));const file=path.join(directory,name);await mkdir(path.dirname(file),{recursive:true});await writeFile(file,new Uint8Array(zip,start,size));offset=start+size;}
 return {files:result.files,bytes:result.blob.size};
}
const route=complete3dRoute(),archive=await build('route',route);
const cameraFixture=structuredClone(route);cameraFixture.entities.find(o=>o.playable3d).cameraRig.mode='thirdPerson';await build('camera',cameraFixture);
const probe=registerLocalModel(new File([materialProbeGlb()],'PBR-probe.glb'));
const neutralProbe=registerLocalModel(new File([materialProbeGlb({normalScale:0})],'PBR-normal-zero.glb'));
const galleryModels=['free-mini-characters-character-male-a','free-car-kit-sedan','free-survival-kit-barrel'];
// Resolve IDs through the real catalogue, never substitute a primitive.
const gallery=[];
for(let i=0;i<galleryModels.length;i++){
 const o=prefab3d(galleryModels[i],i+1,-240+i*240,0);assert(o,'Missing representative GLB: '+galleryModels[i]);Object.assign(o,{name:['Humanoïde','Véhicule','Objet texturé'][i],w:128,h:160,depth3d:128,playable3d:false,collision3d:false,solid3d:false});gallery.push(o);
}
gallery.push({id:4,name:'Sonde PBR',type:'mesh3d',assetId:probe.id,model3dId:probe.id,x:-30,y:260,w:120,h:120,depth3d:120,elevation3d:1.7,collision3d:false});
gallery.push({id:5,name:'Observateur',type:'player',playable3d:true,x:16,y:620,w:32,h:96,depth3d:32,elevation3d:0,rotation:180,controller3d:{walkSpeed:0,gravity:0},cameraRig:{mode:'firstPerson'}});
const galleryInput={mode:'3d',entities:gallery,camera:{x:0,y:0,zoom:1},project:{...freshGameProject(),id:'material-gallery',title:'GLB — contrôle visuel',genre:'sandbox'}};
await build('gallery',galleryInput);
const neutral=structuredClone(galleryInput);neutral.entities.find(o=>o.id===4).assetId=neutral.entities.find(o=>o.id===4).model3dId=neutralProbe.id;
await build('gallery-normal-zero',neutral);
if(process.argv.includes('--package-only')){console.log(JSON.stringify({result:'PACKAGED',output,archive}));process.exit(0);}
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.glb':'model/gltf-binary','.wasm':'application/wasm','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{const file=path.resolve(output,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(file!==output&&!file.startsWith(output+path.sep)){res.writeHead(403).end();return;}try{const target=path.extname(file)?file:path.join(file,'index.html');res.setHeader('Content-Type',mime[path.extname(target)]||'application/octet-stream');res.end(await readFile(target));}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
let browser,page,context,stage='launch';const errors=[],failed=[],external=[],report={archive};
const mark=s=>{stage=s;console.log('Complete 3D:',s)};
const watchdog=setTimeout(()=>{console.error('Timed out at',stage);process.exit(1)},240000);watchdog.unref();
async function open(name){
 context=await browser.newContext({viewport:{width:1280,height:800}});
 await context.route('**/*',r=>{const url=new URL(r.request().url());if(url.origin===origin||['data:','blob:'].includes(url.protocol))return r.continue();external.push(url.href);return r.abort()});
 page=await context.newPage();page.setDefaultTimeout(45000);page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push([r.status(),r.url()])});
 await page.goto(origin+'/'+name+'/',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Jouer',exact:true}).click();
 await wait(async()=>{const {runtimeSession}=await import('./js/core/runtime-session.js'),{activeRapierScene3d}=await import('./js/core/rapier-physics-3d.js');return runtimeSession.phase==='ready'&&!!activeRapierScene3d();});
}
async function wait(fn,arg=null,timeout=30000){const start=Date.now();while(Date.now()-start<timeout){if(await page.evaluate(fn,arg))return;await new Promise(r=>setTimeout(r,50));}throw Error('Condition timed out at '+stage+'; state='+JSON.stringify(await snapshot()));}
const snapshot=()=>page.evaluate(async()=>{const {state}=await import('./js/core/state.js'),{view3d}=await import('./js/core/viewport-3d.js'),{gameSession}=await import('./js/core/game-session.js'),{sequenceRuntime}=await import('./js/core/logic-sequences.js');const p=state.entities.find(o=>o.playable3d);return {player:{x:p.x,y:p.y,height:p.elevation3d,grounded:p.grounded3d},yaw:view3d.yaw,phase:gameSession.phase,doorOpen:sequenceRuntime.globals.doorOpen,enemyHp:state.entities.find(o=>o.name==='Cible de combat')?.stats?.health,glError:view3d.gl?.getError(),renderError:view3d.error,models:view3d.modelDiagnostics?.()};});
async function walkUntil(key,fn){await page.keyboard.down(key);try{await wait(fn)}finally{await page.keyboard.up(key)}}
try{
 browser=await chromium.launch({headless:true,...(process.env.WARLIKE_CHROMIUM?{executablePath:process.env.WARLIKE_CHROMIUM}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--in-process-gpu']});
 mark('third-person mouse camera and pause');await open('camera');const cameraStart=await snapshot();
 const canvas=page.locator('#canvas3d'),rect=await canvas.boundingBox(),cx=rect.x+rect.width/2,cy=rect.y+rect.height/2;
 await page.mouse.move(cx,cy);await page.mouse.down({button:'right'});await page.mouse.move(cx+40,cy,{steps:8});await page.mouse.up({button:'right'});
 await wait(async initial=>{const {view3d}=await import('./js/core/viewport-3d.js');return Math.abs(view3d.yaw-initial)>.1},cameraStart.yaw);
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'Reprendre la partie',exact:true}).click();
 report.camera=await snapshot();await page.screenshot({path:path.join(output,'route-camera.png')});await context.close();
 mark('offline exported FPS route');await open('route');report.start=await snapshot();
 mark('walk up four real steps');await walkUntil('w',async()=>{const {state}=await import('./js/core/state.js');return state.entities.find(o=>o.playable3d).y<310});
 const stairs=await snapshot();assert.ok(stairs.player.height>.7&&stairs.player.height<.85);report.stairs=stairs;await page.screenshot({path:path.join(output,'route-stairs.png')});
 mark('closed door blocks player and shots');await walkUntil('w',async()=>{const {state}=await import('./js/core/state.js');return state.entities.find(o=>o.playable3d).y<195});const blocked=await snapshot();assert.ok(blocked.player.y>=185&&blocked.player.y<195,JSON.stringify(blocked));await page.keyboard.down('w');await page.evaluate(()=>new Promise(resolve=>{let n=0;function frame(){if(++n>=8)resolve();else requestAnimationFrame(frame)}requestAnimationFrame(frame)}));await page.keyboard.up('w');assert.ok((await snapshot()).player.y>=185);await page.keyboard.down('f');await wait(async()=>{const {state}=await import('./js/core/state.js');return state.entities.find(o=>o.playable3d)._attackCooldown>0});await page.keyboard.up('f');assert.equal((await snapshot()).enemyHp,100);
 mark('open door with E and cross');await page.keyboard.press('e');await wait(async()=>{const {sequenceRuntime}=await import('./js/core/logic-sequences.js');return sequenceRuntime.globals.doorOpen===1});await walkUntil('w',async()=>{const {state}=await import('./js/core/state.js');return state.entities.find(o=>o.playable3d).y<0});
 mark('FPS combat');await page.keyboard.down('f');try{await wait(async()=>{const {state}=await import('./js/core/state.js');return state.entities.find(o=>o.name==='Cible de combat').stats.health===0})}finally{await page.keyboard.up('f')};report.combat=await snapshot();await page.screenshot({path:path.join(output,'route-combat.png')});
 mark('save, move, quick-load and cold resume');await page.keyboard.press('F5');const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('warlike.save.v1:complete-3d-route:quick')));assert(saved);
 await page.keyboard.down('s');await page.waitForTimeout(400);await page.keyboard.up('s');await page.keyboard.press('F9');await wait(async()=>{const {gameSession}=await import('./js/core/game-session.js');return gameSession.pending===null});
 await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Continuer la sauvegarde',exact:true}).click();await wait(async()=>{const {runtimeSession}=await import('./js/core/runtime-session.js'),{activeRapierScene3d}=await import('./js/core/rapier-physics-3d.js');return runtimeSession.phase==='ready'&&!!activeRapierScene3d()});
 const restored=await snapshot(),savedPlayer=saved.entities.find(o=>o.playable3d);assert.ok(Math.hypot(restored.player.x-savedPlayer.x,restored.player.y-savedPlayer.y)<1);assert.equal(restored.enemyHp,0);assert.equal(restored.doorOpen,1);report.restored=restored;
 mark('finish route');await page.keyboard.press('e');await page.getByRole('heading',{name:'Mission accomplie',exact:true}).waitFor();report.finish=await snapshot();await page.screenshot({path:path.join(output,'route-finished.png')});await context.close();
 for(const name of ['gallery','gallery-normal-zero']){
  mark(name);await open(name);await wait(async()=>{const {view3d}=await import('./js/core/viewport-3d.js');const models=view3d.modelDiagnostics();return models.length>=4&&models.every(o=>o.status==='ready')});
  const status=await snapshot();assert.equal(status.glError,0);assert.equal(status.renderError,null);assert.ok(status.models.every(o=>o.triangles>0&&o.warnings.length===0),JSON.stringify(status.models));assert.equal(status.models.find(o=>o.id.startsWith('local-')).maps[0].length,4);
  report[name]=status;const screenshot=await page.screenshot({path:path.join(output,name+'.png')});
  // Read the captured, composited PNG. WebGL's default drawing buffer can
  // already be cleared when an asynchronous readPixels callback executes.
  report[name].pixels=await page.evaluate(async base64=>{
   const image=new Image();image.src='data:image/png;base64,'+base64;await image.decode();
   const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
   const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
   return Array.from(ctx.getImageData(Math.floor(image.width*.3),Math.floor(image.height*.2),Math.floor(image.width*.4),Math.floor(image.height*.6)).data);
  },screenshot.toString('base64'));
  await context.close();
 }
 const a=report.gallery.pixels,b=report['gallery-normal-zero'].pixels;assert.equal(a.length,b.length);let changed=0;for(let i=0;i<a.length;i+=4)if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>6)changed++;
 assert.ok(changed>150,'Normal-map scale must change actual rendered pixels: '+changed);delete report.gallery.pixels;delete report['gallery-normal-zero'].pixels;report.normalMapChangedPixels=changed;
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);assert.deepEqual(external,[]);report.result='PASS';await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}catch(error){if(page&&!page.isClosed())await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});console.error('Stage:',stage,'Page errors:',errors,'Snapshot:',await snapshot().catch(()=>null));throw error;}finally{clearTimeout(watchdog);await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
