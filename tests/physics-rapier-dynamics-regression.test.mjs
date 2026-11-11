import test from 'node:test';
import assert from 'node:assert/strict';
import {freshGameProject} from '../js/core/game-project.js';
import {prepareGameDefinition} from '../js/core/game-build.js';
import {defaultRigidbody3d} from '../js/core/physics-3d.js';
import {defaultCollider3d,defaultJoint3d} from '../js/core/collider-3d.js';
import {loadRapier3d,createRapierScene,stepRapierScene,disposeRapierScene} from '../js/core/rapier-physics-3d.js';

// These tests exercise genuine Rapier WASM dynamics, not a mocked collision
// library. Both authoring and exported scenes use the same deterministic frames.
const cube=(id,x,elevation,props={})=>({
 id,name:'Body '+id,type:'mesh3d',x,y:0,w:32,h:32,depth3d:32,
 elevation3d:elevation,color:'#999999',collision3d:true,solid3d:true,
 collider3d:defaultCollider3d(),...props
});
const rigidbody=(extra={})=>({...defaultRigidbody3d(),restitution:0,friction:.8,...extra});
const floor=()=>cube(1,-256,-.25,{name:'Floor',w:1024,depth3d:1024,y:-256,h:16});
const project=()=>({...freshGameProject(),physics3d:'rapier',genre:'sandbox'});
const portable=entities=>{
 const original=structuredClone(entities);
 // An exportable Web game requires a playable actor. Keep this test-only
 // actor far away and omit it from physics parity samples.
 const testPlayer={id:9999,name:'QA Player',type:'mesh3d',x:2000,y:2000,w:32,h:64,depth3d:32,elevation3d:0,color:'#88ccff',playable3d:true};
 const build=prepareGameDefinition({entities:[...entities,testPlayer],mode:'3d',project:project()});
 assert.deepEqual(entities,original,'Web export must not mutate authored physics entities');
 return structuredClone(build.project.scenes.find(s=>s.id===build.project.startupSceneId).entities.filter(e=>e.id!==testPlayer.id));
};
async function simulate(entities,frames=180){
 const api=await loadRapier3d();assert.ok(api,'Rapier WASM must be available');
 const world=createRapierScene(api,entities);
 try{
  assert.deepEqual(world.errors,[],'Rapier must not silently skip bodies or joints');
  const initial=new Map(entities.map(o=>[o.id,{x:o.x,y:o.elevation3d,z:o.y}]));
  for(let i=0;i<frames;i++)stepRapierScene(world,1/60);
  return {actors:world.actors.size,joints:world.joints.size,initial,
   final:new Map(entities.map(o=>[o.id,{x:o.x,y:o.elevation3d,z:o.y,vy:o.rigidbody3d?.vy,grounded:o.grounded3d}]))};
 }finally{disposeRapierScene(world)}
}
function linked(kind){
 const anchor=cube(2,0,3,{name:'Anchor'});
 // The joint anchors coincide in world space: anchor center x=.25,
 // bob center x=1.25; (+.5) and (-.5) meet at x=.75m.
 const j={...defaultJoint3d(),kind,targetId:2,anchorX:-.5,targetAnchorX:.5,
   axisX:0,axisY:0,axisZ:1,limitsEnabled:kind==='hinge',minAngle:-85,maxAngle:85};
 const bob=cube(3,64,3,{name:'Swinging Bob',rigidbody3d:rigidbody({lockRotations:false}),joint3d:j});
 // Joint is attached to the bob; its own local anchor is -0.5m.
 // The corresponding anchor's local target point is +0.5m.
 return [anchor,bob];
}
for(const kind of ['hinge','ball'])test('Rapier '+kind+' joint swings while preserving constraints after export',async()=>{
 const source=linked(kind);
 const before=await simulate(structuredClone(source),90);
 const after=await simulate(portable(source),90);
 assert.equal(before.joints,1);
 const start=before.initial.get(3),end=before.final.get(3),exportEnd=after.final.get(3);
 assert.ok(end.y<start.y-.05,kind+' joint should allow gravity-driven swing');
 assert.ok(Number.isFinite(end.x)&&Number.isFinite(end.y),'Body position must remain finite');
 assert.ok(Math.abs(end.x-exportEnd.x)<.0005&&Math.abs(end.y-exportEnd.y)<.0005,
  kind+' editor/export trajectories disagree: '+JSON.stringify({end,exportEnd}));
});
test('two stacked dynamic Rigidbody boxes settle without penetrating each other',async()=>{
 const entities=[floor(),cube(2,0,1.1,{rigidbody3d:rigidbody()}),cube(3,0,2.5,{rigidbody3d:rigidbody()})];
 const a=await simulate(structuredClone(entities),300),b=await simulate(portable(entities),300);
 const low=a.final.get(2),high=a.final.get(3);
 assert.ok(Math.abs(low.y)<.08,'Lower body does not rest on floor: '+JSON.stringify(low));
 assert.ok(high.y>=low.y+.42,'Stacked body interpenetrates lower collider: '+JSON.stringify({low,high}));
 assert.ok(Math.abs(low.y-b.final.get(2).y)<.001&&Math.abs(high.y-b.final.get(3).y)<.001,
  'Stacking diverged between editor and export');
});
test('continuous collision detection prevents high-speed body from crossing a thin floor',async()=>{
 const fast=cube(2,0,5,{rigidbody3d:rigidbody({ccd:true,gravity:0,vy:-120})});
 const scene=[floor(),fast],a=await simulate(structuredClone(scene),24),b=await simulate(portable(scene),24);
 const end=a.final.get(2);
 assert.ok(end.y>-.1,'CCD body tunneled below floor: '+JSON.stringify(end));
 assert.ok(Math.abs(end.y-b.final.get(2).y)<.001,'CCD trajectory diverged on export');
});
