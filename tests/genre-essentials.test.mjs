import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,categories,getAsset,svgFor} from '../js/assets/catalog.js';
import {genrePack,genreAssets,genreKeywords} from '../js/assets/genre-essentials.js';

test('genre pack adds exactly 72 unique assets across six existing categories',()=>{
 assert.equal(genreAssets.length,72);
 assert.equal(new Set(genreAssets.map(a=>a.id)).size,72);
 assert.deepEqual(Object.keys(genrePack).sort(),['Characters','Monsters','Props','VFX','Vehicles','Weapons'].sort());
 for(const a of genreAssets){
  assert.ok(categories.includes(a.category));
  assert.equal(getAsset(a.id)?.category,a.category);
  assert.equal(getAsset(a.id)?.name,a.name);
 }
});
test('catalogue keeps all 247 prefabs without duplicate IDs',()=>{
 assert.equal(catalog.length,247);
 assert.equal(new Set(catalog.map(a=>a.id)).size,catalog.length);
});
test('each new genre sprite renders a standalone offline SVG preview',()=>{
 for(const a of genreAssets){
  const svg=svgFor(getAsset(a.id));
  assert.ok(svg.startsWith('<svg '),a.id);
  assert.match(svg,/<title>/);
  assert.match(svg,/<\/svg>$/);
  assert.ok(!svg.includes('http://')||svg.includes('http://www.w3.org/2000/svg'));
 }
});
test('search can associate recognizable genres with the pack',()=>{
 assert.match(genreKeywords('footballer'),/sport/);
 assert.match(genreKeywords('harvester'),/rts/);
 assert.match(genreKeywords('sports-car'),/city|racing/);
});
