import {recoverBackup} from '../core/storage.js';
import {resetLayout} from './docking.js';
import {state,notify} from '../core/state.js';
import {record,undo,redo} from '../core/history.js';
import {addEntity,addLogicHotspot,loadLogicDemo,duplicateSelected,deleteSelected,togglePlay,loadCombatDemo,exportScene} from '../core/scene.js';
import {resetCamera} from '../core/camera.js';
import {toolsState,log} from './workspace.js';
const $=id=>document.getElementById(id);
export function initStudioMenus(){
 const menu=$('studioMenus');
 const close=()=>menu.querySelectorAll('details').forEach(d=>d.open=false);
 menu.addEventListener('toggle',e=>{if(e.target.tagName==='DETAILS'&&e.target.open){for(const d of menu.querySelectorAll('details'))if(d!==e.target)d.open=false}},true);
 document.addEventListener('pointerdown',e=>{if(!menu.contains(e.target))close()});
 const actions={
 new(){if(state.playing)return alert('Arrête le mode Play avant de créer une scène.');if(!confirm('Créer une scène vide ? Tu peux annuler cette opération avec Ctrl+Z.'))return;state.entities=[];state.selected=[];state.nextId=1;record('Nouvelle scène');notify();$('studioProjectName').textContent='Nouvelle scène';log('Nouvelle scène créée')},
 open(){$('load').click()},recoverBackup(){if(state.playing)return alert('Arrête Play avant la récupération.');if(!confirm('Rouvrir la scène précédente ? La scène actuelle sera remplacée.'))return;if(!recoverBackup())alert('Aucune sauvegarde de secours disponible.');else log('Scène précédente restaurée')},save(){exportScene()},cloud(){$('cloudConnect').click()},
 undo,redo,duplicate:duplicateSelected,delete:deleteSelected,
 project(){$('projectTab').click();$('assetSearch').focus()},hotspot:addLogicHotspot,logicDemo(){$('logicDemo').click()},character(){addEntity('character')},object(){addEntity('object')},
 play(){$('play').click()},demo(){$('loadDemo').click()},
 scene(){$('sceneTab').click()},console(){$('consoleTab').click()},frame:resetCamera,resetLayout,
 grid(){const input=$('gridEnabled');input.checked=!input.checked;input.dispatchEvent(new Event('change',{bubbles:true}))},
 shortcuts(){alert('WarLike Studio — raccourcis\nQ Main • W Déplacer • E Rotation • R Échelle • T Rectangle\nCtrl+Z Annuler • Ctrl+Y Rétablir • Ctrl+D Dupliquer\nSuppr Supprimer • Souris : zoom et déplacement caméra\nPlay : ZQSD ou flèches, clic gauche/F pour tirer')}
 };
 menu.addEventListener('click',e=>{const b=e.target.closest('[data-studio-action]');if(!b)return;const action=b.dataset.studioAction;close();if(actions[action])actions[action]()});
 window.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='n'){if(['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;e.preventDefault();actions.new()}if(e.key==='Escape')close()});
}
