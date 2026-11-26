import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const moduleSource=await readFile(new URL('../js/core/sprite-animation-2d.js',import.meta.url));
const server=createServer((req,res)=>{if(req.url==='/sprite.js'){res.setHeader('Content-Type','text/javascript');res.end(moduleSource);}else{res.setHeader('Content-Type','text/html');res.end('<canvas width="16" height="16"></canvas>');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{browser=await chromium.launch({headless:true});const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port);
 const result=await page.evaluate(async()=>{const {drawSpriteSheet2d}=await import('/sprite.js');const sheet=document.createElement('canvas');sheet.width=48;sheet.height=16;const sc=sheet.getContext('2d');['#ff0000','#00ff00','#0000ff'].forEach((color,i)=>{sc.fillStyle=color;sc.fillRect(i*16,0,16,16);});const image=new Image();image.src=sheet.toDataURL();await image.decode();const ctx=document.querySelector('canvas').getContext('2d');const entity={x:0,y:0,w:16,h:16,spriteAnimation2d:{enabled:true,frames:3,fps:4,loop:true,editorFrame:2,grid:{columns:3,rows:1,sequence:[0,1,2],durations:[1,2,1]}}};return [[0,false],[0,true],[.5,true],[.75,true]].map(([time,playing])=>{if(!drawSpriteSheet2d(ctx,image,entity,time,playing))throw Error('Draw failed');return Array.from(ctx.getImageData(8,8,1,1).data);});});
 assert.deepEqual(result,[[0,0,255,255],[255,0,0,255],[0,255,0,255],[0,0,255,255]]);
 console.log('SpriteFrames Canvas2D browser acceptance passed');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
