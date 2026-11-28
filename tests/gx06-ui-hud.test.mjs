import test from 'node:test';
import assert from 'node:assert/strict';
import {gameUiHealthText} from '../js/core/ui-game-overlay.js';
test('HUD uses native health and bounds',()=>{assert.equal(gameUiHealthText({stats:{health:120,maxHealth:100}}),'100 / 100');assert.equal(gameUiHealthText({}),'');});
