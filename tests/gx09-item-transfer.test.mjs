import test from 'node:test';
import assert from 'node:assert/strict';
import {transferInventoryItem} from '../js/core/quest-inventory.js';
test('transfer respects quantity and capacity',()=>{const a={inventory:{capacity:2,items:[{id:'key',count:2}]}},b={inventory:{capacity:1,items:[{id:'coin',count:1}]}};assert.equal(transferInventoryItem(a,b,'key',1),false);assert.equal(a.inventory.items[0].count,2);b.inventory.items=[];assert.equal(transferInventoryItem(a,b,'key',1),true);assert.equal(a.inventory.items[0].count,1);assert.equal(b.inventory.items[0].count,1);});
