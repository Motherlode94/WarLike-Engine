import test from 'node:test';
import assert from 'node:assert/strict';
import {AnimationPreview,animationEditorPreview,hasAnimationEditorPreviews,stopAnimationEditorPreviews,createClip} from '../js/core/animation-clips.js';
import {state} from '../js/core/state.js';
import {workspace,switchWorkspace,workspacePayload} from '../js/core/workspaces.js';
import {freshGameProject,gameProject} from '../js/core/game-project.js';
import {prepareGameDefinition} from '../js/core/game-build.js';
const values=new Map();
globalThis.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};
globalThis.document={dispatchEvent:()=>true,querySelector:()=>({replaceChildren(){},append(){},classList:{toggle(){}},disabled:false}),createElement:()=>({classList:{toggle(){}}})};
const {saveProject,openProject,hub}=await import('../js/core/project-hub.js');
function scene(){
 stopAnimationEditorPreviews();Object.assign(gameProject,freshGameProject());
 const clip=createClip('Shared',2);clip.keys=[{time:0,x:100,elevation3d:2},{time:2,x:200,elevation3d:4}];
 state.entities=[{id:1,name:'Player',type:'player',x:10,y:0,w:64,h:64},{id:2,name:'Door',type:'object',x:20,y:0,w:64,h:64}];
 state.selected=[1,2];state.nextId=3;state.playing=false;
 const original=structuredClone(state.entities),group=new AnimationPreview({editor:true});
 group.seek(state.entities[0],clip,1);animationEditorPreview.seek(state.entities[1],clip,1);
 return {original,group,clip};
}
test('group previews are restored before saving and reopening old/new 2D and 3D workspaces',()=>{
 for(const mode of ['2d','3d']){
  workspace.mode=mode;const {original}=scene();Object.assign(hub,{projectId:'preview-'+mode,projectName:'Preview '+mode,type:mode});
  assert.equal(hasAnimationEditorPreviews(),true);assert.equal(saveProject(),true);
  const stored=JSON.parse(values.get('warlike.hub.project.'+hub.projectId));
  assert.deepEqual(stored.entities,original);assert.deepEqual(stored.workspaces[mode].entities,original);
  assert.equal(hasAnimationEditorPreviews(),false);assert.equal(saveProject(),true);
  openProject(hub.projectId);assert.deepEqual(state.entities,original);
 }
});
test('export restores all preview owners, including an owner outside the active selection',()=>{
 const {original}=scene();state.selected=[2];
 const built=prepareGameDefinition({entities:state.entities,mode:'3d',project:freshGameProject()});
 assert.deepEqual(built.project.scenes[0].entities,original);assert.deepEqual(state.entities,original);
 assert.equal(hasAnimationEditorPreviews(),false);
});
test('workspace capture and switching never capture a group preview pose',()=>{
 workspace.mode='3d';let {original}=scene();
 assert.deepEqual(workspacePayload().workspaces['3d'].entities,original);
 scene();assert.equal(switchWorkspace('2d'),true);assert.deepEqual(workspace.scenes['3d'].entities,original);
 assert.equal(hasAnimationEditorPreviews(),false);
});
test('stopping a preview scope leaves unrelated and standalone previews intact',()=>{
 const {group,clip}=scene(),outside={x:40},isolated=new AnimationPreview({editor:true}),standalone=new AnimationPreview();
 isolated.seek(outside,clip,1);const independent={x:50};standalone.seek(independent,clip,1);
 stopAnimationEditorPreviews(state.entities);assert.equal(group.owner,null);assert.equal(outside.x,150);assert.equal(hasAnimationEditorPreviews(),true);
 stopAnimationEditorPreviews();stopAnimationEditorPreviews();assert.equal(outside.x,40);assert.equal(independent.x,150);
 standalone.stop();assert.equal(independent.x,50);assert.equal(hasAnimationEditorPreviews(),false);
});
test('empty preview clips do not register an active editor preview',()=>{
 stopAnimationEditorPreviews();new AnimationPreview({editor:true}).seek({x:0},createClip(),0);
 assert.equal(hasAnimationEditorPreviews(),false);
});
