import {sequenceRuntime} from './logic-sequences.js';
import {state} from './state.js';
import {gameProject} from './game-project.js';
import {gameIsRunning} from './game-session.js';
import {startComponentRuntime,resetComponentRuntime,updateComponentRuntime} from './component-runtime.js';
import {bridgeScene,runtimeFrame} from './scene-contract.js';
import {applyCsharpFrame} from './csharp-frame.js';
import {nativePlayEntities,initializeWebComponents,captureWebComponents} from './runtime-capabilities.js';

const base='http://127.0.0.1:8765';
export const runtimeSession={generation:0,phase:'stopped',backend:'web',frame:0,error:'',busy:false};
let requestNative=defaultRequest,revision=null,initializedScene=null,pending=null,elapsed=0;
async function defaultRequest(path,payload){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),4500);
 try{const response=await fetch(base+path,{method:payload===undefined?'GET':'POST',headers:payload===undefined?{}:{'Content-Type':'application/json'},...(payload===undefined?{}:{body:JSON.stringify(payload)}),signal:controller.signal,cache:'no-store'});const data=await response.json();if(!response.ok||data.ok===false)throw Error(data.error||'HTTP '+response.status);return data}finally{clearTimeout(timer)}
}
export function setRuntimeTransport(transport=defaultRequest){requestNative=transport}
const announce=()=>globalThis.document?.dispatchEvent(new Event('warlike:runtime'));
export function startRuntimeSession(){
 stopRuntimeSession();Object.assign(runtimeSession,{backend:gameProject.runtimeBackend||'web',phase:'ready',error:'',frame:0});
 startComponentRuntime();initializeWebComponents(state.entities,sequenceRuntime.globals);announce();
}
export function stopRuntimeSession(){
 runtimeSession.generation++;runtimeSession.phase='stopped';runtimeSession.busy=false;revision=null;initializedScene=null;pending=null;elapsed=0;resetComponentRuntime();announce();
}
// A frame has one writer. Native callbacks finish before browser components,
// gameplay and Blueprint actions run against the same state.entities objects.
// Late responses are never applied after Stop, scene replacement or reconnect.
export function runRuntimeFrame(dt,{update,canRun=gameIsRunning}={}){
 if(!state.playing||runtimeSession.phase==='error')return false;
 if(runtimeSession.phase==='stopped'){update?.(dt);return true} // standalone tools/tests
 if(runtimeSession.backend==='web'||!canRun()){if(!runtimeSession.busy){if(canRun())updateComponentRuntime(dt);update?.(dt);captureWebComponents(state.entities,sequenceRuntime.globals)}return true}
 elapsed=Math.min(.1,elapsed+Math.max(0,Number(dt)||0));
 if(runtimeSession.busy)return false;
 // Hold a completed native frame while the debugger or game is paused.
 const generation=runtimeSession.generation,entities=state.entities,frame=++runtimeSession.frame,delta=elapsed;elapsed=0;
 runtimeSession.busy=true;
 const execute=async()=>{
  if(pending){const ready=pending;pending=null;return ready}
  if(initializedScene!==entities){
   runtimeSession.phase='connecting';announce();
   const health=await requestNative('/health');
   if(health.protocol<3||!health.capabilities?.includes('shared-play-frame'))throw Error('Le pont C# doit être mis à jour (protocole 3).');
   if(generation!==runtimeSession.generation)return null;
   const response=await requestNative('/scene',bridgeScene(nativePlayEntities(entities),{id:gameProject.activeSceneId}));
   if(generation!==runtimeSession.generation)return null;
   revision=response.revision;initializedScene=entities;
  }
  const submitted=runtimeFrame(entities);
  const response=await requestNative('/frame',{revision,frame,dt:delta,actors:submitted});
  if(response.revision!==revision||response.frame!==frame)throw Error('Réponse C# périmée : scène ou image différente.');
  if(!Array.isArray(response.actors))throw Error('Image C# invalide.');
  return {response,delta,submitted};
 };
 const promise=execute().then(result=>{
  if(!result||generation!==runtimeSession.generation||!state.playing||state.entities!==entities)return;
  if(!canRun()){pending=result;return}
  applyCsharpFrame(entities,result.response.actors,{expected:result.submitted});
  const living=new Set(result.response.actors.map(a=>a.id));for(let i=entities.length-1;i>=0;i--)if(result.submitted.some(a=>a.id===entities[i].id)&&!living.has(entities[i].id))entities.splice(i,1);
  runtimeSession.phase='ready';updateComponentRuntime(result.delta);update?.(result.delta);captureWebComponents(state.entities,sequenceRuntime.globals);
 }).catch(error=>{
  if(generation!==runtimeSession.generation||!state.playing)return;
  runtimeSession.phase='error';runtimeSession.error='Play C# interrompu : '+error.message;announce();
 }).finally(()=>{if(generation===runtimeSession.generation){runtimeSession.busy=false;announce()}});
 runtimeSession.completion=promise;return false;
}
