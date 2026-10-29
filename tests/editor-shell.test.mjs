import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {projectPanelRange} from '../js/ui/resizable-window.js';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../css/style.css',import.meta.url),'utf8');
const editor=readFileSync(new URL('../js/editor.js',import.meta.url),'utf8');
const workspace=readFileSync(new URL('../js/ui/workspace.js',import.meta.url),'utf8');
const docking=readFileSync(new URL('../js/ui/docking.js',import.meta.url),'utf8');

test('one full-width status footer exists outside workspace and Inspector',()=>{
 assert.equal((html.match(/class="warlike-status-footer"/g)||[]).length,1);
 const footer=html.indexOf('<footer class="warlike-status-footer"');
 assert.ok(footer>html.indexOf('</main>'));
 assert.ok(footer<html.indexOf('<section id="hubOverlay"'));
 assert.match(html,/class="warlike-studio-signature brand"/);
 assert.match(css,/\.warlike-status-footer\{position:fixed!important;inset:auto 0 0 0!important;width:100vw!important/);
});

test('menus close when another menu opens and on Escape',()=>{
 assert.match(editor,/for\(const other of transientMenus\(\)\)if\(other!==owner\)other\.open=false/);
 assert.match(editor,/event\.key==='Escape'/);
});

test('Project can grow past half height while keeping a usable Scene viewport',()=>{
 for(const height of [500,600,800,1200]){const {min,max}=projectPanelRange(height,60);assert.ok(min>=0&&max>=(height-60)/2);assert.ok(height-60-max>=160)}
 const small=projectPanelRange(180,60);assert.ok(small.max>0&&small.max<120);
 assert.match(workspace,/projectPanelRange\(center\.clientHeight,chrome\)/);
 assert.match(workspace,/ResizeObserver/);
});

test('editor shell reserves the same footer height across the whole viewport',()=>{
 assert.match(css,/--warlike-footer-height:44px/);
 assert.match(css,/--warlike-menubar-height\) - var\(--warlike-toolbar-height\) - var\(--warlike-footer-height\)/);
 assert.match(css,/\.warlike-status-footer\{box-sizing:border-box;position:fixed!important/);
});

test('audio volume stays with its accessible label in tool library',()=>{
 assert.match(editor,/volumeInput\.closest\('label'\)/);
 assert.match(editor,/target\.append\(volumeLabel\)/);
});
test('Component commands close their dropdown when invoked',()=>{
 assert.match(editor,/menuOpenBlueprint[\s\S]*?closest\('details'\)\?\.removeAttribute\('open'\)/);
 assert.match(editor,/menuAddComponent[\s\S]*?closest\('details'\)\?\.removeAttribute\('open'\)/);
});

test('corrupt floating panel layouts are discarded before rendering',()=>{
 assert.match(docking,/Number\.isFinite\(f\[key\]\)/);
 assert.match(docking,/Number\.isFinite\(panel\[key\]\)/);
 assert.match(docking,/if\(!el\)continue/);
});

test('advanced UI stays available but collapses by default',()=>{
 assert.match(html,/<details class="hierarchy-history"><summary>↶ History<\/summary><div id="history"><\/div><\/details>/);
 assert.match(html,/class="toolbar-group toolbar-storage-actions"/);
 assert.match(workspace,/createElement\('details'\);prefabTools\.className='asset-folder-import prefab-tools-collapsible'/);
 assert.match(css,/\.prefab-tools-collapsible:not\(\[open\]\)>:not\(summary\)/);
});

test('cursor editor exposes shape, color, size, halo and reset controls',()=>{
 for(const id of ['editorCursorShape','editorCursorColor','editorCursorSize','editorCursorTrail','editorCursorReset'])assert.ok(html.includes('id="'+id+'"'));
 assert.match(editor,/initCursorSettings\(\)/);
 assert.match(css,/body\.warlike-custom-cursor/);
});

test('global editor appearance exposes full palette and typography',()=>{
 for(const id of ['editorMenuColor','editorToolbarColor','editorPanelColor','editorHeaderColor','editorButtonColor','editorBorderColor','editorMutedColor','editorSceneColor','editorFooterColor','editorFontSize','editorFontWeight'])assert.ok(html.includes('id="'+id+'"'));
 assert.match(editor,/initEditorPalette\(\)/);
 assert.match(css,/--warlike-palette-footer/);
 assert.match(css,/--warlike-palette-fontSize/);
});

test('primary toolbar exposes actual quick creation actions',()=>{
 assert.match(html,/id="studioQuickCreate"/);
 for(const action of ['object','character','light','audio','blueprint'])assert.ok(html.includes('data-quick-create="'+action+'"'));
 assert.match(editor,/actions\[button\.dataset\.quickCreate\]\?\.\(\)/);
 assert.doesNotMatch(html,/id="studioCompactToggle"/);
});

test('focus mode moves main actions into the top menu and reclaims scene height',()=>{
 assert.match(html,/id="studioPrimaryActions"/);
 assert.match(html,/id="studioToolbarToggle"/);
 assert.match(editor,/for\(const id of \['warlikeToolLibrary','studioQuickCreate','openBlueprint','undo','redo','play'\]\)/);
 assert.match(css,/--warlike-toolbar-height:0px/);
 assert.match(css,/warlike-toolbar-expanded\{--warlike-toolbar-height:42px\}/);
});
