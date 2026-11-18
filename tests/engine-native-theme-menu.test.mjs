import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Engine keeps native appearance menu and suppresses duplicate floating theme selector',()=>{
 const html=read('index.html');
 const script=read('design-system/warlike-theme-switcher-v2.js');
 assert.match(html,/id="editorAppearance"/);
 assert.match(html,/id="editorThemePreset"/);
 assert.match(script,/dataset\.warlikeApp==='warlike-engine'/);
 assert.match(script,/getElementById\('warlike-theme-switcher'\)\?\.remove\(\)/);
});
test('saved palette applies without mounting duplicate controls',()=>{
 const script=read('design-system/warlike-theme-switcher-v2.js');
 assert.match(script,/initializeWarLikeTheme\(\)/);
 assert.match(script,/localStorage\.getItem\(WARLIKE_THEME_KEY\)/);
 assert.match(script,/return null;\s*}\s*const old/);
});
