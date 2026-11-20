import test from 'node:test';
import assert from 'node:assert/strict';
import {componentChoices} from '../js/core/component-definitions.js';
import {unityComponentCategory} from '../js/ui/component-browser.js';
import {componentMenuPath,componentMenuChildren} from '../js/ui/component-menu-tree.js';
import {cameraFacingDegrees} from '../js/core/character-facing.js';
import {playerFacing3d} from '../js/core/player-look-rotation.js';
import {defaultController,updateController3d,cameraRelativeWalk3d} from '../js/core/gameplay-components.js';

test('real 2D and 3D components use nested Unity-like folders but are not fabricated',()=>{
 const modes=['2d','3d'];
 for(const mode of modes){
  const options=componentChoices(mode),ids=new Set(options.map(x=>x.id));
  assert.equal(ids.size,options.length);
  for(const option of options){
   const path=componentMenuPath(option,unityComponentCategory(option));
   assert(path.length>=1&&path.length<=2);
   assert(path.every(s=>typeof s==='string'&&s.length>0));
  }
 }
 const d2=componentChoices('2d'),d3=componentChoices('3d');
 assert.deepEqual(componentMenuPath(d2.find(x=>x.id==='collider2d'),'Physics 2D'),['Physics 2D','Colliders']);
 assert.deepEqual(componentMenuPath(d2.find(x=>x.id==='joint2d'),'Physics 2D'),['Physics 2D','Joints']);
 assert.deepEqual(componentMenuPath(d3.find(x=>x.id==='animatorGraph'),'Animation'),['Animation','Animator']);
 const entries=componentMenuChildren(d2,'Physics 2D',o=>componentMenuPath(o,unityComponentCategory(o)));
 assert(entries.groups.includes('Colliders')&&entries.groups.includes('Joints'));
 assert(!d2.some(x=>x.id==='videoPlayer'),'An unsupported Unity Video Player is not represented as functional');
});

test('player look follows camera by default and can turn toward actual motion',()=>{
 const cfg=defaultController();
 assert.equal(cfg.facingMode,'camera');
 for(const yaw of [0,Math.PI/2,-Math.PI/2,Math.PI]){
  assert.equal(playerFacing3d({yaw}),cameraFacingDegrees(yaw));
 }
 const movement=cameraRelativeWalk3d(0,1,0);
 assert.equal(Math.round(playerFacing3d({yaw:0,right:movement.x,forward:movement.z,mode:'movement'})),180);
 assert.equal(playerFacing3d({yaw:1,mode:'locked',current:42}),42);
 assert.equal(playerFacing3d({yaw:Math.PI/2,current:0,mode:'camera',turnSpeed:90,dt:.5}),45);
 assert.equal(playerFacing3d({yaw:Math.PI,current:350,mode:'camera',turnSpeed:40,dt:.25}),0);
});

test('3D player controller exposes look config without altering core movement defaults',()=>{
 const config=defaultController();
 assert(config.walkSpeed>0);
 const player={id:1,name:'Author GameObject',x:0,y:0,elevation3d:0,rotation:90,
   controller3d:{...config,facingMode:'locked'},hp:100,stats:{health:100,maxHealth:100,stamina:100,maxStamina:100,staminaRegen:14}};
 updateController3d(player,new Set(),.02,1,[],{});
 assert.equal(player.rotation,90);
});
