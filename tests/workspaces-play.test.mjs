import test from 'node:test';
import assert from 'node:assert/strict';
import {state} from '../js/core/state.js';
import {workspace,switchWorkspace,workspacePayload,restoreWorkspaces,captureWorkspace} from '../js/core/workspaces.js';
globalThis.document ??={dispatchEvent:()=>true};
test('2D and 3D keep separate scene objects selection and cameras',()=>{
 state.playing=false;
 workspace.mode='2d';
 state.entities=[{id:1,type:'player',x:13,y:20,w:38,h:38}];state.selected=[1];state.nextId=2;state.camera={x:0,y:0,zoom:1};
 assert.equal(switchWorkspace('3d'),true);
 assert.deepEqual(state.entities.map(e=>e.name),['Main Camera','Terrain','Directional Light']);
 state.entities.push({id:4,type:'object',x:800,y:400,w:20,h:20});state.selected=[4];state.camera.x=202;
 assert.equal(switchWorkspace('2d'),true);
 assert.equal(state.entities.length,1);assert.equal(state.entities[0].x,13);assert.deepEqual(state.selected,[1]);assert.equal(state.camera.x,0);
 assert.equal(switchWorkspace('3d'),true);
 assert.equal(state.entities.length,4);assert.deepEqual(state.selected,[4]);assert.equal(state.camera.x,202);
});
test('Play locks workspace change and keeps current project',()=>{
 state.playing=true;assert.equal(switchWorkspace('2d'),false);assert.equal(workspace.mode,'3d');state.playing=false;
});
test('JSON-style snapshot restores both independent projects',()=>{
 const saved=workspacePayload();switchWorkspace('2d');state.entities=[];captureWorkspace();
 assert.equal(restoreWorkspaces(saved),true);
 assert.equal(workspace.mode,'3d');assert.equal(state.entities.length,4);
 assert.equal(switchWorkspace('2d'),true);assert.equal(state.entities.length,1);
});
test('import mode retention does not overwrite other workspace',()=>{
 switchWorkspace('3d');const saved=workspacePayload();
 switchWorkspace('2d');assert.equal(restoreWorkspaces(saved,true),true);
 assert.equal(workspace.mode,'2d');assert.equal(state.entities.length,1);
 assert.equal(switchWorkspace('3d'),true);assert.equal(state.entities.length,4);
});
