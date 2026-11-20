// P1: verify legacy-style authored data survives a real browser reload and Web export.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
const root=path.resolve(import.meta.dirname,'..');
const output=path.join(root,'.validation-tools/legacy-reopen');
await mkdir(output,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.glb':'model/gltf-binary','.wasm':'application/wasm','.svg':'image/svg+xml','.jpg':'image/jpeg','.webp':'image/webp'};
const server=createServer(async(req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname);
 const file=path.resolve(root,'.'+pathname);
 if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 const target=path.extname(file)?file:path.join(file,'index.html');
 try{res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream'});res.end(await readFile(target))}
 catch{res.writeHead(404).end()}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
let browser;const report={status:'FAIL',checks:[],errors:[]};
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--in-process-gpu']});
 const context=await browser.newContext({viewport:{width:1440,height:960}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('dialog',d=>d.accept());
 await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'load'});
 await page.locator('body.reference-engine').waitFor();
 const created=await page.evaluate(async()=>{
  const [{createProject,saveProject},{state},{createCleanStarterScene3d}]=await Promise.all([
   import('/js/core/project-hub.js'),import('/js/core/state.js'),
   import('/js/core/clean-starter-scene.js')
  ]);
  const id=createProject('Legacy visual re-open check','3d');
  const scene=createCleanStarterScene3d();
  scene[0].sceneCamera3d={...scene[0].sceneCamera3d,fieldOfView:72,nearClip:.15,farClip:180};
  scene[1].materialRoughness=.31;
  scene[1].materialMetallic=.12;
  scene[1].colorCustomized=true;
  scene.push({
   id:4,name:'Ancien GameObject',type:'mesh3d',assetId:'primitive-cube',
   x:64,y:64,elevation3d:1,w:96,h:96,depth3d:96,visible:true,
   collision3d:true,solid3d:true,collider3d:{shape:'box',enabled:true},
   materialRoughness:.43,materialMetallic:.26,materialColor:'#a08468',
   customLegacyComponent:{schema:'legacy.example.v1',payload:{customValue:42}},
   blueprintVariables:[{name:'vitesse',type:'number',value:5,exposed:true}],
   blueprintOverrides:{vitesse:7},
   animationRig:{clips:[],playOnStart:false},
  });
  state.entities=scene;state.selected=[4];state.nextId=5;
  if(!saveProject())throw Error('Save failed');
  return {id,entities:structuredClone(state.entities)};
 });
 await page.locator('#hubClose').click();
 await page.locator('#hubOverlay').waitFor({state:'hidden'});
 await page.screenshot({path:path.join(output,'before-reopen.png')});
 report.checks.push('Visual evidence before reload captured');
 await page.reload({waitUntil:'load'});
 const reopened=await page.evaluate(async id=>{
  const [{openProject},{state},{gameProject},{prepareGameDefinition}]=await Promise.all([
   import('/js/core/project-hub.js'),import('/js/core/state.js'),
   import('/js/core/game-project.js'),import('/js/core/game-build.js')
  ]);
  if(!openProject(id))throw Error('Legacy project not reopened');
  const exported=prepareGameDefinition({entities:state.entities,camera:state.camera,mode:'3d',project:gameProject});
  const active=exported.project.scenes.find(s=>s.id===exported.project.activeSceneId);
  return {entities:structuredClone(state.entities),exported:active?.entities};
 },created.id);
 assert.deepEqual(reopened.entities,created.entities,'Saved camera, materials, collider, Blueprint, custom data must survive reload');
 assert.deepEqual(reopened.exported,created.entities,'Web export must preserve the reopened scene data');
 assert.deepEqual(reopened.entities.slice(0,3).map(e=>e.name),['Main Camera','Terrain','Directional Light']);
 assert.equal(reopened.entities[3].customLegacyComponent.payload.customValue,42);
 assert.equal(reopened.entities[3].blueprintOverrides.vitesse,7);
 assert.equal(reopened.entities[1].materialRoughness,.31);
 await page.locator('#hubClose').click().catch(()=>{});
 await page.screenshot({path:path.join(output,'after-reopen.png')});
 assert.deepEqual(errors,[],'No browser JavaScript errors during visual re-open');
 report.status='PASS';report.objects=created.entities.length;
 report.checks.push('Exact GameObjects, camera, materials, Blueprint and custom fields preserved');
 report.checks.push('Portable Web export reproduces saved entities');
 report.checks.push('Visual evidence after reload captured');
 await context.close();
} catch(e){report.errors.push({message:e.message,stack:e.stack});throw e}
finally{
 await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));
 await browser?.close();
 server.closeAllConnections();
 await new Promise(done=>server.close(done));
}
