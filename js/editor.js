import {renderQuality,loadRenderQuality,setRenderQuality,saveRenderQuality,applyHorrorAtmosphere} from './core/render-quality.js';
import {initBlueprintWorkspace} from './ui/blueprint-workspace.js';
import {initEditorAppearance} from './ui/editor-appearance.js';
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
const enableLight=document.getElementById('render2dLight');
if(enableLight){enableLight.checked=renderQuality.lighting2d;enableLight.addEventListener('change',()=>{setRenderQuality({lighting2d:enableLight.checked});saveRenderQuality()})}
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
initDocking();
window.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='d'&&!['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)){e.preventDefault();duplicateSelected()}});

initStudioMenus();
initEditorAppearance();
