import {tickSurvival} from './survival-runtime.js';
import {lighting} from './lighting.js';
import {playableActor} from './viewport-3d.js';
import {state} from './state.js';
import {workspace} from './workspaces.js';
import {gameIsRunning} from './game-session.js';
import {stepAnimator,resetAnimators} from './animator-graph.js';
import {emitFx} from './fx-runtime.js';
import {heroCenter} from './hero-movement.js';
import {emitSequenceSignal} from './logic-sequences.js';
import {playSound} from './audio.js';
import {controllerMode2d} from './physics-2d.js';
import {isLanGuest} from './lan-state.js';
export function initCreativeRuntime(){
 let previous=0,playing=state.playing,lightingBackup=null;
 const frame=now=>{requestAnimationFrame(frame);const dt=Math.max(0,Math.min(.05,(now-previous)/1000));previous=now;if(playing!==state.playing){resetAnimators();if(state.playing)lightingBackup={...lighting};else if(lightingBackup){Object.assign(lighting,lightingBackup);lightingBackup=null}playing=state.playing}if(state.playing&&!gameIsRunning())return;
  if(state.playing&&!isLanGuest()){const world=tickSurvival(state.entities,dt,{mode:workspace.mode,hour:lighting.hour,player:playableActor(state.entities),keys:state.keys});if(world&&state.entities.some(o=>o.survivalWorld?.enabled))Object.assign(lighting,{hour:world.hour,dayNight:false})}
  for(const o of state.entities){if(o.sequenceEnabled===false||o._sequenceDestroyed||!o.animatorGraph||!state.playing&&!o.animatorPreview)continue;stepAnimator(o,dt,{mode:workspace.mode,preview:!state.playing,parameters:workspace.mode==='2d'&&controllerMode2d(o,state.entities)==='topDown'?{grounded:true}:{},onEvent:(event,owner)=>{
   if(isLanGuest())return;
   if(event.type==='fx')emitFx(event.value||'energy',heroCenter(owner,workspace.mode),{...event.options,color:event.color||event.options?.color,mode:workspace.mode,ownerId:owner.id});
   else if(event.type==='signal'&&state.playing)emitSequenceSignal(String(event.value||'animation:event').slice(0,100));
   else if(event.type==='sound')playSound(String(event.value||'impact'),{gain:.5,cooldown:.08});
  }})}
 };requestAnimationFrame(frame);
}
