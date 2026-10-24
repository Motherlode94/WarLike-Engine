import {recoverBackup} from '../core/storage.js';
import {resetLayout} from './docking.js';
import {state,notify} from '../core/state.js';
import {record,undo,redo} from '../core/history.js';
import {addEntity,addLogicHotspot,loadLogicDemo,loadNinjaZombieDemo,loadBuildingDemo,load3dBetaDemo,loadElementsDemo,loadGameModeDemo,setGameModeOnScene,duplicateSelected,deleteSelected,togglePlay,loadCombatDemo,exportScene} from '../core/scene.js';
import {resetCamera} from '../core/camera.js';
import {toolsState,log} from './workspace.js';
const $=id=>document.getElementById(id);
export function initStudioMenus(){
 const menu=$('studioMenus');
 const close=()=>menu.querySelectorAll('details').forEach(d=>d.open=false);
 menu.addEventListener('toggle',e=>{if(e.target.tagName==='DETAILS'&&e.target.open){for(const d of menu.querySelectorAll('details'))if(d!==e.target)d.open=false}},true);
 document.addEventListener('pointerdown',e=>{if(!menu.contains(e.target))close()});
 const actions={
 new(){if(!state.playing)$('hubOpen').click()},
 open(){$('load').click()},recoverBackup(){if(state.playing)return alert('Arrête Play avant la récupération.');if(!confirm('Rouvrir la scène précédente ? La scène actuelle sera remplacée.'))return;if(!recoverBackup())alert('Aucune sauvegarde de secours disponible.');else log('Scène précédente restaurée')},save(){exportScene()},cloud(){$('cloudConnect').click()},
 undo,redo,duplicate:duplicateSelected,delete:deleteSelected,
 project(){$('projectTab').click();$('assetSearch').focus()},hotspot:addLogicHotspot,logicDemo(){$('logicDemo').click()},character(){addEntity('character')},object(){addEntity('object')},
 threeDDemo(){if(state.playing)return;if(!confirm('Remplacer la scène du projet 3D par la ville 3D ?'))return;if(!$('view3dToggle').classList.contains('active'))$('view3dToggle').click();load3dBetaDemo('town');$('view3dFocus').click();log('Ville 3D : scène de test prête')},
 threeDNatureDemo(){if(state.playing)return;if(!confirm('Charger la démo Nature 3D dans ce projet ?'))return;if(!$('view3dToggle').classList.contains('active'))$('view3dToggle').click();load3dBetaDemo('nature');$('view3dFocus').click();log('Nature 3D : scène de test prête')},
 threeDGarageDemo(){if(state.playing)return;if(!confirm('Charger le garage 3D dans ce projet ?'))return;if(!$('view3dToggle').classList.contains('active'))$('view3dToggle').click();load3dBetaDemo('garage');$('view3dFocus').click();log('Garage 3D : véhicules exposés (conduite 3D non disponible)')},play(){$('play').click()},demo(){$('loadDemo').click()},elementsDemo(){if(state.playing)return;if(!confirm('Charger Elements Demo ? La scène actuelle sera remplacée.'))return;loadElementsDemo();log('Elements Demo : ramassage, pièges, checkpoint, téléportation')},buildingDemo(){if(state.playing)return;if(!confirm('Charger Building / RTS Demo ? La scène actuelle sera remplacée. Ctrl+Z permet d’annuler.'))return;loadBuildingDemo();log('RTS Buildings Demo chargé : production de soldats et véhicules au Play')},ninjaZombieDemo(){if(state.playing)return;if(!confirm('Charger Ninja vs Zombies ? La scène actuelle sera remplacée. Ctrl+Z permet d’annuler.'))return;loadNinjaZombieDemo();log('Ninja vs Zombies chargé : Play, déplacement ZQSD, K katana, F shuriken')},
 gameModeAdd(){if(state.playing)return;setGameModeOnScene('deathmatch');log('Game Mode ajouté : configurer dans Inspector')},gameModeDemo(){if(state.playing)return;const kind=document.getElementById('gameModeSelect')?.value||'deathmatch';if(!confirm('Charger la démo '+kind+' ? La scène actuelle sera remplacée (Ctrl+Z pour annuler).'))return;loadGameModeDemo(kind);log('Démo '+kind+' chargée')},
 scene(){$('sceneTab').click()},console(){$('consoleTab').click()},frame:resetCamera,resetLayout,
 grid(){const input=$('gridEnabled');input.checked=!input.checked;input.dispatchEvent(new Event('change',{bubbles:true}))},
 shortcuts(){alert('WarLike Studio — raccourcis\nQ Main • W Déplacer • E Rotation • R Échelle • T Rectangle\nCtrl+Z Annuler • Ctrl+Y Rétablir • Ctrl+D Dupliquer\nSuppr Supprimer • Souris : zoom et déplacement caméra\nPlay : ZQSD ou flèches, clic gauche/F pour tirer')}
 };
 menu.addEventListener('click',e=>{const b=e.target.closest('[data-studio-action]');if(!b)return;const action=b.dataset.studioAction;close();if(actions[action])actions[action]()});
 window.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='n'){if(['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;e.preventDefault();actions.new()}if(e.key==='Escape')close()});
}
