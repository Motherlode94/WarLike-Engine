import {sampleRigPose,nodeMatrix,multiplyMatrices} from './gltf-animation.js';
import {invertMatrix4Math} from './math-kernel.js';
const bodyBones=['hips','spine','chest','upperChest','neck','head','leftShoulder','leftUpperArm','leftLowerArm','leftHand','rightShoulder','rightUpperArm','rightLowerArm','rightHand','leftUpperLeg','leftLowerLeg','leftFoot','rightUpperLeg','rightLowerLeg','rightFoot'];
const fingerNames=['Thumb','Index','Middle','Ring','Little'],fingerSegments=['Proximal','Intermediate','Distal'];
const fingerBones=['left','right'].flatMap(side=>fingerNames.flatMap(finger=>fingerSegments.map(segment=>side+finger+segment)));
export const humanoidBones=Object.freeze([...bodyBones,...fingerBones,'leftToes','rightToes','leftEye','rightEye','jaw']);
export const requiredHumanoidBones=Object.freeze(bodyBones.filter(b=>!['chest','upperChest','neck','leftShoulder','rightShoulder'].includes(b)));
export const humanoidMasks=Object.freeze(['fullBody','upperBody','lowerBody','head','leftArm','rightArm']);
const aliases={hips:['hips','pelvis','hip'],spine:['spine','spine01','spine1'],chest:['chest','spine1','spine01','spine2','spine02','upperchest'],upperChest:['upperchest','spine3','spine03'],neck:['neck','neck1','neck01'],head:['head'],leftShoulder:['leftshoulder','shoulderl','lshoulder','claviclel'],rightShoulder:['rightshoulder','shoulderr','rshoulder','clavicler'],leftUpperArm:['leftupperarm','leftarm','upperarml','arml','lupperarm'],rightUpperArm:['rightupperarm','rightarm','upperarmr','armr','rupperarm'],leftLowerArm:['leftlowerarm','leftforearm','forearml','lowerarml','lforearm'],rightLowerArm:['rightlowerarm','rightforearm','forearmr','lowerarmr','rforearm'],leftHand:['lefthand','handl','lhand'],rightHand:['righthand','handr','rhand'],leftUpperLeg:['leftupperleg','leftupleg','leftthigh','thighl','upperlegl'],rightUpperLeg:['rightupperleg','rightupleg','rightthigh','thighr','upperlegr'],leftLowerLeg:['leftlowerleg','leftleg','leftcalf','shinl','calfl','lowerlegl'],rightLowerLeg:['rightlowerleg','rightleg','rightcalf','shinr','calfr','lowerlegr'],leftFoot:['leftfoot','footl','lfoot'],rightFoot:['rightfoot','footr','rfoot']};
for(const side of ['left','right'])for(const finger of fingerNames)for(const [index,segment] of fingerSegments.entries()){
 const prefix=side==='left'?'l':'r',names=finger==='Little'?['little','pinky']:[finger.toLowerCase()],slot=side+finger+segment;
 aliases[slot]=[slot.toLowerCase(),...names.flatMap(name=>[side+'hand'+name+(index+1),name+'0'+(index+1)+prefix,name+(index+1)+prefix])];
}
Object.assign(aliases,{leftToes:['lefttoebase','lefttoes','balll','toel'],rightToes:['righttoebase','righttoes','ballr','toer'],leftEye:['lefteye','eyel'],rightEye:['righteye','eyer'],jaw:['jaw','lowerjaw']});
const key=name=>String(name||'').toLowerCase().replace(/^(?:(?:mixamorig|armature|skeleton)[.:_\s-]*|rig[.:_\s-]+)+/,'').replace(/[^a-z0-9]/g,'');
export function createHumanoidAvatar(rig,{bones={}}={}){
 const mapped={},used=new Set();
 for(const slot of humanoidBones){
  if(Object.hasOwn(bones,slot)){if(bones[slot]){mapped[slot]=String(bones[slot]);used.add(mapped[slot])}continue}
  for(const alias of aliases[slot]||[]){const matches=(rig?.nodes||[]).filter(n=>key(n.name)===alias);if(matches.length){if(matches.length===1&&!used.has(matches[0].name)){mapped[slot]=matches[0].name;used.add(matches[0].name);break}if(matches.length>1)break}}
 }
 return {schema:'warlike.avatar.v1',enabled:true,bones:mapped};
}
export function inspectHumanoidAvatar(avatar,rig=null){
 const errors=[];
 if(!avatar||avatar.schema!=='warlike.avatar.v1'||!avatar.bones||typeof avatar.bones!=='object'||Array.isArray(avatar.bones))return ['Avatar humanoïde : format invalide.'];
 const names=new Set();
 for(const slot of humanoidBones){const name=avatar.bones[slot];if(name!=null&&(typeof name!=='string'||!name||name.length>160))errors.push('Avatar : os invalide pour '+slot);else if(name){if(names.has(name))errors.push('Avatar : os utilisé plusieurs fois : '+name);names.add(name)}}
 for(const slot of requiredHumanoidBones)if(!avatar.bones[slot])errors.push('Avatar : correspondance manquante : '+slot);
 if(!rig?.nodes)return errors;
 if(!rig.parents||rig.parents.length!==rig.nodes.length||Array.from(rig.parents).some((p,i)=>!Number.isInteger(p)||p< -1||p>=rig.nodes.length||p===i))return [...errors,'Avatar : parents du squelette invalides.'];
 const indices={};
 for(const slot of humanoidBones)if(avatar.bones[slot]){const matches=rig.nodes.map((n,i)=>n.name===avatar.bones[slot]?i:-1).filter(i=>i>=0);if(matches.length!==1)errors.push('Avatar : os absent ou ambigu : '+avatar.bones[slot]);else indices[slot]=matches[0]}
 const below=(child,parent)=>{let index=rig.parents[child];for(let k=0;k<rig.nodes.length&&index>=0;k++,index=rig.parents[index])if(index===parent)return true;return false};
 for(const chain of [['hips','spine','head'],['spine','leftUpperArm','leftLowerArm','leftHand'],['spine','rightUpperArm','rightLowerArm','rightHand'],['hips','leftUpperLeg','leftLowerLeg','leftFoot'],['hips','rightUpperLeg','rightLowerLeg','rightFoot']])for(let i=1;i<chain.length;i++){const parent=indices[chain[i-1]],child=indices[chain[i]];if(parent!=null&&child!=null&&!below(child,parent))errors.push('Avatar : hiérarchie incohérente '+chain[i-1]+' → '+chain[i])}
 for(const side of ['left','right']){
  const chains=[[side+'Foot',side+'Toes'],...fingerNames.map(finger=>[side+'Hand',...fingerSegments.map(segment=>side+finger+segment)])];
  for(const chain of chains){const mapped=chain.filter(slot=>indices[slot]!=null);for(let i=1;i<mapped.length;i++)if(!below(indices[mapped[i]],indices[mapped[i-1]]))errors.push('Avatar : hiérarchie optionnelle incohérente '+mapped[i-1]+' → '+mapped[i]);}
 }
 for(const slot of ['leftEye','rightEye','jaw'])if(indices[slot]!=null&&indices.head!=null&&!below(indices[slot],indices.head))errors.push('Avatar : '+slot+' doit dépendre de la tête.');
 return errors;
}
export function humanoidMaskRoots(avatar,mask){
 if(!humanoidMasks.includes(mask)||!avatar?.bones||avatar.enabled===false)return null;
 const b=avatar.bones,roots={fullBody:[b.hips],upperBody:[b.spine],lowerBody:[b.leftUpperLeg,b.rightUpperLeg],head:[b.neck||b.head],leftArm:[b.leftShoulder||b.leftUpperArm],rightArm:[b.rightShoulder||b.rightUpperArm]}[mask];
 return roots.every(Boolean)?roots:null;
}
const normalize=q=>{const n=Math.hypot(...q)||1;return q.map(v=>v/n)};
const inverse=q=>[-q[0],-q[1],-q[2],q[3]];
const multiply=(a,b)=>normalize([a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]]);
const rotate=(q,v)=>{const t=[2*(q[1]*v[2]-q[2]*v[1]),2*(q[2]*v[0]-q[0]*v[2]),2*(q[0]*v[1]-q[1]*v[0])];return [v[0]+q[3]*t[0]+q[1]*t[2]-q[2]*t[1],v[1]+q[3]*t[1]+q[2]*t[0]-q[0]*t[2],v[2]+q[3]*t[2]+q[0]*t[1]-q[1]*t[0]]};
function worldRotations(rig,nodes){
 const values=[],visiting=new Set();
 const visit=i=>{if(values[i])return values[i];if(visiting.has(i))throw Error('Avatar : squelette cyclique.');visiting.add(i);const p=rig.parents[i],q=normalize(nodes[i].rotation);values[i]=p>=0?multiply(visit(p),q):q;visiting.delete(i);return values[i]};
 nodes.forEach((_,i)=>visit(i));return values;
}
const point=(matrix,p=[0,0,0])=>[matrix[0]*p[0]+matrix[4]*p[1]+matrix[8]*p[2]+matrix[12],matrix[1]*p[0]+matrix[5]*p[1]+matrix[9]*p[2]+matrix[13],matrix[2]*p[0]+matrix[6]*p[1]+matrix[10]*p[2]+matrix[14]];
function legLength(rig,avatar,rest){
 const position=slot=>point(rest.world[rig.nodes.findIndex(n=>n.name===avatar.bones[slot])]);
 return ['left','right'].reduce((sum,side)=>{const a=position(side+'UpperLeg'),b=position(side+'LowerLeg'),c=position(side+'Foot');return sum+Math.hypot(...a.map((v,i)=>v-b[i]))+Math.hypot(...b.map((v,i)=>v-c[i]))},0)/2;
}
// Rest-world deltas account for different parent orientations and helper bones.
// Only hips translation is transferred; target limb lengths stay authored.
export function retargetHumanoidClip(source,target,clip,sourceAvatar,targetAvatar,{name=clip?.name+' · humanoïde',fps=30,translateHips=true}={}){
 const errors=[...inspectHumanoidAvatar(sourceAvatar,source),...inspectHumanoidAvatar(targetAvatar,target)];
 if(errors.length)throw Error(errors.join('\n'));
 if(!clip||!Number.isFinite(clip.duration)||clip.duration<=0||!Number.isFinite(fps)||fps<1||fps>60||clip.duration*fps>511)throw Error('Avatar : budget de transfert dépassé (511 intervalles).');
 for(const rig of [source,target])if(rig.nodes.some(n=>!n.scale?.every(v=>Number.isFinite(v)&&v>1e-7)||Math.max(...n.scale)-Math.min(...n.scale)>1e-4))throw Error('Avatar : transfert avec échelles positives uniformes uniquement.');
 const sourceRest=sampleRigPose(source,null,0),targetRest=sampleRigPose(target,null,0),sourceRot=worldRotations(source,sourceRest.nodes),targetRot=worldRotations(target,targetRest.nodes);
 const sourceLeg=legLength(source,sourceAvatar,sourceRest),targetLeg=legLength(target,targetAvatar,targetRest);
 if(sourceLeg<1e-6||targetLeg<1e-6)throw Error('Avatar : longueur des jambes dégénérée.');
 const ratio=targetLeg/sourceLeg;if(!Number.isFinite(ratio)||ratio>1000||ratio<.001)throw Error('Avatar : échelle de transfert invalide.');
 const pairs=humanoidBones.filter(slot=>sourceAvatar.bones[slot]&&targetAvatar.bones[slot]).map(slot=>({slot,from:source.nodes.findIndex(n=>n.name===sourceAvatar.bones[slot]),to:target.nodes.findIndex(n=>n.name===targetAvatar.bones[slot])}));
 const sourceHips=pairs.find(p=>p.slot==='hips').from,targetHips=pairs.find(p=>p.slot==='hips').to,align=multiply(targetRot[targetHips],inverse(sourceRot[sourceHips]));
 const channels=pairs.map(p=>({bone:target.nodes[p.to].name,path:'rotation',interpolation:'LINEAR',keys:[]}));
 const translation={bone:target.nodes[targetHips].name,path:'translation',interpolation:'LINEAR',keys:[]};
 const count=Math.max(1,Math.ceil(clip.duration*fps)),mapped=new Map(pairs.map((p,i)=>[p.to,{...p,channel:channels[i]}]));
 for(let frame=0;frame<=count;frame++){
  const time=clip.duration*frame/count,pose=sampleRigPose(source,clip,time,{loop:false}),rot=worldRotations(source,pose.nodes),world=[],matrices=[],nodes=target.nodes.map(n=>({...n,translation:n.translation.slice(),rotation:n.rotation.slice(),scale:n.scale.slice()}));
  const visit=i=>{
   if(world[i])return;const parent=target.parents[i];if(parent>=0)visit(parent);
   const pair=mapped.get(i);
   if(pair){
    const delta=multiply(multiply(align,multiply(rot[pair.from],inverse(sourceRot[pair.from]))),inverse(align));
    const desired=multiply(delta,targetRot[i]);nodes[i].rotation=parent>=0?multiply(inverse(world[parent]),desired):desired;delete nodes[i].matrix;
    pair.channel.keys.push({time,value:nodes[i].rotation});
   }
   if(i===targetHips&&translateHips){
    const delta=rotate(align,point(pose.world[sourceHips]).map((v,k)=>(v-point(sourceRest.world[sourceHips])[k])*ratio)),desired=point(targetRest.world[targetHips]).map((v,k)=>v+delta[k]);
    const inv=parent>=0?invertMatrix4Math(matrices[parent]):null;if(parent>=0&&!inv)throw Error('Avatar : matrice parent singulière.');
    nodes[i].translation=parent>=0?point(inv,desired):desired;delete nodes[i].matrix;translation.keys.push({time,value:nodes[i].translation.slice()});
   }
   world[i]=parent>=0?multiply(world[parent],nodes[i].rotation):nodes[i].rotation;
   matrices[i]=parent>=0?multiplyMatrices(matrices[parent],nodeMatrix(nodes[i])):nodeMatrix(nodes[i]);
  };
  nodes.forEach((_,i)=>visit(i));
 }
 if(translateHips)channels.push(translation);
 return {name,duration:clip.duration,loop:true,channels};
}
