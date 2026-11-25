import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const hub=read('js/ui/simple-hub.js'),cloud=read('js/ui/private-workspace.js'),editor=read('js/editor.js'),storage=read('js/core/project-hub.js');
test('Engine Hub has a concise create, project and cloud workflow, without renaming Engine as Studio',()=>{
 assert.match(hub,/'projects','▱ Mes projets'/);
 assert.match(hub,/'create','＋ Créer'/);
 assert.match(hub,/'cloud','☁ Cloud'/);
 assert.match(hub,/id='hubCloudPanel'/);
 assert.match(hub,/show\('create'\)/);
 assert.match(hub,/show\('projects'\)/);
 assert.match(hub,/WarLike Engine/);
 assert.doesNotMatch(hub,/make\('h2','','WarLike Studio'\)/);
 assert.doesNotMatch(hub,/make\('small','simple-hub-developer','WarLike Studio/);
 assert.match(hub,/warlike:hub-ui-ready/);
});
test('Engine account panel mounts inside the actual Cloud tab after Hub construction',()=>{
 assert.match(cloud,/getElementById\('hubCloudPanel'\)/);
 assert.match(cloud,/target\.append\(box\)/);
 assert.match(cloud,/warlike:hub-ui-ready/);
 assert.match(cloud,/if\(!target\|\|workspaceMounted\)return/);
 assert.doesNotMatch(cloud,/\.hub-heading'\)\?\.after\(box\)/);
 assert.match(cloud,/\[data-account-connect\]/);
 assert.match(cloud,/\[data-account-refresh\]/);
 assert.match(cloud,/\[data-account-save\]/);
 assert.match(cloud,/\[data-account-disconnect\]/);
});
test('Real 2D/3D project creation and opening are still tied to the editor and persistent storage',()=>{
 assert.match(editor,/initHub\(\)/);
 assert.match(editor,/initSimpleHub\(\)/);
 assert.match(storage,/export function createProject/);
 assert.match(storage,/export function openProject/);
 assert.match(storage,/export function saveProject/);
 assert.match(storage,/modal\.hidden=false/);
});
