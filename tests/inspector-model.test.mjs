import test from 'node:test';
import assert from 'node:assert/strict';
import {InspectorSelection,mixedInspectorValue,setInspectorValue,commonInspectorFields,copyInspectorComponent,pasteInspectorComponent,inspectorNumber,inspectorMetadata} from '../js/core/inspector-model.js';
import {prefabPropertyOverrides,revertInspectorPrefab} from '../js/core/inspector-prefabs.js';

test('locked Inspector follows stable IDs through history restore, not stale references',()=>{
 const selection=new InspectorSelection(),entities=[{id:1,x:10},{id:2,x:20}];
 assert.deepEqual(selection.resolve(entities,[1],'project:scene:2d'),[entities[0]]);selection.toggle();
 const restored=[{id:1,x:50},{id:2,x:90}];assert.equal(selection.resolve(restored,[2],'project:scene:2d')[0],restored[0]);
 selection.toggle();assert.equal(selection.resolve(restored,[2],'project:scene:2d')[0],restored[1]);
});
test('lock releases after deletion and on scene, project or dimension changes',()=>{
 for(const next of ['other:scene:2d','project:other:2d','project:scene:3d']){const selection=new InspectorSelection();selection.resolve([{id:1},{id:2}],[1],'project:scene:2d');selection.toggle();assert.equal(selection.resolve([{id:1},{id:2}],[2],next)[0].id,2);assert.equal(selection.locked,false)}
 const selection=new InspectorSelection();selection.resolve([{id:1},{id:2}],[1],'same');selection.toggle();assert.equal(selection.resolve([{id:2}],[2],'same')[0].id,2);assert.equal(selection.locked,false);
});
test('locked multi-selection retains surviving objects after a deletion',()=>{
 const selection=new InspectorSelection();selection.resolve([{id:1},{id:2},{id:3}],[1,2,2],'same');selection.toggle();assert.deepEqual(selection.resolve([{id:2},{id:3}],[3],'same'),[{id:2}]);
});
test('bulk edits preserve other component values and report mixed fields',()=>{
 const objects=[{ai:{speed:3,enabled:true,target:1}},{ai:{speed:6,enabled:false,target:2}}];
 assert.deepEqual(mixedInspectorValue(objects,['ai','speed']),{value:3,mixed:true});assert.equal(setInspectorValue(objects,['ai','speed'],12),true);
 assert.deepEqual(objects.map(object=>object.ai),[{speed:12,enabled:true,target:1},{speed:12,enabled:false,target:2}]);assert.equal(mixedInspectorValue(objects,['ai','speed']).mixed,false);
});
test('bulk edit validates every target before mutating any object',()=>{
 for(const value of [NaN,Infinity,'wrong']){const objects=[{mass:1},{mass:2}];assert.equal(setInspectorValue(objects,['mass'],value),false);assert.deepEqual(objects,[{mass:1},{mass:2}])}
 const objects=[{config:{value:1}},{other:2}];assert.equal(setInspectorValue(objects,['config','value'],5),false);assert.equal(objects[0].config.value,1);
 assert.equal(setInspectorValue(objects,['__proto__','polluted'],true),false);assert.equal({}.polluted,undefined);
});
test('common fields intersect names and types, omitting arrays and private data',()=>{
 const objects=[{a:{speed:1,extra:2,nested:{enabled:true},list:[1],_cache:4}},{a:{speed:2,nested:{enabled:false},list:[2],_cache:9}}];
 assert.deepEqual(commonInspectorFields(objects,['a']),[['a','speed'],['a','nested','enabled']]);assert.deepEqual(commonInspectorFields([{x:1},{x:'one'}]),[]);
});
test('component clipboard deep copies data, preserves identity and clears absent optional values',()=>{
 const source={id:1,name:'A',stats:{hp:50,items:[1]}},target={id:2,name:'B',stats:{hp:100},optional:1};
 const copy=copyInspectorComponent(source,['stats','optional']);source.stats.hp=4;
 assert.equal(pasteInspectorComponent(target,['stats','optional'],copy),true);assert.deepEqual(target,{id:2,name:'B',stats:{hp:50,items:[1]}});copy.stats.items.push(2);assert.deepEqual(target.stats.items,[1]);
 assert.equal(pasteInspectorComponent(target,['stats'],{id:99}),false);assert.equal(target.id,2);
});
test('numeric fields accept arithmetic with precedence, parentheses and scientific notation',()=>{
 for(const [expression,value] of [['2 + 3 * 4',14],['(2 + 3) * 4',20],['-10 / 2',-5],['2^3^2',512],['1e-3 + .5',.501],['10 % 3',1]])assert.equal(inspectorNumber(expression),value);
});
test('numeric fields reject executable expressions, empty values, overflow and incomplete arithmetic',()=>{
 for(const expression of ['', ' ', '1/0','1e999','2 +','(1+2','1+2)','Math.random()','alert(1)','globalThis.x=4','2**8','1,5','1 2'])assert.throws(()=>inspectorNumber(expression),expression);
});
test('Inspector metadata survives import while filtering malformed field values',()=>{
 assert.deepEqual(inspectorMetadata({visible:false,editorHidden:true,hierarchyGroup:'Joueur',prefabSourceId:'prefab-1',inspectorOrder:['Transform','stats',null,'constructor'],prefabOverrides:['stats'],unrelated:4}),{visible:false,editorHidden:true,hierarchyGroup:'Joueur',prefabSourceId:'prefab-1',inspectorOrder:['Transform','stats'],prefabOverrides:['stats']});
 assert.deepEqual(inspectorMetadata({visible:'false',hierarchyGroup:9,inspectorOrder:'bad'}),{});
});
test('prefab revert restores components and removes additions without moving or renaming the instance',()=>{
 const prefab={id:'source',components:{type:'object',color:'#ffffff',stats:{health:100},name:'Old',x:10}},entity={id:3,name:'My instance',x:120,y:20,type:'object',color:'#000000',stats:{health:10},ai:{enabled:true},prefabSourceId:'source',prefabOverrides:['stats']};
 assert.deepEqual(prefabPropertyOverrides(prefab,entity),['color','stats','ai']);assert.equal(revertInspectorPrefab(prefab,entity),true);assert.equal(entity.id,3);assert.equal(entity.name,'My instance');assert.equal(entity.x,120);assert.equal(entity.y,20);assert.equal(entity.ai,undefined);assert.equal(entity.stats.health,100);entity.stats.health=40;assert.equal(prefab.components.stats.health,100);
 assert.equal(revertInspectorPrefab({...prefab,id:'other'},entity),false);
});
