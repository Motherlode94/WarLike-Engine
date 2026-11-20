// Real Chromium acceptance for the Main Camera offscreen WebGL preview.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
const root=path.resolve(import.meta.dirname,'..'),output=path.join(root,'.validation-tools/camera-live-preview');
await mkdir(output,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.glb':'model/gltf-binary','.wasm':'application/wasm','.svg':'image/svg+xml','.jpg':'image/jpeg','.webp':'image/webp'};
const server=createServer(async(req,res)=>{
 const pathName=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const file=path.resolve(root,'.'+pathName);
 if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 const target=path.extname(file)?file:path.join(file,'index.html');
 try{res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream'});res.end(await readFile(target))}
 catch{res.writeHead(404).end()}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;const report={status:'FAIL',errors:[]};
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--in-process-gpu']});
 const page=await browser.newPage({viewport:{width:1440,height:960}});
 page.on('pageerror',error=>report.errors.push(error.message));
 await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'load'});
 await page.locator('body.reference-engine').waitFor();
 await page.evaluate(async()=>{
  const {createProject}=await import('/js/core/project-hub.js');
  createProject('Camera Preview P1','3d');
 });
 await page.locator('#hubClose').click();
 await page.locator('#hubOverlay').waitFor({state:'hidden'});
 await page.getByRole('button',{name:'Sélectionner Main Camera',exact:true}).click();
 await page.waitForFunction(()=>{
  const canvas=document.querySelector('.warlike-camera-frame-preview');
  return canvas&&!canvas.hidden&&canvas.dataset.liveRenderer==='webgl';
 },null,{timeout:30000});
 const sample=await page.evaluate(()=>{
  const c=document.querySelector('.warlike-camera-frame-preview');
  const ctx=c.getContext('2d'),pixels=ctx.getImageData(0,30,c.width,c.height-30).data;
  const tones=new Set();
  for(let i=0;i<pixels.length;i+=4*151){
   tones.add([pixels[i],pixels[i+1],pixels[i+2]].map(x=>Math.round(x/12)).join('-'));
  }
  return {width:c.width,height:c.height,tones:tones.size,live:c.dataset.liveRenderer};
 });
 assert.equal(sample.live,'webgl');
 assert.equal(sample.width,320);
 assert(sample.tones>=2,'Camera preview must contain a rendered scene, not one flat color');
 await page.screenshot({path:path.join(output,'camera-preview-webgl.png')});
 assert.deepEqual(report.errors,[],'No JS errors while rendering Camera Preview');
 report.status='PASS';report.sample=sample;
}finally{
 await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));
 await browser?.close();server.closeAllConnections();
 await new Promise(resolve=>server.close(resolve));
}
