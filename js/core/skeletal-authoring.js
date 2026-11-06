import {recordBoneKey} from './skeletal-animation.js';
const epsilon=1e-5;
export function snapSkeletalTime(clip,time,snap=true){
 if(!Number.isFinite(time))throw Error('Instant fini attendu.');const fps=Number.isInteger(clip.fps)&&clip.fps>=1&&clip.fps<=120?clip.fps:30;
 return Math.max(0,Math.min(clip.duration,snap?Math.round(time*fps)/fps:time));
}
export function neighboringSkeletalKey(clip,time,direction){
 const times=[...new Set(clip.channels.flatMap(c=>c.keys.map(k=>k.time)))].sort((a,b)=>a-b);return direction<0?times.findLast(t=>t<time-epsilon)??0:times.find(t=>t>time+epsilon)??clip.duration;
}
export function moveSkeletalKey(clip,channel,key,time,{snap=true}={}){
 if(!clip.channels.includes(channel)||!channel.keys.includes(key))throw Error('La clé ne fait pas partie de ce clip.');if(!Number.isFinite(time)||time<0||time>clip.duration)throw Error('Instant hors du clip.');const at=snapSkeletalTime(clip,time,snap);if(channel.keys.some(other=>other!==key&&Math.abs(other.time-at)<epsilon))throw Error('Une clé occupe déjà cet instant.');key.time=at;channel.keys.sort((a,b)=>a.time-b.time);return at;
}
export function skeletalClipReferences(owner,name){
 const refs=[];for(const state of owner.animatorGraph?.states||[]){if(state.clip===name||[...(state.blend||[]),...(state.blend2d||[])].some(p=>p.clip===name))refs.push('état '+state.name);}for(const [index,layer] of (owner.animatorGraph?.layers||[]).entries())if(layer.clip===name)refs.push('couche '+(index+1));for(const [key,value] of Object.entries(owner.animationMap||{}))if(value===name)refs.push('animation '+key);if(owner.animation3dClip===name)refs.push('clip manuel 3D');return refs;
}
export function renameSkeletalClip(owner,clip,name){
 name=String(name).trim();if(!name||name.length>160||owner.animationRig.clips.some(c=>c!==clip&&c.name===name))throw Error('Nom vide, trop long ou déjà utilisé.');const previous=clip.name;clip.name=name;if(owner.animationRig.activeClip===previous)owner.animationRig.activeClip=name;if(owner.animation3dClip===previous)owner.animation3dClip=name;for(const state of owner.animatorGraph?.states||[]){if(state.clip===previous)state.clip=name;for(const p of [...(state.blend||[]),...(state.blend2d||[])])if(p.clip===previous)p.clip=name;}for(const layer of owner.animatorGraph?.layers||[])if(layer.clip===previous)layer.clip=name;for(const key of Object.keys(owner.animationMap||{}))if(owner.animationMap[key]===previous)owner.animationMap[key]=name;
 return name;
}
export function recordSkeletalPose(clip,rig,nodes,time){
 const candidate=structuredClone(clip),names=new Set();for(let i=0;i<rig.nodes.length;i++){const name=rig.nodes[i].name;if(!name)continue;if(names.has(name))throw Error('Os ambigus : noms dupliqués dans le modèle.');names.add(name);for(const path of ['translation','rotation','scale'])recordBoneKey(candidate,name,path,time,nodes[i][path]);}clip.channels=candidate.channels;return clip.channels.length;
}
