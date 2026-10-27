import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../css/style.css',import.meta.url),'utf8');
const editor=readFileSync(new URL('../js/editor.js',import.meta.url),'utf8');
const workspace=readFileSync(new URL('../js/ui/workspace.js',import.meta.url),'utf8');

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

test('Project panel cannot consume most of the Scene viewport',()=>{
 assert.match(workspace,/center\.clientHeight\*0\.5/);
});
