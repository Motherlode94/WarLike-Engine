import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {packPortableHdri,unpackPortableHdri,validHdriBytes,storeProjectHdri} from '../js/core/project-hdri-assets.js';

test('portable HDRI binary survives base64 JSON roundtrip without a single byte changed',()=>{
 const original=Uint8Array.from({length:8192},(_,i)=>(i*37+13)&255);
 const packed=packPortableHdri('interior-studio.hdr',original);
 assert.equal(packed.encoding,'base64');
 const parsed=JSON.parse(JSON.stringify(packed));
 const restored=unpackPortableHdri(parsed);
 assert.equal(restored.name,'interior-studio.hdr');
 assert.deepEqual(restored.bytes,original);
});
test('project HDRI rejects invalid files, malformed base64 payloads and oversize claims',()=>{
 assert.equal(validHdriBytes(new Uint8Array(31)),false);
 assert.equal(validHdriBytes(new Uint8Array(32)),true);
 assert.throws(()=>packPortableHdri('empty',new Uint8Array(2)),/non valide/);
 assert.throws(()=>unpackPortableHdri({encoding:'json',data:'AAAA'}),/invalide/);
 assert.throws(()=>unpackPortableHdri({encoding:'base64',data:'@@@@'}));
});
test('portable scene exporter and Web game exporter both embed project HDRI',()=>{
 const scene=readFileSync(new URL('../js/core/scene.js',import.meta.url),'utf8');
 const build=readFileSync(new URL('../js/core/game-build.js',import.meta.url),'utf8');
 const renderer=readFileSync(new URL('../js/core/viewport-3d.js',import.meta.url),'utf8');
 assert.match(scene,/payload\.environmentHdri=await encodeProjectHdri\(gameProject\.id\)/);
 assert.match(scene,/restoreProjectHdri\(gameProject\.id,data\.environmentHdri\)/);
 assert.match(build,/name:'assets\/environment\.hdr'/);
 assert.match(renderer,/fetch\('\.\/assets\/environment\.hdr'\)/);
 assert.match(renderer,/__WARLIKE_HDRI_INCLUDED__/);
 assert.match(build,/data\.hasEnvironmentHdri=!!hdri/);
 assert.match(build,/data\.hasEnvironmentHdri\?'globalThis\.__WARLIKE_HDRI_INCLUDED__=true;'/);
});

test('invalid Radiance bytes are rejected before IndexedDB write',async()=>{
 const malformed=new Uint8Array(64);
 await assert.rejects(storeProjectHdri('project-invalid-hdr','broken.hdr',malformed),/Not Radiance HDR/);
});
test('HDRI renderer guards against applying another project environment',()=>{
 const renderer=readFileSync(new URL('../js/core/viewport-3d.js',import.meta.url),'utf8');
 assert.match(renderer,/if\(!globalThis\.__WARLIKE_BUILD__&&projectId!==gameProject\.id\)return null/);
 assert.match(renderer,/if\(operation!==hdrOperation\|\|projectId!==gameProject\.id\)return/);
});
