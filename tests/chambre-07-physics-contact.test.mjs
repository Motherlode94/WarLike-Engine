import test from 'node:test';
import assert from 'node:assert/strict';
import {createChambre07Scene} from '../js/core/chambre-07-scene.js';
import {defaultRigidbody3d,stepPhysics3d} from '../js/core/physics-3d.js';
import {defaultCollider3d} from '../js/core/collider-3d.js';
import {collisionBox3d,solidBody3d,boxesOverlap3d} from '../js/core/collision-3d.js';

test('CHAMBRE 07 native interior does not re-elevate a settled rigidbody',()=>{
 const demo=createChambre07Scene('3d');
 const qa={id:demo.nextId,name:'QA · Chute Rigidbody',type:'mesh3d',x:540,y:240,w:32,depth3d:32,h:32,elevation3d:2,
   color:'#d5ec80',collision3d:true,solid3d:true,
   rigidbody3d:{...defaultRigidbody3d(),restitution:0},collider3d:defaultCollider3d()};
 demo.entities.push(qa);
 let maxAfterContact=0,contacted=false,steps=0;
 for(let i=0;i<300;i++){
  stepPhysics3d(demo.entities,1/60);
  if(qa.grounded3d)contacted=true;
  if(contacted){maxAfterContact=Math.max(maxAfterContact,qa.elevation3d);steps++}
 }
 const overlaps=demo.entities.filter(e=>e!==qa&&solidBody3d(e)&&boxesOverlap3d(collisionBox3d(qa),collisionBox3d(e))).map(e=>({id:e.id,name:e.name}));
 assert.ok(contacted,'Scene cube never touches any physical support; final '+qa.elevation3d);
 assert.ok(Math.abs(qa.elevation3d)<.05&&maxAfterContact<.05,'Scene contact instability: '+JSON.stringify({elevation:qa.elevation3d,velocity:qa.rigidbody3d.vy,maxAfterContact,contactSteps:steps,overlaps}));
});
