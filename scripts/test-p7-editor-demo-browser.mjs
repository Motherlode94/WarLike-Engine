// P7 — Verify that the native FPS/TPS scenes are actually loadable from the real
// Engine UI and preserve editable GameObjects through Play/Stop and project save.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';

const root=path.resolve(import.meta.dirname,'..');
const output=path.join(root,'.validation-tools/p7-editor');
await mkdir(output,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.glb':'model/gltf-binary','.wasm':'application/wasm','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname);
 const file=path.resolve(root,'.'+pathname);
 if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 const target=path.extname(file)?file:path.join(file,'index.html');
 try{res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream'});res.end(await readFile(target))}
 catch{res.writeHead(404).end()}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base='http://127.0.0.1:'+server.address().port;
let browser;const report={result:'FAIL',modes:{},errors:[]};
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--in-process-gpu']});
 for(const [id,mode] of [['p5fps','firstPerson'],['p5tps','thirdPerson']]){
  const context=await browser.newContext({viewport:{width:1440,height:960}});
  const page=await context.newPage(),errors=[];
  page.setDefaultTimeout(45000);
  page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  try{
   await page.goto(base,{waitUntil:'load'});
   await page.locator('body.reference-engine').waitFor();
   await page.evaluate(async sceneName=>{
    const {createProject}=await import('/js/core/project-hub.js');
    createProject('P7 '+sceneName,'3d');
   },id);
   await page.locator('#hubClose').click();
   await page.locator('#hubOverlay').waitFor({state:'hidden'});
   await page.locator('#canvas3d').waitFor({state:'visible'});
   const cleanStart=await page.evaluate(async()=>{
    const {state}=await import('/js/core/state.js');
    return state.entities.map(entity=>entity.name);
   });
   assert.deepEqual(cleanStart,['Main Camera','Terrain','Directional Light'],
     'New Engine project must start with exactly three native objects');
   assert.equal(await page.locator('#demoSceneBrowser').count(),0,
     'The obsolete demonstration browser must not be mounted');
   // Keep the P5 certification fixtures internal. Production UI no longer
   // exposes a demonstration browser; lifecycle still exercises real editor UI.
   await page.evaluate(async kind=>{
    const {loadAuthoredDemo}=await import('/js/core/scene.js');
    if(!loadAuthoredDemo(kind))throw new Error('Could not load internal P5 certification scene');
   },id);
   const snapshot=()=>page.evaluate(async()=>{
    const {state}=await import('/js/core/state.js');
    return structuredClone(state.entities);
   });
   const original=await snapshot();
   assert(original.length>=10,'P7 must load complete authored GameObjects');
   const actor=original.find(o=>o.playable3d);
   const mobile=original.find(o=>o.navigationAgent);
   assert(actor&&mobile,'P7 actor and mobile target absent from editor scene');
   assert.equal(actor.cameraRig.mode,mode);
   assert.equal(new Set(original.map(o=>o.id)).size,original.length);
   await page.getByRole('button',{name:'Sélectionner '+actor.name,exact:true}).waitFor();
   await page.screenshot({path:path.join(output,id+'-editor.png')});
   // Actually use Inspector, never replace the authored scene with a fixture.
   await page.getByRole('button',{name:'Sélectionner '+actor.name,exact:true}).click();
   await page.getByRole('textbox',{name:'Nom du GameObject',exact:true}).fill('P7 '+mode+' joueur certifié');
   await page.getByRole('textbox',{name:'Nom du GameObject',exact:true}).press('Tab');
   const edited=await snapshot();
   assert.equal(edited.find(o=>o.id===actor.id).name,'P7 '+mode+' joueur certifié');
   assert.equal(edited.find(o=>o.id===actor.id).cameraRig.mode,mode);
   // Play and Stop must not mutate the authored definition.
   await page.locator('#play').click();
   await page.waitForFunction(async()=>{
    const {runtimeSession}=await import('/js/core/runtime-session.js');
    return runtimeSession.phase==='ready';
   },null,{timeout:60000});
   await page.screenshot({path:path.join(output,id+'-play.png')});
   await page.locator('#play').click();
   assert.deepEqual(await snapshot(),edited,'P7 Play/Stop mutated the authored scene');
   await page.locator('#hubSave').click();
   await page.reload({waitUntil:'load'});
   await page.getByRole('button',{name:'P7 '+id,exact:true}).click();
   await page.locator('#hubOverlay').waitFor({state:'hidden'});
   assert.deepEqual(await snapshot(),edited,'P7 save/reopen lost Inspector edits, controller or Animator');
   // P8: compare the *actually reopened* Editor project against the real Web
   // export preparation, including edited Inspector data and native components.
   const parity=await page.evaluate(async()=>{
    const [{state},{gameProject},{prepareGameDefinition}]=await Promise.all([
      import('/js/core/state.js'),import('/js/core/game-project.js'),
      import('/js/core/game-build.js'),
    ]);
    const data=prepareGameDefinition({
      entities:state.entities,camera:state.camera,mode:'3d',project:gameProject,
    });
    const scene=data.project.scenes.find(s=>s.id===data.project.activeSceneId);
    return {entities:scene?.entities,mode:data.mode,format:data.format};
   });
   assert.equal(parity.mode,'3d');
   assert.equal(parity.format,'warlike.game.v1');
   assert.deepEqual(parity.entities,edited,
     'P8 Web export must match reopened Inspector, camera, navigation and animation components');
   assert.deepEqual(errors,[],'P7 browser JS errors');
   report.modes[id]={mode,objects:edited.length,selected:actor.id,editedName:'P7 '+mode+' joueur certifié',saved:true,reopened:true,playStop:true,exportParity:true};
  }catch(error){
   report.errors.push({id,message:error.message,stack:error.stack,errors});
   await page.screenshot({path:path.join(output,id+'-failure.png')}).catch(()=>{});
   throw error;
  }finally{await context.close()}
 }
 report.result='PASS';
 console.log('PASS P7 clean editor, internal FPS/TPS certification, Inspector, Play/Stop, save/reopen',report.modes);
}finally{
 await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));
 await browser?.close();
 server.closeAllConnections();
 await new Promise(done=>server.close(done));
}
