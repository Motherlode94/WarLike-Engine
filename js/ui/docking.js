import {makeWindowResizable,bindPanelSplitter,dockedPanelWidths} from './resizable-window.js';
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
const uiScale=()=>Number.parseFloat(getComputedStyle(document.body).zoom)||1;
const viewportSize=()=>({width:innerWidth/uiScale(),height:innerHeight/uiScale()});
const save=()=>{try{localStorage.setItem(storageKey,JSON.stringify(layout))}catch{}};
function widths(prefer='right',values={}){return dockedPanelWidths({width:document.querySelector('.workspace')?.clientWidth||viewportSize().width,left:layout.leftWidth,right:layout.rightWidth,leftFloating:!!layout.float.hierarchy,rightFloating:!!layout.float.inspector,prefer,...values})}
function applyWidths(prefer){
 const {left,right}=widths(prefer);
 document.documentElement.style.setProperty('--left-pane-width',left+'px');
 document.documentElement.style.setProperty('--right-pane-width',right+'px');
 document.body.classList.toggle('hierarchy-floating',!!layout.float.hierarchy);
 document.body.classList.toggle('inspector-floating',!!layout.float.inspector);
 document.body.classList.toggle('project-floating',!!layout.float.project);
}
function floatPanel(kind){
 const element=$(panelMap[kind]);if(!element)return;const rect=element.getBoundingClientRect();
 const scale=uiScale(),viewport=viewportSize();
 layout.float[kind]={x:clamp(Math.round(rect.x/scale+18),0,Math.max(0,viewport.width-260)),y:clamp(Math.round(rect.y/scale+16),35,Math.max(35,viewport.height-210)),width:clamp(Math.round(rect.width/scale),260,Math.max(260,viewport.width-24)),height:clamp(Math.round(rect.height/scale),210,Math.max(210,viewport.height-50))};
 applyLayout();save();
}
function dockPanel(kind){delete layout.float[kind];applyLayout();save()}
function applyLayout(){
 applyWidths();
 for(const [kind,id] of Object.entries(panelMap)){
  const el=$(id),f=layout.float[kind],button=document.querySelector('[data-dock-toggle="'+kind+'"]');
  if(!el)continue;
  el.classList.toggle('floating-panel',!!f);if(f&&Number(el.style.zIndex||0)<1000)bringToFront(el);
  if(f&&!el.hasAttribute('data-window-maximized')){const viewport=viewportSize(),width=Math.min(viewport.width,Math.max(260,f.width)),height=Math.min(viewport.height-35,Math.max(210,f.height));Object.assign(f,{x:clamp(f.x,0,Math.max(0,viewport.width-width)),y:clamp(f.y,35,Math.max(35,viewport.height-height)),width,height});el.style.left=f.x+'px';el.style.top=f.y+'px';el.style.width=width+'px';el.style.height=height+'px'}
  else if(!f){for(const property of ['left','top','width','height','min-width','min-height','max-width','max-height','right','bottom'])el.style.removeProperty(property)}
  if(button){button.textContent=f?'↧':'▣';button.title=f?'Ancrer '+kind:'Détacher '+kind}
 }
}
function bindColumnSplitter(splitterId,side){
 const handle=$(splitterId);if(!handle)return;
 const property=side==='left'?'leftWidth':'rightWidth';
 let startingWidths;
 const splitter=bindPanelSplitter(handle,{direction:side==='left'?1:-1,getValue:()=>parseFloat(document.documentElement.style.getPropertyValue(side==='left'?'--left-pane-width':'--right-pane-width'))||layout[property],setValue:value=>{const next=widths(side,{[side]:Math.round(value)});if(!layout.float.hierarchy)layout.leftWidth=next.left;if(!layout.float.inspector)layout.rightWidth=next.right;applyWidths(side)},getLimits:()=>({min:widths(side,{[side]:0})[side],max:widths(side,{[side]:10000})[side]}),defaultValue:defaults[property],onStart:()=>startingWidths={leftWidth:layout.leftWidth,rightWidth:layout.rightWidth},onCancel:()=>{Object.assign(layout,startingWidths);applyWidths()},onEnd:save});
 window.addEventListener('resize',splitter.refresh);
}
let frontZ=1000;
function bringToFront(panel){
 panel.style.setProperty('z-index',String(++frontZ),'important');
}
function bindFloating(kind){
 const panel=$(panelMap[kind]);
 const handle=document.querySelector('[data-dock-handle="'+kind+'"]');
 const button=document.querySelector('[data-dock-toggle="'+kind+'"]');
 if(!panel||!handle||!button)return;
 const resizer=makeWindowResizable(panel,{enabled:()=>!!layout.float[kind],minWidth:260,minHeight:210,controls:false,onResize:rect=>{if(layout.float[kind])Object.assign(layout.float[kind],rect)},onEnd:save});
 const maximize=document.createElement('button');maximize.type='button';maximize.className='window-size-button dock-size-button';maximize.textContent='⛶';maximize.setAttribute('aria-label','Agrandir '+kind);maximize.title='Agrandir / restaurer '+kind;maximize.setAttribute('aria-pressed','false');(handle.querySelector('.dock-title-actions')||handle).append(maximize);
 maximize.onclick=e=>{e.stopPropagation();if(!layout.float[kind])floatPanel(kind);bringToFront(panel);resizer.toggleMaximize()};
 new MutationObserver(()=>{const active=panel.hasAttribute('data-window-maximized');maximize.textContent=active?'❐':'⛶';maximize.setAttribute('aria-pressed',String(active));maximize.setAttribute('aria-label',(active?'Restaurer ':'Agrandir ')+kind)}).observe(panel,{attributes:true,attributeFilter:['data-window-maximized']});
 button.addEventListener('click',e=>{e.stopPropagation();layout.float[kind]?dockPanel(kind):floatPanel(kind);if(layout.float[kind])bringToFront(panel)});
 panel.addEventListener('pointerdown',()=>{if(layout.float[kind])bringToFront(panel)},true);
 handle.addEventListener('dblclick',e=>{if(e.target.closest('button,input,select,a'))return;layout.float[kind]?dockPanel(kind):floatPanel(kind)});
 let drag=null;
 handle.addEventListener('pointerdown',e=>{
  if(e.button!==0||e.target.closest('button,input,select,a,[role="button"]'))return;
  const rect=panel.getBoundingClientRect();
  drag={id:e.pointerId,startX:e.clientX,startY:e.clientY,x:rect.left/uiScale(),y:rect.top/uiScale(),started:false,wasFloating:!!layout.float[kind]};
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
  const left=clamp(drag.x+dx/uiScale(),0,Math.max(0,viewportSize().width-panel.offsetWidth));
  const top=clamp(drag.y+dy/uiScale(),35,Math.max(35,viewportSize().height-panel.offsetHeight));
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
   if(!layout.float[kind]||panel.hasAttribute('data-window-maximized')||panel.classList.contains('moving-panel')||pending)return;
   const rect=panel.getBoundingClientRect();
   if(rect.width>0&&rect.height>0){
    layout.float[kind].width=Math.round(rect.width/uiScale());
    layout.float[kind].height=Math.round(rect.height/uiScale());
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
 layout={leftWidth:clamp(saved.leftWidth,160,640),rightWidth:clamp(saved.rightWidth,190,880),float:safeFloat};
 const center=document.querySelector('.center-stack');
 if(center&&Number.isFinite(saved.projectHeight))center.style.setProperty('--project-height',clamp(saved.projectHeight,120,650)+'px');
 applyLayout();save();window.dispatchEvent(new Event('resize'));return true;
}
let maximizedScene=false;
export function toggleMaximizeScene(force){
 maximizedScene=typeof force==='boolean'?force:!maximizedScene;
 document.body.classList.toggle('scene-maximized',maximizedScene);
 for(const button of document.querySelectorAll('[data-maximize-scene],#layoutMaximizeScene')){button.textContent=maximizedScene?'❐ Restaurer':'⛶ Agrandir la scène';button.setAttribute('aria-pressed',String(maximizedScene))}
 window.dispatchEvent(new Event('resize'));
 return maximizedScene;
}
export function initDocking(){
 const saveButton=document.querySelector('#layoutSaveCustom'),loadButton=document.querySelector('#layoutLoadCustom'),maxButton=document.querySelector('#layoutMaximizeScene');
 if(saveButton)saveButton.onclick=()=>{saveButton.textContent=saveCustomLayout()?'✓ Disposition enregistrée':'Enregistrement impossible'};
 if(loadButton)loadButton.onclick=()=>{loadButton.textContent=loadCustomLayout()?'✓ Disposition restaurée':'Aucune disposition enregistrée'};
 if(maxButton)maxButton.onclick=()=>toggleMaximizeScene();
 const sceneSize=document.createElement('button');sceneSize.type='button';sceneSize.className='scene-size-button';sceneSize.dataset.maximizeScene='';sceneSize.textContent='⛶ Agrandir la scène';sceneSize.title='Agrandir / restaurer la scène · Double-clic sur Scene ou Game';sceneSize.setAttribute('aria-pressed','false');sceneSize.onclick=()=>toggleMaximizeScene();document.querySelector('.scene-actions')?.append(sceneSize);
 for(const tab of ['sceneTab','gameTab'])$(tab)?.addEventListener('dblclick',()=>toggleMaximizeScene());
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&maximizedScene){e.preventDefault();e.stopImmediatePropagation();toggleMaximizeScene(false)}},true);
 document.querySelectorAll('[data-warlike-layout]').forEach(button=>{
  button.addEventListener('click',()=>{
   applyLayoutPreset(button.dataset.warlikeLayout);
   button.closest('details')?.removeAttribute('open');
  });
 });
 bindColumnSplitter('leftSplitter','left');bindColumnSplitter('rightSplitter','right');
 for(const kind of Object.keys(panelMap))bindFloating(kind);
 const bindWindows=()=>document.querySelectorAll('.blueprint-window,.warlike-animation-studio,.csharp-runtime-panel,.render-quality-panel').forEach(panel=>makeWindowResizable(panel,{minWidth:panel.classList.contains('blueprint-window')?480:300,minHeight:240,storageKey:panel.id?'warlike.window.bounds.'+panel.id:undefined}));
 bindWindows();new MutationObserver(bindWindows).observe(document.body,{childList:true,subtree:true});
 applyLayout();window.addEventListener('resize',()=>applyLayout());
}
export function resetLayout(){layout={leftWidth:245,rightWidth:350,float:{}};applyLayout();save();const center=document.querySelector('.center-stack');center.style.removeProperty('--project-height');localStorage.removeItem('warlike.projectHeight')}
