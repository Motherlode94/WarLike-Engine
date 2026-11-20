import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';

const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'.validation-tools/project-animator-assets');
await mkdir(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.glb':'model/gltf-binary','.wasm':'application/wasm','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname);
 const file=path.resolve(root,'.'+pathname);
 if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 const target=path.extname(file)?file:path.join(file,'index.html');
 try{res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream'});res.end(await readFile(target))}
 catch{res.writeHead(404).end()}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;const report={status:'FAIL',checks:[],errors:[]};
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--in-process-gpu']});
 const context=await browser.newContext({viewport:{width:1440,height:960}});
 const page=await context.newPage();
 page.on('pageerror',error=>report.errors.push(error.message));
 page.on('dialog',dialog=>dialog.accept());
 await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'load'});
 await page.locator('body.reference-engine').waitFor();
 const projectId=await page.evaluate(async()=>{
  const [{createProject},{state,notify},{defaultAnimatorGraph}]=await Promise.all([
   import('/js/core/project-hub.js'),import('/js/core/state.js'),import('/js/core/animator-graph.js')
  ]);
  const id=createProject('Native Animator Project Assets','3d');
  const actor=index=>({
   id:3+index,name:'Native Actor '+index,type:'mesh3d',x:120*index,y:0,elevation3d:0,
   w:60,h:120,depth3d:60,visible:true,rotation:0,shape:'box',
   animatorGraph:defaultAnimatorGraph(),
   animationRig:{enabled:true,clips:[],activeClip:'',playOnStart:false,
     avatar:{schema:'warlike.avatar.v1',enabled:false,bones:{},id:'avatar-native-'+index}}
  });
  state.entities.push(actor(1),actor(2));state.nextId=6;state.selected=[4];notify();
  return id;
 });
 await page.locator('#hubClose').click();
 await page.locator('#hubOverlay').waitFor({state:'hidden'});
 await page.locator('.warlike-project-create > summary').click();
 await page.locator('.warlike-project-create-options button').filter({hasText:/^Animator Controller$/}).click();
 const nativeAsset=page.locator('.warlike-project-animator-drag').first();
 await nativeAsset.waitFor({state:'visible'});
 const before=await page.evaluate(async()=>{
  const [{gameProject},{state}]=await Promise.all([import('/js/core/game-project.js'),import('/js/core/state.js')]);
  return {asset:structuredClone(gameProject.animatorControllers[0]),a:structuredClone(state.entities.find(e=>e.id===4)),
   b:structuredClone(state.entities.find(e=>e.id===5))};
 });
 assert(before.asset?.id,'Create menu must create a real project-owned Controller');
 assert.equal(before.a.animatorControllerId,before.asset.id);
 assert.equal(before.b.animatorControllerId,undefined);
 assert.equal(await page.locator('.warlike-project-document').filter({hasText:'Animator Controller'}).count(),0,
   'Do not create an editor-only placeholder document');
 report.checks.push('Project/Assets creates a real Controller, not a localStorage placeholder');

 await nativeAsset.dragTo(page.locator('.unity-hierarchy-row[data-object-id="5"]'));
 const attached=await page.evaluate(async()=>{
  const [{gameProject},{state}]=await Promise.all([import('/js/core/game-project.js'),import('/js/core/state.js')]);
  const obj=state.entities.find(e=>e.id===5);
  return {id:obj.animatorControllerId,revision:obj.animatorControllerRevision,
   graph:structuredClone(obj.animatorGraph),avatar:obj.animationRig.avatar.id,assets:gameProject.animatorControllers.length};
 });
 assert.equal(attached.id,before.asset.id);
 assert.deepEqual(attached.graph,before.asset.graph);
 assert.equal(attached.avatar,'avatar-native-2');
 assert.equal(attached.assets,1);
 report.checks.push('Real drag and drop onto Hierarchy retains the target Avatar');
 await page.screenshot({path:path.join(out,'project-animator-drag.png')});

 const saved=await page.evaluate(async()=>{
  const {saveProject}=await import('/js/core/project-hub.js');
  return saveProject();
 });
 assert(saved,'Project must save');
 await page.reload({waitUntil:'load'});
 const reopened=await page.evaluate(async id=>{
  const [{openProject},{state},{gameProject},{prepareGameDefinition}]=await Promise.all([
   import('/js/core/project-hub.js'),import('/js/core/state.js'),
   import('/js/core/game-project.js'),import('/js/core/game-build.js')
  ]);
  if(!openProject(id))throw Error('Cannot reopen project');
  const build=prepareGameDefinition({entities:state.entities,camera:state.camera,mode:'3d',project:gameProject});
  const obj=state.entities.find(e=>e.id===5);
  return {asset:structuredClone(gameProject.animatorControllers[0]),
   target:structuredClone(obj.animatorGraph),avatar:obj.animationRig.avatar.id,
   exportAsset:build.project.animatorControllers[0]};
 },projectId);
 assert.deepEqual(reopened.asset,before.asset);
 assert.deepEqual(reopened.target,before.asset.graph);
 assert.deepEqual(reopened.exportAsset,before.asset);
 assert.equal(reopened.avatar,'avatar-native-2');
 assert.deepEqual(report.errors,[]);
 report.checks.push('Save/reopen and Web export preserve the shared asset and GameObject graph');
 report.status='PASS';
}catch(error){report.errors.push(error.message);throw error}
finally{
 await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
 await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
}
