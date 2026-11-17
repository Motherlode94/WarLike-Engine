// Optional Rust/WASM acceleration for 3D gizmo axis drags.
// Never block editor startup; the established projection tool stays the fallback.
let backend=null;
export const rustGizmoStatus=()=>backend?'ready':'fallback-js';

export async function initializeRustGizmo(url=new URL('../../native/dist/warlike_geometry_kernel.wasm',import.meta.url)){
  if(typeof WebAssembly==='undefined')return false;
  try{
    const response=await fetch(url);
    if(!response.ok)return false;
    const bytes=await response.arrayBuffer();
    const instance=await WebAssembly.instantiate(bytes,{});
    if(typeof instance.instance?.exports?.wl_axis_ray_parameter!=='function')return false;
    backend=instance.instance.exports;
    return true;
  }catch{backend=null;return false;}
}
export function axisRayParameter(rayOrigin,rayDirection,pivot,axis){
  if(!backend)return null;
  if(![rayOrigin,rayDirection,pivot,axis].every(a=>Array.isArray(a)&&a.length===3&&a.every(Number.isFinite)))return null;
  const t=backend.wl_axis_ray_parameter(...rayOrigin,...rayDirection,...pivot,...axis);
  return Number.isFinite(t)?t:null;
}
export function gizmoPointerRay(clientX,clientY,rect,cam){
  if(!rect||rect.height<=0||!cam)return null;
  const x=clientX-rect.left,y=clientY-rect.top;
  const f=1/Math.tan(Math.PI/6);
  const v=cam.forward.map((n,i)=>n+cam.right[i]*(x-rect.width/2)*2/(rect.height*f)+cam.up[i]*(rect.height/2-y)*2/(rect.height*f));
  const size=Math.hypot(...v);
  return size>1e-8?{origin:[...cam.eye],direction:v.map(n=>n/size)}:null;
}
