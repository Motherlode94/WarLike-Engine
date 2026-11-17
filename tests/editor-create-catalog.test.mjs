import test from 'node:test';
import assert from 'node:assert/strict';
import {projectCreateTypes,createProjectDocument,listProjectDocuments,removeProjectDocument} from '../js/ui/project-create-browser.js';
import {gameProject} from '../js/core/game-project.js';

test('project document palette provides real authoring templates',()=>{
 for(const type of ['scene','material','animatorController','animationClip','audioMixer','prefab','shaderGraph'])
  assert.ok(projectCreateTypes[type]?.data&&typeof projectCreateTypes[type].data==='object',type);
});

test('project documents are scoped to their project and persist without replacing prior assets',()=>{
 const memory=new Map(),previousStorage=globalThis.localStorage,previousDocument=globalThis.document,originalId=gameProject.id;
 globalThis.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,String(v))};
 globalThis.document={dispatchEvent:()=>{}};
 try{
  gameProject.id='create-catalog-test-a';
  const first=createProjectDocument('material'),second=createProjectDocument('scene');
  assert.equal(first.type,'material');assert.equal(second.type,'scene');
  assert.equal(listProjectDocuments().length,2);
  gameProject.id='create-catalog-test-b';
  assert.equal(listProjectDocuments().length,0);
  gameProject.id='create-catalog-test-a';
  assert.equal(listProjectDocuments()[0].data.shader,'standard');
  assert.equal(removeProjectDocument(first.id),true);
  assert.equal(listProjectDocuments().length,1);
 }finally{gameProject.id=originalId;globalThis.localStorage=previousStorage;globalThis.document=previousDocument}
});
