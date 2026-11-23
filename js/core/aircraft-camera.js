// Aircraft-specific camera and instrument model. Pure, DOM-free, serializable.
// Orientation follows the actual aircraft Rigidbody quaternion, including pitch/roll.
import {rotationQuaternion3d} from './collider-3d.js';
import {rotateAircraftVector} from './aircraft-rapier.js';
import {cameraPose} from './play-camera.js';
const finite=(v,d=0)=>Number.isFinite(v)?v:d;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,finite(v)));
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const scale=(a,k)=>a.map(v=>v*k);
const toArray=v=>[v.x,v.y,v.z];
const norm=a=>{const l=Math.hypot(...a)||1;return scale(a,1/l)};
export const defaultAircraftCamera=()=>({mode:'chase',distance:10,height:2.5,cockpitHeight:0.3,cockpitForward:0.5});
export function aircraftCameraSettings(entity){
 const source=entity?.aircraftCamera||{},defaults=defaultAircraftCamera();
 return {mode:source.mode==='cockpit'?'cockpit':'chase',distance:clamp(source.distance??defaults.distance,3,35),
 height:clamp(source.height??defaults.height,0,12),
 cockpitHeight:clamp(source.cockpitHeight??defaults.cockpitHeight,-2,3),
 cockpitForward:clamp(source.cockpitForward??defaults.cockpitForward,-3,5)};
}
export function aircraftCameraView(entity,{mode}={}){
 if(!entity?.aircraftPhysics?.enabled)return null;
 const settings=aircraftCameraSettings(entity),viewMode=mode==='cockpit'||mode==='chase'?mode:settings.mode;
 const q=rotationQuaternion3d(entity);
 const forward=norm(toArray(rotateAircraftVector(q,{x:0,y:0,z:-1})));
 const up=norm(toArray(rotateAircraftVector(q,{x:0,y:1,z:0})));
 const center=[finite(entity.x)/64+finite(entity.w,32)/128,
  finite(entity.elevation3d)+finite(entity.h,32)/128,
  finite(entity.y)/64+finite(entity.depth3d??entity.h,32)/128];
 let eye,target;
 if(viewMode==='cockpit'){
  eye=add(center,add(scale(up,settings.cockpitHeight),scale(forward,settings.cockpitForward)));
  target=add(eye,forward);
 }else{
  eye=add(center,add(scale(forward,-settings.distance),[0,settings.height,0]));
  target=add(center,scale(forward,3));
 }
 return {...cameraPose(target,eye),mode:viewMode};
}
export function aircraftFlightInstruments(entity){
 const rb=entity?.rigidbody3d||{};
 const vx=finite(rb.vx)/64,vy=finite(rb.vy),vz=finite(rb.vz)/64;
 const groundSpeed=Math.hypot(vx,vz);
 const input=entity?.aircraftInput||{};
 return {
  kind:entity?.aircraftPhysics?.kind||'airplane',
  altitudeMeters:Math.max(0,finite(entity?.elevation3d)),
  verticalSpeedMs:vy,
  speedKmh:Math.hypot(groundSpeed,vy)*3.6,
  headingDeg:((finite(entity?.rotation)%360)+360)%360,
  pitchDeg:finite(entity?.rotationX3d),
  bankDeg:finite(entity?.rotationZ3d),
  powerPercent:Math.round(clamp((entity?.aircraftPhysics?.kind==='helicopter'?input.collective:input.throttle)??0,0,1)*100)
 };
}
export const nextAircraftCameraMode=mode=>mode==='cockpit'?'chase':'cockpit';
