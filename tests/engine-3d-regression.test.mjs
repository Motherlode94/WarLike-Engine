import test from 'node:test';
import assert from 'node:assert/strict';
import {overlap3d,stepPhysics3d,applyImpulse3d,defaultRigidbody3d} from '../js/core/physics-3d.js';
import {updateAi} from '../js/core/gameplay-components.js';

const obj=(x,y,extra={})=>({x,y,w:32,h:32,depth3d:32,elevation3d:0,type:'mesh3d',collision3d:true,...extra});
test('3D AABB rejects horizontal separation and respects vertical separation',()=>{
 assert.equal(overlap3d(obj(0,0),obj(100,0)),false);
 assert.equal(overlap3d(obj(0,0),obj(16,16)),true);
 assert.equal(overlap3d(obj(0,0),obj(0,0,{elevation3d:2})),false);
});
test('3D collision slides along an unblocked axis',()=>{
 const mover=obj(0,0,{rigidbody3d:{...defaultRigidbody3d(),vx:200,vz:200,gravity:0,restitution:0}});
 const wall=obj(40,-20,{w:32,h:32,depth3d:64,solid3d:true});
 stepPhysics3d([mover,wall],.05);
 assert.ok(mover.x>=0&&mover.x<=8,'Le corps doit s’arrêter avant le mur sur X');
 assert.ok(Math.abs(mover.y-10)<1e-5,'Le corps conserve son mouvement libre sur Z');
});
test('3D impulses account for mass',()=>{
 const body=obj(0,0,{rigidbody3d:{...defaultRigidbody3d(),mass:2}});
 assert.equal(applyImpulse3d(body,10,4,6),true);
 assert.equal(body.rigidbody3d.vx,5);
 assert.equal(body.rigidbody3d.vy,2);
 assert.equal(body.rigidbody3d.vz,3);
});
test('AI cannot attack player through solid walls',()=>{
 const player=obj(90,0,{type:'player',stats:{maxHealth:100,health:100}});
 const enemy=obj(0,0,{ai:{enabled:true,attackRange:150,attackDamage:20,attackCooldown:1,cooldown:0,detection:200,speed:0}});
 const wall=obj(50,0,{solid3d:true});
 updateAi([enemy,wall,player],player,.016);
 assert.equal(player.stats.health,100);
 wall.x=250;
 enemy.ai.cooldown=0;
 updateAi([enemy,wall,player],player,.016);
 assert.equal(player.stats.health,80);
});
