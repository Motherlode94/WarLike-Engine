import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../css/unity-workspace-regression-fix.css',import.meta.url),'utf8');

test('UI regression: Unity-like four dock layout keeps Hierarchy, Scene/Game, Project and Inspector',()=>{
 for(const id of ['hierarchyPanel','sceneTab','gameTab','projectPanel','projectTab','consoleTab','inspectorPanel','properties'])
  assert(html.includes(`id="${id}"`),`missing ${id}`);
 assert.match(css,/\.workspace\s*\{/);
 assert.match(css,/grid-template-columns:clamp\(215px/);
 assert.match(css,/\.center-stack/);
});
test('UI regression: project Hub appearance is collapsible, not mixed into the project launcher',()=>{
 assert.match(html,/<details class="hub-appearance-settings"><summary>Apparence du Hub<\/summary>/);
 assert.match(html,/<\/div><\/details><div class="hub-project-list-title">/);
 for(const id of ['hubAccentColor','hubThemePalette','hubThemeReset','hubProjects','hubCreate','hubProjectSearch'])
  assert(html.includes(`id="${id}"`));
});
test('UI regression: all Scene lighting and zoom commands remain operable in contextual menu',()=>{
 assert.match(html,/<details class="scene-view-options">/);
 assert.match(html,/<div class="scene-view-options-menu">/);
 for(const id of ['sunHour','dayNightToggle','dayNightSpeed','zoomOut','zoomIn','resetView'])
  assert(html.includes(`id="${id}"`));
 assert.match(css,/\.scene-view-options\[open\]/);
 assert.match(css,/\.scene-view-options-menu/);
});
test('UI regression: no global engine palette or 3D canvas rewrites',()=>{
 assert.match(html,/css\/unity-workspace-regression-fix\.css/);
 assert(!css.includes('canvas3d{'),'canvas 3D must not be restyled');
 assert(!css.includes('html[data-wl-theme]'),'global palette must not be changed');
 assert(!css.includes('body{background'),'global app background must not be changed');
});
