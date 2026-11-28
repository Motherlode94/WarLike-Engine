import {beginHorrorSession,resetHorror} from './horror-survival.js';
import {profileScope} from './runtime-profiler.js';
import {cleanupPlay} from './play-cleanup.js';
import {nativeBridgeRequest} from './native-bridge-client.js';
import {authorizeScripts} from './script-trust.js';
import {prepareSkeletalAssets} from './skeletal-animation.js';
import {stepEntityAnimations,resetAnimationRuntime} from './animation-runtime.js';
import {stepAnimalControllers} from './animal-controller.js';
import {stepNavigationAgents} from './navigation-agent.js';
import {emitFx} from './fx-runtime.js';
import {playSound} from './audio.js';
import {heroCenter} from './hero-movement.js';
import {webScriptRuntime} from './web-script-runtime.js';
import {nativeScriptEntities,nativeScriptSources} from './csharp-sources.js';
import {warScriptRuntime} from './war-script-runtime.js';
import {physicsContactEvents2d} from './physics-contact-events-2d.js';
import {workspace} from './workspaces.js';
import {gameplayKeys,gameplayInputBlocked} from './gameplay-input.js';
import {isLanGuest} from './lan-state.js';
import {sequenceRuntime,emitSequenceSignal} from './logic-sequences.js';
import {state} from './state.js';
import {gameProject} from './game-project.js';
import {gameIsRunning} from './game-session.js';
import {startComponentRuntime,resetComponentRuntime,updateComponentRuntime} from './component-runtime.js';
import {bridgeScene,runtimeFrame} from './scene-contract.js';
import {applyCsharpFrame} from './csharp-frame.js';
import {nativePlayEntities,initializeWebComponents,captureWebComponents} from './runtime-capabilities.js';

export const runtimeSession={generation:0,phase:'stopped',backend:'web',frame:0,error:'',busy:false};
let requestNative=nativeBridgeRequest,revision=null,initializedScene=null,pending=null,elapsed=0,nativeCanStop=false,webScene=null,webLoading=false,webElapsed=0;
const defaultRequest=nativeBridgeRequest;
export function setRuntimeTransport(transport=defaultRequest){requestNative=transport}
const sameEntities=(snapshot,entities)=>snapshot?.length===entities.length&&entities.every((entity,index)=>entity===snapshot[index]);
// Filtering a collection does not replace its surviving objects or their scripts.
const sameWebScene=entities=>webScene!==null&&entities.filter(entity=>entity.webScripts?.length||entity.animationRig).every(entity=>webScene.includes(entity));
const announce=()=>globalThis.document?.dispatchEvent(new Event('warlike:runtime'));
export function startRuntimeSession(){
 stopRuntimeSession();Object.assign(runtimeSession,{backend:gameProject.runtimeBackend||'web',phase:'ready',error:'',frame:0});
 startComponentRuntime();beginHorrorSession(state.entities,{genre:gameProject.genre});initializeWebComponents(state.entities,sequenceRuntime.globals);announce();
}
export function stopRuntimeSession(){
 const stopNative=runtimeSession.backend==='native'&&nativeCanStop&&revision!==null,stoppedRevision=revision;
 // Invalidate pending responses before any script OnDestroy/cleanup can throw.
 runtimeSession.generation++;runtimeSession.phase='stopped';runtimeSession.busy=false;
 revision=null;initializedScene=null;pending=null;elapsed=0;nativeCanStop=false;
 webScene=null;webLoading=false;webElapsed=0;
 const errors=cleanupPlay([
  ()=>physicsContactEvents2d.reset(),resetAnimationRuntime,()=>webScriptRuntime.stop(),
  ()=>{if(stopNative)Promise.resolve(requestNative('/stop',{revision:stoppedRevision})).catch(()=>{})},
  ()=>warScriptRuntime.stop(),resetComponentRuntime,resetHorror,announce
 ]);
 if(errors.length)throw new AggregateError(errors,'Nettoyage du runtime incomplet');
}
// A frame has one writer. Native callbacks finish before browser components,
// gameplay and Blueprint actions run against the same state.entities objects.
// Late responses are never applied after Stop, scene replacement or reconnect.
const scriptContext=()=>({entities:state.entities,project:gameProject,mode:workspace.mode,globals:sequenceRuntime.globals,keys:gameplayKeys(state.keys),pressedKeys:gameplayInputBlocked()?new Set():state.keyPresses,signal:emitSequenceSignal,log:(message,level,entity)=>globalThis.document?.dispatchEvent(new CustomEvent('warlike:script-log',{detail:{message:(entity.name||'GameObject')+' · '+message,level}}))});
const animationEvent=(event,owner)=>{if(event.type==='signal')emitSequenceSignal(String(event.value||'animation:event').slice(0,100),owner.id);else if(event.type==='fx')emitFx(event.value||'energy',heroCenter(owner,workspace.mode),{...event.options,color:event.color||event.options?.color,mode:workspace.mode,ownerId:owner.id});else if(event.type==='sound')playSound(String(event.value||'impact'),{gain:.5,cooldown:.08});};
function browserFrame(dt,update,run,canRun=gameIsRunning){if(run&&!isLanGuest()&&webScriptRuntime.isolated)return isolatedBrowserFrame(dt,update,canRun);return finishBrowserFrame(dt,update,run)}
async function isolatedBrowserFrame(dt,update,canRun){
 const generation=runtimeSession.generation,entities=state.entities;
 const canApply=()=>generation===runtimeSession.generation&&state.entities===entities&&canRun();
 const ready=await webScriptRuntime.update(dt,scriptContext(),{canApply});if(!ready||!canApply())return;
 if(ready.reused&&runtimeSession.backend==='web')webElapsed=Math.min(.1,webElapsed+dt);
 finishBrowserFrame(ready.dt,update,true,true);if(generation===runtimeSession.generation)await webScriptRuntime.late({canApply});
}

function finishBrowserFrame(dt,update,run,isolated=false){if(run){if(!isLanGuest()){if(!isolated)profileScope('javascript',()=>webScriptRuntime.update(dt,scriptContext()));profileScope('warscript',()=>warScriptRuntime.update(dt,scriptContext()));}profileScope('components',()=>updateComponentRuntime(dt))}if(run&&!isLanGuest()){profileScope('navigation',()=>stepNavigationAgents(state.entities,dt,{mode:workspace.mode}));profileScope('animals',()=>stepAnimalControllers(state.entities,dt,{mode:workspace.mode}))}profileScope('gameplay',()=>update?.(dt));
 if(run&&!isLanGuest()&&workspace.mode==='2d'&&gameIsRunning()){
  for(const event of physicsContactEvents2d.update(state.entities)){
   warScriptRuntime.contact(event);
   emitSequenceSignal('physics2d:'+event.kind+':'+event.stage+':'+event.ownerId,event.otherId);
  }
 }
 if(run&&!isLanGuest()){profileScope('animation',()=>stepEntityAnimations(state.entities,dt,{mode:workspace.mode,onEvent:animationEvent}));profileScope('warscript',()=>warScriptRuntime.late());if(!isolated)webScriptRuntime.late();}captureWebComponents(state.entities,sequenceRuntime.globals)}
export function runRuntimeFrame(dt,{update,canRun=gameIsRunning}={}){
 if(!state.playing||runtimeSession.phase==='error')return false;
 if(runtimeSession.phase==='stopped'){update?.(dt);return true} // standalone tools/tests
 if((!sameWebScene(state.entities)||webScriptRuntime.needsPrepare(scriptContext()))&&!isLanGuest()){
  if(webLoading||runtimeSession.busy)return false;webScene=[...state.entities];
  if(state.entities.some(e=>e.webScripts?.length||e.animationRig)){
   const generation=runtimeSession.generation,entities=state.entities;webLoading=true;runtimeSession.phase='connecting';announce();
   runtimeSession.completion=Promise.all([webScriptRuntime.prepare(scriptContext()),prepareSkeletalAssets(state.entities)]).then(()=>{if(generation===runtimeSession.generation){webLoading=false;if(!sameWebScene(state.entities)){webScene=null;webScriptRuntime.stop()}runtimeSession.phase='ready';announce()}}).catch(error=>{if(generation===runtimeSession.generation){webLoading=false;runtimeSession.phase='error';runtimeSession.error='Scripts / animation : '+error.message;announce()}});return false;
  }else webScriptRuntime.stop();
 }
 if(webLoading)return false;
 if(runtimeSession.backend==='web'||!canRun()||webScriptRuntime.sandbox?.held?.type==='update'){const run=canRun();if(webScriptRuntime.isolated&&run)webElapsed=Math.min(.1,webElapsed+Math.max(0,Number(dt)||0));if(!runtimeSession.busy){const generation=runtimeSession.generation,delta=webScriptRuntime.isolated&&run?webElapsed:dt;webElapsed=0;const result=browserFrame(delta,update,run,canRun);if(result?.then){runtimeSession.busy=true;runtimeSession.completion=result.catch(error=>{if(generation===runtimeSession.generation){runtimeSession.phase='error';runtimeSession.error='Scripts JS/TS : '+error.message;announce()}}).finally(()=>{if(generation===runtimeSession.generation)runtimeSession.busy=false});return false}}return true}
 elapsed=Math.min(.1,elapsed+Math.max(0,Number(dt)||0));
 if(runtimeSession.busy)return false;
 // Hold a completed native frame while the debugger or game is paused.
 const generation=runtimeSession.generation,entities=state.entities,frame=++runtimeSession.frame,delta=elapsed;elapsed=0;
 runtimeSession.busy=true;
 const execute=async()=>{
  if(pending){const ready=pending;pending=null;return ready}
  if(!sameEntities(initializedScene,entities)){
   runtimeSession.phase='connecting';announce();
   const health=await requestNative('/health');
   if(requestNative===defaultRequest&&(health.authenticationRequired!==true||health.isolationRequired!==true))throw Error('Pont C# non sécurisé : mets à jour et redémarre le superviseur authentifié.');
   nativeCanStop=health.capabilities?.includes('mono-behaviour')===true;
   if(health.protocol<3||!health.capabilities?.includes('shared-play-frame'))throw Error('Le pont C# doit être mis à jour (protocole 3).');
   if(generation!==runtimeSession.generation)return null;
   const scripts=nativeScriptSources(entities,gameProject);if(scripts.length){if(requestNative===defaultRequest)await authorizeScripts(scripts.map(s=>({project:gameProject.id||'',language:'csharp',name:s.name,source:s.source})));if(generation!==runtimeSession.generation)return null;if(!health.capabilities?.includes('native-script-compiler'))throw Error('Redémarre le bridge C# à jour pour compiler MonoBehaviour.');await requestNative('/scripts/compile',{scripts});if(generation!==runtimeSession.generation)return null;}
   const response=await requestNative('/scene',bridgeScene(nativeScriptEntities(nativePlayEntities(entities),gameProject),{id:gameProject.activeSceneId}));
   if(generation!==runtimeSession.generation){await requestNative('/stop',{revision:response.revision}).catch(()=>{});return null;}
   revision=response.revision;initializedScene=[...entities];
  }
  const submitted=runtimeFrame(entities);
  const response=await requestNative('/frame',{revision,frame,dt:delta,actors:submitted,keys:[...gameplayKeys(state.keys)],pressedKeys:gameplayInputBlocked()?[]:[...(state.keyPresses||[])]});
  if(response.revision!==revision||response.frame!==frame)throw Error('Réponse C# périmée : scène ou image différente.');
  if(!Array.isArray(response.actors))throw Error('Image C# invalide.');
  return {response,delta,submitted};
 };
 const promise=execute().then(result=>{
  if(!result||generation!==runtimeSession.generation||!state.playing||state.entities!==entities)return;
  if(!canRun()){pending=result;return}
  for(const message of result.response.logs||[])scriptContext().log(String(message),'info',{name:'C#'});
  applyCsharpFrame(entities,result.response.actors,{expected:result.submitted});
  const living=new Set(result.response.actors.map(a=>a.id));for(let i=entities.length-1;i>=0;i--)if(result.submitted.some(a=>a.id===entities[i].id)&&!living.has(entities[i].id))entities.splice(i,1);
  runtimeSession.phase='ready';return browserFrame(result.delta,update,true,canRun);
 }).catch(error=>{
  if(generation!==runtimeSession.generation||!state.playing)return;
  runtimeSession.phase='error';runtimeSession.error='Play C# interrompu : '+error.message;announce();
 }).finally(()=>{if(generation===runtimeSession.generation){runtimeSession.busy=false;announce()}});
 runtimeSession.completion=promise;return false;
}
