import test from 'node:test';
import assert from 'node:assert/strict';
import {horror,resetHorror,updateHorrorPerception,updateHorror} from '../js/core/horror-survival.js';
test('Game Creator enemy component detects without legacy behavior',()=>{
 resetHorror();horror.enabled=true;
 const p={x:0,y:0},enemy={x:100,y:0,horrorAiConfig:{enabled:true,visionRange:200,hearingRange:120,chaseSpeed:40,searchSpeed:20,memorySeconds:4}};
 for(let i=0;i<12;i++)updateHorrorPerception(.1,p,[p,enemy],new Set());
 assert.equal(enemy.horrorAI.state,'chase');
});
test('Game Creator hiding component masks crouched player detection',()=>{
 resetHorror();horror.enabled=true;
 const p={x:0,y:0},enemy={x:50,y:0,horrorAiConfig:{enabled:true}},hiding={x:0,y:0,horrorHideConfig:{enabled:true,radius:80}};
 updateHorrorPerception(.1,p,[p,enemy,hiding],new Set(['control']));
 assert.equal(enemy.horrorAI.awareness,0);
});
test('Game Creator fear zone increases threat',()=>{
 resetHorror();horror.enabled=true;
 const p={x:0,y:0},zone={x:0,y:0,horrorFearConfig:{enabled:true,radius:140,strength:25}};
 updateHorror(.1,p,[p,zone],new Set());
 assert.ok(horror.threat>.7);
});
