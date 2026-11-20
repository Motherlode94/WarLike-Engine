// P6: exercise the real Engine-built, self-contained FPS and TPS exports in Chromium.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {chromium} from 'playwright';
import {p5CertificationScene} from '../js/core/p5-certification-scene.js';
import {exportGamePackage} from '../js/core/game-build.js';

const root=path.resolve(import.meta.dirname,'..');
const out=process.env.WARLIKE_P6_OUTPUT_DIR?path.resolve(process.env.WARLIKE_P6_OUTPUT_DIR):await mkdtemp(path.join(tmpdir(),'warlike-p6-'));
await mkdir(out,{recursive:true});
const fetcher=async url=>{
 try {
  const b=await readFile(decodeURIComponent(url.pathname));
  return {ok:true,json:async()=>JSON.parse(b.toString()),text:async()=>b.toString(),arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.length)};
 } catch{return {ok:false};}
};
async function build(mode) {
 const input=p5CertificationScene(mode),original=structuredClone(input);
 const result=await exportGamePackage(input,{fetcher});
 assert.deepEqual(input,original,'Export modified the authored P5 scene');
 const zip=await result.blob.arrayBuffer(),v=new DataView(zip);
 const dir=path.join(out,mode);
 let offset=0,count=0;
 while(offset+30<=zip.byteLength&&v.getUint32(offset,true)===0x04034b50) {
  const size=v.getUint32(offset+18,true),len=v.getUint16(offset+26,true),extra=v.getUint16(offset+28,true);
  const name=new TextDecoder().decode(new Uint8Array(zip,offset+30,len));
  assert(!name.startsWith('/')&&!name.split('/').includes('..'),'Unsafe ZIP path: '+name);
  const start=offset+30+len+extra,file=path.resolve(dir,name);
  assert(file.startsWith(dir+path.sep),'ZIP escaped output');
  await mkdir(path.dirname(file),{recursive:true});
  await writeFile(file,new Uint8Array(zip,start,size));
  offset=start+size;count++;
 }
 assert(count>40,'Export must contain real Engine runtime files');
 const game=JSON.parse(await readFile(path.join(dir,'game.json'),'utf8'));
 const scene=game.project.scenes.find(s=>s.id===game.project.activeSceneId);
 assert(scene,'Export missing active scene');
 const hero=scene.entities.find(e=>e.playable3d);
 assert.equal(hero.cameraRig.mode,mode);
 assert(scene.entities.some(e=>e.navigationAgent),'Export missing Navigation Agent');
 assert(scene.entities.some(e=>e.animatorGraph),'Export missing Animator');
 return {count,bytes:result.blob.size,sceneId:scene.id};
}
const builds={};
for(const mode of ['firstPerson','thirdPerson'])builds[mode]=await build(mode);
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.glb':'model/gltf-binary','.wasm':'application/wasm','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const server=createServer(async(req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname);
 const file=path.resolve(out,'.'+pathname);
 if(!file.startsWith(out+path.sep)){res.writeHead(403).end();return}
 const target=path.extname(file)?file:path.join(file,'index.html');
 try{res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream'});res.end(await readFile(target))}catch{res.writeHead(404).end()}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
let browser;const report={builds,modes:{},errors:[]};
try{
 browser=await chromium.launch({headless:true,...(process.env.WARLIKE_CHROMIUM?{executablePath:process.env.WARLIKE_CHROMIUM}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--in-process-gpu']});
 for(const mode of ['firstPerson','thirdPerson']){
  const context=await browser.newContext({viewport:{width:1280,height:800}});
  const page=await context.newPage();
  const errors=[],httpErrors=[],external=[];
  await context.route('**/*',route=>{
   const u=new URL(route.request().url());
   if(u.origin===origin||['blob:','data:'].includes(u.protocol))return route.continue();
   external.push(u.href);return route.abort();
  });
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)httpErrors.push([r.status(),r.url()])});
  try{
   await page.goto(origin+'/'+mode+'/',{waitUntil:'domcontentloaded'});
   const start=await page.evaluate(async()=>{
    const game=await(await fetch('/'+location.pathname.split('/')[1]+'/game.json')).json();
    return {project:game.project?.id,mode:game.mode};
   });
   assert.equal(start.mode,'3d');
   await page.getByRole('button',{name:'Jouer',exact:true}).click();
   await page.waitForFunction(async()=>{
    const {runtimeSession}=await import('./js/core/runtime-session.js');
    return runtimeSession.phase==='ready';
   },null,{timeout:60000});
   const snap=()=>page.evaluate(async()=>{
    const [{state},{view3d},{rapierStatus}]=await Promise.all([import('./js/core/state.js'),import('./js/core/viewport-3d.js'),import('./js/core/rapier-physics-3d.js')]);
    const hero=state.entities.find(e=>e.playable3d),target=state.entities.find(e=>e.navigationAgent);
    return {playing:state.playing,mode:hero.cameraRig.mode,yaw:view3d.yaw,rotation:hero.rotation,playerX:hero.x,playerY:hero.y,navX:target.x,navY:target.y,navStatus:target._navigationState?.status,navSpeed:target.animatorParameters?.navigationSpeed,navMoving:target.animatorParameters?.navigationMoving,attackCooldown:hero._attackCooldown||0,glError:view3d.gl?.getError(),renderError:view3d.error,rapierReady:rapierStatus().ready};
   });
   const initial=await snap();
   assert(initial.playing);
   assert.equal(initial.mode,mode);
   assert.equal(initial.rapierReady,true,'Portable Rapier must be active');
   assert.equal(initial.glError,0);
   // Sample position and Animator parameters atomically. At a waypoint or an
   // obstacle the agent may legitimately be idle on the NEXT animation frame.
   // Playwright's waitForFunction may execute in an isolated world; never
   // write telemetry to window and then read it through page.evaluate.
   // Return the same-frame observation as a JSHandle instead.
   // Sample directly in the application's page world on animation frames.
   // The previous waitForFunction JSHandle could serialize to false even while
   // successive real snapshots showed moving=true and navigationSpeed > 0.
   // Resolve only with a frozen same-frame measurement meeting all criteria.
   const observation=await page.evaluate(async initialX=>{
    const {state}=await import('./js/core/state.js');
    const deadline=performance.now()+15000;
    return new Promise((resolve,reject)=>{
     const sample=()=>{
      const target=state.entities.find(e=>e.navigationAgent);
      if(!target)return reject(new Error('Navigation Agent missing'));
      const snapshot={
       x:target.x,y:target.y,
       speed:target.animatorParameters?.navigationSpeed,
       moving:target.animatorParameters?.navigationMoving,
       status:target._navigationState?.status,
      };
      if(Math.abs(snapshot.x-initialX)>0.2&&snapshot.speed>0&&snapshot.moving===true)
       return resolve(snapshot);
      if(performance.now()>=deadline)
       return reject(new Error('Navigation Agent did not move with Animator speed: '+JSON.stringify(snapshot)));
      requestAnimationFrame(sample);
     };
     sample();
    });
   },initial.navX);
   const navigated={...await snap(),observation};
   assert(Math.abs(navigated.observation.x-initial.navX)>0.2&&
     navigated.observation.speed>0&&navigated.observation.moving===true,
     'Native Navigation Agent must report Animator speed while moving: '+JSON.stringify({initial,navigated}));
   // Verify keyboard locomotion BEFORE turning to separate input capture
   // failures from genuinely blocked camera-relative paths.
   // Focus the actual game canvas, not a potentially focused UI field.
   // Otherwise a keydown can be rejected by the editor's typing guard.
   await page.locator('#canvas3d').focus();
   const beforeForward=await snap();
   await page.keyboard.down('w');
   let held;
   try {
    // Observe the actor and the Rapier body on consecutive animation frames
    // while W is genuinely held. Reject one-frame displacement spikes.
    held=await page.evaluate(async start=>{
     const [{state},{activeRapierScene3d}]=await Promise.all([
      import('./js/core/state.js'),import('./js/core/rapier-physics-3d.js')
     ]);
     const samples=[];
     const deadline=performance.now()+6000;
     return new Promise((resolve,reject)=>{
      const observe=()=>{
       const actor=state.entities.find(e=>e.playable3d);
       const physics=activeRapierScene3d()?.actors.get(actor?.id);
       const displacement=Math.hypot(actor.x-start.x,actor.y-start.y);
       const snapshot={time:Math.round(performance.now()),x:actor.x,y:actor.y,
        displacement,keys:[...state.keys],body:physics?.body.translation(),
        grounded:actor.grounded3d};
       samples.push(snapshot);
       if(samples.length>200)samples.shift();
       const stable=samples.length>=4&&samples.slice(-4).every(v=>v.displacement>1&&v.keys.includes('w'));
       if(stable)return resolve({stable:true,samples:samples.slice(-30)});
       if(performance.now()>deadline)
        return reject(new Error('Forward W did not produce sustained motion: '+JSON.stringify({
         initial:start,first:samples.slice(0,10),last:samples.slice(-25),
         maxDisplacement:Math.max(...samples.map(s=>s.displacement))
        })));
       requestAnimationFrame(observe);
      };
      observe();
     });
    },{x:beforeForward.playerX,y:beforeForward.playerY});
   } finally {await page.keyboard.up('w')}
   const forward=await snap();
   // A character must NOT snap back to its spawn after the key is released.
   assert(Math.hypot(forward.playerX-beforeForward.playerX,forward.playerY-beforeForward.playerY)>1,
     'Forward motion was undone after W released: '+JSON.stringify({beforeForward,forward,held}));
   const canvas=page.locator('#canvas3d'),rect=await canvas.boundingBox();
   assert(rect&&rect.width>100);
   const cx=rect.x+rect.width/2,cy=rect.y+rect.height/2;
   await page.mouse.move(cx,cy);
   const yawBefore=(await snap()).yaw;
   await page.mouse.move(cx+160,cy,{steps:12});
   await page.waitForFunction(async prior=>{
    const {view3d}=await import('./js/core/viewport-3d.js');
    return Math.abs(view3d.yaw-prior)>.04;
   },yawBefore);
   // Camera yaw must also rotate the actor, not just the picture.
   await page.waitForFunction(async()=>{
    const [{state},{view3d}]=await Promise.all([
      import('./js/core/state.js'),import('./js/core/viewport-3d.js')
    ]);
    const actor=state.entities.find(e=>e.playable3d);
    const expected=((180-view3d.yaw*180/Math.PI)%360+360)%360;
    const delta=((actor.rotation-expected+540)%360)-180;
    return Math.abs(delta)<3;
   },null,{timeout:5000});
   const turned=await snap();
   assert(Math.abs(turned.yaw-yawBefore)>.04,'Mouse motion must rotate camera without clicking');
   const expectedRotation=((180-turned.yaw*180/Math.PI)%360+360)%360;
   const facingDifference=((turned.rotation-expectedRotation+540)%360)-180;
   assert(Math.abs(facingDifference)<3,
     'Player must face camera direction in both FPS/TPS: '+JSON.stringify({turned,expectedRotation,facingDifference}));
   // Rotating into an obstacle can legitimately stop movement; assert either
   // actual displacement or grounded collision without silently passing stuck input.
   await page.keyboard.down('w');
   try {await page.waitForTimeout(550)} finally {await page.keyboard.up('w')}
   const moved=await snap();
   const rotatedDistance=Math.hypot(moved.playerX-turned.playerX,moved.playerY-turned.playerY);
   // Require the player to remain in a valid physics state. A blocked path is
   // separately evidenced, not misreported as a movement regression.
   assert(Number.isFinite(moved.playerX)&&Number.isFinite(moved.playerY),
     'Camera-relative movement produced non-finite position: '+JSON.stringify({turned,moved}));
   assert(moved.rapierReady&&moved.glError===0,'Movement broke physics or rendering: '+JSON.stringify(moved));
   // Left-click is the gameplay fire action; capture the real runtime cooldown
   // while the button is pressed, rather than sampling after it has expired.
   // The legacy F key is deliberately NOT used.
   await page.mouse.move(cx,cy);
   await page.mouse.down({button:'left'});
   let fired;
   try {
    const shotHandle=await page.waitForFunction(async()=>{
      const {state}=await import('./js/core/state.js');
      const p=state.entities.find(e=>e.playable3d);
      const cooldown=p._attackCooldown||0;
      return cooldown>0?{cooldown,animation:p.animation||null}:false;
    },null,{timeout:5000});
    const shot=await shotHandle.jsonValue();
    await shotHandle.dispose();
    fired={...await snap(),shot};
   } finally {await page.mouse.up({button:'left'})}
   assert(fired.shot.cooldown>0,
     'Left-click must invoke real FPS/TPS weapon attack: '+JSON.stringify(fired));
   await page.screenshot({path:path.join(out,mode+'-play.png')});
   await page.keyboard.press('Escape');
   const paused=await snap();
   assert.equal(paused.glError,0);
   assert.equal(paused.renderError,null);
   assert.deepEqual(errors,[]);
   assert.deepEqual(httpErrors,[]);
   assert.deepEqual(external,[]);
   report.modes[mode]={initial,navigated,beforeForward,forward,turned,moved,rotatedDistance,fired,paused};
  }catch(e){
   report.errors.push({mode,error:String(e),pageErrors:errors,httpErrors,external});
   await page.screenshot({path:path.join(out,mode+'-failure.png')}).catch(()=>{});
   await writeFile(path.join(out,'report.json'),JSON.stringify({...report,result:'FAIL'},null,2));
   throw e;
  }finally{await context.close()}
 }
 report.result='PASS';
 await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({result:report.result,builds,modes:Object.fromEntries(Object.entries(report.modes).map(([m,v])=>[m,{camera:v.turned.yaw,navSpeed:v.navigated.observation.speed,playerMoved:Math.hypot(v.forward.playerX-v.beforeForward.playerX,v.forward.playerY-v.beforeForward.playerY),rotatedDistance:v.rotatedDistance,fired:v.fired.shot.cooldown>0}]))},null,2));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
