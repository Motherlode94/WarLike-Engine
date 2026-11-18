import test from 'node:test';
import assert from 'node:assert/strict';
import {updateController3d} from '../js/core/gameplay-components.js';

const player=()=>({id:1,type:'player',x:0,y:0,w:32,h:96,depth3d:32,elevation3d:0,playable3d:true,stats:{maxHealth:100,health:100,maxStamina:100,stamina:100,staminaRegen:14}});
const keys=(...names)=>new Set(names);
const floor={id:99,type:'object',x:-500,y:-500,w:1000,h:16,depth3d:1000,elevation3d:-.25,solid3d:true};
test('player cannot run through solid 3D wall',()=>{
 const p=player(),wall={id:2,type:'mesh3d',x:65,y:-20,w:20,h:128,depth3d:90,elevation3d:0,solid3d:true};
 for(let t=0;t<90;t++)updateController3d(p,keys('d'),1/60,0,[p,wall,floor]);
 assert.ok(p.x+p.w<=wall.x+.001,'wall should block player');
});
test('player jumps only once while jump key is held',()=>{
 const p=player();let peak=0;
 for(let t=0;t<180;t++){updateController3d(p,keys(' '),1/60,0,[p,floor]);peak=Math.max(peak,p.elevation3d)}
 assert.ok(peak>.1,'character should jump');assert.equal(p.elevation3d,0);assert.equal(p.grounded3d,true);
});
test('player can land on a solid raised platform',()=>{
 const p=player();p.x=20;p.y=20;p.elevation3d=3;p._verticalVelocity=0;
 const platform={id:2,type:'mesh3d',x:0,y:0,w:130,h:64,depth3d:130,elevation3d:0,solid3d:true};
 for(let t=0;t<180;t++)updateController3d(p,keys(),1/60,0,[p,platform]);
 assert.ok(Math.abs(p.elevation3d-1)<.04,'should land at height 1 meter');
 assert.equal(p.grounded3d,true);
});

test('Rapier controller retains grounded state on real support after a transient contact miss',()=>{
 const p=player(),ground={id:99,type:'object',x:-100,y:-100,w:300,h:16,depth3d:300,elevation3d:-.25,solid3d:true};
 // A contact query can be one frame late after a kinematic platform movement.
 const moveCharacter=(actor,dx,dy,dz)=>{actor.x+=dx;actor.y+=dy;actor.elevation3d+=dz/64;actor.grounded3d=false;return {grounded:false,ceiling:false}};
 updateController3d(p,new Set(),1/60,0,[p,ground],{moveCharacter});
 assert.equal(p.grounded3d,true,'physical support must preserve grounded state');
 assert.equal(p._support3d?.id,ground.id);
});
test('Rapier controller cannot invent grounded state in empty space',()=>{
 const p=player();p.elevation3d=2;
 const moveCharacter=(actor,dx,dy,dz)=>{actor.x+=dx;actor.y+=dy;actor.elevation3d+=dz/64;actor.grounded3d=false;return {grounded:false,ceiling:false}};
 updateController3d(p,new Set(),1/60,0,[p],{moveCharacter});
 assert.equal(p.grounded3d,false);
 assert.equal(p._support3d,null);
});
