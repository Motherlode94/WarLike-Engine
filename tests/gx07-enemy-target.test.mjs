import test from 'node:test';
import assert from 'node:assert/strict';
import {selectHostileTarget} from '../js/core/ai-perception.js';
test('dead actors cannot acquire targets',()=>{assert.equal(selectHostileTarget({stats:{health:0}},[],null),null);});
test('selects nearest detected hostile',()=>{const actor={x:0,y:0,team:'red',ai:{detection:100}},near={x:10,y:0,team:'blue'},far={x:50,y:0,team:'blue'};assert.equal(selectHostileTarget(actor,[actor,far,near],near),near);});
