import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {componentChoices} from '../js/core/component-definitions.js';
import {componentBrowserMatches,componentBrowserCategory,orderComponentBrowserOptions} from '../js/ui/component-browser.js';

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
