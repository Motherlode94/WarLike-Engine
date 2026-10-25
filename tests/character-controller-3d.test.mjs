import test from 'node:test';
import assert from 'node:assert/strict';
import {updateController3d} from '../js/core/gameplay-components.js';

const player=()=>({id:1,type:'player',x:0,y:0,w:32,h:96,depth3d:32,elevation3d:0,playable3d:true,stats:{maxHealth:100,health:100,maxStamina:100,stamina:100,staminaRegen:14}});
const keys=(...names)=>new Set(names);
test('player cannot run through solid 3D wall',()=>{
 const p=player(),wall={id:2,type:'mesh3d',x:65,y:-20,w:20,h:128,depth3d:90,elevation3d:0,solid3d:true};
 for(let t=0;t<90;t++)updateController3d(p,keys('d'),1/60,0,[p,wall]);
 assert.ok(p.x+p.w<=wall.x+.001,'wall should block player');
});
test('player jumps only once while jump key is held',()=>{
 const p=player();let peak=0;
 for(let t=0;t<180;t++){updateController3d(p,keys(' '),1/60,0,[p]);peak=Math.max(peak,p.elevation3d)}
 assert.ok(peak>.1,'character should jump');assert.equal(p.elevation3d,0);assert.equal(p.grounded3d,true);
});
test('player can land on a solid raised platform',()=>{
 const p=player();p.x=20;p.y=20;p.elevation3d=3;p._verticalVelocity=0;
 const platform={id:2,type:'mesh3d',x:0,y:0,w:130,h:64,depth3d:130,elevation3d:0,solid3d:true};
 for(let t=0;t<180;t++)updateController3d(p,keys(),1/60,0,[p,platform]);
 assert.ok(Math.abs(p.elevation3d-1)<.04,'should land at height 1 meter');
 assert.equal(p.grounded3d,true);
});
