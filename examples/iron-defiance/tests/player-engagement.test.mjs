import test from 'node:test';
import assert from 'node:assert/strict';
import {createMission,tick,applyDamage,giveOrder} from '../game-rules.js';
function nearby(){
 const m=createMission(),ally=m.units.find(u=>u.id==='alpha1'),enemy=m.units.find(u=>u.id==='bot1');
 ally.x=-2;ally.z=-2;enemy.x=-2;enemy.z=2;
 // Remove other enemies and other allies from this isolated combat scenario.
 m.units=m.units.filter(u=>u.id==='alpha1'||u.id==='bot1'||u.id==='convoy');
 return {m,ally,enemy};
}
test('ally does not fire on sight without player authorization',()=>{
 const {m,ally}=nearby();tick(m,.05);assert.equal(ally.ammo,28);
});
test('explicit attack order authorizes fire',()=>{
 const {m,ally,enemy}=nearby();giveOrder(m,[ally.id],{x:enemy.x,z:enemy.z},{attack:enemy.id});tick(m,.05);assert.equal(ally.ammo,27);
});
test('direct attack authorizes temporary retaliation',()=>{
 const {m,ally,enemy}=nearby();applyDamage(m,ally,3,enemy);tick(m,.05);
 assert.equal(ally.ammo,27);assert.equal(ally.retaliateAgainst,enemy.id);
});
