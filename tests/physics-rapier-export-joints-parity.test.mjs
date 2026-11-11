import test from 'node:test';
import assert from 'node:assert/strict';
import {freshGameProject} from '../js/core/game-project.js';
import {prepareGameDefinition} from '../js/core/game-build.js';
import {defaultRigidbody3d} from '../js/core/physics-3d.js';
import {defaultCollider3d,defaultJoint3d} from '../js/core/collider-3d.js';
import {loadRapier3d,createRapierScene,stepRapierScene,disposeRapierScene} from '../js/core/rapier-physics-3d.js';

function authored(){
 const floor={id:1,name:'Plancher',type:'mesh3d',x:-400,y:-400,w:800,depth3d:800,h:16,elevation3d:-.25,color:'#888888',solid3d:true,collision3d:true};
 const anchor={id:2,name:'Support fixe',type:'mesh3d',x:0,y:0,w:32,depth3d:32,h:32,elevation3d:3,color:'#777777',solid3d:true,collision3d:true,collider3d:defaultCollider3d()};
 const bob={id:3,name:'Poids lie',type:'mesh3d',x:0,y:0,w:32,depth3d:32,h:32,elevation3d:3,color:'#bbccdd',collision3d:true,collider3d:defaultCollider3d(),rigidbody3d:{...defaultRigidbody3d(),mass:2,restitution:0},joint3d:{...defaultJoint3d(),kind:'fixed',targetId:2}};
 const player={id:4,name:'Joueur',type:'mesh3d',x:100,y:100,w:32,depth3d:32,h:64,color:'#22aacc',playable3d:true};
 return [floor,anchor,bob,player];
}
async function runPhysics(objects){
 const api=await loadRapier3d();assert.ok(api,'Rapier must initialize');
 const physics=createRapierScene(api,objects);
 try{
  assert.deepEqual(physics.errors,[],'No silently skipped joint or collider');
  assert.ok(physics.actors.has(3),'Rigidbody is in Rapier');
  assert.ok(physics.joints.has(3),'Fixed joint is actually created');
  for(let step=0;step<100;step++)stepRapierScene(physics,1/60);
  return {bob:objects.find(o=>o.id===3).elevation3d,anchor:objects.find(o=>o.id===2).elevation3d,joints:physics.joints.size};
 }finally{disposeRapierScene(physics)}
}
test('Rapier fixed joint constrains a dynamic Rigidbody during Play and Web export',async()=>{
 const source=authored(),snapshot=structuredClone(source);
 const build=prepareGameDefinition({entities:source,mode:'3d',project:{...freshGameProject(),physics3d:'rapier'}});
 assert.equal(build.project.physics3d,'rapier');
 const exported=structuredClone(build.project.scenes.find(s=>s.id===build.project.startupSceneId).entities);
 const fromEditor=await runPhysics(structuredClone(source));
 const fromExport=await runPhysics(exported);
 assert.ok(Math.abs(fromEditor.bob-fromEditor.anchor)<.16,'Fixed joint must prevent the body falling away from anchor');
 assert.ok(Math.abs(fromEditor.bob-fromExport.bob)<1e-5,'Editor/Export Rapier discrepancy: '+JSON.stringify({fromEditor,fromExport}));
 assert.equal(fromEditor.joints,1);
 assert.deepEqual(source,snapshot,'Export may not mutate original physical scene');
});
test('Rapier respects removed/disabled Collider 3D on an exported scene',async()=>{
 const source=authored();source[2].collider3d.enabled=false;
 const build=prepareGameDefinition({entities:source,mode:'3d',project:{...freshGameProject(),physics3d:'rapier'}});
 const exported=build.project.scenes[0].entities;
 const api=await loadRapier3d(),session=createRapierScene(api,exported);
 try{
  assert.equal(session.actors.has(3),false,'Disabled collider must not silently participate in Rapier');
  assert.equal(exported.find(o=>o.id===3).collider3d.enabled,false);
 }finally{disposeRapierScene(session)}
});
