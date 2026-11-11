import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root=new URL('../',import.meta.url);
const html=readFileSync(new URL('index.html',root),'utf8');
const js=readFileSync(new URL('js/ui/focus-menu.js',root),'utf8');
const css=readFileSync(new URL('css/focus-menu.css',root),'utf8');

test('compact editor menu is loaded after the existing theme styles',()=>{
 assert.match(html,/css\/focus-menu\.css/);
 assert.match(html,/js\/ui\/focus-menu\.js/);
 assert.ok(html.indexOf('css/focus-menu.css')>html.indexOf('css/responsive-editor.css'));
});
test('essential menus and quick action host remain available',()=>{
 for(const label of ['Fichier','Édition','Game'])assert.match(html,new RegExp('<summary>'+label+'</summary>'));
 for(const id of ['studioMenus','studioPrimaryActions','studioToolbarToggle','studioSecondaryToolbar','hubOpen','hubSave'])assert.match(html,new RegExp('id="'+id+'"'));
});
test('advanced menus are moved, not duplicated or destroyed',()=>{
 for(const label of ['GameObject','Assets','Component','Window','Aide'])assert.ok(js.includes("'"+label+"'"));
 assert.match(js,/contents\.append\(entry\)/);
 assert.match(js,/contents\.append\(animator\)/);
 assert.match(js,/document\.getElementById\('studioMoreMenus'\)/);
});
test('compact UI keeps toolbar opt-in and main workspace geometry',()=>{
 assert.match(css,/\.workspace\s*\{/);
 assert.match(css,/\.studio-more-popover/);
 assert.match(css,/warlike-toolbar-expanded/);
 assert.match(css,/@media\(max-width:850px\)/);
});
