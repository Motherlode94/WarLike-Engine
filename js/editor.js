import {bindAudioControls} from './core/audio.js';
import {init3d} from './core/viewport-3d.js';
import {motion} from './core/player-controller.js';
import {bindModeInput} from './core/game-modes.js';
import {initializeRpgUi} from './core/rpg-systems.js';
import {initDocking} from './ui/docking.js';
import {initStudioMenus} from './ui/studio-menu.js';
import {bindGameInput} from './core/gameplay.js';
import {initWorkspace,log} from './ui/workspace.js';
import {catalog,urlFor} from './assets/catalog.js';
import {state,notify} from './core/state.js';
import {autoSave,recoverLocal,hasLocalSave,backupLocalSave,beginAutoSave,connectCloud} from './core/storage.js';
import {zoomAt,resetCamera} from './core/camera.js';
import {record,undo,redo} from './core/history.js';
import {addEntity,addPrefab,addLogicHotspot,loadLogicDemo,loadRpgDemo,loadCombatDemo,loadDrivingDemo,duplicateSelected,togglePlay,exportScene,importScene} from './core/scene.js';
import {renderUI} from './ui/inspector.js';
import {attachInput} from './core/input.js';
import {startRenderer} from './core/renderer.js';
const $=s=>document.querySelector(s),canvas=$('#canvas'),host=$('#viewport');
bindAudioControls($('#audioToggle'),$('#audioVolume'));
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
if(hasLocalSave()){
 if(window.confirm('WarLike Studio a retrouvé une scène sauvegardée.\n\nOK : rouvrir la dernière scène.\nAnnuler : commencer une nouvelle session (l’ancienne scène sera conservée en sauvegarde de secours).')){
  if(!recoverLocal())record('Scène initiale');
 }else{
  backupLocalSave();record('Nouvelle session');
 }
}else record('Scène initiale');
beginAutoSave();
$('#cloudConnect').onclick=connectCloud;
renderUI();
startRenderer(canvas,host);
init3d($('#canvas3d'),host,{toggle:$('#view3dToggle'),focus:$('#view3dFocus'),status:$('#view3dStatus')});

const sceneTab=$('#sceneTab'),gameTab=$('#gameTab');
function syncTabs(){sceneTab.classList.toggle('active',!state.playing);gameTab.classList.toggle('active',state.playing);$('#gameHint').hidden=!state.playing}
sceneTab.onclick=()=>{if(state.playing)togglePlay();syncTabs()};
gameTab.onclick=()=>{if(!state.playing)togglePlay();syncTabs()};
$('#play').addEventListener('click',syncTabs);
$('#duplicate').onclick=duplicateSelected;
initWorkspace();
initDocking();
window.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='d'&&!['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)){e.preventDefault();duplicateSelected()}});

initStudioMenus();
