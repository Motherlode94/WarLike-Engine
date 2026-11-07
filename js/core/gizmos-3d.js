import {updateAffineEditorPose3d,updateEditorEntityHierarchy3d,gizmoAxis3d,snap3d} from './scene-graph-v2.js';
import {rotationQuaternion3d} from './collider-3d.js';
// Lightweight scene-view transform gizmo: works in the existing WebGL 3D workspace.
const ns='http://www.w3.org/2000/svg';
const el=(tag,props={})=>{const node=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(props))node.setAttribute(k,String(v));return node};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function initSceneGizmo3d({canvas,host,state,view3d,project3d,objectBounds3d,getCamera,record,notify}){
 const layer=el('svg',{class:'warlike-gizmo-3d','aria-label':'Gizmo de transformation 3D'});
 layer.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:12;overflow:visible';
 const lines=['x','y','z'].map(axis=>{
  const line=el('line',{'data-gizmo-axis':axis,'stroke-width':4,'stroke-linecap':'round'});
  line.style.pointerEvents='stroke';line.style.cursor='grab';layer.append(line);return line;
 });
 const hub=el('circle',{r:7,fill:'#ffe48b',stroke:'#14202a','stroke-width':2});layer.append(hub);
 host.append(layer);
 const options=document.createElement('div');
 options.style.cssText='position:absolute;right:12px;top:12px;z-index:14;display:flex;gap:5px;align-items:center;background:#222832e8;border:1px solid #455363;border-radius:7px;padding:5px;color:#e5eaf1;font:12px Segoe UI,sans-serif';
 const mode=document.createElement('button');mode.type='button';mode.textContent='Global';mode.title='Basculer repère Local / Global';mode.setAttribute('aria-label','Repère Gizmo');mode.style.cssText='background:#303944;color:inherit;border:1px solid #455363;border-radius:4px;padding:4px 9px;cursor:pointer';mode.onclick=()=>{mode.textContent=mode.textContent==='Global'?'Local':'Global'};
 const snap=document.createElement('input');snap.type='checkbox';snap.checked=localStorage.getItem('warlike.snap3d.enabled')==='true';snap.setAttribute('aria-label','Activer snapping 3D');snap.onchange=()=>{localStorage.setItem('warlike.snap3d.enabled',String(snap.checked));document.dispatchEvent(new CustomEvent('warlike:snap3d',{detail:{enabled:snap.checked}}))};
 document.addEventListener('warlike:snap3d',e=>{snap.checked=Boolean(e.detail?.enabled)});
 const step=document.createElement('input');step.type='number';step.min='.01';step.max='20';step.step='.05';step.value=localStorage.getItem('warlike.snap3d.step')||'.5';step.title='Pas de snapping en mètres (rotation en degrés)';step.setAttribute('aria-label','Pas de snapping 3D');step.style.cssText='width:55px;background:#151b23;color:inherit;border:1px solid #455363;padding:3px';step.onchange=()=>{step.value=String(Math.min(20,Math.max(.01,Number(step.value)||.5)));localStorage.setItem('warlike.snap3d.step',step.value)};
 options.append(mode,snap,document.createTextNode('Snap'),step);host.append(options);
 let drag=null,lastTool='';
 const tool=()=>document.querySelector('.scene-tools [data-tool].active')?.dataset.tool||'move';
 const center=()=>{
  const objects=state.entities.filter(o=>state.selected.includes(o.id));
  if(!objects.length)return null;
  const pts=objects.map(objectBounds3d);
  return pts.reduce((p,b)=>[p[0]+b.x/pts.length,p[1]+b.y/pts.length,p[2]+b.z/pts.length],[0,0,0]);
 };
 const axes={x:[1,0,0],y:[0,1,0],z:[0,0,1]};
 const axisVector=(axis,o)=>gizmoAxis3d(axis,rotationQuaternion3d(o||{}),{local:mode.textContent==='Local'});
 const colors={x:'#f36868',y:'#68d781',z:'#64a9ff'};
 const redraw=()=>{
  const selected=center(),active=view3d.enabled&&!state.playing&&!!selected&&tool()!=='hand';
  layer.style.display=active?'block':'none';if(!active)return;
  const rect=canvas.getBoundingClientRect();if(rect.width<1||rect.height<1)return;
  layer.setAttribute('viewBox','0 0 '+rect.width+' '+rect.height);
  const cam=getCamera(),p=project3d(selected,cam,rect.width,rect.height);if(!p){layer.style.display='none';return}
  const mode=tool();lastTool=mode;
  hub.setAttribute('cx',p.x);hub.setAttribute('cy',p.y);
  hub.setAttribute('fill',mode==='rotate'?'#f2c66b':mode==='scale'||mode==='rect'?'#ffffff':'#ffe48b');
  for(let i=0;i<3;i++){
   const axis=['x','y','z'][i],line=lines[i],o=state.entities.find(x=>state.selected.includes(x.id)),v=axisVector(axis,o);
   const end=project3d(selected.map((n,j)=>n+v[j]*Math.max(.4,p.depth*.08)),cam,rect.width,rect.height);
   if(!end){line.style.display='none';continue}
   line.style.display='block';
   const dx=end.x-p.x,dy=end.y-p.y,len=Math.hypot(dx,dy)||1;
   const scale=mode==='rotate'?1.2:1;
   line.setAttribute('x1',p.x+dx/len*11);line.setAttribute('y1',p.y+dy/len*11);
   line.setAttribute('x2',p.x+dx/len*64*scale);line.setAttribute('y2',p.y+dy/len*64*scale);
   line.setAttribute('stroke',mode==='rotate'?'#f2c66b':mode==='scale'||mode==='rect'?'#f5d678':colors[axis]);
  }
 };
 layer.addEventListener('pointerdown',event=>{
  const axis=event.target.getAttribute('data-gizmo-axis');
  if(!axis||event.button!==0||event.altKey||state.playing)return;
  const selected=state.entities.filter(o=>state.selected.includes(o.id));
  if(!selected.length)return;
  event.preventDefault();event.stopPropagation();
  drag={pointer:event.pointerId,axis,startX:event.clientX,startY:event.clientY,mode:lastTool,
   objects:selected.map(o=>({id:o.id,x:o.x,y:o.y,elevation3d:o.elevation3d||0,w:o.w,h:o.h,depth3d:o.depth3d??o.h,rotation:o.rotation||0,rotationX3d:o.rotationX3d||0,rotationZ3d:o.rotationZ3d||0,worldMatrix3d:Array.isArray(o.worldMatrix3d)?[...o.worldMatrix3d]:null,matrixReference3d:Array.isArray(o.matrixReference3d)?[...o.matrixReference3d]:null}))};
  event.target.setPointerCapture(event.pointerId);
 });
 layer.addEventListener('pointermove',event=>{
  if(!drag||event.pointerId!==drag.pointer)return;
  const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;
  const scale=Math.max(.05,view3d.radius/Math.max(140,canvas.clientHeight))*60;
  const amount=(dx-dy)*scale/64,snapStep=snap.checked?Math.max(.01,Number(step.value)||.5):0;
  const quant=(value,increment)=>snapStep?snap3d(value,increment??snapStep):value;
  for(const start of drag.objects){
   const o=state.entities.find(o=>o.id===start.id);if(!o)continue;
   if(drag.mode==='rotate'){
    const degrees=quant((dx-dy)*.75,snapStep?Math.max(1,snapStep*30):0);
    if(drag.axis==='x')o.rotationX3d=start.rotationX3d+degrees;
    else if(drag.axis==='z')o.rotationZ3d=start.rotationZ3d+degrees;
    else o.rotation=start.rotation+degrees;
   }else if(drag.mode==='scale'||drag.mode==='rect'){
    const factor=clamp(1+(dx-dy)/140,.1,8);
    const scaled=value=>Math.max(4,Math.round(quant(value*factor/64)*64));
    if(drag.axis==='x')o.w=scaled(start.w);
    else if(drag.axis==='y')o.h=scaled(start.h);
    else o.depth3d=scaled(start.depth3d);
   }else{
    const direction=axisVector(drag.axis,{...o,rotation:start.rotation,rotationX3d:start.rotationX3d,rotationZ3d:start.rotationZ3d});
    o.x=Math.round((quant(start.x/64+direction[0]*amount))*64);
    o.elevation3d=quant(start.elevation3d+direction[1]*amount);
    o.y=Math.round((quant(start.y/64+direction[2]*amount))*64);
   }
   // Keep the authored affine shear instead of throwing it away when the gizmo moves.
   if(start.worldMatrix3d&&start.matrixReference3d)updateAffineEditorPose3d(o,start.worldMatrix3d,start.matrixReference3d);
  }
  if(drag.objects.length)updateEditorEntityHierarchy3d(state.entities,{worldOverrideIds:new Set(drag.objects.map(o=>o.id))});
  redraw();
 });
 const finish=event=>{
  if(!drag||event.pointerId!==drag.pointer)return;
  const changed=drag.objects.some(start=>{const o=state.entities.find(o=>o.id===start.id);return o&&(o.x!==start.x||o.y!==start.y||o.elevation3d!==start.elevation3d||o.w!==start.w||o.h!==start.h||o.depth3d!==start.depth3d||o.rotation!==start.rotation||o.rotationX3d!==start.rotationX3d||o.rotationZ3d!==start.rotationZ3d)});
  if(changed)record('Gizmo 3D : '+drag.mode);
  drag=null;notify();
 };
 layer.addEventListener('pointerup',finish);
 layer.addEventListener('pointercancel',finish);
 layer.addEventListener('lostpointercapture',finish);
 return redraw;
}
