import test from 'node:test';
import assert from 'node:assert/strict';
import {selectObjectInteraction} from '../js/core/object-interaction-targeting.js';
import {addObjectComponent,componentChoices} from '../js/core/component-definitions.js';

const actor={id:1,type:'player',x:0,y:0,w:20,h:20,depth3d:20,elevation3d:0};
const object=(id,x,options={})=>({id,type:'object',x,y:0,w:20,h:20,depth3d:20,elevation3d:0,collision3d:false,solid3d:false,interactable:{enabled:true,maxDistance:3},...options});

test('2D interaction selects nearest eligible entity and respects range',()=>{
 const near=object(2,70),far=object(3,160);
 assert.equal(selectObjectInteraction(actor,[actor,far,near],{mode:'2d'}).entity,near);
 assert.equal(selectObjectInteraction(actor,[actor,far],{mode:'2d',maxDistance:1}),null);
 near.interactable.enabled=false;
 assert.equal(selectObjectInteraction(actor,[actor,near],{mode:'2d'}),null);
});

test('2D interaction cannot pass through solid obstacles',()=>{
 const target=object(2,100);
 const wall={id:4,type:'object',x:52,y:-15,w:10,h:70,collision3d:true,solid3d:true};
 assert.equal(selectObjectInteraction(actor,[actor,wall,target],{mode:'2d'}),null);
});

test('3D aimed interaction uses raycast and rejects solid occluders',()=>{
 const target=object(2,128,{h:128,depth3d:128,y:-64});
 const origin=[0,1,0],direction=[1,0,0];
 const options={mode:'3d',origin,direction,maxDistance:4};
 assert.equal(selectObjectInteraction(actor,[actor,target],options).entity,target);
 const wall={id:5,type:'object',x:64,y:-64,w:12,h:128,depth3d:128,elevation3d:0,solid3d:true};
 assert.equal(selectObjectInteraction(actor,[actor,wall,target],options),null);
});

test('3D aiming honors object-specific reach and rejects invalid direction',()=>{
 const target=object(2,128,{h:128,depth3d:128,y:-64,interactable:{maxDistance:1}});
 const options={mode:'3d',origin:[0,1,0],direction:[1,0,0],maxDistance:4};
 assert.equal(selectObjectInteraction(actor,[actor,target],options),null);
 assert.equal(selectObjectInteraction(actor,[actor,target],{...options,direction:[0,0,0]}),null);
});

test('Interactable can be added from the native component browser in 2D and 3D',()=>{
 for(const mode of ['2d','3d']){
  assert.ok(componentChoices(mode).some(x=>x.id==='interactable'));
  const entity={id:35,type:'object',x:0,y:0,w:32,h:32};
  assert.equal(addObjectComponent(entity,'interactable',mode),true);
  assert.deepEqual(entity.interactable,{enabled:true,maxDistance:3,prompt:'Interagir'});
  assert.equal(addObjectComponent(entity,'interactable',mode),false);
 }
});
