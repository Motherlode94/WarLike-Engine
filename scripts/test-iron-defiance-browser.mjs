// Headless acceptance: actual 3D WebGL rendering, group selection, orders and save/reload.
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,join,relative} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve('examples/iron-defiance/dist'),mime={'.html':'text/html','.js':'application/javascript','.glb':'model/gltf-binary'};
const server=createServer(async(req,res)=>{
 try{const name=req.url==='/'?'/index.html':new URL(req.url,'http://localhost').pathname;const file=resolve(root,'.'+name);
 if(relative(root,file).startsWith('..')){res.writeHead(403).end();return}
 const bytes=await readFile(file);res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(bytes);
 }catch{res.writeHead(404).end()}
});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const port=server.address().port,url='http://127.0.0.1:'+port;let browser;
try{
 browser=await chromium.launch({headless:true,args:['--enable-webgl','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:1280,height:850}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.getByText('MISSION ACTIVE').waitFor({timeout:15000});
 await page.waitForFunction(()=>document.querySelector('#allies')?.textContent==='8',{timeout:15000});
 await page.keyboard.press('g');
 await page.waitForFunction(()=>Number(document.getElementById('selectionCount').textContent)>=6,{timeout:12000});
 const selected=Number(await page.locator('#selectionCount').textContent());assert.ok(selected>=6);
 await page.locator('#battlefield').click({button:'right',position:{x:680,y:550}});
 await page.getByRole('button',{name:'Sauvegarder'}).click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('warlike.iron-defiance.cendre01.v1')));
 assert.ok(saved.orders>=6,'Group move order not recorded');
 assert.equal(saved.units.length,14);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Reprendre'}).click();
 await page.getByText('Mission reprise.').waitFor({timeout:10000});
 assert.equal(errors.length,0,'Browser exceptions: '+errors.join('; '));
 await mkdir('outputs/iron-defiance',{recursive:true});
 await page.screenshot({path:'outputs/iron-defiance/cendre01.png',fullPage:true});
 console.log('PASS: WebGL mission loaded, '+selected+' units selected, order persisted, reload successful');
}finally{await browser?.close();await new Promise(r=>server.close(r))}
