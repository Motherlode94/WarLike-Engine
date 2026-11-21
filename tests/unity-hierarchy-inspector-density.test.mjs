import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
test('Hierarchy remains scene-native and keeps parent/child and drag reparent',()=>{
 const code=read('js/ui/hierarchy-view.js');
 assert.match(code,/const byId=new Map\(state\.entities/);
 assert.match(code,/object\.parentId/);
 assert.match(code,/reparentSelected\(id,parentId\)/);
 assert.match(code,/state\.selected\.includes\(object\.id\)/);
});
test('Hierarchy offers expand/collapse all and visible script tag layer metadata',()=>{
 const code=read('js/ui/hierarchy-view.js');
 for(const term of ['foldsAll(true)','foldsAll(false)','hierarchy-row-metadata','hierarchy-row-layer','hierarchy-row-tag','hierarchy-row-static','hierarchy-script-icon'])assert.ok(code.includes(term),term);
 assert.match(code,/if\(meta\.scripts\)/);
 assert.match(code,/folds\['object:'\+object\.id\]/);
});
test('Inspector continues to edit real object components and scene transform',()=>{
 const inspector=read('js/ui/inspector.js');
 for(const term of ["component(root,'Transform'","component(root,'Collider 3D'","component(root,'Mesh Renderer · Matériau'","record('Transform '+title+' '+axis)","renderSceneHierarchy"])assert.ok(inspector.includes(term),term);
 const components=read('js/ui/inspector-components.js');
 assert.ok(components.includes('Copier le composant'));
 assert.ok(components.includes('Coller les valeurs'));
 assert.ok(components.includes('Réinitialiser'));
 assert.ok(components.includes('Supprimer le composant'));
});
test('WarLike uses neutral hierarchy layout without loading old Unity visual overrides',()=>{
 const html=read('index.html');
 const manifest=JSON.parse(read('runtime-files.json'));
 for(const file of ['css/editor-hierarchy.css','css/component-picker.css']){
  assert.ok(html.includes(file),file+' not loaded');
  assert.ok(manifest.files.includes(file),file+' missing from export manifest');
 }
 for(const legacy of ['unity-workspace.css','unity-layout-refinement.css','unity-hierarchy-inspector-density.css','unity-component-picker.css']){
  assert.ok(!html.includes(legacy),legacy+' still loaded');
  assert.ok(!manifest.files.includes('css/'+legacy),legacy+' still packaged');
 }
 const css=read('css/editor-hierarchy.css');
 assert.match(css,/\.unity-hierarchy-row/);
 assert.match(css,/\[aria-selected="true"\]/);
 assert.match(css,/@container hierarchy-pane/);
});

test('Inspector identity metadata is editable and static is editor-only',()=>{
 const inspector=read('js/ui/inspector.js');
 for(const term of ["['layer','Layer'","o.layer=v||'Default'","staticToggle.checked=o.isStatic===true","o.isStatic=staticToggle.checked","ne remplace pas le type du Rigidbody"])assert.ok(inspector.includes(term),term);
 const css=read('css/editor-hierarchy.css');
 for(const term of ['.hierarchy-object-name','.hierarchy-row-metadata','@container hierarchy-pane','min-height:0','overflow:hidden'])assert.ok(css.includes(term),term);
});
