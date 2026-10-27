import {createFpsScene} from './core/fps-scene.js';
import {initUnityPackageImport} from './ui/unitypackage-import.js';
import {horror} from './core/horror-survival.js';
import {renderQuality,loadRenderQuality,setRenderQuality,saveRenderQuality,applyHorrorAtmosphere} from './core/render-quality.js';
import {initBlueprintWorkspace} from './ui/blueprint-workspace.js';
import {initEditorAppearance} from './ui/editor-appearance.js?v=theme-sync-20261027';
import {initEditorPalette} from './ui/editor-palette.js?v=theme-consistency-2-20261027';
import {initCursorSettings} from './ui/cursor-settings.js';
import {initCSharpBridge} from './ui/csharp-runtime.js';
import {initializeNative3d,nativeStatus} from './core/native-3d.js';
import {initHub,hub} from './core/project-hub.js';
import {workspace} from './core/workspaces.js';
import {lighting} from './core/lighting.js';
import {view3d} from './core/viewport-3d.js';
import {updateAudioSources,stopSources} from './core/audio-sources.js';
import {bindAudioControls} from './core/audio.js';
import {init3d} from './core/viewport-3d.js';
import {motion} from './core/player-controller.js';
import {bindModeInput} from './core/game-modes.js';
import {initializeRpgUi} from './core/rpg-systems.js';
import {initDocking} from './ui/docking.js';
import {initStudioMenus} from './ui/studio-menu.js';
import {bindGameInput,startGameSimulation} from './core/gameplay.js';
import {initWorkspace,log} from './ui/workspace.js';
import {catalog,urlFor} from './assets/catalog.js';
import {state,notify} from './core/state.js';
import {autoSave,recoverLocal,hasLocalSave,backupLocalSave,beginAutoSave,connectCloud} from './core/storage.js';
import {zoomAt,resetCamera} from './core/camera.js';
import {record,undo,redo,renderHistory} from './core/history.js';
import {addEntity,addPrefab,addLogicHotspot,loadLogicDemo,loadRpgDemo,loadCombatDemo,loadDrivingDemo,addLight,addAudioEmitter,duplicateSelected,togglePlay,exportScene,importScene} from './core/scene.js';
import {renderUI} from './ui/inspector.js';
import {attachInput} from './core/input.js';
import {startRenderer} from './core/renderer.js';
const $=s=>document.querySelector(s),canvas=$('#canvas'),host=$('#viewport');
document.getElementById('fpsScene')?.addEventListener('click',()=>{if(!window.confirm('Remplacer la scène 3D actuelle par le terrain d’entraînement FPS ? Sauvegarde d’abord ton projet.'))return;try{createFpsScene();document.getElementById('workspace3d')?.click();}catch(error){window.alert(error.message)}});
// Make the project chooser visible before initializing optional editor systems.
loadRenderQuality();
for(const [id,key,scale] of [['render2dAmbient','ambient2d',100],['render2dRadius','lightRadius2d',1],['render3dExposure','exposure3d',100],['render3dFog','fog3d',1000]]){
 const input=document.getElementById(id);if(!input)continue;
 input.value=String(Math.round(renderQuality[key]*scale));
 input.addEventListener('input',()=>setRenderQuality({[key]:Number(input.value)/scale}));
 input.addEventListener('change',()=>saveRenderQuality());
}
document.getElementById('renderHorrorProfile')?.addEventListener('click',()=>{
 applyHorrorAtmosphere();saveRenderQuality();
 for(const [id,key,scale] of [['render2dAmbient','ambient2d',100],['render2dRadius','lightRadius2d',1],['render3dExposure','exposure3d',100],['render3dFog','fog3d',1000]]){
  const control=document.getElementById(id);if(control)control.value=String(Math.round(renderQuality[key]*scale));
 }
});
const horrorToggle=document.getElementById('horrorSurvivalToggle');
if(horrorToggle){horrorToggle.checked=horror.enabled;horrorToggle.addEventListener('change',()=>{horror.enabled=horrorToggle.checked})}
const enableLight=document.getElementById('render2dLight');
if(enableLight){enableLight.checked=renderQuality.lighting2d;enableLight.addEventListener('change',()=>{setRenderQuality({lighting2d:enableLight.checked});saveRenderQuality()})}
initUnityPackageImport();
initHub();
initBlueprintWorkspace();
initializeNative3d();
bindAudioControls($('#audioToggle'),$('#audioVolume'));

$('#newPointLight').onclick=()=>addLight('point');
$('#newSpotLight').onclick=()=>addLight('spot');
$('#newAudioSource').onclick=addAudioEmitter;
const hourInput=$('#sunHour'),clock=$('#sunClock'),cycle=$('#dayNightToggle');
const clockText=()=>{const h=Math.floor(lighting.hour)%24,m=Math.floor((lighting.hour%1)*60);clock.textContent=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');hourInput.value=String(lighting.hour);cycle.checked=lighting.dayNight};
hourInput.addEventListener('input',()=>{lighting.hour=Number(hourInput.value);clockText()});
hourInput.addEventListener('change',()=>record('Lighting: time of day'));
cycle.addEventListener('change',()=>{lighting.dayNight=cycle.checked;lighting.speed=lighting.dayNight?30:0;record('Lighting: day night cycle')});
document.addEventListener('warlike:change',clockText);
clockText();
let wasPlaying=false,lastClock=0;
function audioFrame(timestamp){
 requestAnimationFrame(audioFrame);
 if(wasPlaying&&!state.playing)stopSources();
 wasPlaying=state.playing;
 updateAudioSources(timestamp/1000);
 if(timestamp-lastClock>300){clockText();lastClock=timestamp}
}
requestAnimationFrame(audioFrame);

$('#undo').onclick=undo;
$('#redo').onclick=redo;
$('#play').onclick=togglePlay;
$('#save').onclick=exportScene;
$('#load').onclick=()=>$('#file').click();
$('#file').onchange=async e=>{try{await importScene(e.target.files?.[0])}catch(error){alert('Impossible de charger la scène : '+error.message)}finally{e.target.value=''}};
$('#zoomIn').onclick=()=>zoomAt(1.25,{x:host.clientWidth/2,y:host.clientHeight/2});
$('#zoomOut').onclick=()=>zoomAt(.8,{x:host.clientWidth/2,y:host.clientHeight/2});
$('#resetView').onclick=resetCamera;
attachInput(canvas,host);
bindGameInput(canvas);
initializeRpgUi();
bindModeInput();
window.addEventListener('keydown',e=>{if(!state.playing||e.repeat||e.key.toLowerCase()!=='c'||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;motion.cameraFollow=!motion.cameraFollow;log('Caméra : '+(motion.cameraFollow?'suivi du joueur':'libre'))});
$('#rpgDemo').onclick=()=>{if(state.playing)return;if(!confirm('Charger RPG Demo ? Cette action remplace la scène actuelle (Ctrl+Z pour annuler).'))return;loadRpgDemo();log('RPG Demo chargé — Play, E, I et J')};
$('#logicDemo').onclick=()=>{if(state.playing)return;if(!confirm('Charger Visual Logic Demo ? La scène actuelle sera remplacée (Ctrl+Z pour annuler).'))return;loadLogicDemo();log('Visual Logic Demo chargé — Play et E pour interagir')};
$('#driveDemo').onclick=()=>{if(state.playing)return;if(!confirm('Charger Driving Sandbox ? Tu peux annuler ce remplacement avec Ctrl+Z.'))return;loadDrivingDemo();log('Driving Sandbox chargé — Play, puis E pour monter')};
$('#loadDemo').onclick=()=>{if(state.playing)return;if(!confirm('Charger Combat Sandbox ? La scène actuelle sera remplacée dans l’éditeur. Tu pourras l’annuler avec Ctrl+Z.'))return;loadCombatDemo();log('Combat Sandbox chargé : sélectionne Play')};
// The Hub handles legacy scene recovery explicitly; never overwrite a named project on startup.
record('Scène initiale');
beginAutoSave();
$('#cloudConnect').onclick=connectCloud;
// Populate the 2D/3D asset browser before starting either graphics renderer.
initWorkspace();
renderUI();
startRenderer(canvas,host);
startGameSimulation();
const viewport3d=init3d($('#canvas3d'),host,{toggle:$('#view3dToggle'),focus:$('#view3dFocus'),status:$('#view3dStatus')});

const sceneTab=$('#sceneTab'),gameTab=$('#gameTab');
function syncTabs(){sceneTab.classList.toggle('active',!state.playing);gameTab.classList.toggle('active',state.playing);$('#gameHint').hidden=!state.playing;$('#gameHint').textContent=(state.demoGuide|| (workspace.mode==='3d'?'3D Play • ZQSD/WASD : avancer • Maj : courir • Souris droite : orienter caméra • Molette : zoom':'2D Play • ZQSD/WASD : marcher • E : interagir/véhicule • F : tirer'));$('#status').textContent=(workspace.mode==='3d'?'3D':'2D')+' • '+(state.playing?'Play':'Édition');$('#workspace2d').disabled=state.playing||!!hub.projectId&&hub.type!=='2d';$('#workspace3d').disabled=state.playing||!!hub.projectId&&hub.type!=='3d'}
sceneTab.onclick=()=>{if(state.playing)togglePlay();syncTabs()};
gameTab.onclick=()=>{if(!state.playing)togglePlay();syncTabs()};
$('#play').addEventListener('click',syncTabs);
const setWorkspaceUi=()=>{
 const is3d=workspace.mode==='3d';
 document.dispatchEvent(new Event('warlike:workspace'));
 $('#workspace2d').classList.toggle('active',!is3d);
 $('#workspace3d').classList.toggle('active',is3d);
 document.body.dataset.workspace=workspace.mode;
 $('#view3dFocus').disabled=!is3d;
 renderHistory();syncTabs();
};
$('#workspace2d').onclick=()=>{if(state.playing||hub.projectId&&hub.type!=='2d')return;if(workspace.mode==='3d')$('#view3dToggle').click();setWorkspaceUi()};
$('#workspace3d').onclick=()=>{if(state.playing||hub.projectId&&hub.type!=='3d')return;if(workspace.mode==='2d')$('#view3dToggle').click();setWorkspaceUi()};
$('#view3dToggle').addEventListener('click',setWorkspaceUi);
setWorkspaceUi();
document.addEventListener('warlike:project',setWorkspaceUi);
document.addEventListener('warlike:change',()=>{if(viewport3d&&view3d.enabled!==(workspace.mode==='3d')){viewport3d.syncToWorkspace();setWorkspaceUi()}});
$('#duplicate').onclick=duplicateSelected;
// Move existing controls into a single categorized library; preserve original IDs and handlers.
const relocateTools=(targetId,ids)=>{
 const target=document.getElementById(targetId);
 if(!target)return;
 for(const id of ids){const control=document.getElementById(id);if(control)target.append(control)}
};
relocateTools('warlikeDemoTools',['rpgDemo','logicDemo','driveDemo','loadDemo']);
relocateTools('warlikeCreationTools',['newPointLight','newSpotLight','newAudioSource']);
relocateTools('warlikeRenderingTools',['audioToggle']);
const volumeInput=document.getElementById('audioVolume');
if(volumeInput){
 const volumeLabel=volumeInput.closest('label');
 const target=document.getElementById('warlikeRenderingTools');
 if(volumeLabel&&target)target.append(volumeLabel);
}
// One transient menu at a time, across the whole editor (not only one menu group).
const library=document.getElementById('warlikeToolLibrary');
const isTransient=details=>details.matches('.studio-menus > details, #warlikeToolLibrary, #editorAppearance');
const transientMenus=()=>[...document.querySelectorAll('.studio-menus > details, #warlikeToolLibrary, #editorAppearance')];
document.addEventListener('click',event=>{
 const summary=event.target.closest('summary');
 const owner=summary?.parentElement;
 if(owner?.tagName==='DETAILS'&&isTransient(owner)){
  // Native <details> toggles after click; close other menus without preventing it.
  for(const other of transientMenus())if(other!==owner)other.open=false;
 }else if(!event.target.closest('.studio-menus, #warlikeToolLibrary, #editorAppearance')){
  for(const other of transientMenus())other.open=false;
 }
 if(library?.open&&event.target.closest('#warlikeToolLibrary button'))library.open=false;
});
document.addEventListener('keydown',event=>{
 if(event.key==='Escape')for(const other of transientMenus())other.open=false;
});
initDocking();
// The primary toolbar favors creation over an extra visibility toggle.
document.body.classList.add('warlike-compact-editor');
const quickCreate=document.getElementById('studioQuickCreate');
quickCreate?.addEventListener('click',event=>{
 const button=event.target.closest('[data-quick-create]');
 if(!button)return;
 const actions={
  object:()=>addEntity('object'),
  character:()=>addEntity('character'),
  light:()=>document.getElementById('newPointLight')?.click(),
  audio:()=>document.getElementById('newAudioSource')?.click(),
  blueprint:()=>document.getElementById('openBlueprint')?.click()
 };
 actions[button.dataset.quickCreate]?.();
 quickCreate.open=false;
});
document.addEventListener('pointerdown',event=>{if(quickCreate?.open&&!quickCreate.contains(event.target))quickCreate.open=false});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&quickCreate?.open)quickCreate.open=false});
document.getElementById('quickCreateObject')?.addEventListener('click',()=>addEntity('object'));
document.getElementById('quickCreateCharacter')?.addEventListener('click',()=>addEntity('character'));
window.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='d'&&!['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)){e.preventDefault();duplicateSelected()}});

document.getElementById('menuOpenBlueprint')?.addEventListener('click',()=>{
 document.getElementById('openBlueprint')?.click();
 document.getElementById('menuOpenBlueprint')?.closest('details')?.removeAttribute('open');
});
document.getElementById('menuAddComponent')?.addEventListener('click',()=>{
 const inspector=document.getElementById('inspectorPanel');
 if(inspector){inspector.scrollIntoView({block:'nearest'});}
 const details=[...document.querySelectorAll('#properties details')].find(el=>el.querySelector('summary')?.textContent?.includes('Components'));
 if(details){details.open=true;details.querySelector('input[type=search]')?.focus()}
 document.getElementById('menuAddComponent')?.closest('details')?.removeAttribute('open');
});
initStudioMenus();
initEditorAppearance();
initEditorPalette();
initCursorSettings();

// Focus layout: frequent actions live on the first row, advanced toolbar opens on demand.
const primaryActions=document.getElementById('studioPrimaryActions');
const secondaryToolbar=document.getElementById('studioSecondaryToolbar');
const toolbarToggle=document.getElementById('studioToolbarToggle');
if(primaryActions&&secondaryToolbar&&toolbarToggle){
 for(const id of ['warlikeToolLibrary','studioQuickCreate','openBlueprint','undo','redo','play']){
  const element=document.getElementById(id);
  if(element){
   if(element.parentElement?.classList.contains('toolbar-group')&&element.parentElement.children.length===1)element.parentElement.remove();
   primaryActions.append(element);
  }
 }
 const setExpanded=expanded=>{
  document.body.classList.toggle('warlike-toolbar-expanded',expanded);
  toolbarToggle.setAttribute('aria-expanded',String(expanded));
  toolbarToggle.textContent=expanded?'▴ Moins':'☷ Plus';
  try{localStorage.setItem('warlike.toolbar.expanded.v1',String(expanded))}catch{}
  window.dispatchEvent(new Event('resize'));
 };
 let expanded=false;
 try{expanded=localStorage.getItem('warlike.toolbar.expanded.v1')==='true'}catch{}
 setExpanded(expanded);
 toolbarToggle.addEventListener('click',()=>setExpanded(!document.body.classList.contains('warlike-toolbar-expanded')));
}

initCSharpBridge();
