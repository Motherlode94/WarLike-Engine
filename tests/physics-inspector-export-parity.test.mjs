import test from 'node:test';
import assert from 'node:assert/strict';
import {addObjectComponent} from '../js/core/component-definitions.js';
import {defaultRigidbody3d,stepPhysics3d,applyImpulse3d} from '../js/core/physics-3d.js';
import {solidBody3d} from '../js/core/collision-3d.js';
import {canonicalScene,runtimeEntities} from '../js/core/scene-contract.js';
import {freshGameProject,restoreGameProject,gameProject,captureGameScene} from '../js/core/game-project.js';
import {prepareGameDefinition} from '../js/core/game-build.js';
import {loadRapier3d,createRapierScene,stepRapierScene,disposeRapierScene} from '../js/core/rapier-physics-3d.js';

const floor=()=>({id:2,type:'mesh3d',name:'Sol',x:-300,y:-300,w:600,h:16,depth3d:600,elevation3d:-.25,color:'#636363',solid3d:true,collision3d:true});
const cube=()=>({id:3,type:'mesh3d',name:'Cube physique',x:0,y:0,w:32,h:32,depth3d:32,elevation3d:2,color:'#b2ccff'});
const player=()=>({id:1,type:'mesh3d',name:'Joueur',x:120,y:120,w:32,h:64,depth3d:32,elevation3d:0,color:'#8acdee',playable3d:true});
function authored(){
 const c=cube();
 assert.equal(addObjectComponent(c,'rigidbody3d','3d'),true);
 assert.ok(c.collider3d,'Rigidbody must attach a collider');
 c.rigidbody3d.restitution=0;c.rigidbody3d.friction=.71;c.rigidbody3d.mass=2.5;
 return [player(),c,floor()];
}
function simulate(entities){
 for(let i=0;i<160;i++)stepPhysics3d(entities,1/60);
 return entities.find(e=>e.id===3);
}
test('Inspector Rigidbody becomes a dynamic body and physically collides with floor on Play',()=>{
 const scene=authored(),body=scene[1],start=body.elevation3d;
 assert.ok(solidBody3d(body));
 assert.equal(body.rigidbody3d.enabled,true);
 assert.equal(body.collision3d,true);
 simulate(scene);
 assert.ok(body.elevation3d<start,'gravity must move the body');
 assert.ok(Math.abs(body.elevation3d)<.005,'cube must stop at floor instead of tunneling through');
 assert.equal(body.grounded3d,true);
});
test('Collider enabled in Inspector has the same collision meaning for built-in and Rapier',()=>{
 const b=cube();assert.equal(addObjectComponent(b,'collider3d','3d'),true);
 assert.equal(b.collision3d,true);assert.equal(solidBody3d(b),true);
 b.collider3d.enabled=false;assert.equal(solidBody3d(b),false);
 b.collider3d.enabled=true;assert.equal(solidBody3d(b),true);
 b.collision3d=false;assert.equal(solidBody3d(b),false);
});
test('Rigidbody tuning is preserved through canonical scene, project save and exported definition',()=>{
 const original=authored(),snapshot=structuredClone(original);
 const canonical=canonicalScene(original),converted=runtimeEntities(canonical);
 const originalBody=original[1],convertedBody=converted.find(e=>e.id===3);
 assert.equal(convertedBody.rigidbody3d.mass,2.5);
 assert.equal(convertedBody.rigidbody3d.friction,.71);
 assert.equal(convertedBody.collider3d.enabled,true);
 restoreGameProject({...freshGameProject(),id:'physics-authoring',startupSceneId:'main',physics3d:'builtin'});
 captureGameScene(original,{x:0,y:0,zoom:1},{id:'main',name:'Test physique'});
 const saved=structuredClone(gameProject);
 restoreGameProject(saved);
 const reopened=gameProject.scenes[0].entities.find(e=>e.id===3);
 assert.deepEqual(reopened.rigidbody3d,originalBody.rigidbody3d);
 assert.deepEqual(reopened.collider3d,originalBody.collider3d);
 const build=prepareGameDefinition({entities:original,mode:'3d',project:saved});
 const exported=structuredClone(build.project.scenes.find(s=>s.id==='main').entities);
 assert.deepEqual(exported.find(e=>e.id===3).rigidbody3d,originalBody.rigidbody3d);
 assert.deepEqual(exported.find(e=>e.id===3).collider3d,originalBody.collider3d);
 const played=simulate(structuredClone(original));
 const exportedPlayed=simulate(exported);
 assert.ok(Math.abs(played.elevation3d-exportedPlayed.elevation3d)<1e-8);
 assert.deepEqual(original,snapshot,'Play/build must not change the authored scene');
});
test('Impulse acceleration depends on the Inspector mass value',()=>{
 const light={rigidbody3d:{...defaultRigidbody3d(),mass:1}};
 const heavy={rigidbody3d:{...defaultRigidbody3d(),mass:5}};
 assert.equal(applyImpulse3d(light,10,0,0),true);
 assert.equal(applyImpulse3d(heavy,10,0,0),true);
 assert.equal(light.rigidbody3d.vx,10);assert.equal(heavy.rigidbody3d.vx,2);
});
test('Rapier uses the same authored collider and Rigidbody with contact on floor',async()=>{
 const api=await loadRapier3d();assert.ok(api,'Rapier must initialize for default Web physics');
 const authoredScene=authored(),session=createRapierScene(api,authoredScene);
 try{
  assert.ok(session.actors.has(3));
  for(let i=0;i<180;i++)stepRapierScene(session,1/60);
  const body=authoredScene[1];
  assert.ok(Math.abs(body.elevation3d)<.06,'Rapier body must settle on floor, got '+body.elevation3d);
  assert.ok(body.rigidbody3d.vy<.2);
  assert.equal(body.grounded3d,true,'Rapier dynamic body must report grounded contact at rest');
 }finally{disposeRapierScene(session)}
});
