// Customizable editor palette, independent from Hub and scene project data.
const KEY='warlike.editor.palette.v1';
export const defaultPalette={menu:'#222832',toolbar:'#252d38',panel:'#252b34',header:'#303944',button:'#354251',border:'#455363',muted:'#a8b8c8',scene:'#121923',footer:'#171d25',fontSize:12,fontWeight:'500'};
const fields={menu:'editorMenuColor',toolbar:'editorToolbarColor',panel:'editorPanelColor',header:'editorHeaderColor',button:'editorButtonColor',border:'editorBorderColor',muted:'editorMutedColor',scene:'editorSceneColor',footer:'editorFooterColor',fontSize:'editorFontSize',fontWeight:'editorFontWeight'};
const colorValid=value=>typeof value==='string'&&/^#[a-f0-9]{6}$/i.test(value);
export function sanitizePalette(value){
 const s=value&&typeof value==='object'?value:{};
 const result={...defaultPalette};
 for(const key of Object.keys(defaultPalette)){
  if(key==='fontSize')result[key]=Number.isFinite(Number(s[key]))?Math.max(10,Math.min(18,Math.round(Number(s[key])))):12;
  else if(key==='fontWeight')result[key]=['400','500','600','700'].includes(String(s[key]))?String(s[key]):'500';
  else if(colorValid(s[key]))result[key]=s[key];
 }
 return result;
}
export function initEditorPalette(){
 const inputs=Object.fromEntries(Object.entries(fields).map(([key,id])=>[key,document.getElementById(id)]));
 if(Object.values(inputs).some(value=>!value))return;
 let saved;try{saved=JSON.parse(localStorage.getItem(KEY)||'null')}catch{}
 let palette=sanitizePalette(saved);
 const apply=()=>{
  const root=document.documentElement;
  for(const [key,input] of Object.entries(inputs)){
   input.value=String(palette[key]);
   root.style.setProperty('--warlike-palette-'+key,palette[key]+(key==='fontSize'?'px':''));
  }
  document.getElementById('editorFontSizeValue').textContent=palette.fontSize+' px';
 };
 const save=()=>{apply();try{localStorage.setItem(KEY,JSON.stringify(palette))}catch{}};
 for(const [key,input] of Object.entries(inputs)){
  input.addEventListener(key==='fontWeight'?'change':'input',()=>{palette=sanitizePalette({...palette,[key]:input.value});save()});
 }
 document.getElementById('editorPaletteReset')?.addEventListener('click',()=>{
  palette={...palette,...Object.fromEntries(Object.entries(defaultPalette).filter(([key])=>key!=='fontSize'&&key!=='fontWeight'))};save();
 });
 document.getElementById('editorFontReset')?.addEventListener('click',()=>{palette.fontSize=12;palette.fontWeight='500';save()});
 document.getElementById('editorAppearanceReset')?.addEventListener('click',()=>{palette={...defaultPalette};save()});
 apply();
}
