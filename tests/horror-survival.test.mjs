import test from 'node:test';
import assert from 'node:assert/strict';
import {horror,resetHorror,updateHorror} from '../js/core/horror-survival.js';
test('survival horror is opt-in and flashlight drains battery',()=>{
 resetHorror();const p={x:0,y:0,w:20,h:20};updateHorror(.1,p,[p],new Set());assert.equal(horror.battery,100);
 horror.enabled=true;updateHorror(.1,p,[p],new Set());assert.ok(horror.battery<100);
});
test('flashlight toggles with key edge, and recharges when off',()=>{
 resetHorror();horror.enabled=true;const p={x:0,y:0};updateHorror(.016,p,[p],new Set(['l']));assert.equal(horror.flashlight,false);
 const start=horror.battery;updateHorror(.1,p,[p],new Set(['l']));assert.equal(horror.flashlight,false);assert.ok(horror.battery>=start);
 updateHorror(.016,p,[p],new Set());updateHorror(.016,p,[p],new Set(['l']));assert.equal(horror.flashlight,true);
});
test('nearby chasing enemy increases fear but values remain bounded',()=>{
 resetHorror();horror.enabled=true;horror.flashlight=false;const p={x:0,y:0,w:20,h:20};
 for(let i=0;i<2000;i++)updateHorror(.1,p,[p,{x:1,y:1,w:20,h:20,behavior:'chase'}],new Set());
 assert.ok(horror.fear>0&&horror.fear<=100);
 assert.ok(horror.battery>=0&&horror.battery<=100);
});
