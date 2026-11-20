import {recoverBackup} from '../core/storage.js';
import {resetLayout} from './docking.js';
import {state,notify} from '../core/state.js';
import {record,undo,redo} from '../core/history.js';
import {addEntity,addLogicHotspot,setGameModeOnScene,duplicateSelected,deleteSelected,exportScene} from '../core/scene.js';
import {resetCamera} from '../core/camera.js';
import {toolsState,log} from './workspace.js';
const $=id=>document.getElementById(id);
export function initStudioMenus(){
 const menu=$('studioMenus');
 if(!menu)return;
 const close=()=>menu.querySelectorAll('details').forEach(d=>d.open=false);
 menu.addEventListener('click',e=>{const summary=e.target.closest('summary');if(!summary||!menu.contains(summary))return;const active=summary.parentElement;queueMicrotask(()=>{if(active.open)for(const d of menu.querySelectorAll('details'))if(d!==active)d.open=false})});
 document.addEventListener('pointerdown',e=>{if(!menu.contains(e.target))close()});
 const actions={
 new(){if(!state.playing)$('hubOpen').click()},
 open(){$('load').click()},recoverBackup(){if(state.playing)return alert('Arrête Play avant la récupération.');if(!confirm('Rouvrir la scène précédente ? La scène actuelle sera remplacée.'))return;if(!recoverBackup())alert('Aucune sauvegarde de secours disponible.');else log('Scène précédente restaurée')},save(){exportScene().catch(error=>alert('Export impossible : '+error.message))},cloud(){$('cloudConnect').click()},
 undo,redo,duplicate:duplicateSelected,delete:deleteSelected,
 project(){$('projectTab').click();$('assetSearch').focus()},hotspot:addLogicHotspot,character(){addEntity('character')},object(){addEntity('object')},
 play(){$('play').click()},
 gameModeAdd(){if(state.playing)return;const mode=$('gameModeSelect')?.value||'deathmatch';setGameModeOnScene(mode);log('Game Mode ajouté : configurer dans Inspector')},
 scene(){$('sceneTab').click()},console(){$('consoleTab').click()},frame:resetCamera,resetLayout,
 grid(){const input=$('gridEnabled');input.checked=!input.checked;input.dispatchEvent(new Event('change',{bubbles:true}))},
 shortcuts(){alert('WarLike Studio — raccourcis\nQ Main • W Déplacer • E Rotation • R Échelle • T Rectangle\nCtrl+Z Annuler • Ctrl+Y Rétablir • Ctrl+D Dupliquer\nSuppr Supprimer • Souris : zoom et déplacement caméra\nPlay : ZQSD ou flèches, clic gauche/F pour tirer')}
 };
 menu.addEventListener('click',e=>{const b=e.target.closest('[data-studio-action]');if(!b)return;const action=b.dataset.studioAction;close();if(actions[action]){try{actions[action]()}catch(error){console.error('[WarLike menu]',action,error);log('Erreur menu '+action+' : '+error.message)}}});
 window.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='n'){if(['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;e.preventDefault();actions.new()}if(e.key==='Escape')close()});
}
