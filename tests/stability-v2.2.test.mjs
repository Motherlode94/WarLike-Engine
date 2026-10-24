import test from 'node:test';
import assert from 'node:assert/strict';
import {state} from '../js/core/state.js';
import {housing,resetHousing,updateHousing} from '../js/core/housing.js';
import {resetDriving,driving,updateVehicles} from '../js/core/vehicle.js';
import {resetElements,updateElements} from '../js/core/game-elements.js';
import {resetRpg,hasItem} from '../js/core/rpg-systems.js';

globalThis.document ??={getElementById:()=>null};
const actor=(x=100,y=100)=>({id:1,type:'character',name:'Tester',x,y,w:38,h:65,color:'#54bea8'});
const object=(id,assetId,x,y)=>({id,type:'prefab',assetId,name:assetId,x,y,w:48,h:48,color:'#6789ab',elementEnabled:true,elementValue:1,elementRadius:75});
const boot=(entities)=>{state.playing=true;state.entities=entities;state.keys=new Set();resetHousing();resetDriving();resetElements();resetRpg()};
const shutdown=()=>{state.playing=false;state.keys.clear();resetHousing();resetDriving();resetElements();resetRpg()};

test('house can be entered and exited without trapping the player',()=>{
 const p=actor(240,224),home=object(2,'city-house',200,100);home.w=128;home.h=112;boot([p,home]);
 state.keys.add('e');updateHousing(.016,p);
 assert.equal(housing.inside,home.id);assert.equal(p._hiddenInHouse,true);
 state.keys.delete('e');updateHousing(1,p);
 state.keys.add('e');updateHousing(.016,p);
 assert.equal(housing.inside,null);assert.equal(p._hiddenInHouse,false);assert.equal(p.animation,'exit_house');
 shutdown();
});

test('keycard belongs to inventory and unlocks gates',()=>{
 const p=actor(100,100),card=object(2,'keycard',100,100),gate=object(3,'locked-gate',470,100);boot([p,card,gate]);
 updateElements(.016,p,{life:100});
 assert.equal(hasItem('keycard'),true);
 p.x=470;state.keys.add('e');updateElements(.016,p,{life:100});
 assert.equal(gate._gateOpen,true);
 shutdown();
});

test('a lever can be activated repeatedly without being consumed',()=>{
 const p=actor(),lever=object(2,'lever',110,100),gate=object(3,'locked-gate',430,100);boot([p,lever,gate]);
 state.keys.add('e');updateElements(.016,p,{life:100});
 assert.equal(gate._gateOpen,true);assert.notEqual(lever.elementUsed,true);
 state.keys.delete('e');updateElements(.016,p,{life:100});
 state.keys.add('e');updateElements(.016,p,{life:100});
 assert.equal(gate._gateOpen,false);
 shutdown();
});

test('vehicle entry is blocked during house transition',()=>{
 const p=actor(100,100),jeep=object(2,'jeep',110,100);jeep.w=110;jeep.h=66;boot([p,jeep]);
 housing.transition=.4;state.keys.add('e');updateVehicles(.016,p);
 assert.equal(driving.transition,null);
 housing.transition=0;state.keys.delete('e');updateVehicles(.016,p);
 state.keys.add('e');updateVehicles(.016,p);
 assert.equal(driving.transition?.type,'enter');
 shutdown();
});
