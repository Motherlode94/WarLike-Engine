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
 await page.locator('#projectTab').click();
 // The Project panel may be collapsed by a persisted workspace layout.
 await page.locator('#projectContent').evaluate(el=>{if(el.hidden)throw Error('Project Browser is hidden after opening the tab')});
 const projectMenu=page.locator('.warlike-project-create > summary');
 if(!await projectMenu.isVisible()){
  const layout=await page.evaluate(()=>{
   const describe=sel=>{const e=document.querySelector(sel);if(!e)return null;const r=e.getBoundingClientRect(),css=getComputedStyle(e);return {hidden:e.hidden,display:css.display,visibility:css.visibility,overflow:css.overflow,rect:{x:r.x,y:r.y,width:r.width,height:r.height},scrollHeight:e.scrollHeight,clientHeight:e.clientHeight}};
   return Object.fromEntries(['#projectPanel','#projectContent','.asset-content','.asset-toolbar','.warlike-project-create','.warlike-project-create > summary'].map(sel=>[sel,describe(sel)]));
  });
  await page.screenshot({path:path.join(out,'project-menu-not-visible.png')});
  throw Error('Project/Assets native Create menu not visible: '+JSON.stringify(layout));
 }
 await projectMenu.click();
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
 const sceneDrop2d=await page.evaluate(async()=>{
  const [{createProject},{state,notify},{gameProject},{defaultAnimatorGraph},{animatorControllerDragType}]=await Promise.all([
    import('/js/core/project-hub.js'),import('/js/core/state.js'),
    import('/js/core/game-project.js'),import('/js/core/animator-graph.js'),
    import('/js/ui/project-animator-assets.js')
  ]);
  createProject('Animator Scene 2D Drop','2d');
  const source={id:20,name:'Source 2D',type:'object',x:60,y:60,w:70,h:80,animatorGraph:defaultAnimatorGraph()};
  const target={id:21,name:'Target 2D',type:'object',x:230,y:60,w:80,h:90,animatorGraph:defaultAnimatorGraph()};
  state.entities.push(source,target);state.selected=[20];notify();
  const {createAnimatorControllerAsset}=await import('/js/core/animator-controller-assets.js');
  const asset=createAnimatorControllerAsset(gameProject,source);
  const canvas=document.querySelector('#canvas'),r=canvas.getBoundingClientRect();
  const drag=(x,y)=>{
   const dt=new DataTransfer();dt.setData(animatorControllerDragType,asset.id);
   const options={bubbles:true,cancelable:true,dataTransfer:dt,clientX:r.left+x,clientY:r.top+y};
   canvas.dispatchEvent(new DragEvent('dragover',options));
   canvas.dispatchEvent(new DragEvent('drop',options));
  };
  drag(900,500); // Empty space must not alter the current selection.
  const noChange=target.animatorControllerId===undefined&&state.selected.at(-1)===20;
  drag(250,80);
  return {noChange,assigned:target.animatorControllerId===asset.id,
    selected:state.selected.at(-1),sourceGraph:structuredClone(source.animatorGraph),
    targetGraph:structuredClone(target.animatorGraph)};
 });
 assert(sceneDrop2d.noChange,'Dropping in empty 2D space must not affect selected GameObject');
 assert(sceneDrop2d.assigned,'Dropping on 2D target must attach the Controller');
 assert.equal(sceneDrop2d.selected,21);
 assert.deepEqual(sceneDrop2d.sourceGraph,sceneDrop2d.targetGraph);
 report.checks.push('Scene View 2D drop resolves the target position; empty space is ignored');
 report.status='PASS';
}catch(error){report.errors.push(error.message);throw error}
finally{
 await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
 await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
}
