// Explicit authoring-only Camera component. This is a scene-view preview,
// not a replacement for the runtime camera/CameraRig or a virtual Unity Camera.
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export const defaultEditorCamera3d=()=>({projection:'perspective',fieldOfView:60,orthographicSize:5,near:.3,far:1000,previewDistance:16,showFrustum:true});
export function editorCameraSettings3d(value={}){
 const base=defaultEditorCamera3d(),src=value&&typeof value==='object'?value:{};
 const finite=(name,min,max)=>Number.isFinite(Number(src[name]))?clamp(Number(src[name]),min,max):base[name];
 const near=finite('near',.01,100);
 return {projection:src.projection==='orthographic'?'orthographic':'perspective',
  fieldOfView:finite('fieldOfView',1,179),orthographicSize:finite('orthographicSize',.1,100),
  near,far:Math.max(near+.01,finite('far',.02,10000)),
  previewDistance:finite('previewDistance',.1,100),
  showFrustum:src.showFrustum!==false};
}
export function cameraFrustumCorners3d(origin,rotation,settings,aspect=16/9){
 const c=editorCameraSettings3d(settings);
 if(!Array.isArray(origin)||origin.length!==3||origin.some(n=>!Number.isFinite(n))||!Number.isFinite(aspect)||aspect<=0)throw Error('Paramètres de caméra invalides');
 const degrees=Array.isArray(rotation)&&rotation.length===3?rotation:[0,0,0];
 const [pitch,yaw,roll]=degrees.map(n=>(Number.isFinite(n)?n:0)*Math.PI/180);
 // Rotations local-to-world: Rx → Ry → Rz, forward points towards local -Z.
 const transform=([x,y,z])=>{
  let yy=y*Math.cos(pitch)-z*Math.sin(pitch),zz=y*Math.sin(pitch)+z*Math.cos(pitch);
  let xx=x*Math.cos(yaw)+zz*Math.sin(yaw);zz=-x*Math.sin(yaw)+zz*Math.cos(yaw);
  return [origin[0]+xx*Math.cos(roll)-yy*Math.sin(roll),origin[1]+xx*Math.sin(roll)+yy*Math.cos(roll),origin[2]+zz];
 };
 const depth=Math.max(c.near+.01,Math.min(c.far,c.previewDistance));
 const plane=d=>{
  const halfHeight=c.projection==='orthographic'?c.orthographicSize:Math.tan(c.fieldOfView*Math.PI/360)*d;
  const halfWidth=halfHeight*aspect;
  return [[-halfWidth,-halfHeight,-d],[halfWidth,-halfHeight,-d],[halfWidth,halfHeight,-d],[-halfWidth,halfHeight,-d]].map(transform);
 };
 return {near:plane(c.near),far:plane(depth),origin:origin.slice(),settings:c,previewFar:depth};
}
