// WarLike Studio unified theme engine. Single owner of preset and manual palette state.
// Hub styling and per-project scene assets are intentionally independent.
const KEY='warlike.editor.theme.v2';
const COLOR=/^#[0-9a-f]{6}$/i;
const P=(name,accent,surface,menu,toolbar,panel,header,button,border,muted,scene,footer,text)=>({
 name,accent,surface,menu,toolbar,panel,header,button,border,muted,scene,footer,text,font:'default',fontSize:12,fontWeight:'500'
});
export const editorThemePresets={
 graphite:P('Unity Graphite','#6c9dc8','#252629','#252629','#323438','#323438','#454950','#454950','#535a62','#adb8c1','#191b1f','#252629','#e5e7eb'),
 obsidian:P('WarLike Obsidian','#48cba9','#101316','#101316','#1c2228','#1c2228','#303a43','#303a43','#45535b','#9fadaf','#0c1115','#101316','#f1f5f9'),
 midnight:P('Midnight Blue','#4ca9d9','#101827','#101827','#192638','#192638','#283e57','#283e57','#3f5973','#a4c3d5','#0b1421','#101827','#e2f0ff'),
 violet:P('Cyber Violet','#a784f7','#171322','#171322','#261f37','#261f37','#37304d','#37304d','#574969','#baabd9','#100e1b','#171322','#f0e8ff'),
 light:P('Light Studio','#437db9','#f2f4f7','#e3e8ef','#edf1f5','#ffffff','#d8dfe7','#e9edf2','#b3beca','#536579','#e2e8ef','#e3e8ef','#253347'),
 tactical:P('Military Tactical','#98b67a','#191d1b','#191d1b','#2a302b','#2a302b','#444c3c','#444c3c','#606f57','#abb9a5','#121714','#191d1b','#e1e7d8'),
 racing:P('Racing Carbon','#ff923b','#151719','#151719','#26292d','#26292d','#3d4248','#3d4248','#5b6269','#b6bcc3','#101215','#151719','#edeff2'),
 crimson:P('Crimson Developer','#d15d6a','#171719','#171719','#262528','#262528','#403137','#403137','#63525a','#c5afb5','#110f12','#171719','#f1e7e9')
};
export const defaultPalette={...editorThemePresets.graphite};
export function isLightPalette(surface){
 if(typeof surface!=='string'||!COLOR.test(surface))return false;
 const components=[1,3,5].map(i=>parseInt(surface.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 return components[0]*.2126+components[1]*.7152+components[2]*.0722>.4;
}

const fields={
 menu:'editorMenuColor',toolbar:'editorToolbarColor',panel:'editorPanelColor',
 header:'editorHeaderColor',button:'editorButtonColor',border:'editorBorderColor',
 muted:'editorMutedColor',scene:'editorSceneColor',footer:'editorFooterColor',
 surface:'editorSurfaceColor',text:'editorTextColor',accent:'editorAccentColor',
 font:'editorFontChoice',fontSize:'editorFontSize',fontWeight:'editorFontWeight'
};
export function sanitizePalette(value,fallback=defaultPalette){
 const source=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
 const result={...fallback};
 for(const key of Object.keys(fields)){
  const v=source[key];
  if(key==='fontSize')result[key]=Number.isFinite(Number(v))&&v!==undefined&&v!==null?Math.max(10,Math.min(18,Math.round(Number(v)))):fallback[key];
  else if(key==='fontWeight')result[key]=['400','500','600','700'].includes(String(v))?String(v):fallback[key];
  else if(key==='font')result[key]=['default','compact','mono'].includes(v)?v:fallback[key];
  else if(typeof v==='string'&&COLOR.test(v))result[key]=v.toLowerCase();
 }
 return result;
}
export function initEditorPalette(){
 const select=document.getElementById('editorThemePreset');
 const inputs=Object.fromEntries(Object.entries(fields).map(([key,id])=>[key,document.getElementById(id)]));
 if(!select||Object.values(inputs).some(value=>!value))return;
 const preview=document.getElementById('editorThemePreview');
 const root=document.documentElement;
 let saved=null;try{saved=JSON.parse(localStorage.getItem(KEY)||'null')}catch{}
 let theme=saved&&Object.prototype.hasOwnProperty.call(editorThemePresets,saved.theme)?saved.theme:'graphite';
 let palette=sanitizePalette(editorThemePresets[theme]);
 if(saved?.palette&&saved.theme==='custom'){
  theme='custom';palette=sanitizePalette(saved.palette);
 }else if(saved?.palette&&saved.theme===theme){
  palette=sanitizePalette(saved.palette,editorThemePresets[theme]);
 }
 // Fresh installs always start with Unity Graphite. Old v1 manual colors must not
 // silently override the default; only explicit v2 selections are restored.
 const apply=()=>{
  for(const [key,input] of Object.entries(inputs)){
   input.value=String(palette[key]);
   if(key!=='font')root.style.setProperty('--warlike-palette-'+key,palette[key]+(key==='fontSize'?'px':''));
  }
  root.style.setProperty('--warlike-custom-surface',palette.surface);
  root.style.setProperty('--warlike-custom-text',palette.text);
  root.style.setProperty('--editor-accent',palette.accent);
  root.dataset.warlikeFont=palette.font;
  root.dataset.warlikeTheme=theme;
  root.style.colorScheme=isLightPalette(palette.panel)?'light':'dark';
  root.dataset.warlikeContrast=isLightPalette(palette.panel)?'light':'dark';
  select.value=theme;
  document.dispatchEvent(new CustomEvent('warlike:editor-theme-applied',{detail:{theme,accent:palette.accent}}));
  const out=document.getElementById('editorFontSizeValue');if(out)out.textContent=palette.fontSize+' px';
  if(preview){
   preview.replaceChildren();
   for(const key of ['surface','panel','header','button','accent','text']){
    const swatch=document.createElement('span');swatch.style.backgroundColor=palette[key];
    swatch.title=key+' : '+palette[key];preview.append(swatch);
   }
  }
  document.querySelectorAll('#editorSwatches button').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.color===palette.accent)));
 };
 const save=()=>{apply();try{localStorage.setItem(KEY,JSON.stringify({theme,palette}))}catch{}};
 const manual=(key,value)=>{palette=sanitizePalette({...palette,[key]:value},palette);theme='custom';save()};
 select.addEventListener('change',()=>{
  if(!Object.prototype.hasOwnProperty.call(editorThemePresets,select.value)){select.value=theme;return}
  theme=select.value;palette=sanitizePalette(editorThemePresets[theme]);save();
 });
 for(const [key,input] of Object.entries(inputs)){
  if(key==='accent')continue; // Owned by editor-appearance; listen for its custom event.
  input.addEventListener(['font','fontWeight'].includes(key)?'change':'input',()=>manual(key,input.value));
 }
 document.addEventListener('warlike:editor-accent-change',event=>{
  if(event.detail?.color&&COLOR.test(event.detail.color))manual('accent',event.detail.color);
 });
 document.getElementById('editorPaletteReset')?.addEventListener('click',()=>{
  const preset=editorThemePresets[theme]||defaultPalette;
  const keys=['menu','toolbar','panel','header','button','border','muted','scene','footer','surface','text'];
  palette=sanitizePalette({...palette,...Object.fromEntries(keys.map(key=>[key,preset[key]]))},palette);save();
 });
 document.getElementById('editorFontReset')?.addEventListener('click',()=>{manual('fontSize',12);manual('fontWeight','500')});
 document.getElementById('editorAdvancedReset')?.addEventListener('click',()=>{
  palette=sanitizePalette({...palette,surface:defaultPalette.surface,text:defaultPalette.text,font:'default'},palette);
  theme='custom';save();
 });
 document.getElementById('editorThemeDefault')?.addEventListener('click',()=>{
  theme='graphite';
  palette=sanitizePalette(editorThemePresets.graphite);
  save();
 });
 document.getElementById('editorAppearanceReset')?.addEventListener('click',()=>{
  theme='graphite';palette=sanitizePalette(editorThemePresets.graphite);save();
 });
 apply();
}
