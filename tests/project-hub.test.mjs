import test from 'node:test';
import assert from 'node:assert/strict';
import {state} from '../js/core/state.js';
import {workspace} from '../js/core/workspaces.js';
const elements=new Map();
globalThis.localStorage={
 getItem:k=>elements.get(k)??null,
 setItem:(k,v)=>{elements.set(k,String(v))},
 removeItem:k=>elements.delete(k)
};
globalThis.document={
 dispatchEvent:()=>true,
 querySelector:()=>({replaceChildren(){},append(){},disabled:false,textContent:''}),
 createElement:()=>({textContent:'',classList:{toggle(){}},onclick:null})
};
const {createProject,openProject,saveProject,listProjects,renameProject,deleteProject}=await import('../js/core/project-hub.js');

test('Hub saves independently named 2D and 3D projects',()=>{
 state.playing=false;
 const a=createProject('Arena 2D','2d');
 assert.equal(workspace.mode,'2d');
 state.entities.push({id:2,name:'Arena wall',type:'object',x:100,y:100,w:50,h:50,color:'#aabbcc'});
 state.nextId=3;assert.equal(saveProject(),true);
 const b=createProject('World 3D','3d');
 assert.equal(workspace.mode,'3d');
 assert.ok(state.entities.some(o=>o.type==='mesh3d'&&o.playable3d));
 assert.equal(listProjects().length,2);
 assert.ok(renameProject(b,'World Renamed'));
 assert.equal(listProjects().find(p=>p.id===b).name,'World Renamed');
 openProject(a);
 assert.ok(state.entities.some(o=>o.name==='Arena wall'));
 assert.equal(state.entities.some(o=>o.type==='mesh3d'),false);
 openProject(b);
 assert.ok(state.entities.some(o=>o.playable3d));
 deleteProject(a);
 assert.equal(listProjects().length,1);
});
