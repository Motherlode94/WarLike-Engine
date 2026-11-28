import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultStats,healPlayer} from '../js/core/gameplay-components.js';
test('healing caps health and does not revive',()=>{const p={stats:{...defaultStats(),health:80}};assert.equal(healPlayer(p,50),true);assert.equal(p.stats.health,100);assert.equal(healPlayer(p,1),false);p.stats.health=0;assert.equal(healPlayer(p,20),false);});
