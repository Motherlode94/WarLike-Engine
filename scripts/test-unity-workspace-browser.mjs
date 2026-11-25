import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=fileURLToPath(new URL('../',import.meta.url));
const out=path.join(root,'.validation-tools/unity-workspace');
await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{
 const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
 if(file!==path.resolve(root)&&!file.startsWith(root)){res.writeHead(403).end();return}
 const target=path.extname(file)?file:path.join(file,'index.html');
 try{
  const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.wasm':'application/wasm'};
  res.setHeader('Content-Type',mime[path.extname(target)]||'application/octet-stream');
  res.end(await readFile(target));
 }catch{res.writeHead(404).end()}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--in-process-gpu']});
let page;
try{
 page=await browser.newPage({viewport:{width:1440,height:900}});
 page.setDefaultTimeout(30000);
 await page.addInitScript(()=>{
  localStorage.setItem('warlike.hub.projects.v1',JSON.stringify([{id:'unity-ui-qa',name:'Unity UI QA',type:'3d'}]));
  const slot={entities:[],selected:[],nextId:1,camera:{x:0,y:0,zoom:1}};
  localStorage.setItem('warlike.hub.project.unity-ui-qa',JSON.stringify({version:3,name:'Unity UI QA',workspaceMode:'3d',workspaces:{'2d':slot,'3d':slot}}));
  localStorage.setItem('warlike.workspace.ui-schema.v2','done');
  if(!localStorage.getItem('warlike.workspace.layout.v1'))localStorage.setItem('warlike.workspace.layout.v1',JSON.stringify({leftWidth:240,rightWidth:320,float:{}}));
  localStorage.setItem('warlike.projectHeight','220');
 });
 await page.goto('http://127.0.0.1:'+server.address().port+'/index.html',{waitUntil:'load'});
 await page.locator('#hubOverlay').waitFor({state:'visible'});
 // initSimpleHub() replaces the static HTML Hub with its tabbed runtime shell.
 await page.locator('#hubOverlay .hub-window[data-simple-hub="true"]').waitFor();
 await page.locator('#hubOverlay .simple-hub-nav-item[data-hub-tab="projects"]').waitFor();
 assert.equal(await page.locator('#hubOverlay .hub-project-welcome').count(),0,'No marketing hero in Unity Hub Projects');
 assert.equal(await page.locator('#hubOverlay .simple-hub-projects').getAttribute('data-project-view'),'list','Project list is default');
 const hubZones=await page.evaluate(()=>{const r=sel=>{const v=document.querySelector(sel).getBoundingClientRect();return {left:v.left,right:v.right,top:v.top,bottom:v.bottom}};return {nav:r('#hubOverlay .simple-hub-nav'),header:r('#hubOverlay .simple-hub-heading'),main:r('#hubOverlay .simple-hub-main')}});
 assert(hubZones.nav.right<=hubZones.main.left+4,'Sidebar does not overlap projects');
 assert(hubZones.header.bottom<=hubZones.main.top+4,'Header does not overlap list');
 assert.equal(await page.locator('#hubOverlay .simple-hub-main').getAttribute('data-hub-tab'),'projects');
 assert.equal(await page.locator('#hubOverlay .hub-appearance').isVisible(),false,
  'Appearance is not mixed into the project browser');
 const hubGeometry=await page.evaluate(()=>{
  const bounds=selector=>{const e=document.querySelector(selector);if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
  return {window:bounds('#hubOverlay .hub-window[data-simple-hub]'),nav:bounds('#hubOverlay .simple-hub-nav'),main:bounds('#hubOverlay .simple-hub-main'),heading:bounds('#hubOverlay .simple-hub-heading')};
 });
 assert(hubGeometry.window&&hubGeometry.nav&&hubGeometry.main&&hubGeometry.heading,'runtime Hub sections exist');
 assert(hubGeometry.nav.right<=hubGeometry.main.x+8,'Hub navigation does not overlap project content');
 assert(hubGeometry.heading.bottom<=hubGeometry.main.y+10,'Hub heading does not overlay content');
 assert(hubGeometry.window.right<=1441&&hubGeometry.window.bottom<=901,'Hub fits within desktop viewport');

 const hubHeader=await page.evaluate(()=>{
  const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width}};
  return {heading:rect('#hubOverlay .simple-hub-heading h1'),toolbar:rect('#hubOverlay .simple-hub-toolbar'),backup:rect('#hubBackupAll'),count:rect('#hubProjectCount'),newProjectButtons:[...document.querySelectorAll('#hubOverlay button')].filter(b=>b.textContent.includes('Nouveau projet')&&!b.hidden).length};
 });
 assert(hubHeader.toolbar.left>=hubHeader.heading.right-2||
  hubHeader.toolbar.top>=hubHeader.heading.bottom-2,
  'Hub project tools must be beside or below heading, never overlapping');
 assert(hubHeader.backup.left>=hubHeader.count.right-2||hubHeader.backup.top>=hubHeader.count.bottom-2,
  'project backup button does not overlap the project counter');
 assert.equal(hubHeader.newProjectButtons,1,'Hub exposes one visible New Project button');

 await page.screenshot({path:path.join(out,'hub-before-open.png')});
 await page.locator('#hubOverlay .simple-hub-nav-item[data-hub-tab="appearance"]').click();
 assert.equal(await page.locator('#hubOverlay .hub-appearance').isVisible(),true,
  'Appearance is a separate navigable Hub screen');
 assert.equal(await page.locator('#hubAccentColor').isVisible(),true,'color picker remains available');
 await page.screenshot({path:path.join(out,'hub-appearance-1440.png')});
 await page.locator('#hubOverlay .simple-hub-nav-item[data-hub-tab="projects"]').click();
 assert.equal(await page.locator('#hubOverlay .hub-appearance').isVisible(),false);
 await page.getByRole('button',{name:'Unity UI QA',exact:true}).click();
 await page.locator('#hubOverlay').waitFor({state:'hidden'});
 // Shared P1 editor design tokens must preserve existing window stacking and
 // selected palette rather than adding a second set of theme colors.
 const uiMetrics=await page.evaluate(()=>{
  const root=getComputedStyle(document.documentElement);
  const read=name=>root.getPropertyValue(name).trim();
  return {toolbar:read('--wl-editor-z-toolbar'),
   sceneMenu:read('--wl-editor-z-scene-menu'),
   blueprint:read('--wl-editor-z-blueprint'),
   inspectorMenu:read('--wl-editor-z-inspector-menu'),
   componentPopup:read('--wl-editor-z-component-popup'),
   hierarchyRow:read('--wl-editor-size-hierarchy-row'),
   accent:getComputedStyle(document.body).getPropertyValue('--editor-accent').trim()};
 });
 assert.deepEqual([uiMetrics.toolbar,uiMetrics.sceneMenu,uiMetrics.blueprint,
  uiMetrics.inspectorMenu,uiMetrics.componentPopup],['51','90','9000','8','99999'],
  'P1 stacking tokens retain established editor layer order');
 assert.equal(uiMetrics.hierarchyRow,'24px','Hierarchy retains existing row dimensions');
 assert(uiMetrics.accent,'Editor still inherits an active palette accent');

 for(const viewport of [{width:1920,height:1080},{width:1440,height:900},{width:1366,height:768}]){
  await page.setViewportSize(viewport);
  const boxes=await page.evaluate(()=>{
   const rect=sel=>{const r=document.querySelector(sel).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
   return {hierarchy:rect('#hierarchyPanel'),scene:rect('#viewport'),project:rect('#projectPanel'),inspector:rect('#inspectorPanel'),header:rect('.studio-menubar'),vw:innerWidth,vh:innerHeight};
  });
  assert(boxes.hierarchy.width>=200,'Hierarchy remains usable');
  assert(boxes.inspector.width>=240,'Inspector remains usable');
  assert(boxes.scene.width>=250&&boxes.scene.height>=170,'Scene remains usable');
  assert(boxes.hierarchy.right<=boxes.scene.left+12,'Hierarchy must not overlap Scene');
  assert(boxes.scene.right<=boxes.inspector.left+12,'Scene must not overlap Inspector');
  assert(boxes.project.top>=boxes.scene.bottom-12,'Project remains docked under Scene');
  assert(boxes.header.bottom<=boxes.scene.top+40,'Top menu should not overlap Scene');
  await page.locator('.reference-scene-menu>summary').click();
  assert(await page.locator('#zoomIn').isVisible(),'zoom remains available');
  assert(await page.locator('#sunHour').isVisible(),'lighting remains available');
  assert.equal(await page.locator('.scene-view-options').count(),0,'no nested hidden scene menu');
  await page.locator('.reference-scene-menu>summary').click();
  await page.screenshot({path:path.join(out,`editor-${viewport.width}x${viewport.height}.png`)});
 }
 // Unity window organization: History is a menu in the Hierarchy header,
 // while Project/Assets and Inspector keep usable scrolling areas.
 const unityWindows=await page.evaluate(()=>{
  const h=document.querySelector('#hierarchyPanel .hierarchy-history');
  const p=document.querySelector('#projectPanel');
  const grids=[...p.querySelectorAll('#visualPackItems,#assetGrid')].filter(node=>{
   const style=getComputedStyle(node);
   return style.display!=='none'&&style.visibility!=='hidden'&&node.getClientRects().length>0;
  });
  const inspector=document.querySelector('#inspectorPanel #properties');
  return {historyInHeader:!!h?.closest('.dock-title-actions'),
   assetGridHeight:Math.max(0,...grids.map(node=>node.getBoundingClientRect().height)),
   assetItems:grids.reduce((total,node)=>total+node.children.length,0),
   projectDockHeight:p?.getBoundingClientRect().height??0,
   inspectorScroll:getComputedStyle(inspector).overflowY,
   repeatedInspectorTitle:!!inspector?.querySelector('.inspector-window-toolbar>strong')&&getComputedStyle(inspector.querySelector('.inspector-window-toolbar>strong')).display!=='none'};
 });
 assert(unityWindows.historyInHeader,'History belongs to the Hierarchy title menu');
 assert(unityWindows.assetGridHeight>=70&&unityWindows.assetItems>0,
  'Project must render real asset items in a usable grid, not just toolbars');
 assert(unityWindows.inspectorScroll==='auto','Inspector properties scroll inside the dock');

 const panelGeometry=await page.evaluate(()=>{
  const rect=selector=>{const n=document.querySelector(selector);return n?.getBoundingClientRect()};
  const folders=rect('#assetFolders'),content=rect('#projectPanel .asset-content');
  const properties=rect('#inspectorPanel #properties'),inspector=rect('#inspectorPanel');
  return {folderRight:folders?.right??0,contentLeft:content?.left??0,
   contentWidth:content?.width??0,propertiesRight:properties?.right??0,
   inspectorRight:inspector?.right??0};
 });
 assert(panelGeometry.folderRight<=panelGeometry.contentLeft+3,
  'Project folders and asset content are separate non-overlapping columns');
 assert(panelGeometry.contentWidth>120,'Project assets remain usable');
 assert(panelGeometry.propertiesRight<=panelGeometry.inspectorRight+3,
  'Inspector content remains within its dock');

 assert.equal(unityWindows.repeatedInspectorTitle,false,'Inspector must not display duplicate headings');

 // Unity 2023 editor hierarchy: a single + dropdown, preserving real actions.
 await page.setViewportSize({width:1440,height:900});
 await page.locator('#hierarchyPanel .unity-hierarchy-create>summary').click();
 assert.equal(await page.locator('#quickCreateObject').isVisible(),true,'GameObject command available from Hierarchy +');
 assert.equal(await page.locator('#quickCreateCharacter').isVisible(),true,'Character command available from Hierarchy +');
 await page.screenshot({path:path.join(out,'unity-2023-hierarchy-create.png')});
 await page.locator('#hierarchyPanel .unity-hierarchy-create>summary').click();
 assert.equal(await page.locator('#view3dStatus').isVisible(),false,'no permanent tutorial overlay in 3D Scene');
 // The 3D authoring view must not show 2D Tilemap painting controls.
 await page.setViewportSize({width:1440,height:900});
 await page.locator('#workspace3d').click();
 await page.waitForFunction(()=>document.querySelector('#viewport .warlike-tilemap-toolbar')!==null);
 assert.equal(await page.locator('#viewport .warlike-tilemap-toolbar').isVisible(),false,
  '2D Tilemap controls must not cover 3D Scene');
 const createMenu=page.locator('#hierarchyPanel .unity-hierarchy-create>summary');
 await createMenu.click();
 await page.locator('#quickCreateObject').click();
 await page.waitForFunction(()=>!!document.querySelector('#hierarchyPanel .hierarchy-object-name'));
 const labels=await page.locator('#hierarchyPanel .hierarchy-object-name').allTextContents();
 assert(labels.some(name=>name.trim().length>0),'Hierarchy must show real GameObject names');
 const sizes=await page.locator('#hierarchyPanel .unity-hierarchy-row').evaluateAll(rows=>rows.map(row=>{
  const name=row.querySelector('.hierarchy-object-name');
  const label=row.querySelector('.hierarchy-object-label');
  const box=name?.getBoundingClientRect();
  return {name:name?.textContent?.trim(),width:box?.width??0,
   visible:!!(box&&box.width>0&&box.height>0),labelWidth:label?.getBoundingClientRect().width??0};
 }));
 console.log('P0 Hierarchy name widths',JSON.stringify(sizes));

 // A row must not push its controls beyond the Hierarchy viewport.
 const hierarchyBounds=await page.locator('#hierarchyPanel .unity-hierarchy-row').evaluateAll(rows=>rows.map(row=>{
  const bounds=row.getBoundingClientRect();
  const name=row.querySelector('.hierarchy-object-name')?.getBoundingClientRect();
  const label=row.querySelector('.hierarchy-object-label')?.getBoundingClientRect();
  const eye=row.querySelector('.hierarchy-eye')?.getBoundingClientRect();
  return {rowWidth:bounds.width,labelWidth:label?.width??0,
   nameWidth:name?.width??0,eyeWidth:eye?.width??0,
   nameRight:name?.right??0,rowRight:bounds.right};
 }));
 assert(hierarchyBounds.length>0,'Hierarchy has rendered object rows');
 assert(hierarchyBounds.every(row=>row.eyeWidth>=18&&row.eyeWidth<=20),
  'Hierarchy visibility buttons occupy a fixed narrow column');
 assert(hierarchyBounds.some(row=>row.labelWidth>=90&&row.nameWidth>40),
  'GameObject name takes the remaining row width');
 assert(hierarchyBounds.every(row=>row.nameRight<=row.rowRight+2),
  'Hierarchy name does not overflow its row');

 await page.screenshot({path:path.join(out,'editor-3d-clean-scene-and-hierarchy.png')});
 assert(sizes.some(item=>item.name&&item.visible&&item.labelWidth>=90&&item.width>40),
  'GameObject label must have real usable space, not only a forced minimum text width');
 // P0 certification: actual tab switching, panel detachment and restoration.
 await page.setViewportSize({width:1440,height:900});
 await page.locator('#consoleTab').click();
 assert.equal(await page.locator('#consoleContent').isVisible(),true,'Console tab opens');
 assert.equal(await page.locator('#projectContent').isVisible(),false,'Project content hides while Console is active');
 await page.screenshot({path:path.join(out,'console-tab-1440.png')});
 await page.locator('#projectTab').click();
 assert.equal(await page.locator('#projectContent').isVisible(),true,'Project tab restores browser');
 assert.equal(await page.locator('#consoleContent').isVisible(),false,'Console content closes');
 for(const [kind,id] of [['hierarchy','hierarchyPanel'],['inspector','inspectorPanel'],['project','projectPanel']]){
  const toggle=page.locator('[data-dock-toggle="'+kind+'"]');
  await toggle.click();
  await page.waitForFunction(panelId=>document.getElementById(panelId)?.classList.contains('floating-panel'),id);
  const rect=await page.locator('#'+id).boundingBox();
  assert(rect&&rect.width>=240&&rect.height>=180,kind+' floating window has a usable size');
  console.log('P0 floating window bounds',JSON.stringify({kind,rect,viewport:{width:1440,height:900}}));
  await page.screenshot({path:path.join(out,'dock-'+kind+'-floating.png')});
  if(kind==='hierarchy'){
   const title=await page.locator('#hierarchyPanel .dock-title > span').first().boundingBox();
   assert(title&&title.width>0,'Floating Hierarchy keeps a draggable title');
   const startX=title.x+Math.min(35,title.width/2),startY=title.y+title.height/2;
   await page.mouse.move(startX,startY);
   await page.mouse.down();
   await page.mouse.move(startX+75,startY+36,{steps:8});
   await page.mouse.up();
   const moved=await page.locator('#hierarchyPanel').boundingBox();
   assert(moved.x>rect.x+40,
    'Dragging the dock title actually moves the floating Hierarchy');
   assert(moved.x>=7&&moved.y>=34&&moved.x+moved.width<=1433&&moved.y+moved.height<=893,
    'Dragging a floating panel stays inside the same restorable viewport bounds');
   const saved=await page.evaluate(()=>{
    const el=document.querySelector('#hierarchyPanel');
    const state=JSON.parse(localStorage.getItem('warlike.workspace.layout.v1')||'{}');
    return {floating:state.float?.hierarchy,leftPriority:el.style.getPropertyPriority('left'),
     topPriority:el.style.getPropertyPriority('top')};
   });
   assert(saved.floating&&Math.abs(saved.floating.x-moved.x)<4,
    'Dragged Hierarchy coordinates are persisted');
   assert.equal(saved.leftPriority,'important','Drag positioning respects dock CSS priority');
   assert.equal(saved.topPriority,'important','Drag positioning respects dock CSS priority');
   await page.reload({waitUntil:'load'});
   // The Hub opens asynchronously after document load. isVisible() here races
   // initialization and can see the old hidden state before the Hub appears.
   // Reopen the actual project and confirm the overlay releases pointer events.
   await page.locator('#hubOverlay').waitFor({state:'visible'});
   await page.getByRole('button',{name:'Unity UI QA',exact:true}).click();
   await page.locator('#hubOverlay').waitFor({state:'hidden'});
   await page.waitForFunction(()=>document.querySelector('#hierarchyPanel')?.classList.contains('floating-panel'));
   assert.equal(await page.locator('#hubOverlay').isVisible(),false,
    'Hub closes before re-docking the restored project');
   const reopened=await page.locator('#hierarchyPanel').boundingBox();
   assert(Math.abs(reopened.x-moved.x)<6&&Math.abs(reopened.y-moved.y)<6,
    'Floating Hierarchy coordinates survive a full editor reload');
   await page.screenshot({path:path.join(out,'dock-hierarchy-reloaded.png')});
  }

  assert(rect.x>=-1&&rect.y>=-1&&rect.x+rect.width<=1441&&rect.y+rect.height<=901,kind+' floating window remains within viewport');
  await toggle.click();
  await page.waitForFunction(panelId=>!document.getElementById(panelId)?.classList.contains('floating-panel'),id);
 }
 const savedLayout=await page.evaluate(()=>JSON.parse(localStorage.getItem('warlike.workspace.layout.v1')||'{}'));
 assert.deepEqual(savedLayout.float||{}, {},'all certification panels are re-docked');
 const restored=await page.evaluate(()=>{
  const get=id=>{const r=document.getElementById(id).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom}};
  return {left:get('hierarchyPanel'),scene:get('viewport'),right:get('inspectorPanel'),bottom:get('projectPanel')};
 });
 assert(restored.left.right<=restored.scene.left+12,'Hierarchy docks left after floating');
 assert(restored.scene.right<=restored.right.left+12,'Inspector docks right after floating');
 assert(restored.bottom.top>=restored.scene.bottom-12,'Project docks below Scene after floating');
 await page.screenshot({path:path.join(out,'editor-redocked-1440.png')});
 console.log('PASS: Hub settings accessible and Unity-like dock geometry at 1440x900 + 1366x768');
}finally{
 await browser.close();
 server.closeAllConnections();
 await new Promise(resolve=>server.close(resolve));
}
