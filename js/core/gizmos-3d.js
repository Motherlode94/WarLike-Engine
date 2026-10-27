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
 let drag=null,lastTool='';
 const tool=()=>document.querySelector('.scene-tools [data-tool].active')?.dataset.tool||'move';
 const center=()=>{
  const objects=state.entities.filter(o=>state.selected.includes(o.id));
  if(!objects.length)return null;
  const pts=objects.map(objectBounds3d);
  return pts.reduce((p,b)=>[p[0]+b.x/pts.length,p[1]+b.y/pts.length,p[2]+b.z/pts.length],[0,0,0]);
 };
 const axes={x:[1,0,0],y:[0,1,0],z:[0,0,1]};
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
   const axis=['x','y','z'][i],line=lines[i],v=axes[axis];
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
  if(!axis||event.button!==0||state.playing)return;
  const selected=state.entities.filter(o=>state.selected.includes(o.id));
  if(!selected.length)return;
  event.preventDefault();event.stopPropagation();
  drag={pointer:event.pointerId,axis,startX:event.clientX,startY:event.clientY,mode:lastTool,
   objects:selected.map(o=>({id:o.id,x:o.x,y:o.y,elevation3d:o.elevation3d||0,w:o.w,h:o.h,rotation:o.rotation||0}))};
  event.target.setPointerCapture(event.pointerId);
 });
 layer.addEventListener('pointermove',event=>{
  if(!drag||event.pointerId!==drag.pointer)return;
  const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;
  const scale=Math.max(.05,view3d.radius/Math.max(140,canvas.clientHeight))*60;
  for(const start of drag.objects){
   const o=state.entities.find(o=>o.id===start.id);if(!o)continue;
   if(drag.mode==='rotate')o.rotation=start.rotation+(dx-dy)*.75;
   else if(drag.mode==='scale'||drag.mode==='rect'){const factor=clamp(1+(dx-dy)/140,.1,8);o.w=Math.max(4,Math.round(start.w*factor));o.h=Math.max(4,Math.round(start.h*factor))}
   else if(drag.axis==='x')o.x=Math.round(start.x+dx*scale);
   else if(drag.axis==='y')o.elevation3d=Math.round((start.elevation3d-dy*scale/64)*100)/100;
   else o.y=Math.round(start.y-dy*scale);
  }
  redraw();
 });
 const finish=event=>{
  if(!drag||event.pointerId!==drag.pointer)return;
  const changed=drag.objects.some(start=>{const o=state.entities.find(o=>o.id===start.id);return o&&(o.x!==start.x||o.y!==start.y||o.elevation3d!==start.elevation3d||o.w!==start.w||o.h!==start.h||o.rotation!==start.rotation)});
  if(changed)record('Gizmo 3D : '+drag.mode);
  drag=null;notify();
 };
 layer.addEventListener('pointerup',finish);
 layer.addEventListener('pointercancel',finish);
 layer.addEventListener('lostpointercapture',finish);
 return redraw;
}
