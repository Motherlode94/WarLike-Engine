import {updateAffineEditorPose3d,updateEditorEntityHierarchy3d,gizmoAxis3d,snap3d} from './scene-graph-v2.js';
import {rotationQuaternion3d} from './collider-3d.js';
import {projectedAxisDrag3d,projectedAxisScale3d,projectedAxisRotation3d,alignSceneObjects3d,snapSelected3d} from './scene-editing-3d-tools.js';
import {cameraFrustumCorners3d} from './editor-camera-frustum-3d.js';
import {sceneCameraView} from './scene-camera-3d.js';
import {initializeRustGizmo,axisRayParameter,gizmoPointerRay} from './rust-gizmo-acceleration.js';
// Lightweight scene-view transform gizmo: works in the existing WebGL 3D workspace.
const ns='http://www.w3.org/2000/svg';
const el=(tag,props={})=>{const node=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(props))node.setAttribute(k,String(v));return node};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function initSceneGizmo3d({canvas,host,state,view3d,project3d,objectBounds3d,getCamera,record,notify}){
 // Optional: enable math acceleration only if the Rust WASM build is present.
 if(!globalThis.__WARLIKE_BUILD__&&localStorage.getItem('warlike.gizmo.rust.enabled')==='true')void initializeRustGizmo();
 const layer=el('svg',{class:'warlike-gizmo-3d','aria-label':'Gizmo de transformation 3D'});
 layer.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:12;overflow:visible';
 const lines=['x','y','z'].map(axis=>{
  const line=el('line',{'data-gizmo-axis':axis,'stroke-width':4,'stroke-linecap':'round'});
  line.style.pointerEvents='stroke';line.style.cursor='grab';layer.append(line);return line;
 });
 const frustum=el('g',{'data-scene-camera-frustum':'true','stroke':'#8bd8e6','stroke-width':1.7,'fill':'none','stroke-dasharray':'6 4'});layer.append(frustum);
 const hub=el('circle',{r:7,fill:'#ffe48b',stroke:'#14202a','stroke-width':2});layer.append(hub);
 host.append(layer);
 const preview=document.createElement('canvas');
 preview.width=320;preview.height=180;
 preview.className='warlike-camera-frame-preview';
 preview.style.cssText='position:absolute;right:14px;bottom:14px;z-index:13;width:min(320px,42%);height:auto;aspect-ratio:16/9;border:1px solid #6fbcd1;border-radius:7px;background:#152638;box-shadow:0 5px 20px #0009;pointer-events:none';
 preview.setAttribute('aria-label','Aperçu schématique du cadrage Camera 3D, vue filaire');
 host.append(preview);

 const options=document.createElement('div');
 options.style.cssText='position:absolute;right:12px;top:12px;z-index:14;display:flex;gap:5px;align-items:center;background:#222832e8;border:1px solid #455363;border-radius:7px;padding:5px;color:#e5eaf1;font:12px Segoe UI,sans-serif';
 const mode=document.createElement('button');mode.type='button';mode.textContent='Global';mode.title='Basculer repère Local / Global';mode.setAttribute('aria-label','Repère Gizmo');mode.style.cssText='background:#303944;color:inherit;border:1px solid #455363;border-radius:4px;padding:4px 9px;cursor:pointer';mode.onclick=()=>{mode.textContent=mode.textContent==='Global'?'Local':'Global'};
 const snap=document.createElement('input');snap.type='checkbox';snap.checked=localStorage.getItem('warlike.snap3d.enabled')==='true';snap.setAttribute('aria-label','Activer snapping 3D');snap.onchange=()=>{localStorage.setItem('warlike.snap3d.enabled',String(snap.checked));document.dispatchEvent(new CustomEvent('warlike:snap3d',{detail:{enabled:snap.checked}}))};
 document.addEventListener('warlike:snap3d',e=>{snap.checked=Boolean(e.detail?.enabled)});
 const step=document.createElement('input');step.type='number';step.min='.01';step.max='20';step.step='.05';step.value=localStorage.getItem('warlike.snap3d.step')||'.5';step.title='Pas de snapping en mètres (rotation en degrés)';step.setAttribute('aria-label','Pas de snapping 3D');step.style.cssText='width:55px;background:#151b23;color:inherit;border:1px solid #455363;padding:3px';step.onchange=()=>{step.value=String(Math.min(20,Math.max(.01,Number(step.value)||.5)));localStorage.setItem('warlike.snap3d.step',step.value)};
 const snapMode=document.createElement('select');
 snapMode.setAttribute('aria-label','Mode de snapping 3D');snapMode.title='Accrochage grille, sommet, arête ou surface';
 snapMode.style.cssText='background:#303944;color:#e5eaf1;border:1px solid #455363;border-radius:4px;padding:4px;max-width:105px';
 for(const [value,label] of [['grid','Grille'],['vertex','Sommet'],['edge','Arête'],['surface','Surface']]){const opt=document.createElement('option');opt.value=value;opt.textContent=label;snapMode.append(opt)}
 snapMode.value=localStorage.getItem('warlike.snap3d.mode')||'grid';
 snapMode.onchange=()=>localStorage.setItem('warlike.snap3d.mode',snapMode.value);
 const action=(label,title,run)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.title=title;b.style.cssText='background:#303944;color:inherit;border:1px solid #566c70;border-radius:4px;padding:4px 8px;cursor:pointer';b.onclick=()=>{if(state.playing||!state.selected.length)return;const changed=run();if(changed){updateEditorEntityHierarchy3d(state.entities,{worldOverrideIds:new Set(state.selected)});record(title);notify();redraw()}};return b};
 const gridButton=action('Aligner grille','Aligner les objets sélectionnés sur la grille de l’éditeur',()=>snapSelected3d(state.entities,state.selected,{step:Math.max(.01,Number(step.value)||.5)}));
 const floorButton=action('Y = 0','Poser les objets au niveau zéro de la grille (repère visuel, pas un Collider)',()=>{let count=0;for(const o of state.entities.filter(o=>state.selected.includes(o.id))){if((o.elevation3d||0)!==0){o.elevation3d=0;count++}}return count});
 const alignX=action('Aligner X','Aligner les objets sélectionnés sur la position X du premier',()=>alignSceneObjects3d(state.entities,state.selected,{axis:'x'}));
 const alignZ=action('Aligner Z','Aligner les objets sélectionnés sur la position Z du premier',()=>alignSceneObjects3d(state.entities,state.selected,{axis:'y'}));
 const rustToggle=document.createElement('input');rustToggle.type='checkbox';
 rustToggle.setAttribute('aria-label','Accélération Rust expérimentale des Gizmos');
 rustToggle.title='Activer les calculs Rust/WASM optionnels, repli JavaScript si indisponible';
 rustToggle.checked=localStorage.getItem('warlike.gizmo.rust.enabled')==='true';
 rustToggle.onchange=()=>{localStorage.setItem('warlike.gizmo.rust.enabled',String(rustToggle.checked));if(rustToggle.checked)void initializeRustGizmo()};
 options.append(mode,snap,document.createTextNode('Snap'),step,snapMode,gridButton,floorButton,alignX,alignZ,document.createTextNode('Rust'),rustToggle);options.style.flexWrap='wrap';options.style.maxWidth='min(650px,75%)';host.append(options);
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
  const selected=center(),selectedObject=state.entities.find(o=>state.selected.includes(o.id)&&o.sceneCamera3d);
  const showingCamera=!!selectedObject&&selectedObject.sceneCamera3d.showFrustum!==false;
  const active=view3d.enabled&&!state.playing&&!!selected&&(tool()!=='hand'||showingCamera);
  layer.style.display=active?'block':'none';if(!active)return;
  const rect=canvas.getBoundingClientRect();if(rect.width<1||rect.height<1)return;
  layer.setAttribute('viewBox','0 0 '+rect.width+' '+rect.height);
  const cam=getCamera(),p=project3d(selected,cam,rect.width,rect.height);if(!p){layer.style.display='none';return}
  // Scene-only framing aid. This uses actual 3D camera projection, not a second game renderer.
  const selectedCam=state.entities.find(o=>state.selected.includes(o.id)&&o.sceneCamera3d);
  preview.hidden=!selectedCam||selectedCam.sceneCamera3d.showPreview===false||state.playing||!view3d.enabled;
  if(!preview.hidden){
   const ctx=preview.getContext('2d'),w=preview.width,h=preview.height;
   ctx.clearRect(0,0,w,h);ctx.fillStyle='#142536';ctx.fillRect(0,0,w,h);
   const view=sceneCameraView(selectedCam,state.entities,{yaw:view3d.yaw,pitch:view3d.pitch});
   if(view){
    ctx.strokeStyle='#5b879d';ctx.lineWidth=1;
    ctx.strokeRect(1,1,w-2,h-2);
    const boxes=state.entities.filter(e=>e!==selectedCam&&e.enabled!==false&&e.visible!==false).slice(0,160);
    for(const entity of boxes){
     const b=objectBounds3d(entity);
     if(!b||!Number.isFinite(b.x+b.y+b.z))continue;
     const points=[[b.x-b.w/2,b.y-b.h/2,b.z-b.d/2],[b.x+b.w/2,b.y-b.h/2,b.z-b.d/2],
      [b.x+b.w/2,b.y+b.h/2,b.z-b.d/2],[b.x-b.w/2,b.y+b.h/2,b.z-b.d/2],
      [b.x-b.w/2,b.y-b.h/2,b.z+b.d/2],[b.x+b.w/2,b.y-b.h/2,b.z+b.d/2],
      [b.x+b.w/2,b.y+b.h/2,b.z+b.d/2],[b.x-b.w/2,b.y+b.h/2,b.z+b.d/2]]
      .map(q=>project3d(q,view,w,h));
     ctx.strokeStyle=state.selected.includes(entity.id)?'#f1cb78':'#9cb9c9';
     for(let j=0;j<4;j++)for(const [a,c] of [[j,(j+1)%4],[j+4,((j+1)%4)+4],[j,j+4]]){
      if(!points[a]||!points[c])continue;
      ctx.beginPath();ctx.moveTo(points[a].x,points[a].y);ctx.lineTo(points[c].x,points[c].y);ctx.stroke();
     }
    }
    ctx.strokeStyle='#b1d8e6';ctx.beginPath();ctx.moveTo(w/2-6,h/2);ctx.lineTo(w/2+6,h/2);ctx.moveTo(w/2,h/2-6);ctx.lineTo(w/2,h/2+6);ctx.stroke();
   }
   ctx.fillStyle='#e1eff4';ctx.font='11px system-ui';ctx.fillText('CAMERA · CADRAGE FILAIRE',9,16);
  }
  frustum.replaceChildren();
  if(showingCamera){
   const b=objectBounds3d(selectedObject);
   try{
    const bounds=cameraFrustumCorners3d([b.x,b.y,b.z],[selectedObject.rotationX3d||0,selectedObject.rotation||0,selectedObject.rotationZ3d||0],selectedObject.sceneCamera3d,rect.width/rect.height);
    const vertices=[...bounds.near,...bounds.far].map(v=>project3d(v,cam,rect.width,rect.height));
    for(let i=0;i<4;i++)for(const [a,b] of [[i,(i+1)%4],[i+4,((i+1)%4)+4],[i,i+4]]){
     if(vertices[a]&&vertices[b])frustum.append(el('line',{x1:vertices[a].x,y1:vertices[a].y,x2:vertices[b].x,y2:vertices[b].y}));
    }
   }catch{/* A malformed camera preview must never interrupt Scene editing. */}
  }
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
  const cam=getCamera(),rect=canvas.getBoundingClientRect(),pivot=center(),first=selected[0];
  const direction=axisVector(axis,first),pivotScreen=pivot&&project3d(pivot,cam,rect.width,rect.height);
  const endScreen=pivot&&project3d(pivot.map((v,i)=>v+direction[i]),cam,rect.width,rect.height);
  drag={pointer:event.pointerId,axis,startX:event.clientX,startY:event.clientY,mode:lastTool,
   pivotScreen,endScreen,
   // Pointer position and view-facing sign are frozen for the entire drag.
   startPointer:{x:event.clientX-rect.left,y:event.clientY-rect.top},
   axisFacing:(()=>{
    if(!pivot||!Array.isArray(cam?.eye))return 1;
    const facing=direction.reduce((sum,n,i)=>sum+n*(cam.eye[i]-pivot[i]),0);
    return facing<0?-1:1;
   })(),
   rustStart:(()=>{
    if(!pivot||lastTool!=='move')return null;
    const ray=gizmoPointerRay(event.clientX,event.clientY,rect,cam);
    return ray?axisRayParameter(ray.origin,ray.direction,pivot,direction):null;
   })(),
   rustPivot:pivot,rustAxis:direction,
   objects:selected.map(o=>({id:o.id,x:o.x,y:o.y,elevation3d:o.elevation3d||0,w:o.w,h:o.h,depth3d:o.depth3d??o.h,rotation:o.rotation||0,rotationX3d:o.rotationX3d||0,rotationZ3d:o.rotationZ3d||0,worldMatrix3d:Array.isArray(o.worldMatrix3d)?[...o.worldMatrix3d]:null,matrixReference3d:Array.isArray(o.matrixReference3d)?[...o.matrixReference3d]:null}))};
  event.target.setPointerCapture(event.pointerId);
 });
 layer.addEventListener('pointermove',event=>{
  if(!drag||event.pointerId!==drag.pointer)return;
  const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;
  const rect=canvas.getBoundingClientRect(),cam=getCamera();
  const ray=drag.rustStart!==null&&drag.rustPivot?gizmoPointerRay(event.clientX,event.clientY,rect,cam):null;
  const current=ray?axisRayParameter(ray.origin,ray.direction,drag.rustPivot,drag.rustAxis):null;
  const amount=current!==null&&drag.rustStart!==null?current-drag.rustStart:projectedAxisDrag3d(drag.pivotScreen,drag.endScreen,dx,dy),snapStep=snap.checked?Math.max(.01,Number(step.value)||.5):0;
  const surfaceHit=snap.checked&&drag.mode==='move'&&snapMode.value!=='grid'?
   view3d.surfaceAt?.(event.clientX,event.clientY,{excludeIds:drag.objects.map(o=>o.id),groundFallback:snapMode.value==='surface'}):null;
  const quant=(value,increment)=>snapStep?snap3d(value,increment??snapStep):value;
  for(const start of drag.objects){
   const o=state.entities.find(o=>o.id===start.id);if(!o)continue;
   if(drag.mode==='rotate'){
    const pointer={x:event.clientX-rect.left,y:event.clientY-rect.top};
    const raw=projectedAxisRotation3d(drag.pivotScreen,drag.startPointer,pointer,{directionSign:drag.axisFacing});
    const degrees=quant(raw,snapStep?Math.max(1,snapStep*30):0);
    if(drag.axis==='x')o.rotationX3d=start.rotationX3d+degrees;
    else if(drag.axis==='z')o.rotationZ3d=start.rotationZ3d+degrees;
    else o.rotation=start.rotation+degrees;
   }else if(drag.mode==='scale'||drag.mode==='rect'){
    const factor=projectedAxisScale3d(drag.pivotScreen,drag.endScreen,dx,dy);
    const scaled=value=>Math.max(4,Math.round(quant(value*factor/64)*64));
    if(drag.axis==='x')o.w=scaled(start.w);
    else if(drag.axis==='y')o.h=scaled(start.h);
    else o.depth3d=scaled(start.depth3d);
   }else{
    const direction=axisVector(drag.axis,{...o,rotation:start.rotation,rotationX3d:start.rotationX3d,rotationZ3d:start.rotationZ3d});
    if(surfaceHit){
     // Project the pointer-to-feature displacement on the selected gizmo axis.
     const center=[start.x/64+(start.w||64)/128,start.elevation3d+(start.h||64)/128,start.y/64+(start.depth3d||start.h||64)/128];
     const distance=direction.reduce((sum,n,i)=>sum+n*(surfaceHit.point[i]-center[i]),0);
     o.x=(start.x/64+direction[0]*distance)*64;
     o.elevation3d=start.elevation3d+direction[1]*distance;
     o.y=(start.y/64+direction[2]*distance)*64;
    }else{
     // Snap only the coordinates touched by this axis vector. Snapping a
     // perpendicular coordinate would make an object jump sideways on drag.
     const moveAxis=(base,component)=>Math.abs(component)<1e-10?base:quant(base+component*amount);
     o.x=moveAxis(start.x/64,direction[0])*64;
     o.elevation3d=moveAxis(start.elevation3d,direction[1]);
     o.y=moveAxis(start.y/64,direction[2])*64;
    }
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
