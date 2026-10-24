import test from 'node:test';
import assert from 'node:assert/strict';
import {findPath} from '../js/core/pathfinding.js';
import {updateAi,defaultStats,defaultAi} from '../js/core/gameplay-components.js';

test('A* finds detour around obstacle',()=>{
 const route=findPath({x:20,y:20},{x:260,y:20},[{x:90,y:-30,w:70,h:120}],{cellSize:32,padding:5});
 assert.ok(route.length>0);
 assert.ok(route.some(p=>p.y>90||p.y< -30));
});
test('A* returns empty path when goal sealed by walls',()=>{
 const walls=[{x:128,y:96,w:32,h:96},{x:192,y:96,w:32,h:96},{x:128,y:96,w:96,h:32},{x:128,y:160,w:96,h:32}];
 const route=findPath({x:0,y:0},{x:160,y:128},walls,{cellSize:32,padding:0,maxNodes:600});
 assert.equal(route.length,0);
});
test('AI generates path during chase',()=>{
 const player={id:1,x:280,y:0,w:20,h:20,stats:defaultStats()};
 const enemy={id:2,x:0,y:0,w:20,h:20,ai:{...defaultAi(),detection:500,attackRange:20}};
 const obstacle={id:3,type:'object',x:100,y:-30,w:60,h:110,solid3d:true};
 updateAi([player,enemy,obstacle],player,.016);
 assert.equal(enemy.ai.state,'chase');
 assert.ok(Array.isArray(enemy.ai.path));
});
