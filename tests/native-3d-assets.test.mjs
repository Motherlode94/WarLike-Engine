import test from 'node:test';
import assert from 'node:assert/strict';
import {assets3d,categories3d,get3dAsset,prefab3d,thumbnail3d} from '../js/assets/catalog-3d.js';

test('3D catalog retains starter assets and unique IDs as the library grows',()=>{
 assert.ok(assets3d.length>=43);
 assert.equal(new Set(assets3d.map(a=>a.id)).size,assets3d.length);
 for(const asset of assets3d){
  assert.equal(get3dAsset(asset.id),asset);
  assert.ok(categories3d.includes(asset.category));
  const svg=thumbnail3d(asset);
  assert.ok(svg.startsWith('<svg '),asset.id);
  assert.ok(svg.endsWith('</svg>'),asset.id);
 }
});
test('3D prefab has independent mesh geometry and collider attributes',()=>{
 const actor=prefab3d('character-hero',4,140,180);
 assert.equal(actor.type,'mesh3d');
 assert.equal(actor.id,4);
 assert.equal(actor.assetId,'character-hero');
 assert.ok(actor.depth3d>0);
 assert.ok(actor.h>0);
 assert.ok(actor.w>0);
 assert.equal(prefab3d('unknown-3d-id'),null);
});
test('terrain assets default to non-blocking collisions',()=>{
 assert.equal(prefab3d('environment-water',1).collision3d,false);
 assert.equal(prefab3d('environment-road',1).collision3d,false);
 assert.equal(prefab3d('building-house',1).collision3d,true);
});
