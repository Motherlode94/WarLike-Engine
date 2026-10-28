import test from 'node:test';
import assert from 'node:assert/strict';
import {moveBody3d,collisionBox3d,boxesOverlap3d,solidBody3d,raycastScene3d} from '../js/core/collision-3d.js';
import {stepPhysics3d,defaultRigidbody3d} from '../js/core/physics-3d.js';
import {updateController3d,defaultController,defaultStats,updateAi,attack3d} from '../js/core/gameplay-components.js';
import {resolveCameraBoom} from '../js/core/play-camera.js';
import {hasLineOfSight} from '../js/core/ai-perception.js';
import {gameplayKeys,gameplayInputBlocked} from '../js/core/gameplay-input.js';
import {rpg} from '../js/core/rpg-systems.js';
import {gameSession} from '../js/core/game-session.js';
const box=(id,x=0,y=0,extra={})=>({id,type:'mesh3d',x,y,w:32,h:64,depth3d:32,elevation3d:0,...extra});
const player=extra=>box(1,0,0,{type:'player',playable3d:true,stats:defaultStats(),controller3d:defaultController(),...extra});
const close=(a,b,tolerance=.001)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);

test('shared sweep catches subpixel walls at high speed and slides on the other axis',()=>{
 const p=player(),wall=box(2,80,-500,{w:.2,depth3d:1000,h:300});
 const contact=moveBody3d(p,5000,120,0,[p,wall]);close(p.x,48);close(p.y,120);assert.equal(contact.blockedX,true);assert.equal(contact.blockedY,false);
});
test('spawn penetration is resolved and inactive or hidden actors never become ghost walls',()=>{
 const p=player({x:70}),wall=box(2,80,-30,{w:20,depth3d:100,h:128});moveBody3d(p,0,0,0,[p,wall]);assert.equal(boxesOverlap3d(collisionBox3d(p),collisionBox3d(wall)),false);
 for(const flag of [{sequenceEnabled:false},{_sequenceDestroyed:true},{_hiddenInVehicle:true},{_hiddenInHouse:true},{collision3d:false}]){const disabled={...wall,...flag};assert.equal(solidBody3d(disabled),false);p.x=0;moveBody3d(p,200,0,0,[p,disabled]);close(p.x,200)}
});
test('rigid bodies cannot tunnel through thin walls or raised platforms',()=>{
 const body=box(1,0,0,{rigidbody3d:{...defaultRigidbody3d(),vx:100000,gravity:0,restitution:0}}),wall=box(2,100,-10,{w:1,depth3d:100,h:100});stepPhysics3d([body,wall],.1);assert.ok(body.x+body.w<=100.001);
 body.x=0;body.elevation3d=20;Object.assign(body.rigidbody3d,{vx:0,vy:-10000,gravity:15});const platform=box(3,-100,-100,{w:300,depth3d:300,h:1,elevation3d:2});stepPhysics3d([body,platform],.1);close(body.elevation3d,2+1/64);assert.equal(body.grounded3d,true);
});
test('moving platforms carry a standing character and jumping detaches it',()=>{
 const p=player({elevation3d:1}),platform=box(2,-30,-30,{w:120,depth3d:120,h:64});updateController3d(p,new Set(),1/60,0,[p,platform]);assert.equal(p._support3d.id,2);
 platform.x+=15;platform.elevation3d+=.1;updateController3d(p,new Set(),1/60,0,[p,platform]);close(p.x,15);close(p.elevation3d,1.1);assert.equal(p.grounded3d,true);
 updateController3d(p,new Set([' ']),1/60,0,[p,platform]);assert.equal(p.grounded3d,false);assert.equal(p._support3d,null);
 const x=p.x;platform.x+=15;updateController3d(p,new Set(),1/60,0,[p,platform]);close(p.x,x);
});
test('step climbing requires headroom and cannot climb a full-height wall',()=>{
 const p=player(),step=box(2,40,-50,{w:80,depth3d:140,h:12}),keys=new Set(['d']);for(let i=0;i<15;i++)updateController3d(p,keys,1/60,0,[p,step]);assert.ok(p.x>40);close(p.elevation3d,12/64);
 const blocked=player(),ceiling=box(3,-50,-100,{w:300,depth3d:200,h:5,elevation3d:1.05});for(let i=0;i<15;i++)updateController3d(blocked,keys,1/60,0,[blocked,step,ceiling]);assert.ok(blocked.x+blocked.w<=40.001);
});
test('coyote time and a buffered tap improve jumps without repeating a held jump',()=>{
 const p=player({x:60,elevation3d:1}),ledge=box(2,0,-50,{w:100,depth3d:150,h:64});updateController3d(p,new Set(),1/60,0,[p,ledge]);p.x=110;updateController3d(p,new Set(),.02,0,[p,ledge]);updateController3d(p,new Set(),.02,0,[p,ledge],{pressedKeys:new Set([' '])});assert.ok(p._verticalVelocity>0);
 const falling=player({elevation3d:.025,_verticalVelocity:-1});updateController3d(falling,new Set(),1/60,0,[falling],{pressedKeys:new Set([' '])});for(let i=0;i<4;i++)updateController3d(falling,new Set(),1/60,0,[falling]);assert.ok(falling._verticalVelocity>0,'tap before landing must jump after contact');
});
test('aimed fire hits the nearest real box and respects disabled obstacles',()=>{
 const enemy=box(2,-16,300),wall=box(3,-100,150,{w:200,h:200,depth3d:1}),origin=[0,.7,0],direction=[0,0,1],target=o=>o===enemy;
 assert.equal(raycastScene3d(origin,direction,[enemy,wall],{target}).entity,wall);wall.sequenceEnabled=false;assert.equal(raycastScene3d(origin,direction,[enemy,wall],{target}).entity,enemy);assert.equal(raycastScene3d([2,.7,0],direction,[enemy],{target}),null);
});
test('vertical line of sight and combat cannot hit a hero far above the attacker',()=>{
 const p=player({elevation3d:6}),enemy=box(2,0,0,{ai:{enabled:true,detection:700,attackRange:90,attackDamage:20,speed:0,patrolRadius:0}});updateAi([p,enemy],p,1/60);assert.equal(p.stats.health,100);assert.equal(enemy.ai.state,'chase');assert.equal(attack3d(p,[p,enemy],{range:120}),null);
 const low=box(3,-20,100,{w:100,depth3d:10,h:10}),other=box(4,0,200);p.elevation3d=0;assert.equal(hasLineOfSight(p,other,[p,other,low]),true);low.h=150;assert.equal(hasLineOfSight(p,other,[p,other,low]),false);
});
test('camera contracts immediately even very near a wall and returns smoothly',()=>{
 const target=[0,1,0],desired=[0,1,10],wall={x:0,y:1,z:.25,w:4,h:4,d:.02},hit=resolveCameraBoom(target,desired,[wall],{previousDistance:10,dt:1/60});assert.ok(hit.distance<.1,'minimum fraction must not put the camera behind a near wall');
 const clear=resolveCameraBoom(target,desired,[],{previousDistance:hit.distance,dt:1/60});assert.ok(clear.distance>hit.distance&&clear.distance<2);const reset=resolveCameraBoom(target,desired,[]);close(reset.distance,10);
});
test('dialogue, inventory and journal block gameplay without consuming their own keys',()=>{
 const keys=new Set(['w','f','e','1']);try{for(const key of ['dialogue','showInventory','showJournal']){rpg[key]=key==='dialogue'?{}:true;assert.equal(gameplayInputBlocked(),true);assert.equal(gameplayKeys(keys).size,0);rpg[key]=key==='dialogue'?null:false}gameSession.dialogue={text:'Stop'};assert.equal(gameplayKeys(keys).size,0);gameSession.dialogue=null;assert.equal(gameplayKeys(keys),keys);assert.equal(keys.size,4)}finally{rpg.dialogue=null;rpg.showInventory=false;rpg.showJournal=false;gameSession.dialogue=null}
});
