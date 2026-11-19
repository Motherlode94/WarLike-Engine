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
