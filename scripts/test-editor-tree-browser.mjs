// Real pointer/keyboard acceptance for Project folders, Hierarchy and Scene overlays.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {createCleanStarterScene3d} from '../js/core/clean-starter-scene.js';
import {updateEditorEntityHierarchy3d} from '../js/core/scene-graph-v2.js';
import {prefab3d} from '../js/assets/catalog-3d.js';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'.validation-tools/editor-tree');
await mkdir(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.glb':'model/gltf-binary','.wasm':'application/wasm','.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg'};
const server=createServer(async(req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return}const target=path.extname(file)?file:path.join(file,'index.html');try{const content=await readFile(target);res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream'});res.end(content)}catch{res.writeHead(404).end()}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const report={status:'FAIL',checks:[],errors:[],geometry:[]};let browser,page;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--in-process-gpu']});
 page=await browser.newPage({viewport:{width:1440,height:900}});page.setDefaultTimeout(20000);
 page.on('pageerror',error=>report.errors.push(error.message));page.on('dialog',dialog=>dialog.accept());
 let entities=createCleanStarterScene3d();const astronaut=prefab3d('free-space-kit-astronautb',4,0,0);
 Object.assign(astronaut,{name:'Astronaut',customLegacyComponent:{schema:'unknown-v1',payload:[1,'retained']}});entities.push(astronaut,{id:5,name:'Child',type:'object',parentId:4,x:0,y:0,w:8,h:8,visible:false});updateEditorEntityHierarchy3d(entities);entities=JSON.parse(JSON.stringify(entities));
 const slot=entities=>({entities,selected:[],nextId:Math.max(0,...entities.map(e=>e.id))+1,camera:{x:0,y:0,zoom:1}});
 const fixture={version:3,name:'Ancien projet',workspaceMode:'3d',workspaces:{'3d':slot(entities),'2d':slot([{id:10,name:'Sprite ancien',type:'object',x:20,y:30,w:48,h:48,color:'#8baed2',customLegacyComponent:{value:42}}])}};
 await page.addInitScript(fixture=>{if(localStorage.getItem('tree-test-seeded'))return;localStorage.setItem('tree-test-seeded','yes');localStorage.setItem('warlike.hub.projects.v1',JSON.stringify([{id:'tree-legacy',name:'Ancien projet',type:'3d'}]));localStorage.setItem('warlike.hub.project.tree-legacy',JSON.stringify(fixture));localStorage.setItem('warlike.workspace.ui-schema.v2','done');localStorage.setItem('warlike.workspace.layout.v1',JSON.stringify({leftWidth:240,rightWidth:320,float:{}}));localStorage.setItem('warlike.projectHeight','320')},fixture);
 const openHubProject=async name=>{await page.locator('#hubOverlay').waitFor({state:'visible'});await page.getByRole('button',{name,exact:true}).click();await page.locator('#hubOverlay').waitFor({state:'hidden'});await page.locator('#warlikeVisualPacks').waitFor({state:'visible'})};
 await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'load'});await openHubProject('Ancien projet');
 const data=()=>page.evaluate(async()=>{const {state}=await import('/js/core/state.js');return JSON.parse(JSON.stringify(state.entities))});
 assert.deepEqual(await data(),fixture.workspaces['3d'].entities,'Legacy entities open without presentation changes');
 const folder=id=>page.locator('#visualPackFolders [data-folder-id="'+id+'"]');
 await folder('category-Characters').click();
 await page.locator('#visualPackSearch').fill('astronaut');
 await page.waitForFunction(()=>document.querySelectorAll('#visualPackItems .free-asset-card').length===6);
 assert.match(await page.locator('.project-browser-path').textContent(),/Personnages/);
 await page.locator('#visualPackItems .free-asset-preview').first().click();
 assert.deepEqual(await data(),fixture.workspaces['3d'].entities,'Asset single click inspects without adding');
 await page.locator('#visualPackView').click();assert.equal(await page.locator('#visualPackItems').evaluate(el=>el.classList.contains('free-asset-list')),true);
 await page.locator('#visualPackView').click();await page.locator('#visualPackSearch').fill('');
 // Side-by-side panes must remain inside the actual resized dock, never become horizontal folder bands.
 for(const [width,height,dock] of [[1440,900,320],[1920,1080,420],[1366,768,180]]){
  await page.setViewportSize({width,height});await page.evaluate(dock=>document.querySelector('.center-stack').style.setProperty('--project-height',dock+'px'),dock);
  const geometry=await page.evaluate(()=>{const r=selector=>{const v=document.querySelector(selector).getBoundingClientRect();return {left:v.left,right:v.right,top:v.top,bottom:v.bottom,width:v.width,height:v.height}};return {folders:r('#visualPackFolders'),results:r('.visual-pack-results'),items:r('#visualPackItems'),panel:r('#projectPanel'),browser:r('.unity-project-browser')}});
  report.geometry.push({width,height,dock,...geometry});
  assert(geometry.folders.right<=geometry.results.left+2,'Folders are a left column');
  assert(geometry.items.height>=75,'Shallow Project keeps a usable scrolling grid');
  assert(geometry.items.bottom<=geometry.panel.bottom+2,'Grid stays inside Project dock');
  assert(Math.abs(geometry.folders.top-geometry.results.top)<2,'Folder and asset panes start on the same row');
  const card=await page.locator('#visualPackItems .free-asset-card').first().boundingBox();assert(card.height>=85,'Thumbnails keep their full height and scroll instead of collapsing into strips');
 }
 await page.setViewportSize({width:1440,height:900});await page.evaluate(()=>document.querySelector('.center-stack').style.setProperty('--project-height','320px'));
 await page.locator('#visualPackExpand').click();assert.equal(await page.locator('#visualPackExpand').getAttribute('aria-pressed'),'true');await page.keyboard.press('Escape');assert.equal(await page.locator('#visualPackExpand').getAttribute('aria-pressed'),'false');
 await page.evaluate(()=>{window.__treeClicks=[];window.addEventListener('click',event=>window.__treeClicks.push({target:event.target.outerHTML?.slice(0,120),prevented:event.defaultPrevented}),true)});
 const parent=page.locator('.unity-hierarchy-row[data-object-id="4"]'),child=page.locator('.unity-hierarchy-row[data-object-id="5"]');
 await parent.locator('.hierarchy-tree-toggle').click();await child.waitFor({state:'detached'});await parent.locator('.hierarchy-tree-toggle').click();await child.waitFor({state:'visible'});
 await parent.locator('.hierarchy-object-label').click();await parent.locator('.hierarchy-object-label').focus();await page.keyboard.press('ArrowDown');assert.equal(await child.getAttribute('aria-selected'),'true');
 const rowStyle=await parent.locator('.hierarchy-object-label').evaluate(node=>({background:getComputedStyle(node).backgroundColor,border:getComputedStyle(node).borderTopWidth}));assert.equal(rowStyle.background,'rgba(0, 0, 0, 0)');assert.equal(rowStyle.border,'0px');
 await parent.locator('.hierarchy-object-label').dblclick();
 await page.waitForFunction(async()=>{const {view3d}=await import('/js/core/viewport-3d.js');return view3d.enabled});
 const preview=page.locator('.warlike-camera-frame-preview');assert.equal(await preview.isVisible(),false,'No blank camera preview without a camera selection');
 await page.locator('#hierarchyPanel .hierarchy-object-label').filter({hasText:'Main Camera'}).click();await preview.waitFor({state:'visible'});
 await parent.locator('.hierarchy-object-label').click();await preview.waitFor({state:'hidden'});
 const placement=page.locator('.scene-placement-options');assert.equal(await placement.getAttribute('open'),null);await placement.locator('summary').click();assert.equal(await page.getByRole('button',{name:'Repère Gizmo',exact:true}).isVisible(),true);await page.keyboard.press('Escape');assert.equal(await placement.getAttribute('open'),null);assert.equal(await parent.getAttribute('aria-selected'),'true','Closing a scene menu keeps object selection');
 await page.screenshot({path:path.join(out,'editor-3d-after.png')});
 assert.deepEqual(await data(),fixture.workspaces['3d'].entities,'UI navigation, focus and filters never rewrite legacy entities');
 report.checks.push('Legacy v3 project: exact entity data, unknown component, parent/child, selection, arrow keys and double-click focus preserved');
 report.checks.push('Project columns at 1440/1920/1366, 180px shallow dock, filtering, single-click inspect, list/grid and maximize/Escape');
 report.checks.push('Camera preview only on camera selection; Placement menu opens and closes with Escape');
 // Save, reload, reopen and portable export must preserve the exact authored data.
 await page.evaluate(async()=>{const {saveProject}=await import('/js/core/project-hub.js');assertSave(saveProject());function assertSave(ok){if(!ok)throw Error('Save failed')}});
 await page.reload({waitUntil:'load'});await openHubProject('Ancien projet');assert.deepEqual(await data(),entities);
 const exported=await page.evaluate(async()=>{const [{state},{gameProject},{prepareGameDefinition}]=await Promise.all([import('/js/core/state.js'),import('/js/core/game-project.js'),import('/js/core/game-build.js')]);const result=prepareGameDefinition({entities:state.entities,camera:state.camera,mode:'3d',project:gameProject});return JSON.parse(JSON.stringify(result.project.scenes.find(scene=>scene.id===result.project.activeSceneId)?.entities))});assert.deepEqual(exported,entities);
 await page.evaluate(async()=>{const {switchWorkspace}=await import('/js/core/workspaces.js');switchWorkspace('2d')});
 assert.deepEqual(await data(),fixture.workspaces['2d'].entities);assert.equal(await placement.isVisible(),false);
 await page.screenshot({path:path.join(out,'editor-2d-after.png')});
 const current=await page.evaluate(async()=>{const {createProject}=await import('/js/core/project-hub.js');const {state}=await import('/js/core/state.js');const id=createProject('Projet récent','2d');return {id,entities:structuredClone(state.entities)}});
 await page.evaluate(async()=>{const {openProject}=await import('/js/core/project-hub.js');openProject('tree-legacy')});assert.deepEqual(await data(),fixture.workspaces['2d'].entities);
 await page.evaluate(async id=>{const {openProject}=await import('/js/core/project-hub.js');openProject(id)},current.id);assert.deepEqual(await data(),current.entities);
 report.checks.push('Save/reload/reopen/export, switch 3D→2D and old/new project round trip preserve entities exactly');
 // Build a real player through the existing Blueprint UI, link its game camera,
 // then exercise native Play and Stop; no transient Horror checkbox is involved.
 await page.evaluate(async()=>{
  const [{createProject},{state,notify},{prefab3d}]=await Promise.all([import('/js/core/project-hub.js'),import('/js/core/state.js'),import('/js/assets/catalog-3d.js')]);
  createProject('Kits de construction','3d');const actor=prefab3d('free-space-kit-astronautb',state.nextId++,0,0);actor.name='Joueur Horror';state.entities.push(actor);state.selected=[actor.id];notify();
 });
 await page.locator('#openBlueprint').click();await page.locator('.bp-tab').filter({hasText:'Bibliothèque'}).click();
 const horrorCard=page.locator('.bp-template-card').filter({has:page.getByRole('heading',{name:'BP_Horror_Player',exact:true})});
 await horrorCard.getByRole('button',{name:'＋ Configurer l’objet sélectionné',exact:true}).click();
 await horrorCard.getByRole('button',{name:'Relier la caméra de jeu',exact:true}).click();
 await page.screenshot({path:path.join(out,'game-kits-blueprint.png')});await page.locator('#blueprintClose').click();
 const authored=await data();const horrorPlayer=authored.find(o=>o.name==='Joueur Horror');assert(horrorPlayer.horrorSettings.enabled&&horrorPlayer.inputActions.enabled);assert.equal(authored.find(o=>o.sceneCamera3d)?.sceneCamera3d.mode,'firstPerson');
 await page.locator('#play').click();
 await page.waitForFunction(async()=>{const {state}=await import('/js/core/state.js');const {horror}=await import('/js/core/horror-survival.js');return state.playing&&horror.enabled});
 await page.locator('#canvas3d').focus();await page.keyboard.press('l');
 await page.waitForFunction(async()=>!(await import('/js/core/horror-survival.js')).horror.flashlight);
 await page.keyboard.down('w');
 await page.waitForFunction(async initial=>{const p=(await import('/js/core/state.js')).state.entities.find(o=>o.name==='Joueur Horror');return Math.hypot(p.x-initial.x,p.y-initial.y)>5},horrorPlayer);await page.keyboard.up('w');
 await page.locator('#play').click();await page.waitForFunction(async()=>!(await import('/js/core/state.js')).state.playing);
 assert.deepEqual(await data(),authored,'Stop restores every authored component after actual movement');assert.equal(await page.evaluate(async()=>(await import('/js/core/horror-survival.js')).horror.enabled),false);
 report.checks.push('Blueprint UI applies Horror player kit, links Main Camera, starts native Horror, moves with W, toggles lamp with L, and restores the authored scene on Stop');
 assert.deepEqual(report.errors,[],'No browser JavaScript errors');report.status='PASS';console.log(JSON.stringify(report,null,2));
}catch(error){report.failure=error.message;report.css=await page?.evaluate(()=>{const node=document.querySelector('.unity-hierarchy-row[data-object-id="4"] .hierarchy-object-label'),found=[];const scan=rules=>{for(const rule of rules){if(rule.selectorText&&node?.matches(rule.selectorText)&&(rule.style?.background||rule.style?.backgroundColor))found.push({selector:rule.selectorText,background:rule.style.background||rule.style.backgroundColor});if(rule.cssRules)scan(rule.cssRules)}};for(const sheet of document.styleSheets)try{scan(sheet.cssRules)}catch{};return found}).catch(()=>[]);report.debug=await page?.evaluate(()=>({clicks:window.__treeClicks,query:document.getElementById('hierarchySearch')?.value,folds:localStorage.getItem('warlike.hierarchy.folds.v1'),parent:document.querySelector('.unity-hierarchy-row[data-object-id="4"]')?.outerHTML})).catch(()=>null);await page?.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});throw error}finally{await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
