import test from 'node:test';
import assert from 'node:assert/strict';
import {copyEntitiesPayload,pasteEntitiesPayload,readEntitiesPayload,isTypingTarget} from '../js/core/editor-clipboard.js';
import {faceMovement2d,cameraFacingDegrees} from '../js/core/character-facing.js';
import {updateController3d,cameraRelativeWalk3d} from '../js/core/gameplay-components.js';
import {createBundledTestScene} from '../js/core/bundled-test-scene.js';
import {applyCsharpFrame} from '../js/core/csharp-frame.js';
import {freeModels3d} from '../js/assets/free-game-assets.js';
import {quaterniusModels3d} from '../js/assets/quaternius-game-assets.js';
import {execFileSync} from 'node:child_process';
const actor=(id,x=0)=>({id,name:'Actor',type:'character',x,y:0,w:32,h:64,depth3d:32});
test('2D facing follows actual movement, stays upright and retains facing when idle or travelling vertically',()=>{
 const a=actor(1);faceMovement2d(a,-2,0);assert.equal(a.flipX,true);assert.equal(a.facing2d,'left');
 faceMovement2d(a,0,-2);assert.equal(a.flipX,true);assert.equal(a.facing2d,'up');faceMovement2d(a,0,0);assert.equal(a.facing2d,'up');
 faceMovement2d(a,2,0);assert.equal(a.flipX,false);assert.equal(a.facing2d,'right');assert.equal(a.rotation,undefined);
});
test('3D camera controls body yaw while moving forward, backwards, strafing and standing still',()=>{
 for(const yaw of [0,Math.PI/2,-Math.PI/3,Math.PI*4])for(const key of ['w','s','a','d',null]){
  const a=actor(1),keys=new Set(key?[key]:[]);updateController3d(a,keys,.02,yaw,[a]);assert.ok(Math.abs(a.rotation-cameraFacingDegrees(yaw))<.00001);
  if(key){const movement=cameraRelativeWalk3d(key==='d'?1:key==='a'?-1:0,key==='w'?1:key==='s'?-1:0,yaw);assert.ok(Math.abs(a.x-movement.x*4.2*64*.02)<.001);assert.ok(Math.abs(a.y-movement.z*4.2*64*.02)<.001)}else assert.equal(a.x,0);
 }
});
test('scene clipboard preserves components and remaps internal references without mutating originals',()=>{
 const one={...actor(1),ownerId:2,targetId:99,_verticalVelocity:8,stats:{health:80},ai:{homeX:10,homeY:20}},two=actor(2,50),objects=[one,two];
 const text=copyEntitiesPayload(objects,[1,2],'3d');const result=pasteEntitiesPayload(text,{entities:[...objects,actor(100)],mode:'3d',offset:24,nextId:3});
 assert.deepEqual(result.selected,[101,102]);const copy=result.entities[3];assert.equal(copy.ownerId,102);assert.equal(copy.targetId,99);assert.equal(copy.stats.health,80);assert.equal(copy._verticalVelocity,undefined);assert.equal(copy.x,24);assert.equal(copy.ai.homeX,34);assert.equal(one.ownerId,2);assert.equal(result.nextId,103);
 assert.throws(()=>pasteEntitiesPayload(text,{entities:[],mode:'2d'}),/3D/);assert.equal(readEntitiesPayload('plain text'),null);
 const data=JSON.parse(text);data.entities[1].id=1;assert.equal(readEntitiesPayload(JSON.stringify(data)),null);
 assert.equal(isTypingTarget({tagName:'TEXTAREA'}),true);assert.equal(isTypingTarget({isContentEditable:true}),true);assert.equal(isTypingTarget({tagName:'CANVAS'}),false);
});
test('the bundled 3D scene uses real included models, six Ultimate Guns and exactly one playable actor',()=>{
 const available=new Set([...freeModels3d,...quaterniusModels3d].map(o=>o.id));
 for(const kind of ['town','nature']){const scene=createBundledTestScene(kind);const entities=Array.isArray(scene)?scene:scene.entities;assert.equal(entities.filter(o=>o.playable3d).length,1);for(const o of entities.filter(o=>o.model3dId))assert.ok(available.has(o.model3dId),o.model3dId);assert.equal(entities.filter(o=>o.model3dId?.includes('ultimate-guns')||o.model3dId?.includes('ultimategun')).length,6);assert.ok(entities.some(o=>o.ai?.enabled));}
});
test('C# snapshots apply valid finite values only to known actors',()=>{
 const entities=[{...actor(1),stats:{health:100}}];assert.equal(applyCsharpFrame(entities,[{id:1,x:12,y:34,elevation3d:2,rotation:90,hp:80},{id:2,x:99,y:9,elevation3d:0,rotation:0}]),1);assert.equal(entities[0].stats.health,80);assert.equal(entities[0].x,12);
 assert.equal(applyCsharpFrame(entities,[{id:1,x:NaN,y:0,elevation3d:0,rotation:0}]),0);assert.equal(entities[0].x,12);
});
test('Python validates exported scenes and rejects malformed dimensions and duplicate IDs',()=>{
 const code=`import importlib.util,json\ns=importlib.util.spec_from_file_location('tools','python/warlike.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)\na={'id':1,'x':0,'y':0,'w':32,'h':64}\nassert not m.validate({'entities':[a]})\nassert m.validate({'entities':[a,a]})\nassert m.validate({'entities':[{**a,'w':-1}]})\nassert m.validate({'scenes':[{}]})\nprint('ok')`;
 assert.equal(execFileSync('python3',['-c',code],{encoding:'utf8'}).trim(),'ok');
});
