import test from 'node:test';
import assert from 'node:assert/strict';
import {toStoreAsset,categoryFor} from '../asset-store/catalog-bundled.js';
const original={id:'kenney-test-tree',name:'Tree',pack:'nature-kit',packName:'Nature Kit',category:'Nature',url:'./assets/free/kenney/nature-kit/tree.glb',thumbnailUrl:'./assets/free/kenney/nature-kit/previews/kenney-test-tree.png',sourceUrl:'https://kenney.nl/assets/nature-kit',license:'CC0-1.0',triangles:150,animationClips:[]};
test('bundled asset maps to real same-origin model, preview, provenance and metadata',()=>{
 const a=toStoreAsset(original,'Kenney');
 assert.ok(a);assert.equal(a.id,original.id);assert.equal(a.category,'Nature');
 assert.match(a.url,/\/assets\/free\/kenney\/nature-kit\/tree\.glb$/);
 assert.match(a.thumb,/previews\/kenney-test-tree\.png$/);
 assert.equal(a.license,'CC0-1.0');assert.equal(a.triangles,150);assert.equal(a.source,original.sourceUrl);
});
test('reject external and traversal GLB paths',()=>{
 assert.equal(toStoreAsset({...original,url:'https://example.com/model.glb'},'Kenney'),null);
 assert.equal(toStoreAsset({...original,url:'./assets/free/kenney/../outside.glb'},'Kenney'),null);
 assert.equal(toStoreAsset({...original,url:'./assets/free/kenney/fake.obj'},'Kenney'),null);
});
test('category mapping does not make ungrounded claims about asset geometry',()=>{
 assert.equal(categoryFor({pack:'ultimateanimatedcharacter',name:'Knight',category:'Characters'}),'Personnages');
 assert.equal(categoryFor({pack:'cars',name:'Car',category:'Vehicles'}),'Véhicules');
});
