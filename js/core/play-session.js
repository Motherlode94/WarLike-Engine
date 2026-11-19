import {startProfiler,stopProfiler} from './runtime-profiler.js';
import {cleanupPlay} from './play-cleanup.js';
import {state,notify} from './state.js';
import {gameProject} from './game-project.js';
import {workspace} from './workspaces.js';
import {horror} from './horror-survival.js';
import {animationEditorPreview} from './animation-clips.js';
import {inspectRuntimeCompatibility} from './runtime-capabilities.js';
import {inspectBlueprintGame} from './blueprint-validation.js';
import {applyGraph} from './blueprint-graph.js';
import {sequenceEntries,resetSequences} from './logic-sequences.js';
import {resetHeroRuntime} from './superhero-runtime.js';
import {resetEngineDiagnostics,stopEngineDiagnostics} from './engine-diagnostics.js';
import {startRuntimeSession,stopRuntimeSession} from './runtime-session.js';
import {resetGame} from './gameplay.js';
import {getAsset} from '../assets/catalog.js';
import {editorServices} from './editor-services.js';
const renderHistory=()=>editorServices.renderHistory();
// Keep editor state independent from mutable Play objects. All authoring data
// is snapshotted before graph compilation and runtime component initialization.
function restoreEditorAfterPlay(){
 if(state.playBackup!==null&&state.playBackup!==undefined)state.entities=JSON.parse(state.playBackup);
 if(state.playSelectedBackup)state.selected=JSON.parse(state.playSelectedBackup);
 if(state.playProjectBackup){
  const saved=JSON.parse(state.playProjectBackup);
  for(const key of Object.keys(gameProject))if(!Object.hasOwn(saved,key))delete gameProject[key];
  Object.assign(gameProject,saved);
 }
 state.nextId=state.playNextId??state.nextId;
 if(state.playHorrorBackup){Object.assign(horror,state.playHorrorBackup);state.playHorrorBackup=null}
 if(state.playCameraBackup)state.camera=structuredClone(state.playCameraBackup);
 state.playCameraBackup=null;state.playBackup=null;state.playNextId=null;
 state.playSelectedBackup=null;state.playProjectBackup=null;
 state.playing=false;state.keys.clear();state.keyPresses?.clear();
}
export function togglePlay(){
 const btn=document.querySelector('#play');
 if(state.playing){
  // Always restore the editor copy, even if a runtime cleanup reports an error.
  let error=null;
  try{error=cleanupPlay([stopRuntimeSession,resetHeroRuntime,stopEngineDiagnostics,resetSequences,stopProfiler])[0]??null}
  finally{
   try{restoreEditorAfterPlay()}catch(e){error??=e;state.playing=false;state.keys.clear();state.keyPresses?.clear()}
   if(btn){btn.textContent='▶ Play';btn.classList.remove('active');btn.setAttribute('aria-pressed','false')}
   document.querySelector('#status')?.replaceChildren(document.createTextNode('Édition'));
   renderHistory();notify();
  }
  if(error)console.error('[WarLike Stop] Nettoyage incomplet :',error);
  return;
 }
 animationEditorPreview.stop();
 // Make a snapshot before any runtime mutation. Startup failures must not
 // leave Play active or damage the editable scene.
 const compatibility=inspectRuntimeCompatibility(state.entities,{target:gameProject.runtimeBackend==='native'?'native':'web',backend:gameProject.runtimeBackend,project:gameProject});
 if(compatibility.length)throw Error(compatibility[0].message);
 const blueprintErrors=inspectBlueprintGame(state.entities,{requirePlayer:false}).filter(issue=>issue.severity==='error');
 if(blueprintErrors.length)throw Error(blueprintErrors[0].message);
 const backup=JSON.stringify(state.entities),nextId=state.nextId;
 const selectedBackup=JSON.stringify(state.selected),projectBackup=JSON.stringify(gameProject);
 state.playBackup=backup;state.playSelectedBackup=selectedBackup;state.playProjectBackup=projectBackup;
 state.playCameraBackup=structuredClone(state.camera);state.playNextId=nextId;state.keyPresses?.clear();
 try{
  // Play uses cloned entities. Blueprint compilation and scripts never touch
  // the authored objects or their legacy component fields.
  state.entities=JSON.parse(backup);
  for(const o of state.entities)for(const {sequence} of sequenceEntries(o))if(sequence.enabled!==false&&sequence.graph)applyGraph(sequence);
  state.playing=true;
  const playable=state.entities.some(o=>o.playable3d===true||o.type==='player'||o.type==='character'||o.type==='prefab'&&getAsset(o.assetId)?.category==='Characters');
  if(!playable){
   const id=state.nextId++;
   state.entities.unshift({id,name:workspace.mode==='3d'?'3D Test Player':'2D Test Player',type:'character',skin:'scout',animation:'idle',x:100,y:100,w:45,h:78,color:'#41cdb5',elevation3d:0});
  }
  resetHeroRuntime();resetGame();resetSequences();resetEngineDiagnostics(workspace.mode);startProfiler();startRuntimeSession();
  const horrorActor=state.entities.find(o=>o.horrorSettings);if(horrorActor){state.playHorrorBackup=structuredClone(horror);Object.assign(horror,{...horrorActor.horrorSettings,battery:100,fear:0,threat:0,toggleHeld:false,jumpscare:0})}
  if(btn){btn.textContent='■ Stop';btn.classList.add('active');btn.setAttribute('aria-pressed','true')}
  document.querySelector('#status')?.replaceChildren(document.createTextNode('Play mode'));
  renderHistory();notify();
 }catch(error){
  for(const cleanupError of cleanupPlay([stopRuntimeSession,resetHeroRuntime,stopEngineDiagnostics,resetSequences,stopProfiler]))console.error('[WarLike Play] rollback:',cleanupError);
  restoreEditorAfterPlay();
  if(btn){btn.textContent='▶ Play';btn.classList.remove('active');btn.setAttribute('aria-pressed','false')}
  document.querySelector('#status')?.replaceChildren(document.createTextNode('Erreur Play'));
  renderHistory();notify();
  throw error;
 }
}
