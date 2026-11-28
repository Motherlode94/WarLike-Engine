import test from 'node:test';
import assert from 'node:assert/strict';
import {inputActionPressed,inputActionState,resolveInputKeys} from '../js/core/input-actions.js';
test('custom actions and edges share serialized input bindings',()=>{
 const owner={inputActions:{forward:'i',replaceDefaults:true,customActions:{flashlight:'f,gamepad0:button2'}}};
 assert.equal(inputActionPressed(owner,'forward',['i']),true);
 assert.equal(inputActionPressed(owner,'forward',['w']),false);
 assert.equal(resolveInputKeys(owner,['i']).has('w'),true);
 assert.deepEqual(inputActionState(owner,'flashlight',['f'],[]),{held:true,pressed:true,released:false});
 assert.deepEqual(inputActionState(owner,'flashlight',[],['f']),{held:false,pressed:false,released:true});
 assert.equal(inputActionPressed(owner,'flashlight',['gamepad0:button2']),true);
 assert.equal(inputActionPressed(owner,'unknown',['f']),false);
 assert.equal(inputActionPressed({inputActions:{enabled:false}},'forward',['w']),false);
});
