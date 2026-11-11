import test from 'node:test';
import assert from 'node:assert/strict';

// The real editor controls exist in browser; this minimal surface exercises
// the actual togglePlay transaction without replacing the engine runtime.
const elements=new Map();
const control=id=>{
 if(!elements.has(id))elements.set(id,{
  textContent:'',disabled:false,attributes:{},
  classList:{add(){},remove(){},toggle(){}},
  setAttribute(k,v){this.attributes[k]=v},
  replaceChildren(){},append(){},querySelector(){return null}
 });
 return elements.get(id);
};
globalThis.document={
 dispatchEvent:()=>true,
 querySelector:selector=>control(selector),
 getElementById:id=>id==='rpgShortcuts'?null:null,
 createTextNode:text=>({textContent:text}),
 createElement:tag=>control('element-'+tag)
};
globalThis.CustomEvent??=class extends Event{constructor(type,opts){super(type);this.detail=opts?.detail}};
const {togglePlay}=await import('../js/core/scene.js');
const {state}=await import('../js/core/state.js');
const {gameProject,restoreGameProject,freshGameProject}=await import('../js/core/game-project.js');
const {workspace}=await import('../js/core/workspaces.js');

function setup(mode){
 if(state.playing)togglePlay();
 workspace.mode=mode;
 restoreGameProject({...freshGameProject(),id:'legacy-play-'+mode,title:'Ancien projet',runtimeBackend:'web'});
 state.playing=false;
 state.keys.clear();state.keyPresses.clear();
 const actor={id:1,type:mode==='3d'?'mesh3d':'player',name:'Personnage',x:40,y:70,w:40,h:78,
  playable3d:mode==='3d',color:'#aabbcc',legacyCustom:{nested:{value:3}},
  sequence:{enabled:true,event:'start',instructions:[{type:'setVariable',key:'score',value:1}]}};
 const prop={id:2,type:mode==='3d'?'mesh3d':'object',name:'Décor',x:140,y:70,w:50,h:50,color:'#ffcc88',customComponent:{active:true}};
 state.entities=[actor,prop];state.selected=[2];state.nextId=3;state.camera={x:25,y:75,zoom:1.5};
 return {entities:structuredClone(state.entities),selection:[...state.selected],camera:structuredClone(state.camera),game:structuredClone(gameProject)};
}
for(const mode of ['2d','3d'])test(mode+' Play/Stop isolates runtime objects, selection, camera, and original project',()=>{
 const expected=setup(mode),originalActor=state.entities[0];
 togglePlay();assert.equal(state.playing,true);
 assert.notEqual(state.entities[0],originalActor,'Play must use cloned GameObjects');
 state.entities[0].x=999;
 state.entities[0].legacyCustom.nested.value=99;
 state.entities.push({id:3,name:'Spawned',type:'object',x:2,y:2,w:12,h:12});
 state.selected=[3];state.nextId=4;state.camera.x=999;
 gameProject.title='Mutated in Play';gameProject.scenes.push({id:'runtime',entities:[]});
 togglePlay();assert.equal(state.playing,false);
 assert.deepEqual(state.entities,expected.entities);
 assert.deepEqual(state.selected,expected.selection);
 assert.deepEqual(state.camera,expected.camera);
 assert.equal(state.nextId,3);
 assert.deepEqual(gameProject,expected.game);
 assert.equal(state.playBackup,null);
});
test('compiled Blueprint instructions never leak back into authored graph',()=>{
 const expected=setup('2d');
 const sequence=state.entities[0].sequence;
 sequence.graph={nodes:[{id:'event',kind:'event',event:'start',x:0,y:0},{id:'action1',kind:'action',action:{type:'message',value:'test'},x:200,y:0}],links:[{from:'event',to:'action1',port:'next'}]};
 const authored=structuredClone(state.entities);
 togglePlay();
 assert.deepEqual(state.entities[0].sequence.instructions,[{type:'message',value:'test'}]);
 togglePlay();
 assert.deepEqual(state.entities,authored,'Stop must restore instructions from before compilation');
 assert.deepEqual(state.selected,expected.selection);
});
