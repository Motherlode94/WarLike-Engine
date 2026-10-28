import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultRigidbody2d,defaultCollider2d,colliderRect2d,solidCollider2d,moveBody2d,stepPhysics2d,walkPlatformer2d,controllerMode2d,applyImpulse2d} from '../js/core/physics-2d.js';
import {addObjectComponent,componentChoices,removeObjectComponent} from '../js/core/component-definitions.js';
import {freeSprites2d} from '../js/assets/free-game-assets.js';
const box=(id,x,y,w=32,h=32)=>({id,type:'object',name:'Box '+id,x,y,w,h});
const close=(a,b,t=1e-5)=>assert.ok(Math.abs(a-b)<=t,`${a} != ${b}`);
test('every Kenney platform terrain is a solid collider, including previously placed sprites',()=>{
 const terrain=freeSprites2d.filter(a=>a.category==='Terrain'&&a.pack==='platformer-art-deluxe');assert.ok(terrain.length>=3);
 for(const asset of terrain){const o={...box(1,0,0),type:'prefab',assetId:asset.id};assert.equal(solidCollider2d(o),true,asset.id);o.collider2d={...defaultCollider2d(),enabled:false};assert.equal(solidCollider2d(o),false)}
 assert.equal(solidCollider2d({type:'prefab',assetId:'free-tiny-dungeon-tile-0048'}),false);assert.equal(solidCollider2d({type:'prefab',assetId:'free-tiny-dungeon-tile-0014'}),true);
 const platform=terrain.find(a=>a.pack==='platformer-art-deluxe');assert.equal(controllerMode2d({type:'player'},[{assetId:platform.id}]),'platformer');assert.equal(controllerMode2d({controller2d:{mode:'topDown'}},[{assetId:platform.id}]),'topDown');assert.equal(controllerMode2d({type:'player'},[]),'topDown');
});
test('swept 2D collisions block a fast body at a thin wall, while allowing sliding',()=>{
 const a=box(1,0,0),wall=box(2,100,-100,1,400);const hit=moveBody2d(a,2000,40,[a,wall]);close(a.x,68);close(a.y,40);assert.equal(hit.blockedX,true);assert.equal(hit.blockedY,false);
 moveBody2d(a,-100,0,[a,wall]);close(a.x,-32);
});
test('2D falling bodies land on and remain supported by collider platforms',()=>{
 const a={...box(1,0,0),rigidbody2d:defaultRigidbody2d()},floor=box(2,-100,150,400,1);
 for(let i=0;i<180;i++)stepPhysics2d([a,floor],1/60);close(a.y,118);close(a.rigidbody2d.vy,0);assert.equal(a.grounded2d,true);
 floor.collider2d={...defaultCollider2d(),enabled:false};for(let i=0;i<30;i++)stepPhysics2d([a,floor],1/60);assert.ok(a.y>150);
});
test('custom collider offsets determine contacts and triggers allow traversal',()=>{
 const a={...box(1,0,0),collider2d:{...defaultCollider2d(),offsetX:8,width:16}},wall=box(2,100,-100,5,400);moveBody2d(a,1000,0,[a,wall]);close(a.x,76);assert.equal(colliderRect2d(a).w,16);
 a.x=0;wall.collider2d={...defaultCollider2d(),isTrigger:true};moveBody2d(a,200,0,[a,wall]);close(a.x,200);
 a.x=0;a.collider2d.enabled=false;delete wall.collider2d;moveBody2d(a,200,0,[a,wall]);close(a.x,200);
});
test('platform controller jumps once per press, collides with ceilings and can land again',()=>{
 const a={...box(1,0,118),type:'player'},floor=box(2,-200,150,600,4),ceiling=box(3,-200,20,600,4),objects=[a,floor,ceiling],keys=new Set([' ']);
 walkPlatformer2d(a,1/60,keys,objects);assert.ok(a.y<118);assert.ok(a.rigidbody2d.vy<0);
 let highest=a.y;for(let i=0;i<120;i++){walkPlatformer2d(a,1/60,keys,objects);highest=Math.min(highest,a.y)}assert.ok(highest>=24-.001);close(a.y,118);close(a.rigidbody2d.vy,0);
 walkPlatformer2d(a,1/60,new Set(),objects);walkPlatformer2d(a,1/60,keys,objects);assert.ok(a.rigidbody2d.vy<0);
});
test('static and disabled bodies stay fixed, impulses respect mass and controller does not step other bodies twice',()=>{
 const a={...box(1,0,0),rigidbody2d:{...defaultRigidbody2d(),bodyType:'static'}},b={...box(2,80,0),rigidbody2d:{...defaultRigidbody2d(),enabled:false}};stepPhysics2d([a,b],.1);close(a.y,0);close(b.y,0);assert.equal(applyImpulse2d(a,20,30),false);
 a.rigidbody2d.bodyType='dynamic';a.rigidbody2d.mass=2;assert.equal(applyImpulse2d(a,20,-30),true);close(a.rigidbody2d.vx,10);close(a.rigidbody2d.vy,-15);
 const player={...box(3,200,0),type:'player'};const before=a.y;walkPlatformer2d(player,.05,new Set(),[player,a]);close(a.y,before);
});
test('the 2D component browser creates colliders and physical bodies that the simulation actually uses',()=>{
 const o=box(1,0,0);assert.ok(componentChoices('2d').some(c=>c.id==='rigidbody2d'));assert.ok(!componentChoices('3d').some(c=>c.id==='rigidbody2d'));
 assert.equal(addObjectComponent(o,'rigidbody2d','2d'),true);assert.equal(o.collider2d.enabled,true);assert.equal(o.rigidbody2d.gravity,980);removeObjectComponent(o,'collider2d');assert.equal(solidCollider2d(o),false);
});
