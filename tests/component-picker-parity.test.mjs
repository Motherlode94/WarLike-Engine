import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {componentChoices} from '../js/core/component-definitions.js';
import {componentBrowserMatches,componentBrowserCategory,orderComponentBrowserOptions,unityComponentCategory,unityComponentCategories} from '../js/ui/component-browser.js';

test('Add Component exposes every Web component supported by the active mode',()=>{
 const source=readFileSync(new URL('../js/ui/component-browser.js',import.meta.url),'utf8');
 assert.match(source,/const options=componentChoices\(workspace\.mode\)/);
 assert.doesNotMatch(source,/componentChoices\(workspace\.mode\)\.filter/);
 for(const mode of ['2d','3d']){
  const choices=componentChoices(mode);
  assert.ok(choices.length>12);
  for(const id of ['webScripts','warScripts','sequence','stats','inventory']){
   assert.ok(choices.some(d=>d.id===id),mode+' '+id);
  }
 }
});
test('search is accent-aware in French and searches descriptions/category/IDs',()=>{
 const options=componentChoices('3d');
 const ai=options.find(d=>d.id==='ai');
 assert.ok(ai);
 assert.equal(componentBrowserMatches(ai,'intelligence'),true);
 assert.equal(componentBrowserMatches(ai,'AI'),true);
 assert.equal(componentBrowserMatches(ai,'ne correspond pas'),false);
 assert.equal(componentBrowserCategory(ai),ai.category);
});
test('suggested components appear first without hiding the others',()=>{
 const items=orderComponentBrowserOptions(componentChoices('3d'));
 assert.ok(items.findIndex(x=>x.id==='controller3d')<items.findIndex(x=>x.id==='survivalWorld'));
 assert.equal(items.length,componentChoices('3d').length);
 assert.equal(new Set(items.map(x=>x.id)).size,items.length);
});
test('component category and runtime are explicit',()=>{
 assert.equal(componentBrowserCategory({id:'rigidbody3d',name:'Rigidbody 3D'}),'Physique');
 assert.equal(componentBrowserCategory({id:'warScripts',name:'WarScript'}),'Scripts');
 const source=readFileSync(new URL('../js/ui/component-browser.js',import.meta.url),'utf8');
 assert.match(source,/option\.runtime==='dotnet'/);
 assert.match(source,/Les composants déjà présents restent intacts/);
});

test('Unity categories separate physics, layout, animation and editable gameplay components',()=>{
 const options=componentChoices('3d').map(x=>({...x,runtime:'web'}));
 assert.equal(unityComponentCategory(options.find(x=>x.id==='rigidbody3d')),'Physics');
 assert.equal(unityComponentCategory(options.find(x=>x.id==='uiRect')),'Layout');
 assert.equal(unityComponentCategory(options.find(x=>x.id==='animatorGraph')),'Animation');
 const categories=unityComponentCategories(options);
 assert.ok(categories.includes('Physics')&&categories.includes('Rendering')&&categories.includes('Scripts'));
 assert.equal(new Set(options.map(x=>x.id)).size,options.length);
});
test('Add Component has category drill-down and no Script Studio navigation masquerading as component',()=>{
 const source=readFileSync(new URL('../js/ui/component-browser.js',import.meta.url),'utf8');
 assert.match(source,/component-browser-folder/);
 assert.match(source,/activeCategory=category/);
 assert.match(source,/activeCategory=null;render\(\)/);
 assert.doesNotMatch(source,/options\.push\(\{id:'script'/);
 assert.match(source,/button\.onclick=\(\)=>attach\(option\)/);
});

test('2D constraints and force fields are in Physics 2D, not miscellaneous',()=>{
 for(const id of ['joint2d','effector2d'])assert.equal(unityComponentCategory(componentChoices('2d').find(d=>d.id===id)),'Physics 2D');
});

test('native behavior catalogue is not reduced to a single Rigidbody or confused with prefabs',()=>{
 const source=readFileSync(new URL('../js/ui/component-browser.js',import.meta.url),'utf8');
 for(const name of ['VehicleController','TacticalSquad','FollowActor','Damageable','Health','Weapon','Rigidbody']){
  assert.ok(source.includes("'"+name+"'"),name);
 }
 assert.doesNotMatch(source,/nativePrimaryKinds=new Set\(\['Rigidbody'\]\)/);
 assert.match(source,/owner\.csharpComponents\.push\(\{kind,/);
 assert.doesNotMatch(source,/prefab3d|createPrefab|prefabLibrary/);
});
test('catalogue separates movement, gameplay, vehicle behavior and 2D\/3D physics',()=>{
 const source=readFileSync(new URL('../js/ui/component-browser.js',import.meta.url),'utf8');
 assert.match(source,/Vehicles:\['data-VehicleController'\]/);
 assert.match(source,/Movement:\['controller2d','controller3d'\]/);
 assert.match(source,/Physics:\['collider3d','rigidbody3d'/);
 assert.equal(unityComponentCategory({id:'data-VehicleController',name:'VehicleController'}),'Vehicles');
 assert.equal(unityComponentCategory({id:'data-FollowActor',name:'FollowActor'}),'Navigation');
 assert.equal(unityComponentCategory({id:'controller3d',name:'Contrôleur de personnage 3D'}),'Movement');
 assert.equal(unityComponentCategory({id:'collider2d',name:'Collider 2D'}),'Physics 2D');
});
test('portable components are explicitly Web; native only components remain .NET local',()=>{
 const source=readFileSync(new URL('../js/ui/component-browser.js',import.meta.url),'utf8');
 const inspector=readFileSync(new URL('../js/ui/inspector.js',import.meta.url),'utf8');
 assert.match(source,/portableComponentKinds\.has\(kind\)/);
 assert.match(source,/runtime:portable\?'web':'dotnet'/);
 assert.match(source,/runtime:'web'/);
 assert.match(inspector,/portableComponentKinds\.has\(definition\.kind\)/);
 assert.match(source,/if\(owner\.csharpComponents\.some\(c=>c\.kind===kind\)\)return false/);
});
