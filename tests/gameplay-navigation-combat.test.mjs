import test from 'node:test';
import assert from 'node:assert/strict';
import {updateAi,attack3d,defaultStats} from '../js/core/gameplay-components.js';

test('AI attempts alternate steering around a blocking rectangle',()=>{
 const player={id:1,x:250,y:50,w:22,h:22,stats:defaultStats()};
 const enemy={id:2,x:20,y:50,w:22,h:22,ai:{enabled:true,detection:500,attackRange:20,speed:100,patrolRadius:50}};
 const wall={id:3,x:44,y:45,w:45,h:30,type:'object',solid3d:true};
 updateAi([player,enemy,wall],player,.5);
 assert.equal(enemy.ai.state,'chase');
 assert.ok(enemy.x<44 || enemy.y!==50,'enemy should not pass through the wall');
});
test('3D attack damages nearest live AI enemy only within range',()=>{
 const hero={id:1,x:0,y:0,w:20,h:20};
 const enemy={id:2,x:70,y:0,w:20,h:20,ai:{enabled:true},stats:defaultStats()};
 const distant={id:3,x:400,y:0,w:20,h:20,ai:{enabled:true},stats:defaultStats()};
 assert.equal(attack3d(hero,[hero,enemy,distant],{range:100,damageAmount:25}),enemy);
 assert.equal(enemy.stats.health,75);
 assert.equal(distant.stats.health,100);
 assert.equal(attack3d(hero,[hero,distant],{range:100}),null);
});
