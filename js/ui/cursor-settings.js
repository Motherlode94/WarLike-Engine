// Editor-only cursor customization; leaves text fields, native resizing and Play controls untouched.
const key='warlike.editor.cursor.v1';
const defaults={shape:'system',color:'#48cba9',size:24,trail:false};
const shapes=new Set(['system','arrow','diamond','cross','circle']);
const validColor=value=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
export function normalizeCursorSettings(value){
 const s=value&&typeof value==='object'?value:{};
 return {shape:shapes.has(s.shape)?s.shape:defaults.shape,color:validColor(s.color)?s.color:defaults.color,size:clamp(Number.isFinite(Number(s.size))?Math.round(Number(s.size)/4)*4:24,16,48),trail:s.trail===true};
}
export function cursorSvg(shape,color,size){
 const n=clamp(Math.round(size),16,48);
 const base={arrow:'<path d="M3 2 L3 21 L8 16 L12 25 L16 23 L12 14 L21 14 Z"/>',diamond:'<path d="M12 1 L23 12 L12 23 L1 12 Z"/>',cross:'<path d="M12 1 V23 M1 12 H23"/>',circle:'<circle cx="12" cy="12" r="9"/>'};
 const path=base[shapes.has(shape)?shape:'arrow']||base.arrow;
 const fill=shape==='cross'||shape==='circle'?'none':color;
 return '<svg xmlns="http://www.w3.org/2000/svg" width="'+n+'" height="'+n+'" viewBox="0 0 26 26"><g fill="'+fill+'" stroke="#0b1018" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round">'+path+'</g></svg>';
}
export function initCursorSettings(){
 const ids=['editorCursorShape','editorCursorColor','editorCursorSize','editorCursorTrail','editorCursorSizeValue','editorCursorReset'];
 const [shape,color,size,trail,output,reset]=ids.map(id=>document.getElementById(id));
 if(ids.some((_,i)=>![shape,color,size,trail,output,reset][i]))return;
 let saved={};try{saved=JSON.parse(localStorage.getItem(key)||'{}')}catch{}
 let settings=normalizeCursorSettings(saved);
 const halo=document.createElement('div');halo.className='warlike-cursor-halo';halo.setAttribute('aria-hidden','true');document.body.append(halo);
 const apply=()=>{
  shape.value=settings.shape;color.value=settings.color;size.value=String(settings.size);trail.checked=settings.trail;output.textContent=settings.size+' px';
  const active=settings.shape!=='system';
  document.body.classList.toggle('warlike-custom-cursor',active);
  document.body.classList.toggle('warlike-cursor-trail',active&&settings.trail);
  if(active){
   const svg=cursorSvg(settings.shape,settings.color,settings.size);
   const hot=settings.shape==='arrow'?Math.max(1,Math.round(settings.size*0.12)):Math.round(settings.size*0.46);
   document.documentElement.style.setProperty('--warlike-cursor','url("data:image/svg+xml,'+encodeURIComponent(svg)+'") '+hot+' '+hot+', auto');
  }else document.documentElement.style.removeProperty('--warlike-cursor');
  halo.style.setProperty('--cursor-accent',settings.color);
  halo.style.width=halo.style.height=(settings.size*1.7)+'px';
 };
 const save=()=>{try{localStorage.setItem(key,JSON.stringify(settings))}catch{}apply()};
 shape.addEventListener('change',()=>{settings.shape=shape.value;save()});
 color.addEventListener('input',()=>{settings.color=color.value;save()});
 size.addEventListener('input',()=>{settings.size=Number(size.value);save()});
 trail.addEventListener('change',()=>{settings.trail=trail.checked;save()});
 reset.addEventListener('click',()=>{settings={...defaults};save()});
 document.addEventListener('pointermove',event=>{
  if(!settings.trail||settings.shape==='system'||event.pointerType==='touch')return;
  halo.style.transform='translate('+event.clientX+'px,'+event.clientY+'px) translate(-50%,-50%)';
 },{passive:true});
 document.addEventListener('pointerleave',()=>halo.classList.remove('visible'));
 document.addEventListener('pointerover',event=>{
  const target=event.target;
  const blocked=target instanceof Element&&!!target.closest('input,textarea,select,[contenteditable="true"],canvas,[role="separator"]');
  halo.classList.toggle('visible',settings.trail&&settings.shape!=='system'&&!blocked&&!document.body.classList.contains('playing'));
 },{passive:true});
 apply();
}
