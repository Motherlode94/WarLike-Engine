// Player rotation configuration: degrees are for inspector authoring, yaw from camera remains radians.
// Keep the model facing convention (+Z forward) aligned to the existing 3D controller.
import {cameraFacingDegrees} from './character-facing.js';
const normalize=v=>((v%360)+360)%360;
const shortest=(a,b)=>((b-a+540)%360)-180;
export function playerFacing3d({yaw,current=0,right=0,forward=0,mode='camera',turnSpeed=0,dt=0}={}){
 if(mode==='locked')return normalize(current);
 let target=Number.isFinite(yaw)?cameraFacingDegrees(yaw):normalize(current);
 if(mode==='movement'){
  if(Math.hypot(right,forward)<1e-6)return normalize(current);
  // World-space 2D ground motion, +Z is model's forward axis.
  target=normalize(Math.atan2(right,forward)*180/Math.PI);
 }
 if(!Number.isFinite(turnSpeed)||turnSpeed<=0||!Number.isFinite(dt)||dt<=0)return target;
 return normalize(current+Math.max(-turnSpeed*dt,Math.min(turnSpeed*dt,shortest(normalize(current),target))));
}
