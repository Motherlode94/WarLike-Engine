// glTF 2.0 skeletal animation: TRS channels, quaternion slerp and inverse binds.
// Data is read from the asset; no generated poses or substitute characters.
export const identityMatrix=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
export function multiplyMatrices(a,b){const out=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)out[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return out}
export function nodeMatrix(node){
 if(node.matrix)return node.matrix;
 const [x,y,z,w]=node.rotation||[0,0,0,1],s=node.scale||[1,1,1],t=node.translation||[0,0,0];
 return [(1-2*(y*y+z*z))*s[0],2*(x*y+z*w)*s[0],2*(x*z-y*w)*s[0],0,2*(x*y-z*w)*s[1],(1-2*(x*x+z*z))*s[1],2*(y*z+x*w)*s[1],0,2*(x*z+y*w)*s[2],2*(y*z-x*w)*s[2],(1-2*(x*x+y*y))*s[2],0,...t,1];
}
export function slerpQuaternion(a,b,t){
 let dot=a.reduce((n,v,i)=>n+v*b[i],0),sign=dot<0?-1:1;dot=Math.min(1,Math.abs(dot));let first=1-t,second=t;
 if(dot<.9995){const angle=Math.acos(dot),sin=Math.sin(angle);first=Math.sin((1-t)*angle)/sin;second=Math.sin(t*angle)/sin}
 const result=a.map((v,i)=>v*first+b[i]*sign*second),length=Math.hypot(...result)||1;return result.map(v=>v/length);
}
export function sampleChannel(channel,time){
 const {times,values,components:count,interpolation}=channel;let left=0,right=times.length-1;
 if(!times.length)return null;
 while(left+1<right){const mid=(left+right)>>1;if(times[mid]<=time)left=mid;else right=mid}
 if(time<=times[0])left=right=0;else if(time>=times.at(-1))left=right=times.length-1;
 const duration=times[right]-times[left],fraction=duration>0?Math.max(0,Math.min(1,(time-times[left])/duration)):0;
 const value=(key,slot=0)=>Array.from({length:count},(_,i)=>values[(key*(interpolation==='CUBICSPLINE'?3:1)+slot)*count+i]);
 if(interpolation==='STEP')return value(left);
 if(interpolation==='CUBICSPLINE'){
  const a=value(left,1),b=value(right,1),out=value(left,2),into=value(right,0),t=fraction,t2=t*t,t3=t2*t;
  let result=a.map((v,i)=>(2*t3-3*t2+1)*v+(t3-2*t2+t)*duration*out[i]+(-2*t3+3*t2)*b[i]+(t3-t2)*duration*into[i]);
  if(channel.path==='rotation'){const length=Math.hypot(...result)||1;result=result.map(v=>v/length)}return result;
 }
 const a=value(left),b=value(right);return channel.path==='rotation'?slerpQuaternion(a,b,fraction):a.map((v,i)=>v+(b[i]-v)*fraction);
}
export function readAnimationRig(json,accessor){
 if(!json.skins?.length&&!json.animations?.length)return null;
 const nodes=(json.nodes||[]).map(n=>({name:n.name||'',translation:n.translation||[0,0,0],rotation:n.rotation||[0,0,0,1],scale:n.scale||[1,1,1],...(n.matrix?{matrix:n.matrix}:{}),children:n.children||[]}));
 const parents=new Int32Array(nodes.length).fill(-1);for(let i=0;i<nodes.length;i++)for(const child of nodes[i].children)parents[child]=i;
 const skins=(json.skins||[]).map(s=>({joints:s.joints,inverseBinds:s.inverseBindMatrices===undefined?s.joints.map(identityMatrix):Array.from({length:s.joints.length},(_,i)=>new Float32Array(accessor(s.inverseBindMatrices).data.slice(i*16,i*16+16)))}));
 const animations=(json.animations||[]).map((a,i)=>{
  const channels=[];let duration=0;
  for(const c of a.channels||[]){if(!['translation','rotation','scale'].includes(c.target?.path)||!nodes[c.target.node])continue;const sampler=a.samplers[c.sampler],input=accessor(sampler.input),output=accessor(sampler.output);if(!input.count)continue;const times=new Float32Array(input.data);duration=Math.max(duration,times.at(-1));channels.push({node:c.target.node,path:c.target.path,times,values:new Float32Array(output.data),components:output.components,interpolation:sampler.interpolation||'LINEAR'})}
  return {name:a.name||'Animation '+(i+1),duration,channels};
 });
 return {nodes,parents,skins,animations};
}
export function sampleRigPose(rig,clip,time,{loop=true,previous=null,blend=1,samples=null,layers=[]}={}){
 const sample=(animation,seconds,repeat=loop)=>{
  const nodes=rig.nodes.map(n=>({...n,translation:n.translation.slice(),rotation:n.rotation.slice(),scale:n.scale.slice()}));
  if(animation){const t=repeat&&animation.duration>0?((seconds%animation.duration)+animation.duration)%animation.duration:Math.min(Math.max(0,seconds),animation.duration);for(const channel of animation.channels){const value=sampleChannel(channel,t);if(value)nodes[channel.node][channel.path]=value}}
  return nodes;
 };
 const mix=(a,b,weight,mask=null)=>{for(let i=0;i<a.length;i++){if(mask&&!mask.has(i))continue;for(const key of ['translation','scale'])a[i][key]=a[i][key].map((v,k)=>v+(b[i][key][k]-v)*weight);a[i].rotation=slerpQuaternion(a[i].rotation,b[i].rotation,weight)}return a};
 const weighted=list=>{let nodes=null,total=0;for(const item of list||[]){const weight=Math.max(0,Number(item.weight)||0);if(!item.clip||!weight)continue;const pose=sample(item.clip,item.time||0,item.loop!==false);nodes=nodes?mix(nodes,pose,weight/(total+weight)):pose;total+=weight}return nodes||sample(null,0)};
 let nodes=samples?.length?weighted(samples):sample(clip,time);
 if(previous&&blend<1){const old=previous.samples?weighted(previous.samples):sample(previous.clip,previous.time);nodes=mix(old,nodes,Math.max(0,Math.min(1,blend)))}
 for(const layer of layers.slice(0,4)){if(!layer.clip)continue;const roots=new Set((layer.bones||[]).map(name=>rig.nodes.findIndex(n=>n.name===name)).filter(i=>i>=0)),mask=layer.bones?.length?new Set(roots):null;if(mask)for(let i=0;i<rig.nodes.length;i++){let parent=rig.parents[i];for(let k=0;parent>=0&&k<rig.nodes.length;k++,parent=rig.parents[parent])if(roots.has(parent)){mask.add(i);break}}if(mask&&!mask.size)continue;mix(nodes,sample(layer.clip,layer.time||0,layer.loop!==false),Math.max(0,Math.min(1,Number(layer.weight)||0)),mask)}
 const world=new Array(nodes.length),visiting=new Set();
 const visit=i=>{if(world[i])return world[i];if(visiting.has(i))throw Error('Squelette glTF cyclique');visiting.add(i);const local=nodeMatrix(nodes[i]),parent=rig.parents[i];world[i]=parent<0?local:multiplyMatrices(visit(parent),local);visiting.delete(i);return world[i]};
 for(let i=0;i<nodes.length;i++)visit(i);
 return {world,joints:rig.skins.map(s=>s.joints.map((joint,i)=>multiplyMatrices(world[joint],s.inverseBinds[i])))};
}
const vertexScratch=new WeakMap();
export function deformGlbParts(geometry,pose,{buffers=[]}={}){
 const center=geometry.normalizationCenter,scale=geometry.normalizationScale;
 return geometry.parts.map((part,partIndex)=>{
  const source=part.motion;if(!source)return part.vertices;
  const out=buffers[partIndex]||new Float32Array(part.vertices.length);buffers[partIndex]=out;let unique=vertexScratch.get(source);if(!unique){unique=new Float32Array(source.positions.length*2);vertexScratch.set(source,unique)}const matrices=source.skinIndex===undefined?null:pose.joints[source.skinIndex];
  for(const index of source.vertexIds){
   const p=index*3,x=source.positions[p],y=source.positions[p+1],z=source.positions[p+2],nx=source.normals?.[p]??0,ny=source.normals?.[p+1]??1,nz=source.normals?.[p+2]??0;
   let px=0,py=0,pz=0,ax=0,ay=0,az=0,total=0;
   const apply=(m,weight)=>{px+=(m[0]*x+m[4]*y+m[8]*z+m[12])*weight;py+=(m[1]*x+m[5]*y+m[9]*z+m[13])*weight;pz+=(m[2]*x+m[6]*y+m[10]*z+m[14])*weight;ax+=(m[0]*nx+m[4]*ny+m[8]*nz)*weight;ay+=(m[1]*nx+m[5]*ny+m[9]*nz)*weight;az+=(m[2]*nx+m[6]*ny+m[10]*nz)*weight;total+=weight};
   if(matrices&&source.joints&&source.weights){for(let j=0;j<source.influences;j++){const offset=index*source.influences+j,weight=source.weights[offset],matrix=matrices[source.joints[offset]];if(weight>0&&matrix)apply(matrix,weight)}}
   if(total<1e-8)apply(pose.world[source.nodeIndex],1);
   const length=Math.hypot(ax,ay,az)||1,offset=index*6;unique[offset]=(px/total-center[0])/scale;unique[offset+1]=(py/total-center[1])/scale;unique[offset+2]=(pz/total-center[2])/scale;unique[offset+3]=ax/length;unique[offset+4]=ay/length;unique[offset+5]=az/length;
  }
  for(let v=0;v<source.indices.length;v++){const start=source.indices[v]*6;out.set(unique.subarray(start,start+6),v*6)}
  return out;
 });
}
const clipPatterns={idle:[/^idle_loop$/i,/^idle$/i,/idle/i],walk:[/^walk_loop$/i,/^walk$/i,/walking/i,/walk/i,/flying/i],run:[/^sprint_loop$/i,/sprint/i,/run/i,/jog/i,/walk/i,/fast_flying/i,/flying/i],jump:[/^jump_start$/i,/^jump$/i,/jump/i],fall:[/fall/i,/jump_loop/i],attack:[/sword_attack/i,/attack/i,/punch/i,/shoot/i,/bite/i,/headbutt/i],death:[/death/i,/die/i],fly:[/fly/i,/flying/i,/jump_loop/i],hurt:[/hit_chest/i,/hurt/i,/hit/i],drive:[/driving/i,/drive/i]};
export function resolveAnimationClip(animations,state='idle',mapping={}){
 if(mapping[state]){const selected=animations.find(a=>a.name===mapping[state]);if(selected)return selected}
 const exact=animations.find(a=>a.name===state);if(exact)return exact;
 for(const pattern of clipPatterns[state]||[]){const found=animations.find(a=>pattern.test(a.name));if(found)return found}
 return state==='idle'?null:resolveAnimationClip(animations,'idle',mapping);
}

// Short gameplay signals still finish their attack/hit animation before idling.
export function animationClipForState(animations,state,mapping={},track=null,{automatic=true}={}){
 const desired=resolveAnimationClip(animations,state,mapping);
 if(automatic&&track?.oneShot&&track.time<track.clip.duration&&!['death','dead','jump','fall'].includes(state))return track.clip;
 return desired;
}
