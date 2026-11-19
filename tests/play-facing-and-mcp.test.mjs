import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {faceMovement2d,cameraFacingDegrees} from '../js/core/character-facing.js';
import {aimActor2d,facingVector2d,facingVector3d,targetInFacingArc3d} from '../js/core/look-direction.js';
const actor=(x=0,y=0)=>({id:1,name:'Hero',x,y,w:32,h:32,depth3d:32,rotation:0});
test('2D shots follow last observed facing, not a fake mouse target to the right',()=>{
 const p=actor();
 faceMovement2d(p,-20,0);assert.deepEqual(facingVector2d(p),{x:-1,y:0});
 assert.deepEqual(aimActor2d(p,null),{x:-1,y:0});
 assert.equal(p.flipX,true);
 faceMovement2d(p,0,-10);assert.deepEqual(aimActor2d(p,null),{x:0,y:-1});
 aimActor2d(p,{x:80,y:16});assert.equal(p.facing2d,'right');assert.equal(p.flipX,false);
});
test('3D facing arc follows actual camera-controlled character orientation',()=>{
 const p=actor(),front=actor(0,100),back=actor(0,-100),side=actor(100,0);
 // In WarLike, camera yaw 0 -> rotation 180 -> looks along -ground-Y.
 p.rotation=cameraFacingDegrees(0);
 assert.ok(Math.abs(facingVector3d(p).y+1)<1e-8);
 assert.equal(targetInFacingArc3d(p,back,1.2),true);
 assert.equal(targetInFacingArc3d(p,front,1.2),false);
 assert.equal(targetInFacingArc3d(p,side,1.2),false);
 p.rotation=cameraFacingDegrees(Math.PI);
 assert.equal(targetInFacingArc3d(p,front,1.2),true);
});
test('Play does not draw editor object labels unless each object opts in',()=>{
 const renderer=readFileSync(new URL('../js/core/renderer.js',import.meta.url),'utf8');
 assert.match(renderer,/!state\.playing\|\|o\.showLabelInPlay===true/);
 assert.doesNotMatch(renderer,/!state\.playing\|\|!o\.hideLabelInPlay/);
});
test('MCP controls have no arbitrary script execution and require explicit tab consent',()=>{
 const bridge=readFileSync(new URL('../js/ui/mcp-bridge.js',import.meta.url),'utf8');
 assert.match(bridge,/permission!=='edit'\|\|state\.playing/);
 assert.match(bridge,/credentials:'omit'/);
 assert.match(bridge,/token\.type='password'/);
 assert.match(bridge,/executeMcpEditorCommand/);
 assert.doesNotMatch(bridge,/eval\(|new Function\(/);
});
