// Authored transform clips use scene units for X/Y and metres for elevation.
export const animationFields=['x','y','rotation','elevation3d','rotationX3d','rotationZ3d','w','h','depth3d'];
export const animationEasings=['linear','step','easeIn','easeOut','easeInOut'];
const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const poseOf=key=>Object.fromEntries(animationFields.filter(field=>Number.isFinite(key[field])).map(field=>[field,key[field]]));
export function createClip(name='Nouveau clip',duration=2){return {name:String(name).slice(0,60),duration:clamp(finite(duration,2),.1,3600),loop:false,speed:1,keys:[],events:[],transitions:[]}}
export function inspectAnimationStudio(studio){
 if(!studio||!Array.isArray(studio.clips)||studio.clips.length>32)return ['Animation Studio : 32 clips maximum.'];
 const errors=[];
 for(const clip of studio.clips){
  if(!clip||typeof clip.name!=='string'||!clip.name||clip.name.length>60||!Number.isFinite(clip.duration)||clip.duration<.1||clip.duration>3600){errors.push('Nom ou durée de clip invalide.');continue}
  if(clip.speed!=null&&(!Number.isFinite(clip.speed)||clip.speed<.05||clip.speed>4))errors.push('Vitesse du clip entre 0,05 et 4 attendue.');
  if(!Array.isArray(clip.keys)||clip.keys.length>256){errors.push('256 images clés maximum par clip.');continue}
  const times=new Set();for(const key of clip.keys){if(!key||!Number.isFinite(key.time)||key.time<0||key.time>clip.duration||times.has(key.time)){errors.push('Instants des images clés invalides ou dupliqués.');continue}times.add(key.time);if(key.easing!=null&&!animationEasings.includes(key.easing))errors.push('Interpolation d’image clé inconnue.');for(const field of animationFields)if(key[field]!=null&&(!Number.isFinite(key[field])||Math.abs(key[field])>1e8||['w','h','depth3d'].includes(field)&&key[field]<=0))errors.push('Valeur de transformation invalide.');}
  if(!Array.isArray(clip.events)||clip.events.length>64||clip.events.some(event=>!event||!Number.isFinite(event.time)||event.time<0||event.time>clip.duration||typeof event.name!=='string'||!event.name.trim()||event.name.length>80))errors.push('Événement de clip invalide.');
 }
 if(studio.playOnStart&&(!Number.isInteger(studio.defaultClip??0)||(studio.defaultClip??0)<0||(studio.defaultClip??0)>=studio.clips.length))errors.push('Clip de démarrage absent.');
 return [...new Set(errors)];
}
export function sampleClip(clip,time){
 const keys=[...(clip?.keys||[])].filter(k=>k&&Number.isFinite(k.time)).sort((a,b)=>a.time-b.time);
 if(!keys.length)return null;
 const t=clamp(finite(time),0,finite(clip.duration,3600)),result={};
 // Sparse tracks keep independent key times instead of creating zero-valued channels.
 for(const field of animationFields){
  const channel=keys.filter(key=>Number.isFinite(key[field]));if(!channel.length)continue;
  const right=channel.find(key=>key.time>=t)||channel.at(-1),left=channel.findLast(key=>key.time<=t)||channel[0];
  let u=clamp((t-left.time)/(right.time-left.time||1),0,1);
  switch(left.easing){case 'step':u=0;break;case 'easeIn':u*=u;break;case 'easeOut':u=1-(1-u)**2;break;case 'easeInOut':u=u*u*(3-2*u);break;}
  result[field]=left===right?left[field]:left[field]+(right[field]-left[field])*u;
 }
 return result;
}
export function putAnimationKey(clip,time,pose,{easing='linear'}={}){
 const at=clamp(finite(time),0,clip.duration),key={time:at,...poseOf(pose),easing:animationEasings.includes(easing)?easing:'linear'};
 if(!Object.keys(key).some(field=>animationFields.includes(field)))throw Error('Aucune transformation à enregistrer.');
 const previous=clip.keys.findIndex(k=>Math.abs(k.time-at)<.00001);if(previous<0&&clip.keys.length>=256)throw Error('256 images clés maximum.');
 if(previous>=0)clip.keys[previous]=key;else clip.keys.push(key);clip.keys.sort((a,b)=>a.time-b.time);return key;
}
export function animationEventsBetween(events,before,after,duration,{loop=false,normalized=false}={}){
 if(after<=before||duration<=0)return [];
 const result=[],first=loop?Math.max(0,Math.floor(before/duration)-1):0,last=loop?Math.min(first+12,Math.floor(after/duration)):0;
 for(let cycle=first;cycle<=last;cycle++)for(const event of events||[]){const position=finite(event.time)*(normalized?duration:1),at=cycle*duration+position;if(at>before+1e-9&&at<=after+1e-9||at===0&&before===0&&after>0)result.push({event,at});}
 return result.sort((a,b)=>a.at-b.at).slice(0,512).map(item=>item.event);
}
export class AnimationPreview {
 constructor(){this.owner=null;this.original=null;this.time=0}
 seek(owner,clip,time){
  if(this.owner!==owner)this.stop();if(!owner||!clip)return null;
  const pose=sampleClip(clip,clamp(finite(time),0,clip.duration));if(!pose||!Object.keys(pose).length)return null;
  if(!this.original){this.owner=owner;this.original=Object.fromEntries(animationFields.map(field=>[field,{exists:Object.hasOwn(owner,field),value:owner[field]}]));}
  this.time=clamp(finite(time),0,clip.duration);Object.assign(owner,pose);return pose;
 }
 stop(){if(this.owner&&this.original)for(const [field,saved] of Object.entries(this.original)){if(saved.exists)this.owner[field]=saved.value;else delete this.owner[field];}this.owner=null;this.original=null;this.time=0;}
}
export const animationEditorPreview=new AnimationPreview();
let tracks=new WeakMap();
export function resetAnimationClips(){tracks=new WeakMap()}
export function stepAnimationClip(owner,dt,{onEvent=()=>{}}={}){
 const studio=owner.animationStudio;if(!studio||studio.enabled===false||!studio.playOnStart||owner.enabled===false||inspectAnimationStudio(studio).length)return null;
 const clip=studio.clips[studio.defaultClip??0];let track=tracks.get(owner);if(!track||track.clip!==clip){track={clip,time:0};tracks.set(owner,track)}
 const before=track.time,after=before+clamp(finite(dt),0,.1)*clamp(finite(clip.speed,1),.05,4);track.time=clip.loop?after:Math.min(after,clip.duration);
 for(const event of animationEventsBetween(clip.events,before,track.time,clip.duration,{loop:clip.loop}))onEvent({type:'signal',value:event.name},owner);
 const time=clip.loop?track.time%clip.duration:track.time,pose=sampleClip(clip,time);if(pose)Object.assign(owner,pose);
 return {name:clip.name,time,duration:clip.duration,finished:!clip.loop&&track.time>=clip.duration};
}
