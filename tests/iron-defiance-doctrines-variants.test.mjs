import test from 'node:test';
import assert from 'node:assert/strict';
import {IRON_DOCTRINES,factionTacticalConfig} from '../js/core/iron-defiance-doctrines.js';
import {INFECTION_VARIANTS,infectedVariantPreset} from '../js/core/horror-infection-variants.js';
test('seven factions have independent game doctrines',()=>{
 const names=Object.keys(IRON_DOCTRINES);assert.deepEqual(names,['rdc','china','russia','usa','france','ukraine','japan']);
 assert.equal(new Set(names.map(id=>IRON_DOCTRINES[id].signature)).size,7);
 assert.equal(new Set(names.map(id=>IRON_DOCTRINES[id].flag)).size,7);
 for(const id of names){const stats=factionTacticalConfig(id,'assault',{speed:95,damage:9,attackRange:190,attackInterval:.8});assert.ok(stats.speed>0&&stats.damage>0);assert.equal(stats.ironDoctrine.faction,id);}
 assert.notDeepEqual(factionTacticalConfig('rdc','recon'),factionTacticalConfig('russia','recon'));
 assert.throws(()=>factionTacticalConfig('unknown'));
});
test('seven infected variants have independent non-national habitat identities',()=>{
 assert.equal(Object.keys(INFECTION_VARIANTS).length,7);
 const walker=infectedVariantPreset('ordinary'),crawler=infectedVariantPreset('burrower');
 assert.equal(walker.horrorCreature.kind,'walker');
 assert.equal(crawler.horrorCreature.kind,'crawler');
 crawler.horrorCreature.assets.textureIds.push('mud');
 assert.deepEqual(walker.horrorCreature.assets.textureIds,[]);
 assert.throws(()=>infectedVariantPreset('missing'));
});
