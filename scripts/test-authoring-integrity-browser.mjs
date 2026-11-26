// Actual Animation Studio controls, legacy/new projects, persistence and Play.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=fileURLToPath(new URL('../',import.meta.url)),out=path.join(root,'.validation-tools/authoring-integrity');await mkdir(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.wasm':'application/wasm','.png':'image/png','.svg':'image/svg+xml','.glb':'model/gltf-binary','.jpg':'image/jpeg'};
const server=createServer(async(req,res)=>{try{const name=decodeURIComponent(new URL(req.url,'http://local').pathname),file=path.resolve(root,'.'+name),base=path.resolve(root);if(file!==base&&!file.startsWith(base+path.sep)){res.writeHead(403).end();return;}const target=path.extname(file)?file:path.join(file,'index.html');res.setHeader('Content-Type',mime[path.extname(target)]||'application/octet-stream');res.end(await readFile(target));}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,...(process.env.WARLIKE_CHROMIUM_EXECUTABLE?{executablePath:process.env.WARLIKE_CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--in-process-gpu']});
const watchdog=setTimeout(()=>{console.error('Authoring integrity watchdog');browser.close();server.closeAllConnections();server.close();},150000);watchdog.unref();
const base='http://127.0.0.1:'+server.address().port,report=[],errors=[];let page;
const snapshot=()=>page.evaluate(async()=>{const {state}=await import('/js/core/state.js');return structuredClone(state.entities);});
const preview=async()=>{
 await page.locator('#animGroupPreview').check();
 await page.locator('#animTime').evaluate(input=>{input.value='1';input.dispatchEvent(new Event('input',{bubbles:true}));});
 assert.equal(await page.evaluate(async()=>{const {hasAnimationEditorPreviews}=await import('/js/core/animation-clips.js');return hasAnimationEditorPreviews();}),true);
};
try{
 for(const age of ['legacy','new'])for(const mode of ['2d','3d']){
  console.log('Authoring integrity:',age,mode);const context=await browser.newContext({viewport:{width:1440,height:1000}});page=await context.newPage();page.on('pageerror',error=>{errors.push(error.stack||error.message);console.error('Page error:',error.stack||error.message);});page.setDefaultTimeout(30000);
  if(age==='legacy')await page.addInitScript(({mode})=>{
   if(localStorage.getItem('warlike.hub.projects.v1'))return;
   const slot={entities:[{id:1,name:'Legacy player',type:'player',playable3d:true,x:10,y:0,w:64,h:64,legacyExtension:{keep:'unaltered'}},{id:2,name:'Legacy door',type:'object',x:20,y:0,w:64,h:64}],selected:[1,2],nextId:3,camera:{x:0,y:0,zoom:1}};
   localStorage.setItem('warlike.hub.projects.v1',JSON.stringify([{id:'legacy-'+mode,name:'Legacy '+mode,type:mode}]));
   localStorage.setItem('warlike.hub.project.legacy-'+mode,JSON.stringify({version:3,name:'Legacy '+mode,workspaceMode:mode,workspaces:{'2d':slot,'3d':slot}}));
  },{mode});
  await page.goto(base,{waitUntil:'load'});await page.locator('#hubOverlay .hub-window[data-simple-hub="true"]').waitFor();
  if(age==='legacy')await page.getByRole('button',{name:'Legacy '+mode,exact:true}).click();
  else {await page.evaluate(async mode=>{const {createProject}=await import('/js/core/project-hub.js');createProject('New '+mode,mode);},mode);await page.locator('#hubClose').click();}
  await page.locator('#hubOverlay').waitFor({state:'hidden'});
  const project=await page.evaluate(async({age,mode})=>{
   const {state,notify}=await import('/js/core/state.js'),{saveProject,hub}=await import('/js/core/project-hub.js'),{createClip}=await import('/js/core/animation-clips.js');
   if(age==='new')for(const name of ['Player','Door']){const id=state.nextId++;state.entities.push({id,name,type:name==='Player'?'player':'object',playable3d:name==='Player',x:id*100,y:0,w:64,h:64,legacyExtension:{keep:'new'}});}
   const actors=state.entities.slice(-2);for(const actor of actors){const clip=createClip('Shared',2);clip.keys=[{time:0,x:actor.x+64},{time:2,x:actor.x+128}];actor.animationStudio={clips:[clip],defaultClip:0,playOnStart:false};}
   state.selected=actors.map(actor=>actor.id);saveProject();notify();return {id:hub.projectId,name:hub.projectName,ids:actors.map(actor=>actor.id)};
  },{age,mode});
  const authored=await snapshot();await page.locator('#animationDockTab').click();
  await preview();assert.notDeepEqual(await snapshot(),authored);
  await page.locator('#hubSave').click();assert.deepEqual(await snapshot(),authored,'Save restores every preview owner');
  await preview();const exported=await page.evaluate(async mode=>{const {state}=await import('/js/core/state.js'),{prepareGameDefinition}=await import('/js/core/game-build.js'),{gameProject}=await import('/js/core/game-project.js');const data=prepareGameDefinition({entities:state.entities,mode,project:gameProject});return data.project.scenes.find(scene=>scene.id===data.project.activeSceneId).entities;},mode);
  assert.deepEqual(exported,authored,'Export contains only authored poses');
  await preview();await page.locator('#play').click();await page.waitForFunction(async()=>{const {state}=await import('/js/core/state.js');return state.playing;});
  assert.deepEqual(await page.evaluate(async()=>JSON.parse((await import('/js/core/state.js')).state.playBackup)),authored,'Play backup precedes all temporary preview poses');
  await page.locator('#play').click();assert.deepEqual(await snapshot(),authored,'Stop restores the original scene');
  await page.locator('#hubSave').click();await page.reload({waitUntil:'load'});await page.getByRole('button',{name:project.name,exact:true}).click();await page.locator('#hubOverlay').waitFor({state:'hidden'});
  assert.deepEqual(await snapshot(),authored,'Reopen preserves IDs, references, unknown properties and animations');
  let gl=null;if(mode==='3d'){await page.waitForFunction(async()=>!!(await import('/js/core/viewport-3d.js')).view3d.gl);gl=await page.evaluate(async()=>{const {view3d}=await import('/js/core/viewport-3d.js');return {error:view3d.gl.getError(),rendererError:view3d.error};});assert.deepEqual(gl,{error:0,rendererError:null});}
  await page.screenshot({path:path.join(out,age+'-'+mode+'.png')});report.push({age,mode,objects:authored.length,save:true,exportDefinition:true,playStop:true,reopen:true,gl});await context.close();
 }
 assert.deepEqual(errors,[]);await writeFile(path.join(out,'report.json'),JSON.stringify({passed:true,renderer:'Chromium / SwiftShader; functional checks, not a hardware benchmark',cases:report},null,2));console.log('PASS authoring integrity',JSON.stringify(report));
}catch(error){if(page&&!page.isClosed())await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});console.error('Authoring integrity failed:',error,errors);throw error;}finally{clearTimeout(watchdog);await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
