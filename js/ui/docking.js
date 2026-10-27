// WarLike Studio dockable and resizable editor windows.
const storageKey='warlike.workspace.layout.v1';
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const panelMap={hierarchy:'hierarchyPanel',inspector:'inspectorPanel',project:'projectPanel'};
const defaults={leftWidth:245,rightWidth:350,float:{}};
let layout;
try{layout={...defaults,...JSON.parse(localStorage.getItem(storageKey)||'{}')}}catch{layout={...defaults,float:{}}}
layout.float=layout.float&&typeof layout.float==='object'&&!Array.isArray(layout.float)?layout.float:{};
for(const kind of Object.keys(layout.float)){
 const f=layout.float[kind];
 if(!panelMap[kind]||!f||!['x','y','width','height'].every(key=>Number.isFinite(f[key])))delete layout.float[kind];
}
if(!Number.isFinite(layout.leftWidth))layout.leftWidth=defaults.leftWidth;
if(!Number.isFinite(layout.rightWidth))layout.rightWidth=defaults.rightWidth;
// Preserve user-customized layouts. Upgrade only untouched legacy defaults once.
try{if(!localStorage.getItem('warlike.layout.v3.2.migrated')){if(!Object.keys(layout.float).length&&[220,245].includes(layout.leftWidth)&&[275,350].includes(layout.rightWidth)){layout.leftWidth=245;layout.rightWidth=350;}localStorage.setItem('warlike.layout.v3.2.migrated','1')}}catch{}
const $=id=>document.getElementById(id);
const save=()=>{try{localStorage.setItem(storageKey,JSON.stringify(layout))}catch{}};
function applyWidths(){
 const available=Math.max(420,window.innerWidth-220);
 const maxSide=Math.max(170,Math.floor(available*0.36));
 const left=layout.float.hierarchy?0:clamp(layout.leftWidth,160,Math.min(440,maxSide));
 const right=layout.float.inspector?0:clamp(layout.rightWidth,170,Math.min(480,maxSide));
 document.documentElement.style.setProperty('--left-pane-width',left+'px');
 document.documentElement.style.setProperty('--right-pane-width',right+'px');
 document.body.classList.toggle('hierarchy-floating',!!layout.float.hierarchy);
 document.body.classList.toggle('inspector-floating',!!layout.float.inspector);
 document.body.classList.toggle('project-floating',!!layout.float.project);
}
function floatPanel(kind){
 const element=$(panelMap[kind]);if(!element)return;const rect=element.getBoundingClientRect();
 layout.float[kind]={x:clamp(Math.round(rect.x+18),0,Math.max(0,innerWidth-220)),y:clamp(Math.round(rect.y+16),35,Math.max(35,innerHeight-140)),width:clamp(Math.round(rect.width),265,Math.max(265,innerWidth-24)),height:clamp(Math.round(rect.height),210,Math.max(210,innerHeight-90))};
 applyLayout();save();
}
function dockPanel(kind){delete layout.float[kind];applyLayout();save()}
function applyLayout(){
 applyWidths();
 for(const [kind,id] of Object.entries(panelMap)){
  const el=$(id),f=layout.float[kind],button=document.querySelector('[data-dock-toggle="'+kind+'"]');
  if(!el)continue;
  el.classList.toggle('floating-panel',!!f);
  if(f){el.style.left=clamp(f.x,0,Math.max(0,innerWidth-150))+'px';el.style.top=clamp(f.y,35,Math.max(35,innerHeight-110))+'px';el.style.width=clamp(f.width,260,Math.max(260,innerWidth))+'px';el.style.height=clamp(f.height,210,Math.max(210,innerHeight-35))+'px'}
  else{el.style.removeProperty('left');el.style.removeProperty('top');el.style.removeProperty('width');el.style.removeProperty('height')}
  if(button){button.textContent=f?'↧':'▣';button.title=f?'Ancrer '+kind:'Détacher '+kind}
 }
}
function bindColumnSplitter(splitterId,side){
 const handle=$(splitterId);if(!handle)return;let dragging=null;
 function setWidth(v){layout[side==='left'?'leftWidth':'rightWidth']=clamp(Math.round(v),side==='left'?160:190,side==='left'?440:480);applyWidths();save()}
 handle.addEventListener('pointerdown',e=>{if(e.button!==0)return;dragging={start:e.clientX,value:layout[side==='left'?'leftWidth':'rightWidth']};handle.setPointerCapture(e.pointerId);document.body.classList.add('resizing-panels');e.preventDefault()});
 handle.addEventListener('pointermove',e=>{if(!dragging)return;setWidth(dragging.value+(e.clientX-dragging.start)*(side==='left'?1:-1))});
 const stop=()=>{dragging=null;document.body.classList.remove('resizing-panels')};
 handle.addEventListener('pointerup',stop);handle.addEventListener('pointercancel',stop);
 handle.addEventListener('keydown',e=>{if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;e.preventDefault();const delta=(e.key==='ArrowRight'?1:-1)*(side==='left'?1:-1)*24;setWidth(layout[side==='left'?'leftWidth':'rightWidth']+delta)});
 handle.addEventListener('dblclick',()=>setWidth(side==='left'?220:275));
}
let frontZ=110;
function bringToFront(panel){
 panel.style.zIndex=String(++frontZ);
}
function bindFloating(kind){
 const panel=$(panelMap[kind]);
 const handle=document.querySelector('[data-dock-handle="'+kind+'"]');
 const button=document.querySelector('[data-dock-toggle="'+kind+'"]');
 if(!panel||!handle||!button)return;
 button.addEventListener('click',e=>{e.stopPropagation();layout.float[kind]?dockPanel(kind):floatPanel(kind);if(layout.float[kind])bringToFront(panel)});
 panel.addEventListener('pointerdown',()=>{if(layout.float[kind])bringToFront(panel)},true);
 handle.addEventListener('dblclick',e=>{if(e.target.closest('button,input,select,a'))return;layout.float[kind]?dockPanel(kind):floatPanel(kind)});
 let drag=null;
 handle.addEventListener('pointerdown',e=>{
  if(e.button!==0||e.target.closest('button,input,select,a,[role="button"]'))return;
  const rect=panel.getBoundingClientRect();
  drag={id:e.pointerId,startX:e.clientX,startY:e.clientY,x:rect.left,y:rect.top,started:false,wasFloating:!!layout.float[kind]};
  handle.setPointerCapture(e.pointerId);
 });
 handle.addEventListener('pointermove',e=>{
  if(!drag||drag.id!==e.pointerId)return;
  const dx=e.clientX-drag.startX,dy=e.clientY-drag.startY;
  if(!drag.started){
   if(Math.hypot(dx,dy)<6)return;
   if(!layout.float[kind]){
    // Dragging a docked title automatically detaches the panel.
    floatPanel(kind);
    layout.float[kind].x=drag.x;
    layout.float[kind].y=drag.y;
    applyLayout();
   }
   drag.started=true;panel.classList.add('moving-panel');
   document.body.classList.add('dragging-window');
   bringToFront(panel);
  }
  const left=clamp(drag.x+dx,0,Math.max(0,innerWidth-120));
  const top=clamp(drag.y+dy,35,Math.max(35,innerHeight-50));
  panel.style.left=left+'px';panel.style.top=top+'px';
  const f=layout.float[kind];if(f){f.x=left;f.y=top}
 });
 const stop=()=>{
  if(!drag)return;
  if(drag.started){save();panel.classList.remove('moving-panel');document.body.classList.remove('dragging-window')}
  drag=null;
 };
 handle.addEventListener('pointerup',stop);
 handle.addEventListener('pointercancel',stop);
 handle.addEventListener('lostpointercapture',stop);
 if(typeof ResizeObserver!=='undefined'){
  let pending=false;
  new ResizeObserver(()=>{
   if(!layout.float[kind]||panel.classList.contains('moving-panel')||pending)return;
   const rect=panel.getBoundingClientRect();
   if(rect.width>0&&rect.height>0){
    layout.float[kind].width=Math.round(rect.width);
    layout.float[kind].height=Math.round(rect.height);
    save();
   }
  }).observe(panel)
 }
}
const layoutPresets={
 default:{leftWidth:245,rightWidth:350,projectHeight:280},
 scene:{leftWidth:175,rightWidth:210,projectHeight:180},
 inspector:{leftWidth:165,rightWidth:420,projectHeight:235},
 assets:{leftWidth:175,rightWidth:230,projectHeight:460}
};
export function applyLayoutPreset(name){
 const preset=layoutPresets[name];
 if(!preset)return false;
 layout={leftWidth:preset.leftWidth,rightWidth:preset.rightWidth,float:{}};
 const center=document.querySelector('.center-stack');
 if(center)center.style.setProperty('--project-height',preset.projectHeight+'px');
 try{localStorage.setItem('warlike.projectHeight',String(preset.projectHeight))}catch{}
 applyLayout();save();
 window.dispatchEvent(new Event('resize'));
 return true;
}
const customLayoutKey='warlike.workspace.layout.custom.v1';
export function saveCustomLayout(){
 const center=document.querySelector('.center-stack');
 const height=parseInt(getComputedStyle(center).getPropertyValue('--project-height'),10)||320;
 const snapshot={leftWidth:layout.leftWidth,rightWidth:layout.rightWidth,float:JSON.parse(JSON.stringify(layout.float)),projectHeight:height};
 try{localStorage.setItem(customLayoutKey,JSON.stringify(snapshot));return true}catch{return false}
}
export function loadCustomLayout(){
 let saved;
 try{saved=JSON.parse(localStorage.getItem(customLayoutKey)||'null')}catch{return false}
 if(!saved||!Number.isFinite(saved.leftWidth)||!Number.isFinite(saved.rightWidth))return false;
 const safeFloat={};
 if(saved.float&&typeof saved.float==='object'&&!Array.isArray(saved.float)){
  for(const kind of Object.keys(panelMap)){
   const panel=saved.float[kind];
   if(panel&&['x','y','width','height'].every(key=>Number.isFinite(panel[key])))safeFloat[kind]=panel;
  }
 }
 layout={leftWidth:clamp(saved.leftWidth,160,440),rightWidth:clamp(saved.rightWidth,190,480),float:safeFloat};
 const center=document.querySelector('.center-stack');
 if(center&&Number.isFinite(saved.projectHeight))center.style.setProperty('--project-height',clamp(saved.projectHeight,120,650)+'px');
 applyLayout();save();window.dispatchEvent(new Event('resize'));return true;
}
let maximizedScene=false;
export function toggleMaximizeScene(force){
 maximizedScene=typeof force==='boolean'?force:!maximizedScene;
 document.body.classList.toggle('scene-maximized',maximizedScene);
 window.dispatchEvent(new Event('resize'));
 return maximizedScene;
}
export function initDocking(){
 const saveButton=document.querySelector('#layoutSaveCustom'),loadButton=document.querySelector('#layoutLoadCustom'),maxButton=document.querySelector('#layoutMaximizeScene');
 if(saveButton)saveButton.onclick=()=>{saveButton.textContent=saveCustomLayout()?'✓ Disposition enregistrée':'Enregistrement impossible'};
 if(loadButton)loadButton.onclick=()=>{loadButton.textContent=loadCustomLayout()?'✓ Disposition restaurée':'Aucune disposition enregistrée'};
 if(maxButton)maxButton.onclick=()=>{maxButton.textContent=toggleMaximizeScene()?'Restaurer la scène':'Maximiser la scène'};
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&maximizedScene)toggleMaximizeScene(false)});
 document.querySelectorAll('[data-warlike-layout]').forEach(button=>{
  button.addEventListener('click',()=>{
   applyLayoutPreset(button.dataset.warlikeLayout);
   button.closest('details')?.removeAttribute('open');
  });
 });
 bindColumnSplitter('leftSplitter','left');bindColumnSplitter('rightSplitter','right');
 for(const kind of Object.keys(panelMap))bindFloating(kind);
 applyLayout();window.addEventListener('resize',()=>applyLayout());
}
export function resetLayout(){layout={leftWidth:245,rightWidth:350,float:{}};applyLayout();save();const center=document.querySelector('.center-stack');center.style.removeProperty('--project-height');localStorage.removeItem('warlike.projectHeight')}
