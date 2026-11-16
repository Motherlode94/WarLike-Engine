import test from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import {complete3dRoute} from './complete-3d-route-fixture.mjs';
import {createRapierScene,activateRapierQueries3d,moveRapierCharacter3d,stepRapierScene,synchronizeRapierScene,disposeRapierScene} from '../js/core/rapier-physics-3d.js';
import {updateController3d,attack3d} from '../js/core/gameplay-components.js';
import {raycastScene3d} from '../js/core/collision-3d.js';
await RAPIER.init();
test('connected route climbs four steps, is blocked by a closed door, then walks through and can aim at the enemy',()=>{
 const fixture=complete3dRoute(),entities=structuredClone(fixture.entities),p=entities.find(o=>o.id===fixture.ids.player),door=entities.find(o=>o.id===fixture.ids.door),enemy=entities.find(o=>o.id===fixture.ids.enemy);
 let scene=createRapierScene(RAPIER,entities);activateRapierQueries3d(scene);
 const frame=(keys)=>{if(!synchronizeRapierScene(scene,entities)){disposeRapierScene(scene);scene=createRapierScene(RAPIER,entities);activateRapierQueries3d(scene)}stepRapierScene(scene,1/60);updateController3d(p,new Set(keys),1/60,0,entities,{moveCharacter:(...args)=>moveRapierCharacter3d(scene,...args)});};
 try{
  for(let i=0;i<130;i++)frame(['w']);assert.ok(p.y<310&&p.elevation3d>.7,JSON.stringify(p));
  for(let i=0;i<100;i++)frame(['w']);assert.ok(p.y>=185&&p.y<240,JSON.stringify(p));
  const origin=()=>[(p.x+p.w/2)/64,p.elevation3d+p.h/64*.9,(p.y+p.depth3d/2)/64];
  assert.equal(raycastScene3d(origin(),[0,0,-1],entities,{exclude:p,target:o=>o===enemy}).entity,door);
  door.collision3d=false;door.visible=false;
  for(let i=0;i<70;i++)frame(['w']);assert.ok(p.y<0,JSON.stringify(p));assert.ok(Math.abs(p.elevation3d-.75)<.05);
  assert.equal(raycastScene3d(origin(),[0,0,-1],entities,{exclude:p,target:o=>o===enemy}).entity,enemy);
  assert.equal(attack3d(p,entities,{range:500,damageAmount:100}),enemy);assert.equal(enemy.stats.health,0);
  assert.equal(fixture.entities.find(o=>o.id===fixture.ids.player).y,660,'Authored fixture must remain unchanged');
 }finally{disposeRapierScene(scene)}
});
