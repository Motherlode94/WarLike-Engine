// Browser certification of authored, real, rigged GLB assets — not a demo game.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'.validation-tools/real-glb-retarget');
await mkdir(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.glb':'model/gltf-binary','.wasm':'application/wasm','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
 const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const file=path.resolve(root,'.'+name);
 if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 const target=path.extname(file)?file:path.join(file,'index.html');
 try{res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream'});res.end(await readFile(target))}
 catch{res.writeHead(404).end()}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
let browser;const report={status:'FAIL',checks:[],errors:[]};
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--in-process-gpu']});
 const ctx=await browser.newContext({viewport:{width:1440,height:960}});
 const page=await ctx.newPage();page.setDefaultTimeout(45000);
 page.on('pageerror',e=>report.errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'load'});
 await page.locator('body.reference-engine').waitFor();
 const authored=await page.evaluate(async()=>{
  const [{createProject,saveProject},{registerLocalModel},{retargetImportedHumanoidClip},{state,notify}]=await Promise.all([
   import('/js/core/project-hub.js'),import('/js/assets/real-models-3d.js'),
   import('/js/core/humanoid-glb-transfer.js'),import('/js/core/state.js')]);
  const file=async(path,name)=>{
   const res=await fetch('/'+path);if(!res.ok)throw Error(path+' '+res.status);
   return new File([await res.arrayBuffer()],name,{type:'model/gltf-binary'});
  };
  const [source,target]=await Promise.all([
   file('assets/free/quaternius/universal-animation-library/ual1-standard.glb','ual1-standard.glb'),
   file('assets/free/quaternius/universalanimationlibrary2/ual2-standard.glb','ual2-standard.glb')
  ]);
  const a=registerLocalModel(source),b=registerLocalModel(target);
  const id=createProject('Certification GLB réel','3d');
  const actor={id:4,name:'Personnage GLB créé par auteur',type:'mesh3d',shape:'glb',
   model3dId:b.id,x:-64,y:-64,elevation3d:0,w:128,h:192,depth3d:128,
   color:'#ffffff',visible:true,playable3d:true};
  state.entities.push(actor);state.selected=[4];state.nextId=5;
  const transfer=await retargetImportedHumanoidClip(actor,{
   sourceModelId:a.id,sourceClipName:'Walk_Formal_Loop',name:'Marche humanoïde importée',fps:20
  });
  actor.animationRig.activeClip=transfer.name;actor.animationRig.playOnStart=true;
  notify();
  if(!saveProject())throw Error('Saving authored scene failed');
  return {id,modelId:b.id,sourceId:a.id,clip:transfer.name,channels:transfer.channels};
 });
 await page.locator('#hubClose').click();
 await page.locator('#hubOverlay').waitFor({state:'hidden'});
 await page.getByRole('button',{name:'Sélectionner Personnage GLB créé par auteur',exact:true}).click();
 await page.screenshot({path:path.join(out,'editor-real-glb.png')});
 report.checks.push('Real source and target GLB imported; Inspector-compatible rig assigned');
 const modelSettings=page.locator('#properties .inspector-model-import-button');
 await modelSettings.waitFor({state:'visible'});
 await modelSettings.click();
 const inspector=page.locator('#modelRigImportWindow button').filter({hasText:'Analyser le GameObject'});
 const diagnostic=await page.evaluate(async()=>{
  const [{state},{workspace},{inspectedObjects,inspectorSelection},{inspectedAsset}]=await Promise.all([
   import('/js/core/state.js'),import('/js/core/workspaces.js'),import('/js/ui/inspector-context.js'),import('/js/ui/inspector-assets.js')
  ]);
  return {mode:workspace.mode,selected:state.selected,objects:inspectedObjects().map(x=>({id:x.id,name:x.name,type:x.type})),
   inspectorLocked:inspectorSelection.locked,asset:inspectedAsset()?.id||null,
   pane:document.querySelector('#properties')?.innerText?.slice(0,1200),
   auditButtons:[...document.querySelectorAll('button')].filter(b=>b.textContent?.includes('Analyser le GameObject')).map(b=>({text:b.textContent,hidden:b.hidden,ancestry:[b,b.parentElement,b.parentElement?.parentElement,b.parentElement?.parentElement?.parentElement].filter(Boolean).map(e=>({tag:e.tagName,id:e.id,cls:e.className,display:getComputedStyle(e).display,visibility:getComputedStyle(e).visibility,opacity:getComputedStyle(e).opacity,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}))}))};
 });
 console.log('GLB authoring Inspector selection:',JSON.stringify(diagnostic));
 assert.deepEqual(diagnostic.selected,[4],'Hierarchy must select the new authored GLB');
 assert.equal(diagnostic.mode,'3d');
 assert.equal(diagnostic.objects.at(-1)?.id,4,'Inspector must inspect the authored GameObject');
 await inspector.waitFor({state:'visible',timeout:12000});
 await inspector.click();
 await page.waitForFunction(()=>document.querySelector('#modelRigImportWindow .inspector-authoring-results')?.textContent?.includes('clips GLB'),null,{timeout:30000});
 report.checks.push('Inspector loaded actual GLB and evaluated geometry/skin');
 await page.locator('#play').click();
 await page.waitForFunction(async()=>{const {state}=await import('/js/core/state.js');return state.playing===true});
 await page.waitForTimeout(550);
 const play=await page.evaluate(async()=>{
  const {state}=await import('/js/core/state.js');
  const actor=state.entities.find(x=>x.id===4);
  return {playing:state.playing,clip:actor?.animationRig?.activeClip,pose:actor?._animatorFrame?.time??null};
 });
 assert.equal(play.playing,true);
 assert.equal(play.clip,authored.clip);
 await page.screenshot({path:path.join(out,'play-real-glb.png')});
 await page.locator('#play').click();
 await page.waitForFunction(async()=>{const {state}=await import('/js/core/state.js');return !state.playing});
 report.checks.push('Play/Stop completed with real rigged actor and authored clip');
 const exportData=await page.evaluate(async()=>{
  const [{state},{gameProject},{prepareGameDefinition}]=await Promise.all([
   import('/js/core/state.js'),import('/js/core/game-project.js'),import('/js/core/game-build.js')
  ]);
  const ready=prepareGameDefinition({entities:state.entities,camera:state.camera,mode:'3d',project:gameProject});
  const actor=ready.project.scenes.find(s=>s.id===ready.project.activeSceneId).entities.find(x=>x.id===4);
  return {model:actor.model3dId,clip:actor.animationRig.clips[0].name,avatar:actor.animationRig.avatar?.schema};
 });
 assert.deepEqual(exportData,{model:authored.modelId,clip:authored.clip,avatar:'warlike.avatar.v1'});
 report.checks.push('Web export preparation retains target GLB, imported clip and humanoid avatar');
 const built=await page.evaluate(async()=>{
  const [{state},{gameProject},{exportGamePackage}]=await Promise.all([
   import('/js/core/state.js'),import('/js/core/game-project.js'),import('/js/core/game-build.js')
  ]);
  const archive=await exportGamePackage({entities:state.entities,camera:state.camera,mode:'3d',project:gameProject});
  const sig=new Uint8Array(await archive.blob.slice(0,4).arrayBuffer());
  const tail=new Uint8Array(await archive.blob.slice(-65557).arrayBuffer());
  const tailText=new TextDecoder('latin1').decode(tail);
  return {signature:[...sig],bytes:archive.blob.size,files:archive.files,
   containsModel:tailText.includes(state.entities.find(o=>o.id===4).model3dId)};
 });
 assert.deepEqual(built.signature,[80,75,3,4],'Export ZIP header must be valid');
 assert(built.bytes>10000&&built.files>10,'Portable Web export must include runtime files');
 assert(built.containsModel,'Portable archive must include imported target GLB bytes');
 report.checks.push('Actual offline Web ZIP created with its imported target rigged model');
 report.archive=built;
 assert.deepEqual(report.errors,[]);
 report.status='PASS';report.asset=authored;report.play=play;
 await ctx.close();
}catch(e){report.errors.push(e.message);throw e}
finally{
 await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
 await browser?.close();server.closeAllConnections();
 await new Promise(ok=>server.close(ok));
}
