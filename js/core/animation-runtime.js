import {stepSkeletalAnimation,resetSkeletalRuntime} from './skeletal-animation.js';
import {stepAnimator,resetAnimators} from './animator-graph.js';
import {stepAnimationClip,resetAnimationClips} from './animation-clips.js';
import {controllerMode2d} from './physics-2d.js';
export function resetAnimationRuntime(){resetAnimators();resetAnimationClips();resetSkeletalRuntime()}
export function stepEntityAnimations(entities,dt,{mode='3d',preview=false,visualOnly=false,onEvent=()=>{}}={}){
 for(const owner of entities){
  if(owner.enabled===false||owner.sequenceEnabled===false||owner._sequenceDestroyed)continue;
  if(!preview&&!visualOnly)stepAnimationClip(owner,dt,{onEvent});
  if(owner.animatorGraph&&(!preview||owner.animatorPreview))stepAnimator(owner,dt,{mode,preview,parameters:mode==='2d'&&controllerMode2d(owner,entities)==='topDown'?{grounded:true}:{},onEvent});
  if(!preview&&!visualOnly)stepSkeletalAnimation(owner,dt,{entities,mode});
 }
}
