import {toolsState} from '../ui/workspace.js';
import {hitGizmo2d,gizmoCenter} from './gizmos-2d.js';
import {state,notify} from './state.js';
import {toWorld,zoomAt} from './camera.js';
import {record,undo,redo} from './history.js';
import {deleteSelected} from './scene.js';

// Live, screen-independent marquee rectangle. Renderer reads these world coordinates.
export const selectionBox={active:false,start:null,end:null};
export const rectFromPoints=(a,b)=>({x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.abs(a.x-b.x),h:Math.abs(a.y-b.y)});
export const touchesSelection=(entity,rect,contain=false)=>contain
 ?entity.x>=rect.x&&entity.y>=rect.y&&entity.x+entity.w<=rect.x+rect.w&&entity.y+entity.h<=rect.y+rect.h
 :entity.x<rect.x+rect.w&&entity.x+entity.w>rect.x&&entity.y<rect.y+rect.h&&entity.y+entity.h>rect.y;
export const selectInRect=(entities,rect,contain=false)=>entities.filter(e=>touchesSelection(e,rect,contain)).map(e=>e.id);
export function attachInput(canvas,host){
 let drag=null,space=false;
 const screen=e=>{const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}};
 const additive=e=>e.shiftKey||e.ctrlKey||e.metaKey;
 const clearBox=()=>{selectionBox.active=false;selectionBox.start=null;selectionBox.end=null};
 canvas.addEventListener('contextmenu',e=>e.preventDefault());
 canvas.addEventListener('pointerdown',e=>{
  if(state.playing)return;
  if(e.button!==0&&e.button!==1&&e.button!==2)return;
  const p=screen(e);
  if(e.button===1||e.button===2||space||toolsState.tool==='hand'){
   drag={mode:'pan',pointer:e.pointerId,p,x:state.camera.x,y:state.camera.y};
   canvas.setPointerCapture(e.pointerId);return;
  }
  const w=toWorld(p);
  const current=state.entities.filter(o=>state.selected.includes(o.id));
  const handle=hitGizmo2d(w,current,toolsState.tool,state.camera.zoom);
  if(handle){
   drag={mode:toolsState.tool==='rect'?'scale':toolsState.tool,axis:handle,pointer:e.pointerId,start:w,center:gizmoCenter(current),
    starting:current.map(o=>({id:o.id,x:o.x,y:o.y,w:o.w,h:o.h,rotation:o.rotation||0})),moved:false};
   canvas.setPointerCapture(e.pointerId);e.preventDefault();return;
  }
  const object=[...state.entities].reverse().find(o=>w.x>=o.x&&w.y>=o.y&&w.x<=o.x+o.w&&w.y<=o.y+o.h);
  if(!object){
   if(!additive(e)){state.selected=[];notify()}
   drag={mode:'marquee',pointer:e.pointerId,start:w,current:w,base:state.selected.slice(),add:additive(e),moved:false};
   selectionBox.start=w;selectionBox.end=w;selectionBox.active=false;
   canvas.setPointerCapture(e.pointerId);return;
  }
  if(additive(e)){
   state.selected=state.selected.includes(object.id)?state.selected.filter(id=>id!==object.id):[...state.selected,object.id];
   notify();return;
  }
  if(!state.selected.includes(object.id))state.selected=[object.id];
  drag={mode:toolsState.tool==='rotate'?'rotate':toolsState.tool==='scale'?'scale':toolsState.tool==='rect'?'rect':'move',
   pointer:e.pointerId,start:w,starting:state.entities.filter(i=>state.selected.includes(i.id))
   .map(i=>({id:i.id,x:i.x,y:i.y,w:i.w,h:i.h,rotation:i.rotation||0})),moved:false};
  canvas.setPointerCapture(e.pointerId);notify();
 });
 canvas.addEventListener('pointermove',e=>{
  if(!drag||state.playing||e.pointerId!==drag.pointer)return;
  const p=screen(e);
  if(drag.mode==='pan'){state.camera.x=drag.x+p.x-drag.p.x;state.camera.y=drag.y+p.y-drag.p.y;return}
  const w=toWorld(p),dx=w.x-drag.start.x,dy=w.y-drag.start.y;
  if(drag.mode==='marquee'){
   drag.current=w;
   drag.moved ||=Math.hypot(dx,dy)>3/(state.camera.zoom||1);
   selectionBox.active=drag.moved;selectionBox.end=w;
   if(drag.moved){
    const box=rectFromPoints(drag.start,w),ids=selectInRect(state.entities,box,dx<0);
    state.selected=drag.add?[...new Set([...drag.base,...ids])]:ids;
    notify();
   }
   return;
  }
  for(const start of drag.starting){
   const o=state.entities.find(i=>i.id===start.id);if(!o)continue;
   if(drag.mode==='rotate'){
    const center=drag.center||{x:start.x+start.w/2,y:start.y+start.h/2};
    const angle=Math.atan2(w.y-center.y,w.x-center.x)-Math.atan2(drag.start.y-center.y,drag.start.x-center.x);
    o.rotation=Math.round(start.rotation+angle*180/Math.PI);
   }else if(drag.mode==='scale'||drag.mode==='rect'){
    if(drag.axis==='uniform'){
     const factor=Math.max(.1,1+(dx+dy)/Math.max(16,start.w+start.h));
     o.w=Math.max(4,Math.round(start.w*factor));o.h=Math.max(4,Math.round(start.h*factor));
    }else{o.w=Math.max(4,Math.round(start.w+dx));o.h=Math.max(4,Math.round(start.h+dy))}
   }else{
    o.x=Math.round(start.x+(drag.axis==='y'?0:dx));
    o.y=Math.round(start.y+(drag.axis==='x'?0:dy));
   }
   if(toolsState.snap){
    for(const axis of drag.mode==='move'?['x','y']:drag.mode==='rotate'?['rotation']:['w','h'])
     o[axis]=Math.round(o[axis]/(axis==='rotation'?15:16))*(axis==='rotation'?15:16);
   }
  }
  drag.moved ||=Math.abs(dx)+Math.abs(dy)>.1;
 });
 const finish=e=>{
  if(!drag||e?.pointerId!==undefined&&e.pointerId!==drag.pointer)return;
  if(drag.mode==='marquee'&&!drag.moved){state.selected=drag.base.slice()}
  if(drag.mode!=='pan'&&drag.mode!=='marquee'&&drag.moved)
   record('Modifier '+state.selected.length+' objet(s) • '+drag.mode);
  clearBox();drag=null;notify();
 };
 canvas.addEventListener('pointerup',finish);
 canvas.addEventListener('pointercancel',finish);
 canvas.addEventListener('lostpointercapture',finish);
 canvas.addEventListener('wheel',e=>{e.preventDefault();zoomAt(e.deltaY<0?1.1:1/1.1,screen(e))},{passive:false});
 window.addEventListener('keydown',e=>{
  if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
  const key=e.key.toLowerCase();
  if((e.ctrlKey||e.metaKey)&&key==='a'&&!state.playing){
   e.preventDefault();state.selected=state.entities.map(o=>o.id);notify();return;
  }
  if(key==='escape'&&!state.playing){e.preventDefault();drag=null;clearBox();state.selected=[];notify();return}
  if((e.ctrlKey||e.metaKey)&&key==='z'){e.preventDefault();e.shiftKey?redo():undo();return}
  if((e.ctrlKey||e.metaKey)&&key==='y'){e.preventDefault();redo();return}
  if(!state.playing&&(key==='delete'||key==='backspace')){e.preventDefault();deleteSelected();return}
  if(e.code==='Space')space=true;
  state.keys.add(key);
  if(key.startsWith('arrow'))e.preventDefault();
 });
 window.addEventListener('keyup',e=>{state.keys.delete(e.key.toLowerCase());if(e.code==='Space')space=false});
 window.addEventListener('blur',()=>{state.keys.clear();space=false;drag=null;clearBox()});
}
