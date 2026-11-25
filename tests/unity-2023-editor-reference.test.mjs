import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../js/ui/reference-workspace.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../css/unity-workspace-regression-fix.css',import.meta.url),'utf8');
test('Unity 2023 reference: Hierarchy plus menu preserves real creation actions',()=>{
 assert.match(source,/unity-hierarchy-create/);
 assert.match(source,/quickCreateObject/);
 assert.match(source,/quickCreateCharacter/);
 assert.match(source,/entries\.append\(button\)/);
 assert.match(css,/\.unity-hierarchy-create-options/);
 assert.match(css,/\.unity-hierarchy-create:not\(\[open\]\)/);
});
test('Unity 2023 reference: source controls stay functional and belong to real GameObject menu',()=>{
 assert.match(source,/gameObjectMenu/);
 assert.match(source,/studioQuickCreate/);
 assert.match(source,/\.studio-dropdown/);
 assert.match(source,/sceneActions\.append\(sceneMenu\)/);
});
test('Unity 2023 reference: authoring Scene does not show tutorial banners',()=>{
 assert.match(css,/#view3dStatus/);
 assert.match(css,/#viewport>footer/);
 assert.match(css,/\[data-workspace="3d"\]/);
 assert(!css.includes('#canvas3d{display:none'),'3D canvas must remain visible');
});
