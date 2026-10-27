import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {editorThemePresets,sanitizePalette,defaultPalette,isLightPalette} from '../js/ui/editor-palette.js';

const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ids=['graphite','obsidian','midnight','violet','light','tactical','racing','crimson'];
const colorKeys=['accent','surface','menu','toolbar','panel','header','button','border','muted','scene','footer','text'];

test('eight full themes have independent valid palettes and legible contrast',()=>{
 assert.deepEqual(Object.keys(editorThemePresets),ids);
 for(const [id,palette] of Object.entries(editorThemePresets)){
  for(const key of colorKeys)assert.match(palette[key],/^#[0-9a-f]{6}$/i,id+':'+key);
  assert.notEqual(palette.text,palette.panel,id+':foreground');
  assert.notEqual(palette.accent,palette.panel,id+':accent');
 }
});
test('manual palette sanitizer retains custom colors and bounds fonts',()=>{
 const changed=sanitizePalette({panel:'#123456',fontSize:99,font:'mono',fontWeight:'700'});
 assert.equal(changed.panel,'#123456');
 assert.equal(changed.fontSize,18);
 assert.equal(changed.font,'mono');
 assert.equal(changed.fontWeight,'700');
 assert.equal(sanitizePalette({panel:'url(https://malicious.invalid)',fontSize:-8}).panel,defaultPalette.panel);
});
test('all theme choices, swatches and full editor palette controls exist',()=>{
 const html=source('index.html');
 for(const id of ids)assert.ok(html.includes('option value="'+id+'"'),id);
 assert.ok(html.includes('id="editorThemePreview"'));
 assert.doesNotMatch(html,/const key='warlike\.editor\.advanced\.v1'/);
 for(const id of ['editorSurfaceColor','editorTextColor','editorFontChoice','editorAccentColor','editorMenuColor','editorToolbarColor','editorPanelColor','editorHeaderColor','editorButtonColor','editorBorderColor','editorMutedColor','editorSceneColor','editorFooterColor'])assert.ok(html.includes('id="'+id+'"'),id);
});
test('theme engine persists preset or customized palette and restores saved state',()=>{
 const js=source('js/ui/editor-palette.js');
 assert.match(js,/warlike\.editor\.theme\.v2/);
 assert.match(js,/localStorage\.getItem\(KEY\)/);
 assert.match(js,/localStorage\.setItem\(KEY,JSON\.stringify\(\{theme,palette\}\)\)/);
 assert.match(js,/theme='custom'/);
 assert.match(js,/warlike:editor-accent-change/);
 assert.match(source('js/ui/editor-appearance.js'),/warlike:editor-accent-change/);
});
test('theme tokens style panel chrome and the customization menu',()=>{
 const css=source('css/style.css');
 assert.match(css,/editor-theme-preview/);
 for(const token of ['menu','toolbar','panel','header','button','border','muted','scene','footer','text'])assert.ok(css.includes('--warlike-palette-'+token),token);
});

test('Unity Graphite is the default and can be restored explicitly',()=>{
 const html=source('index.html'),js=source('js/ui/editor-palette.js');
 assert.equal(defaultPalette.name,'Unity Graphite');
 assert.match(html,/id="editorThemeDefault"/);
 assert.match(js,/getElementById\('editorThemeDefault'\)/);
 assert.match(js,/theme='graphite';\s*palette=sanitizePalette\(editorThemePresets\.graphite\);\s*save\(\)/);
});

test('Hub uses hub-open class; editor palette remains scoped to Studio',()=>{
 const css=source('css/style.css');
 assert.equal(css.includes('body:not(.hub-active)'),false,'stale Hub class selector');
 assert.match(css,/body:not\(\.hub-open\) :is\(\.workspace/);
 assert.match(css,/body:not\(\.hub-open\) :is\(\.studio-menubar/);
});
test('all major editors use the same palette tokens',()=>{
 const css=source('css/style.css');
 for(const part of ['.hierarchy','.inspector','.project-panel','.blueprint-window','.warlike-animation-studio','.render-quality-panel','.editor-appearance-menu']){
  assert.ok(css.includes(part),'missing theme coverage: '+part);
 }
 const palette=source('js/ui/editor-palette.js');
 const appearance=source('js/ui/editor-appearance.js');
 assert.match(palette,/warlike:editor-theme-applied/);
 assert.match(appearance,/warlike:editor-theme-applied/);
 assert.match(palette,/root\.style\.colorScheme=/);
});

test('Light preset and custom bright palettes use light controls',()=>{
 assert.equal(isLightPalette(editorThemePresets.light.panel),true);
 assert.equal(isLightPalette(editorThemePresets.graphite.panel),false);
 assert.equal(isLightPalette('#ffffff'),true);
 assert.equal(isLightPalette('#101316'),false);
 assert.equal(isLightPalette('not-a-color'),false);
 const engine=source('js/ui/editor-palette.js');
 const css=source('css/style.css');
 assert.match(engine,/dataset\.warlikeContrast=isLightPalette\(palette\.panel\)/);
 assert.match(css,/data-warlike-contrast="light"/);
});
test('nested editor dialogs and popovers follow tokens including selected states',()=>{
 const css=source('css/style.css');
 for(const name of ['.studio-dropdown','.studio-quick-create-menu','.asset-grid','.blueprint-window','.warlike-animation-studio','.render-quality-panel','.editor-appearance-menu']){
  assert.ok(css.includes(name),'theme missed '+name);
 }
 assert.match(css,/--wl-theme-fg/);
 assert.match(css,/color-mix\(in srgb,var\(--editor-accent\)/);
});

test('new editor installations use Unity Graphite while preserving explicitly saved themes',()=>{
 const sourceCode=source('js/ui/editor-palette.js');
 assert.match(sourceCode,/saved\.theme\)\?saved\.theme:'graphite'/);
 assert.match(sourceCode,/saved\?\.palette&&saved\.theme===theme/);
 assert.doesNotMatch(sourceCode,/OLD_PALETTE_KEY|OLD_ADVANCED_KEY/);
 assert.match(sourceCode,/theme='graphite';/);
 assert.equal(defaultPalette.name,'Unity Graphite');
});
