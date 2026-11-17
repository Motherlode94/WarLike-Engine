import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,mkdtemp} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {chromium} from 'playwright';
import {exportGamePackage,prepareGameDefinition} from '../js/core/game-build.js';
import {runtimeFixture} from '../tests/runtime-acceptance-fixture.mjs';

const root=path.resolve(import.meta.dirname,'..'),output=path.join(root,'.validation-tools/runtime-acceptance');
await mkdir(output,{recursive:true});
const built=await mkdtemp(path.join(tmpdir(),'warlike-runtime-'));
const fetcher=async url=>{try{const data=await readFile(url);return {ok:true,json:async()=>JSON.parse(data),text:async()=>data.toString(),arrayBuffer:async()=>data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)};}catch{return {ok:false};}};
for(const mode of ['2d','3d']){
 assert.throws(()=>prepareGameDefinition(runtimeFixture(mode,true)),/runtime C# local|Play C# local/);
 const fixture=runtimeFixture(mode),before=structuredClone(fixture);
 const result=await exportGamePackage(fixture,{fetcher});assert.deepEqual(fixture,before,'export must preserve authored breakpoints');
 const zip=new Uint8Array(await result.blob.arrayBuffer()),view=new DataView(zip.buffer);let offset=0;
 while(offset+30<=zip.length&&view.getUint32(offset,true)===0x04034b50){
  const size=view.getUint32(offset+18,true),length=view.getUint16(offset+26,true),extra=view.getUint16(offset+28,true);
  const name=new TextDecoder().decode(zip.subarray(offset+30,offset+30+length)),start=offset+30+length+extra;
  assert.ok(!name.startsWith('/')&&!name.split('/').includes('..')&&start+size<=zip.length);
  const file=path.join(built,mode,name);await mkdir(path.dirname(file),{recursive:true});await writeFile(file,zip.subarray(start,start+size));offset=start+size;
 }
 // Explicitly verify the extracted Web runtime before the browser tests.
 const base=path.join(built,mode);
 const html=await readFile(path.join(base,'index.html'),'utf8');
 assert.match(html,/src=["']\.\/js\/game-build-player\.js["']/,'Portable '+mode+' HTML must load its own bootstrap');
 for(const required of ['js/game-build-player.js','js/editor.js','js/core/runtime-session.js']){
  const bytes=await readFile(path.join(base,required)).catch(()=>null);
  assert.ok(bytes?.byteLength,'Missing '+required+' in isolated '+mode+' export');
 }
}
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.glb':'model/gltf-binary','.wasm':'application/wasm','.svg':'image/svg+xml','.jpg':'image/jpeg','.webp':'image/webp'};
const server=createServer(async(req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname),exported=pathname.startsWith('/exports/'),base=exported?built:root;
 const file=path.resolve(base,'.'+(exported?pathname.slice(8):pathname));
 if(file!==base&&!file.startsWith(base+path.sep)){res.writeHead(403).end();return;}
 try{const target=path.extname(file)?file:path.join(file,'index.html');res.setHeader('Content-Type',mime[path.extname(target)]||'application/octet-stream');res.end(await readFile(target));}catch{res.writeHead(404).end();}
});
// This is an already allowed bridge origin; never relax the bridge allowlist for QA.
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(8000,'127.0.0.1',resolve);});
let browser,bridge,stage='startup',bridgeLog='';const errors=[],report=[];
const mark=value=>{stage=value;console.log('Runtime acceptance:',value);};
const watchdog=setTimeout(()=>{console.error('Timed out at',stage);bridge?.kill('SIGKILL');process.exit(1);},240000);watchdog.unref();
try{
 try{await fetch('http://127.0.0.1:8765/health',{signal:AbortSignal.timeout(300)});throw Error('Port 8765 already occupied');}catch(error){if(error.message==='Port 8765 already occupied')throw error;}
 bridge=spawn('dotnet',['csharp/WarLike.Bridge/bin/Release/net8.0/WarLike.Bridge.dll'],{cwd:root,stdio:['ignore','pipe','pipe']});
 let spawnError;bridge.on('error',error=>{spawnError=error;});bridge.stdout.on('data',data=>{bridgeLog+=data;});bridge.stderr.on('data',data=>{bridgeLog+=data;});
 for(let attempt=0;!bridgeLog.includes('WarLike C# bridge listening on');attempt++){if(spawnError||bridge.exitCode!==null||attempt>120)throw Error(spawnError?.message||bridgeLog||'Bridge startup timeout');await delay(50);}
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--in-process-gpu']});
 const context=await browser.newContext({viewport:{width:1440,height:960}}),page=await context.newPage();
 page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
 page.on('dialog',async d=>{errors.push('Unexpected dialog: '+d.message());await d.dismiss();});
 const snapshot=()=>page.evaluate(async()=>{
  const {state}=await import('/js/core/state.js'),{sequenceRuntime}=await import('/js/core/logic-sequences.js'),{blueprintDebugger:d}=await import('/js/core/blueprint-debugger.js');
  const {gameSession}=await import('/js/core/game-session.js'),{runtimeSession}=await import('/js/core/runtime-session.js'),{view3d}=await import('/js/core/viewport-3d.js');
  return {playing:state.playing,entities:JSON.parse(JSON.stringify(state.entities)),score:sequenceRuntime.globals.score,nativeRotation:sequenceRuntime.globals.nativeRotation,
   paused:d.paused,node:d.current?.nodeId,stack:d.current?.stack,reason:d.reason,elapsed:gameSession.elapsed,phase:runtimeSession.phase,error:runtimeSession.error,sequenceErrors:sequenceRuntime.errors,glError:view3d.gl?.getError(),renderError:view3d.error};
 });
 const until=async(predicate,label)=>{const deadline=Date.now()+30000;let s;do{s=await snapshot();if(predicate(s))return s;await delay(50);}while(Date.now()<deadline);throw Error(label+': '+JSON.stringify(s));};
 for(const mode of ['2d','3d'])for(const native of [false,true]){
  mark('editor '+mode+' '+(native?'C#':'Web'));
  await page.goto('http://127.0.0.1:8000/',{waitUntil:'load'});await page.locator('body.reference-engine').waitFor();
  const authored=await page.evaluate(async({mode,native})=>{
   const {runtimeFixture}=await import('/tests/runtime-acceptance-fixture.mjs'),{createProject,saveProject}=await import('/js/core/project-hub.js');
   const {restoreWorkspaces}=await import('/js/core/workspaces.js'),{state,notify}=await import('/js/core/state.js');
   const fixture=runtimeFixture(mode,native),id=createProject('QA '+mode+' '+(native?'C#':'Web'),mode);
   const slot={entities:fixture.entities,selected:[1],nextId:4,camera:fixture.camera,game:{...fixture.project,id}};
   restoreWorkspaces({workspaceMode:mode,workspaces:{'2d':mode==='2d'?slot:{entities:[],selected:[],nextId:1,camera:fixture.camera},'3d':mode==='3d'?slot:{entities:[],selected:[],nextId:1,camera:fixture.camera}}});
   saveProject();notify();return JSON.parse(JSON.stringify(state.entities));
  },{mode,native});
  await page.evaluate(async token=>(await import('/js/core/native-bridge-client.js')).setNativeBridgeToken(token),bridgeLog.match(/CLÉ DE SESSION C# : ([A-Za-z0-9_-]+)/)?.[1]||'');
  await page.locator('#hubClose').click();await page.locator('#play').click();if(native)await page.locator('#scriptTrustAllow').click();
  let s=await until(s=>s.paused&&s.node==='action1','break before first side effect');assert.equal(s.score,0);assert.equal(s.phase,'ready');
  await page.locator('#blueprintDialog').waitFor({state:'visible'});await page.locator('#bpDebugStatus').getByText(/Point d’arrêt/).waitFor();
  // Wait across rendered frames to demonstrate that simulation time and C# are frozen.
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))));
  const frozen=await snapshot();assert.equal(frozen.elapsed,s.elapsed);assert.equal(frozen.entities[0].rotation,s.entities[0].rotation);
  if(native){const rotation=s.entities.find(e=>e.id===3).rotation;assert.ok(rotation>0);assert.equal(s.nativeRotation,rotation,'WarScript observes the accepted native frame');assert.equal(frozen.entities.find(e=>e.id===3).rotation,rotation);}
  // Edit a breakpoint on an action already copied into this running job.
  await page.getByRole('button',{name:'⬡ Graphe',exact:true}).click();await page.locator('[data-node-id="action4"]').dispatchEvent('click');
  await page.getByRole('button',{name:'○ Ajouter un point d’arrêt',exact:true}).dispatchEvent('click');await page.getByRole('button',{name:'⌁ Débogage',exact:true}).click();
  await page.getByRole('button',{name:'▷ Pas à pas',exact:true}).click();s=await until(s=>s.paused&&s.score===1,'one action only');assert.equal(s.elapsed,frozen.elapsed);
  await page.getByRole('button',{name:'▷ Pas à pas',exact:true}).click();s=await until(s=>s.paused&&s.stack?.[0]?.id==='award','enter reusable function');assert.equal(s.score,1);assert.equal(s.stack[0].parameters.points,2);
  await page.locator('#bpDebugVariables').getByText('ƒ award',{exact:true}).waitFor();
  await page.getByRole('button',{name:'▷ Pas à pas',exact:true}).click();s=await until(s=>s.paused&&s.score===3,'step function body');assert.equal(s.elapsed,frozen.elapsed);
  await page.screenshot({path:path.join(output,'debug-'+mode+'-'+(native?'native':'web')+'.png')});
  await page.getByRole('button',{name:'▶ Continuer',exact:true}).click();s=await until(s=>s.paused&&s.node==='action4','live breakpoint after Wait');assert.equal(s.score,3);
  await page.getByRole('button',{name:'⬡ Graphe',exact:true}).click();await page.locator('[data-node-id="action4"]').dispatchEvent('click');await page.getByRole('button',{name:'● Retirer le point d’arrêt',exact:true}).dispatchEvent('click');
  await page.getByRole('button',{name:'▶ Continuer',exact:true}).click();s=await until(s=>s.score===7&&!s.paused,'resume after removing live breakpoint');assert.deepEqual(s.sequenceErrors,[]);
  await page.getByRole('button',{name:'■ Arrêter',exact:true}).click();assert.deepEqual((await snapshot()).entities,authored,'Stop restores authored scene and debugging metadata');
  await page.locator('#blueprintClose').click();await page.reload({waitUntil:'load'});
  await page.getByRole('button',{name:'QA '+mode+' '+(native?'C#':'Web'),exact:true}).click();await page.locator('#hubOverlay').waitFor({state:'hidden'});
  assert.deepEqual((await snapshot()).entities,authored,'reopen preserves scripts, components, IDs and breakpoints');
  if(mode==='3d'){s=await snapshot();assert.equal(s.glError,0);assert.ok(!s.renderError);await page.locator('#canvas3d').waitFor({state:'visible'});}
  report.push({mode,native,breakpoint:true,step:true,typedStack:true,stopRestored:true,reopened:true});
 }
 mark('missing bridge');await page.route('http://127.0.0.1:8765/**',route=>route.abort());await page.locator('#play').click();
 const unavailable=await until(s=>s.phase==='error','missing bridge must stop native Play');assert.match(unavailable.error,/Play C# interrompu/);assert.equal(unavailable.score,0);
 await page.locator('#play').click();await page.unroute('http://127.0.0.1:8765/**');
 await context.close();
 // Fresh browser storage and a network allowlist containing only the exported server.
 for(const mode of ['2d','3d']){
  mark('isolated export '+mode);const offline=await browser.newContext({viewport:{width:1440,height:960}}),external=[],failed=[];
  const origin='http://127.0.0.1:8000';await offline.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin===origin&&url.pathname.startsWith('/exports/'+mode+'/')||['blob:','data:'].includes(url.protocol))return route.continue();external.push(url.href);return route.abort();});
  const game=await offline.newPage();game.on('pageerror',e=>errors.push(e.message));game.on('response',r=>{if(r.status()>=400)failed.push(r.status()+' '+r.url());});
  game.on('requestfailed',r=>{failed.push('NETWORK '+r.url()+' '+(r.failure()?.errorText||''))});
  await game.goto(origin+'/exports/'+mode+'/',{waitUntil:'load'});
  const play=game.getByRole('button',{name:'Jouer',exact:true});
  try{await play.waitFor({state:'visible',timeout:15000})}
  catch(error){throw Error('P0 isolated export '+mode+': missing Jouer button; page errors='+JSON.stringify(errors)+'; failed resources='+JSON.stringify(failed)+'; external='+JSON.stringify(external)+'; cause='+error.message)}
  await play.click();
  let result;const deadline=Date.now()+30000;do{result=await game.evaluate(async()=>{const base='./js/core/',{sequenceRuntime}=await import(base+'logic-sequences.js'),{blueprintDebugger}=await import(base+'blueprint-debugger.js'),{view3d}=await import(base+'viewport-3d.js');return {score:sequenceRuntime.globals.score,paused:blueprintDebugger.paused,errors:sequenceRuntime.errors,glError:view3d.gl?.getError(),renderError:view3d.error};});if(result.score===7)break;await delay(50);}while(Date.now()<deadline);
  assert.equal(result.score,7,'shipped graph must run through saved breakpoints');assert.equal(result.paused,false);assert.deepEqual(result.errors,[]);
  if(mode==='3d'){assert.equal(result.glError,0);assert.ok(!result.renderError);}
  await game.screenshot({path:path.join(output,'export-'+mode+'.png')});assert.deepEqual(external,[]);assert.deepEqual(failed,[]);await offline.close();report.push({mode,exportIsolated:true,savedBreakpointsIgnored:true});
 }
 assert.deepEqual(errors,[]);await writeFile(path.join(output,'report.json'),JSON.stringify({result:'PASS',checks:report,nativeUnavailable:'explicit error',nativeWebExport:'refused'},null,2));console.log('PASS',JSON.stringify(report));
}finally{
 await browser?.close();bridge?.kill();if(bridge&&bridge.exitCode===null)await Promise.race([new Promise(r=>bridge.once('exit',r)),delay(2000).then(()=>bridge.kill('SIGKILL'))]);
 server.closeAllConnections();await new Promise(r=>server.close(r));clearTimeout(watchdog);
}
