import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaultAnimatorGraph} from '../js/core/animator-graph.js';
import {freshGameProject,restoreGameProject} from '../js/core/game-project.js';
import {createAnimatorControllerAsset,saveAnimatorControllerAsset} from '../js/core/animator-controller-assets.js';
import {animatorControllerDragType,applyAnimatorControllerToObject,controllerDropId,pickAnimatorSceneTarget2d} from '../js/ui/project-animator-assets.js';
import {createProjectDocument} from '../js/ui/project-create-browser.js';

const actor=id=>({id,name:'Actor '+id,animatorGraph:defaultAnimatorGraph(),animationRig:{
 enabled:true,clips:[],avatar:{schema:'warlike.avatar.v1',enabled:false,bones:{},id:'avatar-'+id},
 rootMotion:{enabled:false,bone:'',axes:['x','z']},ik:[]
},model3dId:'user-glb-'+id});

test('native drag token resolves only the Animator MIME type',()=>{
 assert.equal(animatorControllerDragType,'application/x-warlike-animator-controller');
 assert.equal(controllerDropId({dataTransfer:{types:[animatorControllerDragType],getData:()=> 'anim-123'}}),'anim-123');
 assert.equal(controllerDropId({dataTransfer:{types:['text/plain'],getData:()=> 'anim-123'}}),null);
});

test('drop cancel, missing asset and confirmed assignment preserve source and target GLB rig data',()=>{
 const project=freshGameProject(),source=actor(1),target=actor(2);
 const savedRig=structuredClone(target.animationRig),savedModel=target.model3dId,previousGraph=structuredClone(target.animatorGraph);
 const asset=createAnimatorControllerAsset(project,source);
 source.animatorGraph.states[0].speed=3;saveAnimatorControllerAsset(project,source);
 assert.equal(applyAnimatorControllerToObject(project,target,asset.id,{confirmReplace:()=>false}),false);
 assert.deepEqual(target.animatorGraph,previousGraph);
 assert.throws(()=>applyAnimatorControllerToObject(project,target,'missing',{confirmReplace:()=>true}),/absent/);
 assert.equal(applyAnimatorControllerToObject(project,target,asset.id,{confirmReplace:()=>true}),true);
 assert.equal(target.animatorGraph.states[0].speed,3);
 assert.equal(target.animatorControllerRevision,asset.revision);
 assert.notStrictEqual(target.animatorGraph,asset.graph);
 assert.deepEqual(target.animationRig,savedRig);
 assert.equal(target.model3dId,savedModel);
 const exported=structuredClone(project);
 restoreGameProject(exported,{entities:[source,target]});
 assert.equal(exported.animatorControllers[0].graph.states[0].speed,3);
});

test('unlinked GameObject can receive a Controller without prior Animator',()=>{
 const project=freshGameProject(),source=actor(1),target={id:2,name:'Empty'};
 const asset=createAnimatorControllerAsset(project,source);
 assert.equal(applyAnimatorControllerToObject(project,target,asset.id),true);
 assert.equal(target.animatorControllerId,asset.id);
 assert.deepEqual(target.animatorGraph,asset.graph);
});

test('old editor-only Animator placeholder cannot be newly created',()=>{
 assert.throws(()=>createProjectDocument('animatorController'),/ressource native/);
});

test('project browser, Hierarchy and Inspector contain native drag/drop wiring',()=>{
 const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
 assert.match(read('js/ui/project-create-browser.js'),/mountAnimatorControllerProjectAssets/);
 assert.match(read('js/ui/hierarchy-view.js'),/installAnimatorControllerDrop\(row/);
 assert.match(read('js/ui/project-animator-assets.js'),/installAnimatorControllerDrop\(inspector/);
 assert.match(read('index.html'),/project-animator-assets\.css/);
});

test('Scene View 2D targets only the visible GameObject under the drop point',()=>{
 const first={id:1,name:'First',x:0,y:0,w:50,h:60},second={id:2,name:'Second',x:20,y:10,w:60,h:70};
 assert.equal(pickAnimatorSceneTarget2d([first,second],{x:30,y:30})?.id,2,'topmost object wins');
 assert.equal(pickAnimatorSceneTarget2d([first,{...second,editorHidden:true}],{x:30,y:30})?.id,1);
 assert.equal(pickAnimatorSceneTarget2d([first,second],{x:900,y:900}),null,'empty drop never uses selection');
});
test('Scene View uses native 3D picking and never assigns to selected by default',()=>{
 const source=readFileSync(new URL('../js/ui/project-animator-assets.js',import.meta.url),'utf8');
 assert.match(source,/view3d\.pickAt\(clientX,clientY\)/);
 assert.match(source,/if\(!object\)return; \/\/ Empty scene space/);
 assert.match(source,/workspace\.mode!==mode/);
 assert.match(readFileSync(new URL('../js\/editor.js',import.meta.url),'utf8'),/installAnimatorControllerSceneDrop\(\)/);
});
