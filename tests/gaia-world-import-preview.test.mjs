import test from 'node:test';import assert from 'node:assert/strict';
import {inspectGaiaWorld,readGaiaWorldFile,MAX_GAIA_FILE_BYTES} from '../js/core/gaia-world-import-preview.js';
const tile=(x=0)=>({tileX:x,tileZ:0,collision:{schema:'warlike.terrain.heightfield.v1',resolution:3,size:4,height:2,offsetX:x*4,offsetZ:0,heights:Array(9).fill(.5)}});
const world={schema:'warlike.gaia.world.v1',tiles:[tile(0),tile(1)]};
test('Gaia preview shows tile counts, world bounds and sizes without modifying input',()=>{
 const before=JSON.stringify(world),info=inspectGaiaWorld(world);
 assert.equal(info.count,2);assert.equal(info.sampleCount,18);
 assert.equal(info.overallMinMeters,1);assert.equal(info.overallMaxMeters,1);
 assert.equal(info.tiles[0].resolution,3);assert.equal(info.tiles[1].worldX,4);
 assert.equal(JSON.stringify(world),before);
});
test('Gaia import preview rejects corrupt or unsupported data before mutation',()=>{
 assert.throws(()=>inspectGaiaWorld({schema:'wrong',tiles:[]}),/Gaia invalide/);
 assert.throws(()=>inspectGaiaWorld({schema:world.schema,tiles:[{...tile(0),collision:null}]}),/Tuile Gaia invalide/);
});
test('Gaia file validation rejects oversize, malformed and non-JSON files',async()=>{
 await assert.rejects(()=>readGaiaWorldFile({name:'world.json',size:MAX_GAIA_FILE_BYTES+1,text:async()=>JSON.stringify(world)}),/24 Mo/);
 await assert.rejects(()=>readGaiaWorldFile({name:'world.txt',type:'text/plain',size:1,text:async()=>''}),/JSON attendu/);
 await assert.rejects(()=>readGaiaWorldFile({name:'world.json',size:3,text:async()=>'{?'}),/illisible/);
 const accepted=await readGaiaWorldFile({name:'world.json',size:200,type:'application/json',text:async()=>JSON.stringify(world)});
 assert.equal(accepted.preview.count,2);
});
