import test from 'node:test';
import assert from 'node:assert/strict';
import {createSquad,appoint,orderFormation,squadStatus,rankReinforcements,canRecoverItem,canOperateVehicle} from '../force-organization.js';
const roster=Array.from({length:12},(_,i)=>({id:'s'+(i+1)}));
test('Alpha 5, Beta 4, Delta 3, no invented soldiers',()=>{
 const s=createSquad('one',roster);assert.deepEqual(Object.values(s.teams).map(t=>t.soldierIds.length),[5,4,3]);assert.equal(new Set(Object.values(s.teams).flatMap(t=>t.soldierIds)).size,12);
});
test('a locked team survives a broad order',()=>{
 const s=createSquad('one',roster);orderFormation(s,{level:'team',team:'Delta',order:{kind:'hold'},lock:true});
 const command=orderFormation(s,{order:{kind:'move'}});assert.equal(command.targetIds.length,9);assert.ok(!command.targetIds.includes('s12'));
});
test('leaders can only be selected from actual team members',()=>{
 const s=createSquad('one',roster);appoint(s,{team:'Beta',soldierId:'s6'});assert.equal(s.teams.Beta.leaderId,'s6');assert.throws(()=>appoint(s,{team:'Beta',soldierId:'s1'}));
});
test('reinforcements prioritize highest percentage loss',()=>{
 const sorted=rankReinforcements([{id:'B',active:7,nominal:12},{id:'A',active:4,nominal:12},{id:'C',active:9,nominal:12}]);assert.deepEqual(sorted.map(x=>x.id),['A','B','C']);
});
test('status preserves squad structure',()=>{
 const s=createSquad('one',roster);const status=squadStatus(s,['s1','s2','s3','s6','s7','s8','s10','s11']);assert.equal(status.missing,4);assert.deepEqual(Object.values(status.teams).map(t=>t.active),[3,3,2]);
});
test('recovery requires safe conditions and authorization for weapon change',()=>{
 const unit={compatibleAmmunition:['556'],ammoNeeded:12,capacityRemaining:5};
 assert.equal(canRecoverItem(unit,{kind:'ammo',caliber:'556',quantity:4},{safe:true}),true);
 assert.equal(canRecoverItem(unit,{kind:'primaryWeapon',quantity:1},{safe:true}),false);
 assert.equal(canRecoverItem(unit,{kind:'primaryWeapon',quantity:1},{safe:true,approved:true}),true);
});
test('vehicle requires a qualified live driver and working engine',()=>{
 assert.equal(canOperateVehicle({functional:{engine:true}},[{alive:true,qualified:true,post:'driver'}]),true);
 assert.equal(canOperateVehicle({functional:{engine:true}},[{alive:false,qualified:true,post:'driver'}]),false);
});
