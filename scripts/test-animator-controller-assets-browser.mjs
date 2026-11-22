import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';

const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'.validation-tools/animator-controller-assets');
await mkdir(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.glb':'model/gltf-binary','.wasm':'application/wasm','.svg':'image/svg+xml','.jpg':'image/jpeg','.webp':'image/webp'};
const server=createServer(async(req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname),file=path.resolve(root,'.'+pathname);
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
 page.on('pageerror',e=>report.errors.push(e.message));
 page.on('dialog',d=>d.accept());
 await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'load'});
 await page.locator('body.reference-engine').waitFor();
 const authored=await page.evaluate(async()=>{
  const [{createProject},{state,notify},{defaultAnimatorGraph},{defaultController,defaultStats}]=await Promise.all([
   import('/js/core/project-hub.js'),import('/js/core/state.js'),import('/js/core/animator-graph.js'),import('/js/core/gameplay-components.js')
  ]);
  const id=createProject('Reusing Animator Controllers','3d');
  const actor=index=>({
   id:3+index,name:'Rig Actor '+index,type:'mesh3d',x:120*index,y:0,elevation3d:0,
   w:60,h:120,depth3d:60,visible:true,rotation:0,shape:'box',
   playable3d:index===1,controller3d:defaultController(),stats:defaultStats(),cameraRig:{mode:'thirdPerson',collision:true},
   animatorGraph:defaultAnimatorGraph(),
   animationRig:{enabled:true,clips:[],activeClip:'',playOnStart:false,avatar:{schema:'warlike.avatar.v1',enabled:false,bones:{},id:'user-authored-avatar-'+index}}
  });
  state.entities.push(actor(1),actor(2));state.nextId=6;state.selected=[4];notify();
  return id;
 });
 await page.locator('#hubClose').click();
 await page.locator('#hubOverlay').waitFor({state:'hidden'});
 const panel=page.locator('#properties');
 await panel.locator('.inspector-animator-controller-select').waitFor({state:'attached'});
 // Animator is collapsed by default in the Unity-style Inspector: open it through the visible UI.
 const animatorSection=panel.locator('details.inspector-component:has(.inspector-animator-controller-select)');
 await animatorSection.locator(':scope > summary').click();
 await animatorSection.locator('.inspector-animator-controller-select').waitFor({state:'visible'});
 const manager=panel.locator('.inspector-animator-library');
 await manager.locator('summary').click();
 await manager.getByRole('button',{name:'Créer Controller'}).click();
 const details=await page.evaluate(async()=>{
  const [{state},{gameProject}]=await Promise.all([import('/js/core/state.js'),import('/js/core/game-project.js')]);
  return {asset:gameProject.animatorControllers[0],owner:state.entities.find(e=>e.id===4)};
 });
 assert(details.asset?.id,'Controller must be created in project');
 assert.equal(details.owner.animatorControllerId,details.asset.id);
 report.checks.push('Create reusable Controller through actual Inspector');
 await page.getByRole('button',{name:'Sélectionner Rig Actor 2',exact:true}).click();
 // Selection rebuilds the Inspector and collapses Animator again; expand the new section.
 const secondAnimatorSection=panel.locator('details.inspector-component:has(.inspector-animator-controller-select)');
 await secondAnimatorSection.locator(':scope > summary').click();
 const secondSelect=panel.locator('.inspector-animator-controller-select');
 await secondSelect.waitFor({state:'visible'});
 await secondSelect.selectOption(details.asset.id);
 await panel.getByRole('button',{name:'Assigner',exact:true}).click();
 const saved=await page.evaluate(async()=>{
  const [{saveProject},{state},{gameProject}]=await Promise.all([
   import('/js/core/project-hub.js'),import('/js/core/state.js'),import('/js/core/game-project.js')
  ]);
  if(!saveProject())throw Error('Save failed');
  const a=state.entities.find(e=>e.id===4),b=state.entities.find(e=>e.id===5);
  return {asset:structuredClone(gameProject.animatorControllers[0]),
    graphs:[structuredClone(a.animatorGraph),structuredClone(b.animatorGraph)],
    avatars:[a.animationRig.avatar.id,b.animationRig.avatar.id]};
 });
 assert.deepEqual(saved.graphs[0],saved.graphs[1]);
 assert.deepEqual(saved.avatars,['user-authored-avatar-1','user-authored-avatar-2']);
 await page.screenshot({path:path.join(out,'inspector-controller-shared.png')});
 report.checks.push('Assign Controller to second GameObject without replacing its Avatar');
 await page.reload({waitUntil:'load'});
 const reopened=await page.evaluate(async id=>{
  const [{openProject},{state},{gameProject},{prepareGameDefinition}]=await Promise.all([
   import('/js/core/project-hub.js'),import('/js/core/state.js'),
   import('/js/core/game-project.js'),import('/js/core/game-build.js')
  ]);
  if(!openProject(id))throw Error('Open project failed');
  const exportData=prepareGameDefinition({entities:state.entities,camera:state.camera,mode:'3d',project:gameProject});
  return {
   assets:structuredClone(gameProject.animatorControllers),
   exports:exportData.project.animatorControllers,
   graphs:state.entities.filter(e=>e.id===4||e.id===5).map(e=>structuredClone(e.animatorGraph)),
  };
 },authored);
 assert.equal(reopened.assets.length,1);
 assert.deepEqual(reopened.assets[0],saved.asset);
 assert.deepEqual(reopened.exports,reopened.assets);
 assert.deepEqual(reopened.graphs,saved.graphs);
 assert.deepEqual(report.errors,[]);
 report.checks.push('Browser reload and Web export preserve independent Controller and scene graphs');
 await page.evaluate(async()=>{
  const {state,notify}=await import('/js/core/state.js');state.selected=[4];notify();
  document.dispatchEvent(new CustomEvent('warlike:animator-open',{detail:{id:4}}));
 });
 const studio=page.locator('#animatorGraphStudio');
 const node=id=>studio.locator('[data-animator-state="'+id+'"]');
 const connect=()=>studio.getByRole('button',{name:'Connecter deux états',exact:true});
 const graph=()=>page.evaluate(async()=>{
  const {state}=await import('/js/core/state.js');return structuredClone(state.entities.find(e=>e.id===4).animatorGraph);
 });
 await studio.waitFor({state:'visible'});
 await node('motion').click();const initial=await graph();await connect().click();
 await studio.getByRole('button',{name:'Annuler connexion',exact:true}).click();
 assert.deepEqual(await graph(),initial,'Cancel must not change the graph');
 await connect().click();await node('attack').click();
 const connected=await graph();
 assert.equal(connected.transitions.length,saved.graphs[0].transitions.length+1);
 assert.deepEqual(connected.transitions.at(-1),{from:'motion',to:'attack',conditions:[{parameter:'action',operator:'==',value:'attack'}],blend:.18});
 // A second click sequence must not duplicate an existing edge.
 await node('motion').click();await connect().click();await node('attack').click();
 assert.deepEqual(await graph(),connected);
 // Any State is keyboard accessible; use a destination without an existing edge.
 const any=studio.getByRole('button',{name:'Tous les états',exact:true});
 await any.focus();await page.keyboard.press('Enter');await node('motion').click();
 const withAny=await graph();assert.equal(withAny.transitions.length,connected.transitions.length+1);
 assert.equal(withAny.transitions.at(-1).from,'*');assert.equal(withAny.transitions.at(-1).to,'motion');
 const executed=await page.evaluate(async()=>{
  const [{state},{stepAnimator,resetAnimators},{saveProject}]=await Promise.all([
   import('/js/core/state.js'),import('/js/core/animator-graph.js'),import('/js/core/project-hub.js')
  ]);
  const source=state.entities.find(e=>e.id===4),actor=structuredClone(source);
  resetAnimators();stepAnimator(actor,.016,{parameters:{action:''}});
  const frame=stepAnimator(actor,.016,{parameters:{action:'attack'}});
  if(!saveProject())throw Error('Could not save visual connections');
  return {state:frame.stateId,other:structuredClone(state.entities.find(e=>e.id===5).animatorGraph),avatar:source.animationRig.avatar.id};
 });
 assert.equal(executed.state,'attack','The transition authored through clicks must run in the real Animator');
 assert.deepEqual(executed.other,saved.graphs[1],'Editing one actor must not silently propagate to the second');
 assert.equal(executed.avatar,'user-authored-avatar-1');
 await page.screenshot({path:path.join(out,'animator-visual-connections.png')});
 await page.reload({waitUntil:'load'});
 const persisted=await page.evaluate(async id=>{
  const [{openProject},{state},{gameProject},{prepareGameDefinition}]=await Promise.all([
   import('/js/core/project-hub.js'),import('/js/core/state.js'),import('/js/core/game-project.js'),import('/js/core/game-build.js')
  ]);
  if(!openProject(id))throw Error('Could not reopen visually connected Animator');
  const build=prepareGameDefinition({entities:state.entities,camera:state.camera,mode:'3d',project:gameProject});
  return {graph:structuredClone(state.entities.find(e=>e.id===4).animatorGraph),
   exportGraph:build.project.scenes.find(s=>s.id===build.project.startupSceneId).entities.find(e=>e.id===4).animatorGraph};
 },authored);
 assert.deepEqual(persisted.graph,withAny);assert.deepEqual(persisted.exportGraph,withAny);
 assert.deepEqual(report.errors,[]);
 report.checks.push('Visual state connections: cancel, duplicate protection, keyboard Any State, executable transition, actor isolation, Hub reload and export');
 report.status='PASS';
} catch(error){report.errors.push(error.message);throw error}
finally{
 await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
 await browser?.close();server.closeAllConnections();
 await new Promise(resolve=>server.close(resolve));
}
