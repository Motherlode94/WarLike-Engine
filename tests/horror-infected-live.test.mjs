import test from 'node:test';
import assert from 'node:assert/strict';
import {horror,resetHorror,updateHorrorPerception} from '../js/core/horror-survival.js';
import {infectedVariantPreset} from '../js/core/horror-infection-variants.js';
import {defaultStats} from '../js/core/gameplay-components.js';
const setup=(variant,x=35)=>{
 resetHorror();horror.enabled=true;
 const player={id:1,x:0,y:0,w:30,h:30,stats:defaultStats()};
 const enemy={id:2,x,y:0,w:30,h:30,behavior:'none',stats:defaultStats(),...infectedVariantPreset(variant)};
 return {player,enemy};
};
test('infected finishes attack windup before damage and obeys cooldown',()=>{
 const {player,enemy}=setup('ordinary');
 let began=false,atStart=player.stats.health;
 for(let i=0;i<30;i++){
  updateHorrorPerception(.1,player,[player,enemy],new Set(['shift']));
  if(enemy.horrorAI.pendingAttack){began=true;break}
 }
 assert.equal(began,true,'creature should reach attack windup');
 assert.equal(player.stats.health,atStart,'no hit before windup');
 for(let i=0;i<10;i++)updateHorrorPerception(.1,player,[player,enemy],new Set(['shift']));
 assert.equal(player.stats.health,atStart-enemy.horrorCombat.damage,'one hit after windup');
});
test('walkable solid floor does not block detection or movement',()=>{
 const {player,enemy}=setup('burrower',170);
 const floor={id:3,type:'mesh3d',x:-300,y:-300,w:900,h:16,depth3d:900,collision3d:true,solid3d:true,tags:['ai-walkable']};
 const startX=enemy.x;
 for(let i=0;i<15;i++)updateHorrorPerception(.1,player,[player,enemy,floor],new Set(['shift']));
 assert.ok(enemy.x<startX,'crawler moves toward player despite walkable floor');
 assert.ok(enemy.horrorAI.awareness>0);
});
test('no damage through occluding wall',()=>{
 const {player,enemy}=setup('ordinary');
 const wall={id:3,type:'mesh3d',x:15,y:-40,w:9,h:90,collision3d:true,solid3d:true};
 for(let i=0;i<30;i++)updateHorrorPerception(.1,player,[player,enemy,wall],new Set(['control']));
 assert.equal(player.stats.health,player.stats.maxHealth);
});
