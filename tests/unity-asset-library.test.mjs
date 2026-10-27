import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {indexKenneyManifest,categoryForKenney,kenneyCatalogUrl} from '../js/assets/kenney-unity-library.js';
import {geometryToObj} from '../js/assets/unity-obj-export.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Unity asset catalog indexes real manifest files and rejects fabricated paths',()=>{
 const manifest={packs:[
  {id:'car-kit',url:'https://kenney.nl/assets/car-kit',models:[{name:'Race car',file:'packs/car-kit/race-car.glb',size:100}]},
  {id:'blaster-kit',url:'https://kenney.nl/assets/blaster-kit',models:[{name:'Blaster',file:'packs/blaster-kit/blaster.glb',size:300}]},
  {id:'castle-kit',models:[{name:'Castle',file:'packs/castle-kit/castle.glb',size:240}]},
  {id:'nature-kit',models:[{name:'Oak',file:'packs/nature-kit/oak.glb',size:250}]},
  {id:'prototype-kit',models:[{name:'Bad',file:'../../malware.glb',size:100},{name:'Missing file',file:'packs/prototype-kit/false.glb',size:0}]}
 ]};
 const result=indexKenneyManifest(manifest);
 assert.equal(result.length,4);
 assert.ok(result.some(x=>x.category==='Vehicles'));
 assert.ok(result.some(x=>x.category==='Weapons'));
 assert.ok(result.some(x=>x.category==='Buildings'));
 assert.ok(result.some(x=>x.category==='Nature'));
 assert.ok(result.every(x=>x.license.includes('CC0')&&x.url.endsWith('.glb')));
 assert.match(kenneyCatalogUrl,/raw\.githubusercontent\.com/);
 assert.equal(categoryForKenney('mini-characters','Knight'),'Characters');
});
test('Unity native OBJ export retains triangle positions, normals and face indices',()=>{
 const vertices=new Float32Array([
   0,0,0,0,0,1, 1,0,0,0,0,1, 0,1,0,0,0,1,
   0,0,1,0,0,1, 1,0,1,0,0,1, 0,1,1,0,0,1
 ]);
 const obj=geometryToObj({parts:[{vertices}]},{name:'Race Vehicle'});
 assert.match(obj,/o Race_Vehicle/);
 assert.equal(obj.match(/^v /gm).length,6);
 assert.equal(obj.match(/^vn /gm).length,6);
 assert.match(obj,/f 1\/\/1 2\/\/2 3\/\/3/);
 assert.match(obj,/f 4\/\/4 5\/\/5 6\/\/6/);
 assert.throws(()=>geometryToObj({parts:[{vertices:[0,1]}]}),/Triangles GLB/);
});
test('Unity-compatible shelf, on-demand model registration and OBJ export exist',()=>{
 const src=read('js/ui/workspace.js');
 assert.match(src,/loadKenneyUnityAssets\(\{limit:500\}\)/);
 assert.match(src,/exportModelForUnity\(asset\.id\)/);
 assert.match(src,/kenneyButton\.click\(\)/);
 assert.match(src,/unity-asset-library/);
});
