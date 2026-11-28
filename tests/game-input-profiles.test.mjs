import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameInputProfile,inspectInputActions,resolveInputKeys} from '../js/core/input-actions.js';
test('valid independent game profiles project AZERTY and QWERTY to native controls',()=>{for(const game of ['slime','racing','horror']){const az=createGameInputProfile(game,'azerty'),qw=createGameInputProfile(game,'qwerty');assert.deepEqual(inspectInputActions(az),[]);assert.deepEqual(inspectInputActions(qw),[]);const context=game==='racing'?'vehicle':'player';assert.ok(resolveInputKeys({inputActions:az},new Set(['z','q']),{context}).has('w'));assert.ok(resolveInputKeys({inputActions:qw},new Set(['w','a']),{context}).has('a'));assert.ok(!resolveInputKeys({inputActions:az},new Set(['w']),{context}).has('w'));}});
