// Smoke test the actual Gaia brush controls and live terrain mesh in Chromium.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
const root=path.resolve(import.meta.dirname,'..'),output=path.join(root,'.validation-tools/gaia-terrain');
await mkdir(output,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.glb':'model/gltf-binary','.wasm':'application/wasm','.svg':'image/svg+xml','.jpg':'image/jpeg','.webp':'image/webp'};
const server=createServer(async(req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname),file=path.resolve(root,'.'+pathname);
 if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 const target=path.extname(file)?file:path.join(file,'index.html');
 try{res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream'});res.end(await readFile(target))}
 catch{res.writeHead(404).end()}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
let browser;const report={result:'FAIL',errors:[]};
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--in-process-gpu']});
 const page=await browser.newPage({viewport:{width:1440,height:960}});
 page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'load'});
 await page.locator('body.reference-engine').waitFor();
 await page.evaluate(async()=>{const {createProject}=await import('/js/core/project-hub.js');createProject('Gaia brush P1','3d')});
 await page.locator('#hubClose').click();
 await page.locator('#hubOverlay').waitFor({state:'hidden'});
 await page.getByRole('button',{name:'Sélectionner Terrain',exact:true}).click();
 const tools=page.locator('.warlike-gaia-terrain-tools');
 await tools.waitFor({state:'visible'});
 await tools.getByRole('combobox',{name:'Outil de sculpture terrain 3D'}).selectOption('raise');
 const canvas=page.locator('#canvas3d'),rect=await canvas.boundingBox();
 assert(rect&&rect.width>300);
 await page.mouse.click(rect.x+rect.width*.5,rect.y+rect.height*.53);
 const data=await page.evaluate(async()=>{
  const {state}=await import('/js/core/state.js');
  const o=state.entities.find(e=>e.name==='Terrain');
  return {revision:o.terrainRevision3d,heights:o.terrainHeightfield?.heights,paint:o.terrainHeightfield?.paint,glError:document.querySelector('#canvas3d')?.getContext('webgl')?.getError()};
 });
 assert(data.heights?.some(h=>h>0),'Gaia Raise brush must update saved heightfield');
 assert(data.revision>0);
 assert.equal(data.glError,0);
 assert.deepEqual(report.errors,[]);
 await page.screenshot({path:path.join(output,'terrain-brush-raised.png')});
 report.result='PASS';report.revision=data.revision;report.maxHeight=Math.max(...data.heights);
}finally{
 await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));
 await browser?.close();server.closeAllConnections();
 await new Promise(resolve=>server.close(resolve));
}
