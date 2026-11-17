// Native Camera3D blending: a visual transition, never a second camera system.
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const vec=(a,b,t)=>a.map((x,i)=>x+(b[i]-x)*t);
const norm=a=>{const m=Math.hypot(...a)||1;return a.map(x=>x/m)};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const blendCameraPose3d=(from,to,ratio)=>{
 if(!from||!to)return to||from||null;
 const t=clamp(Number.isFinite(ratio)?ratio:1,0,1);
 const eye=vec(from.eye,to.eye,t);
 const forward=norm(vec(from.forward,to.forward,t));
 let right=norm(cross(forward,[0,1,0]));
 if(Math.hypot(...cross(forward,[0,1,0]))<1e-6)right=norm(vec(from.right,to.right,t));
 const up=norm(cross(right,forward));
 return {eye,forward,right,up,
  fieldOfView:(from.fieldOfView||60)+((to.fieldOfView||60)-(from.fieldOfView||60))*t,
  nearClip:(from.nearClip||.1)+((to.nearClip||.1)-(from.nearClip||.1))*t,
  farClip:(from.farClip||1000)+((to.farClip||1000)-(from.farClip||1000))*t};
};
export class CameraTransition3d {
 constructor(){this.reset()}
 reset(){this.activeId=null;this.from=null;this.elapsed=0;this.last=null}
 update(camera,desired,dt){
  if(!desired){this.reset();return null}
  const id=camera?.id??null;
  if(this.activeId!==id){
   this.from=this.last;
   this.activeId=id;this.elapsed=0;
  }
  const duration=clamp(Number(camera?.sceneCamera3d?.transitionDuration)||0,0,5);
  if(!this.from||duration===0){this.from=null;this.last=desired;return desired}
  this.elapsed+=clamp(Number(dt)||0,0,.1);
  const u=clamp(this.elapsed/duration,0,1);
  const eased=u*u*(3-2*u);
  this.last=blendCameraPose3d(this.from,desired,eased);
  if(u===1)this.from=null;
  return this.last;
 }
}
export const sceneCameraTargets3d=(entities,camera)=>[
 {id:0,name:'Auto · joueur',type:'auto'},
 ...(entities||[]).filter(o=>o&&o!==camera&&Number.isSafeInteger(o.id)&&o.id>0)
 .map(o=>({id:o.id,name:String(o.name||'GameObject'),type:String(o.type||'object')}))
];
