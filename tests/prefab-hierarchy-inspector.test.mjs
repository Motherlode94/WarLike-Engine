import test from 'node:test';
import assert from 'node:assert/strict';
import {makePrefabHierarchy,instantiatePrefabHierarchy} from '../js/core/prefab-library.js';
import {prefabPropertyOverrides,revertInspectorPrefab} from '../js/core/inspector-prefabs.js';

const source=[
 {id:1,name:'Structure',type:'mesh3d',x:100,y:150,w:180,h:60,color:'#aabbcc'},
 {id:2,parentId:1,name:'Porte',type:'mesh3d',x:12,y:0,w:20,h:40,color:'#888888',
  joint3d:{enabled:true,kind:'hinge',targetId:1}}
];
test('Inspector compares each child against its own prefab node, not the root',()=>{
 const base={...makePrefabHierarchy(source[0],source,{mode:'3d'}),id:'door-prefab'};
 const items=instantiatePrefabHierarchy(base,30,200,300).entities;
 const root=items[0],door=items[1];
 assert.deepEqual(prefabPropertyOverrides(base,door,items),[]);
 door.color='#ff0000';
 assert.deepEqual(prefabPropertyOverrides(base,door,items),['color']);
 const changedParent=door.parentId;
 assert.equal(revertInspectorPrefab(base,door,items),true);
 assert.equal(door.color,'#888888');
 assert.equal(door.parentId,changedParent);
 assert.equal(door.joint3d.targetId,root.id);
 assert.deepEqual(prefabPropertyOverrides(base,door,items),[]);
});
test('reverting root prefab respects its scene placement',()=>{
 const base={...makePrefabHierarchy(source[0],source,{mode:'3d'}),id:'door-prefab'};
 const entries=instantiatePrefabHierarchy(base,70,900,950).entities;
 const root=entries[0];root.color='#000000';root.x=300;
 assert.deepEqual(prefabPropertyOverrides(base,root,entries),['color']);
 assert.equal(revertInspectorPrefab(base,root,entries),true);
 assert.equal(root.x,300);
 assert.equal(root.color,'#aabbcc');
});
