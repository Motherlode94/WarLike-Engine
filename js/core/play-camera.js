// Pure camera math shared by the play viewport and regression tests.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const cameraDamping=(sharpness,dt)=>1-Math.exp(-Math.max(0,sharpness)*Math.max(0,dt));
export const defaultCameraRig=()=>({mode:'thirdPerson',distance:4.8,height:.72,followSharpness:10,sensitivity:.0026,collision:true});
export function cameraRigFor(actor,vehicle=false){
 const source=actor?.cameraRig||{},base=defaultCameraRig();
 return {mode:actor?.fpsController?'firstPerson':['thirdPerson','firstPerson','orbit'].includes(source.mode)?source.mode:base.mode,
 distance:clamp(Number(source.distance)|| (vehicle?7.5:base.distance),1.2,24),height:clamp(Number.isFinite(source.height)?source.height:base.height,.1,1.5),followSharpness:clamp(Number(source.followSharpness)||base.followSharpness,1,30),sensitivity:clamp(Number(source.sensitivity)||base.sensitivity,.0005,.02),collision:source.collision!==false};
}
export function cameraTargetFor(bounds,rig){return [bounds.x,bounds.y-bounds.h/2+bounds.h*rig.height,bounds.z]}
// Ray/expanded AABB intersection keeps the third-person camera in front of walls.
export function cameraBoomFraction(target,eye,obstacles,padding=.18){
 const delta=eye.map((n,i)=>n-target[i]);let fraction=1;
 for(const box of obstacles){
  const center=[box.x,box.y,box.z],size=[box.w,box.h,box.d];let enter=0,exit=1,hit=true;
  // A support containing the target should not pin the camera to the character.
  if(center.every((n,i)=>Math.abs(target[i]-n)<size[i]/2+padding))continue;
  for(let axis=0;axis<3;axis++){
   const low=center[axis]-size[axis]/2-padding,high=center[axis]+size[axis]/2+padding;
   if(Math.abs(delta[axis])<1e-8){if(target[axis]<low||target[axis]>high){hit=false;break}continue}
   let a=(low-target[axis])/delta[axis],b=(high-target[axis])/delta[axis];if(a>b)[a,b]=[b,a];enter=Math.max(enter,a);exit=Math.min(exit,b);if(enter>exit){hit=false;break}
  }
  if(hit&&enter>=0&&enter<1)fraction=Math.min(fraction,Math.max(0,enter-.015/Math.max(.001,Math.hypot(...delta))));
 }
 return fraction;
}
export function cameraPose(target,eye){
 const norm=a=>{const d=Math.hypot(...a)||1;return a.map(v=>v/d)},cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const forward=norm(target.map((n,i)=>n-eye[i])),right=norm(cross(forward,[0,1,0])),up=norm(cross(right,forward));return {eye,forward,right,up};
}
export function followCamera2d(camera,player,viewport,dt,{snap=false}={}){
 const zoom=camera.zoom||1,targetX=viewport.width/2-(player.x+player.w/2)*zoom,targetY=viewport.height/2-(player.y+player.h/2)*zoom;
 const factor=snap?1:cameraDamping(Number(player.cameraRig?.followSharpness)||9,dt);
 return {...camera,x:camera.x+(targetX-camera.x)*factor,y:camera.y+(targetY-camera.y)*factor};
}

// Contract immediately at contact, then restore distance smoothly when space clears.
export function resolveCameraBoom(target,desiredEye,obstacles,{previousDistance=null,dt=0,sharpness=8,padding=.18}={}){
 const length=Math.hypot(...desiredEye.map((v,i)=>v-target[i]));if(length<1e-8)return {eye:target.slice(),distance:0};
 const allowed=length*cameraBoomFraction(target,desiredEye,obstacles,padding),prior=Number.isFinite(previousDistance)?Math.max(0,previousDistance):allowed;
 const distance=allowed<=prior?allowed:Math.min(allowed,prior+(allowed-prior)*cameraDamping(sharpness,dt));
 return {eye:desiredEye.map((v,i)=>target[i]+(v-target[i])*distance/length),distance};
}
