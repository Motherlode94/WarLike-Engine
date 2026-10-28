import {initAdventureUi} from './ui/adventure-ui.js';
import {initSurvivalUi} from './ui/survival-ui.js';
import {initCreativeStudios} from './ui/creative-studios.js';
import {initCreativeRuntime} from './core/creative-runtime.js';
import {initLanPanel} from './ui/lan-panel.js';
import {initHeroForgeUi} from './ui/hero-forge-ui.js';
import {initDesktopInteractions} from './ui/desktop-interactions.js';
import {createBundledPhysicsScene2d} from './core/bundled-physics-scene.js';
import {initClipboardControls} from './ui/clipboard-controls.js';
import {isTypingTarget} from './core/editor-clipboard.js';
import {initSimpleHub} from './ui/simple-hub.js';
import {openComponentBrowser} from './ui/component-browser.js';
import {initGameFlowUi} from './ui/game-flow-ui.js';
import {initStudioPolish} from './ui/studio-polish.js';
import {horrorAudio,horrorAmbiences,setHorrorAmbience,unlockHorrorAudio,playHorrorCue} from './core/horror-audio.js';
import {loadHorror3dDemo} from './core/horror-pursuit-3d-demo.js';
import {initExternalAssetLibrary} from './ui/external-asset-library.js';
import {loadHorrorPursuitDemo} from './core/horror-pursuit-demo.js';
import {initVisualAssetPacks} from './ui/visual-asset-packs.js';
import {initCommunityManager} from './ui/community-manager.js';
import {createFpsScene} from './core/fps-scene.js';
import {initUnityPackageImport} from './ui/unitypackage-import.js';
import {horror} from './core/horror-survival.js';
import {renderQuality,loadRenderQuality,setRenderQuality,saveRenderQuality,applyHorrorAtmosphere} from './core/render-quality.js';
import {initBlueprintWorkspace} from './ui/blueprint-workspace.js?v=blueprint-game-builder-20261028';
import {initEditorAppearance} from './ui/editor-appearance.js?v=theme-sync-20261027';
import {initEditorPalette} from './ui/editor-palette.js?v=readable-custom-themes-20261028';
import {initCursorSettings} from './ui/cursor-settings.js';
import {initCSharpBridge} from './ui/csharp-runtime.js';
import {initializeNative3d,nativeStatus} from './core/native-3d.js';
import {initHub,hub} from './core/project-hub.js';
import {workspace} from './core/workspaces.js';
import {lighting,periodAt} from './core/lighting.js';
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
import {addEntity,addPrefab,addLogicHotspot,loadLogicDemo,loadRpgDemo,loadCombatDemo,loadDrivingDemo,load3dBetaDemo,addLight,addAudioEmitter,duplicateSelected,togglePlay,exportScene,importScene} from './core/scene.js';
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
document.getElementById('horrorPursuitDemo')?.addEventListener('click',()=>{if(!window.confirm('Charger Horror Pursuit ? La scène actuelle sera remplacée. Sauvegarde ton projet avant de continuer.'))return;try{loadHorrorPursuitDemo()}catch(error){window.alert(error.message)}});
document.getElementById('horror3dDemo')?.addEventListener('click',()=>{if(!confirm('Remplacer la scene par Horror 3D ?'))return;try{loadHorror3dDemo()}catch(error){alert(error.message)}});
initVisualAssetPacks();
initHub();
initBlueprintWorkspace();
initializeNative3d();
bindAudioControls($('#audioToggle'),$('#audioVolume'));

$('#newPointLight').onclick=()=>addLight('point');
$('#newSpotLight').onclick=()=>addLight('spot');
$('#newAudioSource').onclick=addAudioEmitter;
const hourInput=$('#sunHour'),clock=$('#sunClock'),cycle=$('#dayNightToggle'),speedInput=$('#dayNightSpeed'),period=$('#dayNightPeriod');
const clockText=()=>{const h=((lighting.hour%24)+24)%24,hh=Math.floor(h),mm=Math.floor((h-hh)*60);clock.textContent=String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0');hourInput.value=String(h);cycle.checked=lighting.dayNight;speedInput.value=String(lighting.speed>0?lighting.speed:60);period.textContent=periodAt(h)};
hourInput.addEventListener('input',()=>{lighting.hour=Number(hourInput.value)%24;clockText()});
hourInput.addEventListener('change',()=>record('Lighting: time of day'));
cycle.addEventListener('change',()=>{lighting.dayNight=cycle.checked;if(lighting.dayNight&&lighting.speed<=0)lighting.speed=Number(speedInput.value)||60;record('Lighting: day night cycle');clockText()});
speedInput.addEventListener('change',()=>{lighting.speed=Number(speedInput.value)||60;record('Lighting: day night speed');clockText()});
document.querySelectorAll('[data-day-night-hour]').forEach(button=>button.addEventListener('click',()=>{lighting.hour=Number(button.dataset.dayNightHour);clockText();record('Lighting: preset '+periodAt())}));
document.addEventListener('warlike:change',clockText);
setInterval(()=>{if(lighting.dayNight&&document.visibilityState==='visible'){const h=((lighting.hour%24)+24)%24,hh=Math.floor(h),mm=Math.floor((h-hh)*60);clock.textContent=String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0');hourInput.value=String(h);period.textContent=periodAt(h)}},500);
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
$('#play').onclick=()=>{try{togglePlay()}catch(error){console.error('[WarLike Play]',error);const message='Play impossible : '+(error?.message||String(error));log(message);window.alert(message)}};
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
window.addEventListener('keydown',e=>{if(!state.playing||e.repeat||e.ctrlKey||e.metaKey||e.key.toLowerCase()!=='c'||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;motion.cameraFollow=!motion.cameraFollow;log('Caméra : '+(motion.cameraFollow?'suivi du joueur':'libre'))});
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
sceneTab.onclick=()=>{if(state.playing)$('#play').click();syncTabs()};
gameTab.onclick=()=>{if(!state.playing)$('#play').click();syncTabs()};
$('#play').addEventListener('click',syncTabs);
$('#play').disabled=false;
$('#play').setAttribute('aria-label','Lancer ou arrêter le jeu');
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
window.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='d'&&!isTypingTarget(document.activeElement)){e.preventDefault();duplicateSelected()}});

document.getElementById('menuOpenBlueprint')?.addEventListener('click',()=>{
 document.getElementById('openBlueprint')?.click();
 document.getElementById('menuOpenBlueprint')?.closest('details')?.removeAttribute('open');
});
document.getElementById('menuAddComponent')?.addEventListener('click',()=>{
 const inspector=document.getElementById('inspectorPanel');
 if(inspector){inspector.scrollIntoView({block:'nearest'});}
 openComponentBrowser();
 document.getElementById('menuAddComponent')?.closest('details')?.removeAttribute('open');
});
initStudioMenus();
initCommunityManager();
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

initExternalAssetLibrary();

// Horror Audio Settings use the existing editor and browser audio policy.
const horrorPanel=document.getElementById('projectContent');
if(horrorPanel&&!document.getElementById('warlikeHorrorAudioSettings')){
 const panel=document.createElement('details');panel.id='warlikeHorrorAudioSettings';
 const title=document.createElement('summary');title.textContent='🔊 Horror Audio · Ambiance et poursuite';
 const body=document.createElement('div');body.style.cssText='display:grid;gap:8px;padding:10px';
 const enabled=document.createElement('label'),enable=document.createElement('input');enable.type='checkbox';enable.checked=horrorAudio.enabled;enabled.append(enable,document.createTextNode(' Activer sons Horror'));enable.onchange=()=>{horrorAudio.enabled=enable.checked};
 const volume=document.createElement('input');volume.type='range';volume.min='0';volume.max='1';volume.step='.05';volume.value=String(horrorAudio.volume);volume.setAttribute('aria-label','Volume des sons Horror');volume.oninput=()=>{horrorAudio.volume=Number(volume.value)};
 const test=document.createElement('button');test.type='button';test.textContent='▶ Écouter un son Horror';test.onclick=()=>{unlockHorrorAudio();playHorrorCue('alert')};
 const ambienceLabel=document.createElement('label');ambienceLabel.textContent='Ambiance de la scène';
 const ambienceSelect=document.createElement('select');ambienceSelect.setAttribute('aria-label','Ambiance Horror');
 for(const [key,name] of Object.entries(horrorAmbiences)){const option=document.createElement('option');option.value=key;option.textContent=name;ambienceSelect.append(option)}
 ambienceSelect.value=horrorAudio.environment;
 ambienceSelect.onchange=()=>{setHorrorAmbience(ambienceSelect.value);try{localStorage.setItem('warlike.horror.ambience.v1',ambienceSelect.value)}catch{}};
 ambienceLabel.append(ambienceSelect);
 const detailsLabel=document.createElement('label'),detailsToggle=document.createElement('input');detailsToggle.type='checkbox';detailsToggle.checked=horrorAudio.details;detailsToggle.onchange=()=>{horrorAudio.details=detailsToggle.checked};detailsLabel.append(detailsToggle,document.createTextNode(' Bruits environnementaux'));
 const heartLabel=document.createElement('label'),heartToggle=document.createElement('input');heartToggle.type='checkbox';heartToggle.checked=horrorAudio.heartbeat;heartToggle.onchange=()=>{horrorAudio.heartbeat=heartToggle.checked};heartLabel.append(heartToggle,document.createTextNode(' Battements de coeur selon la peur'));
 body.append(ambienceLabel,detailsLabel,heartLabel);
 try{setHorrorAmbience(localStorage.getItem('warlike.horror.ambience.v1')||'abandoned')}catch{}
 ambienceSelect.value=horrorAudio.environment;
 body.append(enabled,document.createTextNode('Volume Horror'),volume,test);panel.append(title,body);horrorPanel.append(panel);
}
document.getElementById('play')?.addEventListener('click',()=>{unlockHorrorAudio()},{capture:true});


initGameFlowUi();
initStudioPolish();

document.addEventListener('warlike:load-asset-test',()=>{
 if(state.playing)return;
 if(workspace.mode==='2d'){if(!confirm('Charger la scène test de physique 2D ? La scène actuelle reste récupérable avec Ctrl+Z.'))return;record('Avant scène de physique 2D');const scene=createBundledPhysicsScene2d();Object.assign(state,scene);state.demoGuide=scene.guide;delete state.guide;record('Scène test · Physique 2D');notify();log(scene.guide);return}
 if(!confirm('Reconstruire la scène test avec les modèles Kenney et Quaternius ? La scène actuelle est remplaçable avec Ctrl+Z.'))return;
 load3dBetaDemo('town');Object.assign(view3d,{target:[0,1,0],radius:24,yaw:-.65,pitch:.65});log('Scène test reconstruite : Ultimate Guns, personnages et monstres animés, véhicules et décors intégrés.');
});

initSimpleHub();

initClipboardControls();

initDesktopInteractions();

initHeroForgeUi();

initLanPanel();

initCreativeStudios();initCreativeRuntime();initSurvivalUi();initAdventureUi();
