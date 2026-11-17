import test from 'node:test';
import assert from 'node:assert/strict';
import {creaturePreset,decideCreatureAction,creatureAnimationContract,creatureAssetManifest,horrorCreatureProfiles} from '../js/core/horror-creatures.js';
test('four distinct creature archetypes expose isolated presets',()=>{
 const walker=creaturePreset('walker'),brute=creaturePreset('brute'),crawler=creaturePreset('crawler');
 assert.ok(brute.horrorCombat.damage>walker.horrorCombat.damage);
 assert.ok(crawler.horrorAiConfig.chaseSpeed>walker.horrorAiConfig.chaseSpeed);
 crawler.horrorCreature.assets.textureIds.push('a');
 assert.deepEqual(walker.horrorCreature.assets.textureIds,[]);
 assert.ok(horrorCreatureProfiles.stalker);
});
test('creature choice reacts to sight, sound, attack range and memory',()=>{
 const profile={kind:'walker'};
 assert.equal(decideCreatureAction(profile,{visible:true,distance:40},{awareness:1}).intent,'attack');
 assert.equal(decideCreatureAction(profile,{visible:true,distance:140},{awareness:1}).intent,'approach');
 assert.equal(decideCreatureAction(profile,{heard:true,distance:250},{awareness:.2}).intent,'investigate');
 assert.equal(decideCreatureAction(profile,{},{awareness:0}).intent,'patrol');
 assert.equal(decideCreatureAction(profile,{visible:true,distance:1},{dead:true,awareness:1}).state,'dead');
 assert.equal(decideCreatureAction(profile,{visible:true,distance:1},{awareness:1,cooldownRemaining:2}).intent,'approach');
});
test('animation and Library contracts are declarative and do not claim assets exist',()=>{
 assert.ok(creatureAnimationContract('brute').states.includes('Smash'));
 assert.ok(creatureAnimationContract('crawler').states.includes('Pounce'));
 assert.equal(creatureAssetManifest('walker').ready,false);
 assert.equal(creatureAssetManifest('walker').modelR2Key,null);
 assert.throws(()=>creaturePreset('alien'));
});
