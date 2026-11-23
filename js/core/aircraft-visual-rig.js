// GLB named-node animation for aircraft systems. Works only when the GLB
// actually contains an unambiguous named part; no synthetic meshes or rig.
import {sampleRigPose} from './gltf-animation.js';
const finite=v=>Number.isFinite(v)?v:0;
const multiply=(a,b)=>[
 a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],
 a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],
 a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],
 a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];
const axisQ=(axis,angle)=>{const h=angle/2,s=Math.sin(h);return [axis[0]*s,axis[1]*s,axis[2]*s,Math.cos(h)]};
export function aircraftRigPose(rig,entity){
 const sys=entity?.aircraftSystems;
 if(!sys?.enabled||!rig?.nodes?.length)return null;
 const part=sys.parts||{};
 const tracks=new Map(),names=new Map();
 rig.nodes.forEach((node,i)=>{if(node.name){const ids=names.get(node.name)||[];ids.push(i);names.set(node.name,ids)}});
 const apply=(key,axis,angle)=>{
  const label=part[key];if(typeof label!=='string'||!label)return;
  const matches=names.get(label);if(!matches||matches.length!==1)return;
  const i=matches[0],base=tracks.get(i)||rig.nodes[i].rotation||[0,0,0,1];
  tracks.set(i,multiply(base,axisQ(axis,angle)));
 };
 const radians=Math.PI/180;
 apply('propeller',[0,0,1],finite(sys.propeller?.angle)*radians);
 apply('rotor',[0,1,0],finite(sys.rotor?.angle)*radians);
 apply('gear',[1,0,0],sys.gear?.deployed?0:-Math.PI/2);
 apply('flapL',[1,0,0],finite(sys.flaps?.position)*.55);
 apply('flapR',[1,0,0],-finite(sys.flaps?.position)*.55);
 apply('airbrake',[1,0,0],sys.airbrake?.deployed?.8:0);
 if(!tracks.size)return null;
 const channels=[...tracks].map(([node,q])=>({node,path:'rotation',times:new Float32Array([0]),values:new Float32Array(q),components:4,interpolation:'STEP'}));
 return sampleRigPose(rig,{duration:0,channels},0,{loop:false});
}
