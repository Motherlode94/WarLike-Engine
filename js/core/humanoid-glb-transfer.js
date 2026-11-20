// Transfer a genuine glTF animation to an authored humanoid GameObject.
// Source and target must be real GLB rigs; no synthetic fallback clip or asset.
import {getModelGeometry} from '../assets/real-models-3d.js';
import {createHumanoidAvatar,inspectHumanoidAvatar,retargetHumanoidClip} from './humanoid-avatar.js';
import {compileSkeletalClip,defaultAnimationRig,inspectAnimationRig} from './skeletal-animation.js';
const safeName=v=>typeof v==='string'&&v.length>0&&v.length<=160;
export async function listRealGlbAnimationClips(modelId){
 if(!safeName(modelId))throw Error('Identifiant GLB source absent.');
 const geometry=await getModelGeometry(modelId);
 if(!geometry.rig?.skins?.length)throw Error('Modèle source sans rig skinné.');
 return geometry.rig.animations.map(c=>({name:c.name,duration:c.duration,channels:c.channels.length}));
}
export async function retargetImportedHumanoidClip(owner,{
 sourceModelId,sourceClipName,name,fps=30,translateHips=true,replace=false,
}={}){
 if(!owner||!safeName(owner.model3dId))throw Error('GameObject cible sans vrai modèle GLB.');
 if(!safeName(sourceModelId)||!safeName(sourceClipName))throw Error('Source GLB et nom de clip requis.');
 if(!Number.isInteger(fps)||fps<1||fps>60)throw Error('Cadence de transfert invalide : 1–60 FPS.');
 const [source,target]=await Promise.all([getModelGeometry(sourceModelId),getModelGeometry(owner.model3dId)]);
 if(!source.rig?.skins?.length||!target.rig?.skins?.length)throw Error('Deux vrais modèles GLB skinnés sont requis.');
 const clip=source.rig.animations.find(c=>c.name===sourceClipName);
 if(!clip)throw Error('Clip glTF absent du modèle source : '+sourceClipName);
 const sourceAvatar=createHumanoidAvatar(source.rig);
 const targetAvatar=owner.animationRig?.avatar||createHumanoidAvatar(target.rig);
 const errors=[...inspectHumanoidAvatar(sourceAvatar,source.rig),...inspectHumanoidAvatar(targetAvatar,target.rig)];
 if(errors.length)throw Error('Transfert humanoïde impossible : '+errors.slice(0,8).join('; '));
 const clipName=name==null?sourceClipName+' · retarget':name.trim();
 if(!safeName(clipName))throw Error('Nom de clip cible invalide.');
 const config=owner.animationRig?structuredClone(owner.animationRig):defaultAnimationRig();
 const existing=(config.clips||[]).findIndex(c=>c.name===clipName);
 if(existing>=0&&!replace)throw Error('Clip existant : remplacement explicite requis.');
 if(existing<0&&(config.clips||[]).length>=32)throw Error('Limite Animator : 32 clips.');
 const transferred=retargetHumanoidClip(source.rig,target.rig,clip,sourceAvatar,targetAvatar,{
  name:clipName,fps,translateHips
 });
 // Compile against the TARGET skin before mutating the scene.
 compileSkeletalClip(target.rig,transferred);
 const clips=[...(config.clips||[])];
 if(existing>=0)clips[existing]=transferred;else clips.push(transferred);
 const proposed={...config,enabled:true,avatar:targetAvatar,clips,revision:(config.revision||0)+1};
 const validation=inspectAnimationRig(proposed);
 if(validation.length)throw Error('Animation transférée invalide : '+validation.join('; '));
 owner.animationRig=proposed;
 // Preserve authored Animator Graph states, parameters, transitions and masks.
 // The transferred clip is available to its states; do not replace user's graph.
 return {name:clipName,sourceModelId,targetModelId:owner.model3dId,duration:transferred.duration,channels:transferred.channels.length,sourceClipName};
}
