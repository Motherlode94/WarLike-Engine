import test from 'node:test';
import assert from 'node:assert/strict';
import {saveProjectSafely,restoreProjectSafely,projectBackupKey} from '../js/core/project-storage-guard.js';

const sample=(name='Ancien projet')=>({version:5,name,workspaceMode:'3d',workspaces:{
 '2d':{entities:[],selected:[],nextId:1,camera:{x:0,y:0,zoom:1}},
 '3d':{entities:[{id:1,name:'Hero',x:0,y:0,w:64,h:64,customLegacyComponent:{test:1}}],selected:[1],nextId:2,camera:{x:0,y:0,zoom:1}}
}});
function memory(initial={},fail=null){
 const map=new Map(Object.entries(initial));
 return {map,getItem:key=>map.get(key)??null,setItem:(key,value)=>{if(fail?.(key))throw Error('storage quota');map.set(key,String(value))},removeItem:key=>map.delete(key)};
}
const key='warlike.hub.project.ancient';
test('a successful overwrite keeps a recoverable independent old project',()=>{
 const old=sample(),updated=sample('Nouvelle version');
 const storage=memory({[key]:JSON.stringify(old)});
 assert.equal(saveProjectSafely(storage,key,updated,()=>storage.setItem('warlike.hub.projects.v1','[]')),true);
 assert.equal(JSON.parse(storage.getItem(key)).name,'Nouvelle version');
 const backup=JSON.parse(storage.getItem(projectBackupKey(key)));
 assert.deepEqual(backup,old);
 assert.equal(backup.workspaces['3d'].entities[0].customLegacyComponent.test,1);
});
test('failed index update rolls a changed project back to the last valid version',()=>{
 const old=sample(),storage=memory({[key]:JSON.stringify(old)},k=>k==='warlike.hub.projects.v1');
 assert.equal(saveProjectSafely(storage,key,sample('Never commit'),()=>storage.setItem('warlike.hub.projects.v1','[]')),false);
 assert.deepEqual(JSON.parse(storage.getItem(key)),old);
});
test('a broken active project can load its previous backup without overwriting the broken bytes',()=>{
 const old=sample(),storage=memory({[key]:'{invalid-json',[projectBackupKey(key)]:JSON.stringify(old)});
 const opened=restoreProjectSafely(storage,key,data=>Array.isArray(data.workspaces['3d'].entities));
 assert.equal(opened.source,'sauvegarde de secours');
 assert.deepEqual(opened.data,old);
 assert.equal(storage.getItem(key),'{invalid-json');
});
test('only a structurally valid project can become a recovery candidate',()=>{
 const storage=memory({[key]:JSON.stringify(sample()),[projectBackupKey(key)]:JSON.stringify(sample('Backed up'))});
 assert.equal(restoreProjectSafely(storage,key,()=>false),null);
 storage.setItem(key,'{"fake":true}');
 assert.equal(restoreProjectSafely(storage,key,()=>true).source,'sauvegarde de secours');
});
test('missing files, old single workspace and unrelated local UI settings are left intact',()=>{
 const storage=memory({'warlike.workspace.layout.v1':'{"leftWidth":900}'});
 assert.equal(restoreProjectSafely(storage,key,()=>true),null);
 const old=JSON.stringify({workspaceMode:'3d',workspaces:{'3d':{entities:[],selected:[]}}});
 storage.setItem(key,old);
 assert.equal(restoreProjectSafely(storage,key,()=>true),null);
 assert.equal(storage.getItem(key),old);
 assert.equal(storage.getItem('warlike.workspace.layout.v1'),'{"leftWidth":900}');
});
