// Runtime controls for physically colliding vehicles with independent GLB node articulation.
// Rotations only affect actual named nodes; no missing geometry is synthesized.
import {sampleRigPose,slerpQuaternion} from './gltf-animation.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
const radians=degrees=>degrees*Math.PI/180;
const axisQuaternion=(axis,angle)=>{const h=angle/2,s=Math.sin(h);return [axis[0]*s,axis[1]*s,axis[2]*s,Math.cos(h)]};
const multiplyQ=(a,b)=>[
 a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],
 a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],
 a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],
 a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]
];
export const vehicleConfiguration=entity=>entity?.libraryConfig?.vehicle||entity?.vehicleConfig?.parts&&entity.vehicleConfig||entity?.components?.libraryConfig?.vehicle||null;
export function tickVehicleArticulation(entity,dt,{speed=0,steer=0,doorToggle=false,turretYaw=0,barrelPitch=0}={}){
 const cfg=vehicleConfiguration(entity);if(!cfg?.enabled)return null;
 const step=clamp(dt,0,.1),v=entity.vehicleArticulation??={wheelAngle:0,steer:0,doors:0,doorOpen:false,turretYaw:0,barrelPitch:0};
 const wheelRadius=Math.max(.1,clamp(cfg.wheelRadius??.45,.1,4));
 v.wheelAngle=(v.wheelAngle+(Number(speed)||0)/64/wheelRadius*step)%(Math.PI*2);
 const response=Math.min(1,step*8);
 v.steer+=(clamp(steer,-1,1)*radians(clamp(cfg.steeringAngle??30,0,90))-v.steer)*response;
 if(doorToggle)v.doorOpen=!v.doorOpen;
 v.doors+=(Number(v.doorOpen)-v.doors)*Math.min(1,step*5);
 v.turretYaw=clamp(v.turretYaw+clamp(turretYaw,-1,1)*step*1.5,-Math.PI,Math.PI);
 v.barrelPitch=clamp(v.barrelPitch+clamp(barrelPitch,-1,1)*step, -.2,.65);
 return v;
}
export function vehicleRigPose(rig,entity){
 const cfg=vehicleConfiguration(entity),state=entity?.vehicleArticulation;
 if(!cfg?.enabled||!state||!rig?.nodes?.length)return null;
 const rotations=new Map(),names=new Map();
 rig.nodes.forEach((node,index)=>{if(node.name){const values=names.get(node.name)||[];values.push(index);names.set(node.name,values)}});
 const parts=cfg.parts||{};
 const assign=(part,axis,angle)=>{
  const name=parts[part];if(!name)return;
  const matches=names.get(name);if(!matches||matches.length!==1)return;
  const index=matches[0],base=rotations.get(index)||rig.nodes[index].rotation||[0,0,0,1];
  rotations.set(index,multiplyQ(base,axisQuaternion(axis,angle)));
 };
 for(const side of ['FL','FR','RL','RR']){
  if(side==='FL'||side==='FR')assign('wheel'+side,[0,1,0],state.steer);
  assign('wheel'+side,[1,0,0],state.wheelAngle);
 }
 assign('doorL',[0,1,0],state.doors*1.15);
 assign('doorR',[0,1,0],-state.doors*1.15);
 assign('turret',[0,1,0],state.turretYaw);
 assign('barrel',[1,0,0],state.barrelPitch);
 if(!rotations.size)return null;
 const channels=[...rotations].map(([node,q])=>({node,path:'rotation',times:new Float32Array([0]),values:new Float32Array(q),components:4,interpolation:'STEP'}));
 return sampleRigPose(rig,{duration:0,channels},0,{loop:false});
}
