import test from 'node:test';
import assert from 'node:assert/strict';
import {createGraph,inspectGraph} from '../js/core/blueprint-graph.js';
import {updateAi} from '../js/core/gameplay-components.js';
test('blueprints reject disconnected and multiple-input action nodes',()=>{
 const graph=createGraph({event:'start',instructions:[{type:'message',value:'ok'}]});
 assert.deepEqual(inspectGraph(graph),[]);
 graph.links=[];
 assert.ok(inspectGraph(graph).some(x=>x.includes('entrée')||x.includes('déconnecté')));
});
test('AI cannot discover player through solid wall',()=>{
 const player={id:1,x:100,y:0,w:20,h:20,hp:100};
 const enemy={id:2,x:0,y:0,w:20,h:20,ai:{enabled:true,detection:300,attackRange:20,speed:70,homeX:0,homeY:0,patrolRadius:0}};
 const wall={id:3,x:50,y:-30,w:20,h:80,type:'mesh3d',collision3d:true};
 updateAi([player,enemy,wall],player,.016);
 assert.equal(enemy.ai.state,'patrol');
});
