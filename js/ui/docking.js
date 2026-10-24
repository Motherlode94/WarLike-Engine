// WarLike Studio dockable and resizable editor windows.
const storageKey='warlike.workspace.layout.v1';
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const panelMap={hierarchy:'hierarchyPanel',inspector:'inspectorPanel',project:'projectPanel'};
const defaults={leftWidth:220,rightWidth:275,float:{}};
let layout;
try{layout={...defaults,...JSON.parse(localStorage.getItem(storageKey)||'{}')}}catch{layout={...defaults,float:{}}}
layout.float=layout.float&&typeof layout.float==='object'?layout.float:{};
const $=id=>document.getElementById(id);
const save=()=>{try{localStorage.setItem(storageKey,JSON.stringify(layout))}catch{}};
function applyWidths(){
 const left=layout.float.hierarchy?0:clamp(layout.leftWidth,160,440);
 const right=layout.float.inspector?0:clamp(layout.rightWidth,190,480);
 document.documentElement.style.setProperty('--left-pane-width',left+'px');
 document.documentElement.style.setProperty('--right-pane-width',right+'px');
 document.body.classList.toggle('hierarchy-floating',!!layout.float.hierarchy);
 document.body.classList.toggle('inspector-floating',!!layout.float.inspector);
 document.body.classList.toggle('project-floating',!!layout.float.project);
}
function floatPanel(kind){
 const element=$(panelMap[kind]),rect=element.getBoundingClientRect();
 layout.float[kind]={x:clamp(Math.round(rect.x+18),0,innerWidth-220),y:clamp(Math.round(rect.y+16),35,innerHeight-140),width:clamp(Math.round(rect.width),265,Math.max(265,innerWidth-24)),height:clamp(Math.round(rect.height),210,Math.max(210,innerHeight-45))};
 applyLayout();save();
}
function dockPanel(kind){delete layout.float[kind];applyLayout();save()}
function applyLayout(){
 applyWidths();
 for(const [kind,id] of Object.entries(panelMap)){
  const el=$(id),f=layout.float[kind],button=document.querySelector('[data-dock-toggle="'+kind+'"]');
  el.classList.toggle('floating-panel',!!f);
  if(f){el.style.left=clamp(f.x,0,Math.max(0,innerWidth-150))+'px';el.style.top=clamp(f.y,35,Math.max(35,innerHeight-65))+'px';el.style.width=clamp(f.width,260,Math.max(260,innerWidth))+'px';el.style.height=clamp(f.height,210,Math.max(210,innerHeight-35))+'px'}
  else{el.style.removeProperty('left');el.style.removeProperty('top');el.style.removeProperty('width');el.style.removeProperty('height')}
  if(button){button.textContent=f?'↧':'▣';button.title=f?'Ancrer '+kind:'Détacher '+kind}
 }
}
function bindColumnSplitter(splitterId,side){
 const handle=$(splitterId);let dragging=null;
 function setWidth(v){layout[side==='left'?'leftWidth':'rightWidth']=clamp(Math.round(v),side==='left'?160:190,side==='left'?440:480);applyWidths();save()}
 handle.addEventListener('pointerdown',e=>{if(e.button!==0)return;dragging={start:e.clientX,value:layout[side==='left'?'leftWidth':'rightWidth']};handle.setPointerCapture(e.pointerId);document.body.classList.add('resizing-panels');e.preventDefault()});
 handle.addEventListener('pointermove',e=>{if(!dragging)return;setWidth(dragging.value+(e.clientX-dragging.start)*(side==='left'?1:-1))});
 const stop=()=>{dragging=null;document.body.classList.remove('resizing-panels')};
 handle.addEventListener('pointerup',stop);handle.addEventListener('pointercancel',stop);
 handle.addEventListener('keydown',e=>{if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;e.preventDefault();const delta=(e.key==='ArrowRight'?1:-1)*(side==='left'?1:-1)*24;setWidth(layout[side==='left'?'leftWidth':'rightWidth']+delta)});
 handle.addEventListener('dblclick',()=>setWidth(side==='left'?220:275));
}
function bindFloating(kind){
 const panel=$(panelMap[kind]),handle=document.querySelector('[data-dock-handle="'+kind+'"]'),button=document.querySelector('[data-dock-toggle="'+kind+'"]');
 button.addEventListener('click',e=>{e.stopPropagation();layout.float[kind]?dockPanel(kind):floatPanel(kind)});
 handle.addEventListener('dblclick',e=>{if(e.target.closest('button'))return;layout.float[kind]?dockPanel(kind):floatPanel(kind)});
 let drag=null;
 handle.addEventListener('pointerdown',e=>{if(e.button!==0||!layout.float[kind]||e.target.closest('button,input,select,a'))return;drag={pointer:e.pointerId,x:e.clientX,y:e.clientY,left:panel.getBoundingClientRect().left,top:panel.getBoundingClientRect().top};handle.setPointerCapture(e.pointerId);panel.classList.add('moving-panel');e.preventDefault()});
 handle.addEventListener('pointermove',e=>{if(!drag)return;const left=clamp(drag.left+e.clientX-drag.x,0,Math.max(0,innerWidth-120)),top=clamp(drag.top+e.clientY-drag.y,35,Math.max(35,innerHeight-50));panel.style.left=left+'px';panel.style.top=top+'px'});
 const stop=()=>{if(!drag)return;drag=null;if(layout.float[kind]){layout.float[kind].x=parseFloat(panel.style.left);layout.float[kind].y=parseFloat(panel.style.top);save()}panel.classList.remove('moving-panel')};
 handle.addEventListener('pointerup',stop);handle.addEventListener('pointercancel',stop);
 if(typeof ResizeObserver!=='undefined'){let pending=false;new ResizeObserver(()=>{if(!layout.float[kind]||panel.classList.contains('moving-panel')||pending)return;const rect=panel.getBoundingClientRect();if(rect.width>0&&rect.height>0){layout.float[kind].width=Math.round(rect.width);layout.float[kind].height=Math.round(rect.height);save()}}).observe(panel)}
}
export function initDocking(){
 bindColumnSplitter('leftSplitter','left');bindColumnSplitter('rightSplitter','right');
 for(const kind of Object.keys(panelMap))bindFloating(kind);
 applyLayout();window.addEventListener('resize',()=>applyLayout());
}
export function resetLayout(){layout={leftWidth:220,rightWidth:275,float:{}};applyLayout();save();const center=document.querySelector('.center-stack');center.style.removeProperty('--project-height');localStorage.removeItem('warlike.projectHeight')}
