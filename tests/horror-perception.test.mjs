import test from 'node:test';
import assert from 'node:assert/strict';
import {horror,resetHorror,updateHorrorPerception,triggerHorrorJumpscare} from '../js/core/horror-survival.js';
test('enemy detects running player and records last-known position',()=>{
 resetHorror();horror.enabled=true;
 const player={x:0,y:0,w:30,h:30},enemy={x:120,y:0,behavior:'patrol'};
 for(let i=0;i<15;i++)updateHorrorPerception(.1,player,[player,enemy],new Set(['shift']));
 assert.equal(enemy.horrorAI.state,'chase');assert.deepEqual(enemy.horrorAI.lastKnown,{x:0,y:0});
});
test('crouching reduces noise and distant enemy awareness',()=>{
 resetHorror();horror.enabled=true;
 const player={x:0,y:0},enemy={x:190,y:0,behavior:'guard'};
 updateHorrorPerception(.1,player,[player,enemy],new Set(['control']));
 assert.equal(horror.noise,.08);assert.equal(enemy.horrorAI.awareness,0);
});
test('jumpscare stores bounded alerts',()=>{
 resetHorror();for(let i=0;i<8;i++)triggerHorrorJumpscare('Sound');
 assert.equal(horror.alerts.length,5);assert.ok(horror.jumpscare>0);
});
