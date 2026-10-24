import test from 'node:test';
import assert from 'node:assert/strict';
import {newSequence,resetSequences,updateSequences,conditionPass,sequenceRuntime} from '../js/core/logic-sequences.js';

const make=(steps,extra={})=>({id:1,x:0,y:0,w:32,h:32,hp:100,sequence:{...newSequence(),event:'start',instructions:steps,...extra}});
const tick=(entities,player=null)=>updateSequences(.016,{playing:true,entities,player,keys:new Set()});

test('extended conditions evaluate health, distance and tags',()=>{
 resetSequences();
 const entity={id:1,x:0,y:0,w:20,h:20,hp:40,tags:['enemy']};
 const player={x:100,y:0,w:20,h:20};
 assert.equal(conditionPass({type:'healthBelow',value:50},entity,{player}),true);
 assert.equal(conditionPass({type:'healthAbove',value:50},entity,{player}),false);
 assert.equal(conditionPass({type:'distanceGreater',value:60},entity,{player}),true);
 assert.equal(conditionPass({type:'hasTag',value:'enemy'},entity,{player}),true);
});

test('instructions affect targeted entity and clamp health',()=>{
 resetSequences();
 const actor=make([{type:'teleportObject',targetId:2,x:80,y:90},{type:'addHealth',targetId:2,value:-250},{type:'setBehavior',targetId:2,value:'chase'},{type:'setAnimation',targetId:2,value:'run'}]);
 const target={id:2,x:0,y:0,w:20,h:20,hp:70};
 tick([actor,target]);
 assert.deepEqual([target.x,target.y,target.hp,target.behavior,target.animation],[80,90,0,'chase','run']);
});

test('base conditions apply even with branches and prevent execution',()=>{
 resetSequences();
 const actor=make([],{conditions:[{type:'variable',key:'gate',value:1}],branches:[{conditions:[],instructions:[{type:'setVariable',key:'opened',value:1}]}]});
 tick([actor]);
 assert.equal(sequenceRuntime.globals.opened,undefined);
});

test('local variable increment and once semantics',()=>{
 resetSequences();
 const actor=make([{type:'setLocal',key:'count',value:3},{type:'addLocal',key:'count',value:2}],{once:true,event:'interval',interval:.1});
 tick([actor]);for(let i=0;i<30;i++)tick([actor]);
 assert.equal(actor.sequenceLocal?.count,5);
});
