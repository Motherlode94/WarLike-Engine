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
  localStorage.setItem('warlike.workspace.layout.v1',JSON.stringify({leftWidth:240,rightWidth:320,float:{}}));
  localStorage.setItem('warlike.projectHeight','220');
 });
 await page.goto('http://127.0.0.1:'+server.address().port+'/index.html',{waitUntil:'load'});
 await page.locator('#hubOverlay').waitFor({state:'visible'});
 // initSimpleHub() replaces the static HTML Hub with its tabbed runtime shell.
 await page.locator('#hubOverlay .hub-window[data-simple-hub="true"]').waitFor();
 await page.locator('#hubOverlay .simple-hub-nav-item[data-hub-tab="projects"]').waitFor();
 assert.equal(await page.locator('#hubOverlay .simple-hub-main').getAttribute('data-hub-tab'),'projects');
 assert.equal(await page.locator('#hubOverlay .hub-appearance').isVisible(),false,
  'Appearance is not mixed into the project browser');
 await page.screenshot({path:path.join(out,'hub-before-open.png')});
 await page.locator('#hubOverlay .simple-hub-nav-item[data-hub-tab="appearance"]').click();
 assert.equal(await page.locator('#hubOverlay .hub-appearance').isVisible(),true,
  'Appearance is a separate navigable Hub screen');
 assert.equal(await page.locator('#hubAccentColor').isVisible(),true,'color picker remains available');
 await page.locator('#hubOverlay .simple-hub-nav-item[data-hub-tab="projects"]').click();
 assert.equal(await page.locator('#hubOverlay .hub-appearance').isVisible(),false);
 await page.getByRole('button',{name:'Unity UI QA',exact:true}).click();
 await page.locator('#hubOverlay').waitFor({state:'hidden'});
 for(const viewport of [{width:1440,height:900},{width:1366,height:768}]){
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
 console.log('PASS: Hub settings accessible and Unity-like dock geometry at 1440x900 + 1366x768');
}finally{
 await browser.close();
 server.closeAllConnections();
 await new Promise(resolve=>server.close(resolve));
}
