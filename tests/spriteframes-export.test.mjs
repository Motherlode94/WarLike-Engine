import test from 'node:test';import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {exportGamePackage} from '../js/core/game-build.js';
import {freshGameProject} from '../js/core/game-project.js';
import {drawSpriteSheet2d} from '../js/core/sprite-animation-2d.js';
test('standalone ZIP retains named sprite clips and weighted frame data',async()=>{
 const animation={enabled:true,frames:3,fps:4,loop:true,activeClip:'Idle',grid:{columns:3,rows:1,sequence:[0,1,2],durations:[1,2,1]},clips:[{name:'Idle',frames:3,fps:4,loop:true,grid:{columns:3,rows:1,sequence:[0,1,2],durations:[1,2,1]}}]};
 const entity={id:1,name:'Sprite',type:'player',x:0,y:0,w:16,h:16,spriteAnimation2d:animation};
 const input={mode:'2d',entities:[entity],project:freshGameProject()},before=JSON.stringify(input);
 const result=await exportGamePackage(input,{fetcher:async url=>url.pathname.endsWith('runtime-files.json')?Response.json({files:['index.html','js/core/sprite-animation-2d.js']}):new Response(await readFile(url))});
 const bytes=new Uint8Array(await result.blob.arrayBuffer()),view=new DataView(bytes.buffer),decoder=new TextDecoder(),files=new Map();let offset=0;
 while(offset+30<=bytes.length&&view.getUint32(offset,true)===0x04034b50){const size=view.getUint32(offset+18,true),len=view.getUint16(offset+26,true),extra=view.getUint16(offset+28,true),start=offset+30+len+extra;files.set(decoder.decode(bytes.subarray(offset+30,offset+30+len)),decoder.decode(bytes.subarray(start,start+size)));offset=start+size;}
 const html=files.get('index.html'),data=JSON.parse(html.match(/id="warlikeGameData">([^]*?)<\/script>/)[1]),restored=data.project.scenes.find(s=>s.id===data.project.activeSceneId).entities[0];
 assert.deepEqual(restored.spriteAnimation2d,animation);assert.equal(JSON.stringify(input),before);assert.ok(files.get('js/core/sprite-animation-2d.js'));
 const calls=[],ctx={drawImage(...a){calls.push(a)}},image={complete:true,naturalWidth:48,naturalHeight:16};assert.equal(drawSpriteSheet2d(ctx,image,restored,.5,true),true);assert.equal(calls[0][1],16);
});
