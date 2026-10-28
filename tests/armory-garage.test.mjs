import test from 'node:test';import assert from 'node:assert/strict';
import {catalog,getAsset,svgFor} from '../js/assets/catalog.js';
import {armory,garage,weaponStats,vehicleStats} from '../js/assets/armory-garage.js';
test('48 distinct new weapons and vehicles integrated',()=>{
 assert.equal(armory.length,24);assert.equal(garage.length,24);
 assert.equal(new Set([...armory,...garage].map(r=>r[0])).size,48);
 assert.equal(catalog.filter(a=>!a.spriteUrl).length,295);
 assert.equal(new Set(catalog.map(a=>a.id)).size,catalog.length);
});
test('weapon stats and vehicle performance are exposed by assets',()=>{
 for(const [id] of armory){const a=getAsset(id),w=weaponStats(id);assert.equal(a?.category,'Weapons');assert.ok(w.weaponDamage>0);assert.ok(w.weaponInterval>0);assert.ok(w.weaponRange>0);assert.equal(a.weaponDamage,w.weaponDamage)}
 for(const [id] of garage){const a=getAsset(id),v=vehicleStats(id);assert.equal(a?.category,'Vehicles');assert.ok(v.maxSpeed>0);assert.ok(v.acceleration>0);assert.ok(v.hp>0);assert.equal(a.maxSpeed,v.maxSpeed)}
});
test('all new assets render offline SVG',()=>{
 for(const [id] of [...armory,...garage]){const svg=svgFor(getAsset(id));assert.match(svg,/<svg /);assert.match(svg,/<title>/);assert.match(svg,/<\/svg>$/)}
});
