import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultStats,defaultInventory,inventoryAdd,inventoryRemove,equipItem,damage,updateAi,updateController3d,updateStats} from '../js/core/gameplay-components.js';

test('inventory enforces slots, counts and equipment ownership',()=>{
 const o={inventory:{...defaultInventory(),capacity:1}};
 assert.equal(inventoryAdd(o,'sword',2),true);
 assert.equal(inventoryAdd(o,'shield'),false);
 assert.equal(equipItem(o,'sword','weapon'),true);
 assert.equal(equipItem(o,'shield','armor'),false);
 assert.equal(inventoryRemove(o,'sword',1),true);
 assert.equal(o.inventory.items[0].count,1);
 assert.equal(inventoryRemove(o,'sword',2),false);
});
test('stats and damage clamp to zero and regenerate stamina',()=>{
 const o={stats:{...defaultStats(),stamina:20}};
 assert.equal(damage(o,500),0);
 updateStats([o],1);
 assert.equal(o.stats.stamina,34);
});
test('AI follows player and changes to attack within range',()=>{
 const player={id:1,x:200,y:0,w:20,h:20,stats:defaultStats()};
 const enemy={id:2,x:0,y:0,w:20,h:20,ai:{enabled:true,detection:400,attackRange:40,speed:100,attackDamage:10,attackCooldown:.4}};
 updateAi([player,enemy],player,.1);
 assert.equal(enemy.ai.state,'chase');
 assert.ok(enemy.x>0);
 enemy.x=190;
 updateAi([player,enemy],player,.5);
 assert.equal(enemy.ai.state,'attack');
 assert.equal(player.stats.health,90);
});
test('3D controller applies movement and jump',()=>{
 const actor={id:1,x:0,y:0,w:20,h:20,stats:defaultStats()};
 updateController3d(actor,new Set(['w',' ','shift']),.016,0,[actor]);
 assert.ok(actor.y<0); // WarLike 3D forward faces negative ground Z at yaw 0
 assert.ok(actor.elevation3d>0);
 assert.ok(actor.stats.stamina<100);
});
