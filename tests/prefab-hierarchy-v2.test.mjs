import test from 'node:test';
import assert from 'node:assert/strict';
import {
 makePrefabHierarchy,savePrefabHierarchy,instantiatePrefabHierarchy,
 createPrefabVariant,resolvePrefabVariant,savePrefabVariant,readPrefabs,instantiatePrefab
} from '../js/core/prefab-library.js';
import {canonicalScene,runtimeEntities} from '../js/core/scene-contract.js';
import {freshGameProject} from '../js/core/game-project.js';
import {prepareGameDefinition} from '../js/core/game-build.js';
const memory=()=>{const values=new Map();return {getItem:key=>values.get(key)||null,setItem:(key,v)=>values.set(key,String(v))}};
const source=()=>[
 {id:10,type:'mesh3d',name:'Véhicule',x:100,y:200,w:160,h:70,depth3d:110,color:'#aabbcc'},
 {id:11,parentId:10,type:'mesh3d',name:'Porte gauche',x:12,y:0,w:20,h:45,depth3d:9,rigidbody3d:{enabled:true},joint3d:{enabled:true,kind:'hinge',targetId:10}},
 {id:12,parentId:11,type:'mesh3d',name:'Poignée',x:2,y:4,w:7,h:3,depth3d:3,color:'#dddddd'},
 {id:13,type:'mesh3d',name:'Autre objet',x:999,y:999,w:20,h:20}
];
const prefab=()=>({...makePrefabHierarchy(source()[0],source(),{mode:'3d'}),id:'test-hierarchy'});
test('prefab captures root and descendants but no unrelated entity or scene IDs',()=>{
 const p=prefab();
 assert.deepEqual(p.nodes.map(n=>n.name),['Véhicule','Porte gauche','Poignée']);
 assert.equal(p.version,2);
 assert.equal(p.nodes[1].parentKey,p.nodes[0].key);
 assert.equal(p.nodes[2].parentKey,p.nodes[1].key);
 assert.equal(p.nodes[1].data.joint3d.targetNodeKey,p.nodes[0].key);
 assert.equal(p.nodes[1].data.joint3d.targetId,undefined);
 assert.equal(p.nodes[1].data.id,undefined);
});
test('instantiate twice remaps parents and joint target IDs without sharing objects',()=>{
 const p=prefab();
 const a=instantiatePrefabHierarchy(p,50,300,400);
 const b=instantiatePrefabHierarchy(p,a.nextId,900,950);
 assert.deepEqual(a.entities.map(e=>e.id),[50,51,52]);
 assert.deepEqual(a.entities.map(e=>e.parentId),[null,50,51]);
 assert.equal(a.entities[1].joint3d.targetId,50);
 assert.equal(b.entities[1].joint3d.targetId,53);
 assert.equal(a.entities[0].x,300);assert.equal(b.entities[0].y,950);
 assert.equal(a.entities[1].x,12,'Child local transform remains intact');
 a.entities[2].color='#000000';
 assert.notEqual(b.entities[2].color,'#000000');
 assert.deepEqual(a.entities.map(e=>e.prefabNodeKey),b.entities.map(e=>e.prefabNodeKey));
});
test('legacy saved single-object prefabs remain instantiable',()=>{
 const old={id:'legacy',name:'Legacy',components:{type:'mesh3d',w:64,h:64,color:'#abcabc'}};
 const result=instantiatePrefabHierarchy(old,5,30,50);
 assert.equal(result.entities.length,1);
 assert.deepEqual(result.entities[0],instantiatePrefab(old,5,30,50));
});
test('store roundtrip keeps hierarchy and canonical serialization survives',()=>{
 const storage=memory(),objects=source();
 const p=savePrefabHierarchy(objects[0],objects,storage,{mode:'3d'});
 const stored=readPrefabs(storage)[0];
 assert.deepEqual(stored,p);
 const {entities}=instantiatePrefabHierarchy(stored,80,300,400);
 const roundtrip=runtimeEntities(canonicalScene(entities));
 assert.equal(roundtrip.length,3);
 assert.deepEqual(roundtrip.map(x=>x.parentId??null),entities.map(x=>x.parentId??null));
 assert.equal(roundtrip[1].joint3d.targetId,80);
});
test('variants override components without changing base or structure',()=>{
 const base=prefab(),overrides={[base.nodes[1].key]:{color:'#0022ff'},[base.nodes[2].key]:{w:9}};
 const variant=createPrefabVariant(base,overrides,'Portes bleues'),resolved=resolvePrefabVariant(variant,base);
 const result=instantiatePrefabHierarchy(resolved,200,50,60);
 assert.equal(result.entities[1].color,'#0022ff');
 assert.equal(result.entities[2].w,9);
 assert.equal(result.entities[1].parentId,200);
 assert.equal(result.entities[1].joint3d.targetId,200);
 assert.equal(base.nodes[1].data.color,undefined);
 assert.throws(()=>createPrefabVariant(base,{[base.nodes[0].key]:{parentId:100}}),/structure|identifiants/);
});
test('reject cycles and broken hierarchy rather than exporting orphan entities',()=>{
 const p=prefab();
 p.nodes[0].parentKey=p.nodes[2].key;
 assert.throws(()=>instantiatePrefabHierarchy(p,20),/seule racine|Cycle/);
 p.nodes[0].parentKey=null;p.nodes[2].parentKey='nonexistent';
 assert.throws(()=>instantiatePrefabHierarchy(p,20),/Parent prefab introuvable/);
});
test('an instantiated hierarchy is carried into portable Web game definition',()=>{
 const hierarchy=instantiatePrefabHierarchy(prefab(),100,300,400);
 const actor={id:1,name:'Personnage',type:'mesh3d',playable3d:true,x:0,y:0,w:32,h:64,depth3d:32};
 const scene=[actor,...hierarchy.entities],original=structuredClone(scene);
 const build=prepareGameDefinition({entities:scene,mode:'3d',project:{...freshGameProject(),physics3d:'rapier'}});
 const exported=build.project.scenes.find(s=>s.id===build.project.startupSceneId).entities;
 assert.equal(exported.length,4);
 assert.equal(exported.find(e=>e.id===101).parentId,100);
 assert.equal(exported.find(e=>e.id===101).joint3d.targetId,100);
 assert.deepEqual(scene,original);
});

test('library variants inherit later base changes without losing local overrides',()=>{
 const storage=memory(),objects=source();
 const base=savePrefabHierarchy(objects[0],objects,storage,{mode:'3d'});
 const key=base.nodes[1].key;
 const variant=savePrefabVariant(base,{[key]:{color:'#00fefe'}},storage,{name:'Portes personnalisées'});
 assert.equal(variant.basePrefabId,base.id);
 assert.equal(readPrefabs(storage).length,2);
 const baseUpdated=structuredClone(base);
 baseUpdated.nodes[1].data.w=64;
 const raw=JSON.parse(storage.getItem('warlike.prefabs.library.v1'));
 raw[0]=baseUpdated;
 storage.setItem('warlike.prefabs.library.v1',JSON.stringify(raw));
 const again=readPrefabs(storage).find(p=>p.id===variant.id);
 const instance=instantiatePrefabHierarchy(again,400,500,600);
 assert.equal(instance.entities[1].w,64,'Variant must inherit newly updated base width');
 assert.equal(instance.entities[1].color,'#00fefe','Variant keeps overridden color');
 const broken=raw.slice(1);
 storage.setItem('warlike.prefabs.library.v1',JSON.stringify(broken));
 const invalid=readPrefabs(storage)[0];
 assert.equal(invalid.invalidVariant,true);
 assert.throws(()=>instantiatePrefabHierarchy(invalid,500),/Variante de prefab invalide/);
});

test('external 3D joint references are rejected rather than reused as stale scene IDs',()=>{
 const objects=source();
 objects[1].joint3d.targetId=13;
 assert.throws(()=>makePrefabHierarchy(objects[0],objects,{mode:'3d'}),/Articulation externe/);
 assert.equal(objects[1].joint3d.targetId,13,'A failed prefab save must not mutate the authored scene');
});
