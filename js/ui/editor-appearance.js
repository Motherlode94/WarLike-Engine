// WarLike editor appearance — independent from the per-project Hub palette.
const COLOR_KEY='warlike.editor.accent.v1';
const SCALE_KEY='warlike.editor.scale.v1';
export const editorColors=['#48cba9','#58a6ff','#9b7beb','#ef709e','#e4a459','#85c66a','#e06c65','#a1a9b6'];
const safeGet=(key,fallback)=>{try{return localStorage.getItem(key)||fallback}catch{return fallback}};
const safeSet=(key,value)=>{try{localStorage.setItem(key,value)}catch{}};
const validColor=color=>/^#[0-9a-f]{6}$/i.test(color);
const scaleValue=value=>Math.max(75,Math.min(140,Math.round((Number(value)||100)/5)*5));
export function initEditorAppearance(){
 const root=document.documentElement;
 const picker=document.querySelector('#editorAccentColor'),range=document.querySelector('#editorScale'),out=document.querySelector('#editorScaleValue');
 const setColor=(value,persist=true)=>{
  if(!validColor(value))return;
  const color=value.toLowerCase();
  root.style.setProperty('--editor-accent',color);
  picker.value=color;
  document.querySelectorAll('#editorSwatches button').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.color===color)));
  if(persist){safeSet(COLOR_KEY,color);document.dispatchEvent(new CustomEvent('warlike:editor-accent-change',{detail:{color}}))}
 };
 const setScale=(value,persist=true)=>{
  const next=scaleValue(value);
  root.style.setProperty('--editor-ui-scale',String(next/100));
  range.value=next;
  out.textContent=next+' %';
  if(persist)safeSet(SCALE_KEY,String(next));
  window.dispatchEvent(new Event('resize'));
 };
 const container=document.querySelector('#editorSwatches');
 for(const color of editorColors){
  const btn=document.createElement('button');
  btn.type='button';btn.dataset.color=color;btn.style.background=color;btn.title=color;
  btn.setAttribute('aria-label','Utiliser la couleur '+color);
  btn.onclick=()=>setColor(color);
  container.append(btn);
 }
 picker.oninput=()=>setColor(picker.value);
 range.oninput=()=>setScale(range.value);
 document.querySelector('#editorScaleDown').onclick=()=>setScale(Number(range.value)-5);
 document.querySelector('#editorScaleUp').onclick=()=>setScale(Number(range.value)+5);
 document.querySelector('#editorScaleReset').onclick=()=>setScale(100);
 document.querySelector('#editorAppearanceReset').onclick=()=>{setColor(editorColors[0]);setScale(100)};
 const appearance=document.querySelector('.editor-appearance');
 if(appearance){
  document.addEventListener('pointerdown',event=>{
   if(appearance.open&&!appearance.contains(event.target))appearance.open=false;
  });
  document.addEventListener('keydown',event=>{
   if(event.key==='Escape'&&appearance.open){appearance.open=false;appearance.querySelector('summary')?.focus()}
  });
 }
  setColor(safeGet(COLOR_KEY,editorColors[0]),false);
 setScale(safeGet(SCALE_KEY,'100'),false);
}
