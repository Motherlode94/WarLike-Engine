import test from 'node:test';
import assert from 'node:assert/strict';
import {state} from '../js/core/state.js';
import {record,undo,redo,resetHistory} from '../js/core/history.js';

// History is editor logic; provide minimal DOM controls, without a WebGL/browser.
test('Undo/Redo keeps an intentionally empty selection',()=>{
 const previousDocument=globalThis.document;
 const previous={entities:structuredClone(state.entities),selected:[...state.selected],nextId:state.nextId,playing:state.playing};
 const children=[];
 const historyPanel={replaceChildren(){children.length=0},append(node){children.push(node)}};
 const undoButton={disabled:false},redoButton={disabled:false};
 globalThis.document={
  querySelector(selector){return selector==='#history'?historyPanel:selector==='#undo'?undoButton:selector==='#redo'?redoButton:null},
  createElement(){return {classList:{toggle(){}},onclick:null,textContent:''}},
  dispatchEvent(){}
 };
 try{
  state.playing=false;state.entities=[{id:1,name:'Original',type:'object',x:0,y:0,w:32,h:32,color:'#abcdef'}];
  state.selected=[];state.nextId=2;resetHistory();
  record('Initial');
  state.entities[0].name='Edited';record('Rename');
  undo();
  assert.equal(state.entities[0].name,'Original');
  assert.deepEqual(state.selected,[],'Undo must not select the first entity');
  redo();
  assert.equal(state.entities[0].name,'Edited');
  assert.deepEqual(state.selected,[],'Redo must preserve empty selection');
  // Each authored change restores the selection saved with that edit.
  state.selected=[1];state.entities[0].name='Selected edit';record('Selected rename');
  state.selected=[];state.entities.push({id:2,name:'Second',type:'object',x:40,y:0,w:32,h:32,color:'#abcdef'});state.nextId=3;record('Add second');
  undo();
  assert.deepEqual(state.selected,[1],'Undo restores the previous edit selection');
  redo();
  assert.deepEqual(state.selected,[],'Redo restores the empty selection of its own snapshot');
 }finally{
  Object.assign(state,previous);globalThis.document=previousDocument;
 }
});
