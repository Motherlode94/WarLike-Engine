import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {editorThemePresets,paletteContrast,contrastRatio,mixColor} from '../js/ui/editor-palette.js';

const css=readFileSync(new URL('../css/unity-hierarchy-inspector-density.css',import.meta.url),'utf8');
const section=css.split('/* Theme contrast certification')[1];
test('theme contrast overrides are scoped to editor chrome',()=>{
 assert.ok(section,'contrast patch should be loaded');
 for(const selector of ['#hierarchyPanel','.hierarchy-row-layer','.scene-tabs','#inspectorPanel','#editorSwatches']){
  assert.ok(section.includes(selector),selector);
 }
 assert.doesNotMatch(section,/#gameCanvas|canvas\s*\{|\.game-viewport/);
 for(const token of ['--wl-text-selected','--wl-text-button','--wl-text-header','--warlike-palette-border','--warlike-palette-accent']){
  assert.ok(section.includes(token),token);
 }
});
test('all preset themes resolve readable badge, tab and selection text',()=>{
 for(const [name,palette] of Object.entries(editorThemePresets)){
  const fg=paletteContrast(palette);
  assert.ok(contrastRatio(fg.button,palette.button)>=4.5,name+': badge');
  assert.ok(contrastRatio(fg.header,palette.header)>=4.5,name+': inactive tab');
  for(const weight of [.15,.18,.22]){
   const selection=mixColor(palette.accent,palette.panel,weight);
   assert.ok(contrastRatio(fg.selected,selection)>=4.5,name+': selected tab');
  }
 }
});

test('selected Scene tab and swatches use the manual editor accent, not Store-selected green',()=>{
 const parity=readFileSync(new URL('../css/store-theme-parity.css',import.meta.url),'utf8');
 const scoped=parity.split('/* Engine editor-specific palette wins over Store')[1];
 assert.ok(scoped,'editor palette priority bridge');
 assert.match(scoped,/\.scene-header \.scene-tabs \.tab\.active/);
 assert.match(scoped,/--editor-accent:var\(--warlike-palette-accent/);
 assert.match(scoped,/#editorSwatches button\{/);
 assert.match(scoped,/background-color:var\(--swatch-color\)!important/);
 assert.match(scoped,/#hierarchyPanel :is\(\.hierarchy-row-layer/);
 const appearance=readFileSync(new URL('../js/ui/editor-appearance.js',import.meta.url),'utf8');
 assert.match(appearance,/setProperty\('--swatch-color',color\)/);
});
