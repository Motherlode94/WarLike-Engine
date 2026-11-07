import {sampleChannel} from './gltf-animation.js';
import {inspectAnimationRig,defaultAnimationRig} from './skeletal-animation.js';
export const animationCategories=['Tous','Déplacement','Combat','Interactions','Expressions','Postures','Autres'];
export function animationCategory(name){const text=name.toLowerCase();if(/attack|punch|kick|shoot|pistol|sword|melee|spell|shield|hit|hurt|recievehit|death|die|bite|scratch/.test(text))return 'Combat';if(/walk|run|sprint|jog|jump|fall|climb|roll|slide|swim|fly|dash/.test(text))return 'Déplacement';if(/interact|pickup|pick.up|consume|farm|harvest|plant|watering|chop|chest|fixing|push|throw|talk/.test(text))return 'Interactions';if(/yes|no(?:_|$)|wave|emote|dance|victory|defeat|cheer/.test(text))return 'Expressions';if(/idle|sit|stand|lay|crouch|drive|driving|holding|pose|static/.test(text))return 'Postures';return 'Autres';}
export function sourceAnimationLibrary(rig){return (rig?.animations||[]).filter(c=>c&&typeof c.name==='string'&&c.duration>0&&c.duration<=3600&&c.channels?.length).map((c,index)=>({clip:c,key:index+':'+c.name,name:c.name,duration:c.duration,category:animationCategory(c.name),loop:/loop|idle|walk|sprint|jog|run|swim|fly|dance|holding(?!.*shoot)/i.test(c.name)}));}
export function uniqueAnimationName(clips,base){let name=base.slice(0,150),index=2;while(clips.some(c=>c.name===name))name=base.slice(0,145)+' '+index++;return name;}
export function editableSourceClip(rig,animation,{name=animation.name+' · éditable',modelId=''}={}){
 if(!(animation.duration>0)||animation.duration>3600)throw Error('Durée de clip source invalide.');const names=new Set(),channels=[];
 for(const source of animation.channels){const node=rig.nodes[source.node];if(!node?.name||rig.nodes.filter(n=>n.name===node.name).length!==1)throw Error('Os source absent ou ambigu.');const id=node.name+':'+source.path;if(names.has(id))throw Error('Piste source dupliquée.');names.add(id);const count=source.components,kind=source.interpolation||'LINEAR',bake=source.times.length>512||source.path==='rotation'&&kind==='CUBICSPLINE';let keys;
  if(bake){const steps=Math.min(511,Math.max(1,Math.ceil(animation.duration*30)));keys=Array.from({length:steps+1},(_,i)=>({time:animation.duration*i/steps,value:sampleChannel(source,animation.duration*i/steps)}));}
  else keys=Array.from(source.times,(time,index)=>{const slot=kind==='CUBICSPLINE'?3:1,values=offset=>Array.from(source.values.slice((index*slot+offset)*count,(index*slot+offset+1)*count));return {time,value:values(slot===3?1:0),...(slot===3?{inTangent:values(0),outTangent:values(2)}:{})};});
  channels.push({bone:node.name,path:source.path,interpolation:bake?'LINEAR':kind,keys});
 }
 const result={name,duration:animation.duration,loop:sourceAnimationLibrary({animations:[animation]})[0]?.loop??false,fps:30,channels,source:{modelId,clip:animation.name}};const errors=inspectAnimationRig({...defaultAnimationRig(),clips:[result]});if(errors.length)throw Error(errors.join(' · '));return result;
}
// Validate the complete selection before mutating the object, including the 32-clip limit.
export function importSourceAnimations(owner,rig,animations,modelId=''){
 const config=owner.animationRig||defaultAnimationRig(),next=config.clips.slice(),imported=[];
 for(const source of animations){const existing=next.find(c=>c.source?.modelId===modelId&&c.source?.clip===source.name);if(existing){imported.push(existing);continue}if(next.length>=32)throw Error('32 copies éditables maximum par objet. Les autres clips restent accessibles en aperçu.');const clip=editableSourceClip(rig,source,{name:uniqueAnimationName(next,source.name+' · éditable'),modelId});next.push(clip);imported.push(clip);}
 owner.animationRig??=config;config.clips=next;return imported;
}
