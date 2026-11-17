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
test('Production HTML and export include the same hierarchy/Inspector layout CSS',()=>{
 const css='css/unity-hierarchy-inspector-density.css';
 assert.match(read('index.html'),/unity-hierarchy-inspector-density\.css/);
 const manifest=JSON.parse(read('runtime-files.json'));
 assert.ok(manifest.files.includes(css));
 const content=read(css);
 assert.match(content,/\.unity-hierarchy-row/);
 assert.match(content,/\.inspector-component/);
 assert.match(content,/@media\(max-width:1050px\)/);
});
