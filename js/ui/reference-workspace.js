import {state} from '../core/state.js';
import {gameSession,setGamePhase} from '../core/game-session.js';
// Presentation only: move original controls; do not migrate or rewrite projects.
export function initReferenceWorkspace(){
 if(globalThis.__WARLIKE_BUILD__||document.body.classList.contains('reference-engine'))return;
 document.body.classList.add('reference-engine');
 const $=id=>document.getElementById(id),menus=$('studioMenus'),more=$('studioMoreMenus');
 const windowMenu=[...more?.querySelectorAll('.studio-more-popover>details')||[]].find(n=>n.querySelector('summary')?.textContent==='Window');
 if(windowMenu)$('openAnimationStudio')&&windowMenu.querySelector('.studio-dropdown').append($('openAnimationStudio'));
 for(const group of [...more?.querySelectorAll('.studio-more-popover>details')||[]])menus.append(group);
 if(more&&!more.querySelector('.studio-more-popover')?.children.length)more.remove();
 const appearance=$('editorAppearance');if(appearance)menus.append(appearance);
 const primary=$('studioPrimaryActions'),secondary=$('studioSecondaryToolbar');
 for(const id of ['warlikeToolLibrary','undo','redo']){const node=$(id);if(node)secondary.prepend(node);}
 const fileMenu=[...menus.children].find(n=>n.querySelector('summary')?.textContent==='Fichier')?.querySelector('.studio-dropdown');
 const gameMenu=[...menus.children].find(n=>n.querySelector('summary')?.textContent==='Game')?.querySelector('.studio-dropdown');
 if(fileMenu&&$('exportGame'))fileMenu.append($('exportGame'));if(gameMenu&&$('loadAssetTest3d'))gameMenu.prepend($('loadAssetTest3d'));
 const tools=document.querySelector('.scene-tools'),header=document.querySelector('.scene-header'),center=document.querySelector('.center-stack');
 const toolHost=document.createElement('div');toolHost.className='reference-editor-tools';toolHost.setAttribute('aria-label','Outils de transformation');
 if($('studioQuickCreate'))toolHost.append($('studioQuickCreate'));document.querySelector('.studio-menubar').append(toolHost);
 const sceneMenu=document.createElement('details');sceneMenu.className='reference-scene-menu';const summary=document.createElement('summary');summary.textContent='Affichage';const options=document.createElement('div');options.className='reference-scene-options';sceneMenu.append(summary,options);
 const sceneActions=header.querySelector('.scene-actions');for(const n of [...sceneActions.children])if(!['workspace2d','workspace3d','view3dFocus','resetView'].includes(n.id))options.append(n);
 for(const n of [...tools.querySelectorAll('.tool-option')])if(!n.querySelector('#snapEnabled'))options.append(n);
 sceneActions.append(sceneMenu);
 const compact=matchMedia('(max-width:1100px)');const arrange=()=>{if(compact.matches)center.insertBefore(tools,header);else toolHost.append(tools);window.dispatchEvent(new Event('resize'));};compact.addEventListener('change',arrange);arrange();
 const blueprint=$('openBlueprint');if(blueprint){blueprint.textContent='⬡ Blueprint';document.querySelector('.studio-project-name').prepend(blueprint);}
 const pause=document.createElement('button');pause.id='editorPause';pause.type='button';pause.textContent='Ⅱ';pause.setAttribute('aria-label','Pause de la simulation');pause.onclick=()=>{if(state.playing&&['playing','paused'].includes(gameSession.phase)){setGamePhase(gameSession.phase==='paused'?'playing':'paused');sync();}};
 primary.replaceChildren($('play'),pause);const sync=()=>{pause.disabled=!state.playing||!['playing','paused'].includes(gameSession.phase);pause.setAttribute('aria-pressed',String(state.playing&&gameSession.phase==='paused'));};document.addEventListener('warlike:change',sync);sync();
 for(const menu of [sceneMenu]){document.addEventListener('pointerdown',e=>{if(!menu.contains(e.target))menu.open=false;});document.addEventListener('keydown',e=>{if(e.key==='Escape')menu.open=false;});}
 // Project browser: a single search row, compact assets and a bottom pager.
 const assets=$('warlikeVisualPacks'),assetToolbar=assets?.querySelector('.free-asset-toolbar'),results=assets?.querySelector('.visual-pack-results');
 if(assetToolbar&&results){const filters=document.createElement('details');filters.className='reference-asset-options';const label=document.createElement('summary');label.textContent='Filtres';const contents=document.createElement('div');filters.append(label,contents);for(const n of [assets.querySelector('.free-asset-filters'),$('visualPackInfo'),assets.querySelector('[aria-label="Ressources par page"]')])if(n)contents.append(n);assetToolbar.append(filters);const pager=assets.querySelector('.free-asset-pager');if(pager)results.append(pager);document.addEventListener('pointerdown',e=>{if(!filters.contains(e.target))filters.open=false;});document.addEventListener('keydown',e=>{if(e.key==='Escape')filters.open=false;});}
 const advancedFiles=$('projectAdvancedFiles');if(assetToolbar&&advancedFiles){const sprites=assets.querySelector('.free-sprite-import');if(sprites)advancedFiles.append(sprites);const importer=document.createElement('button');importer.type='button';importer.textContent='Importer';importer.onclick=()=>{advancedFiles.open=true;};assetToolbar.append(importer);const title=advancedFiles.querySelector(':scope>summary');if(title)title.textContent='← Ressources · Importer des fichiers et gérer mes prefabs';}
 // Blueprint is a dedicated workspace. Its old floating bounds remain saved.
 const dialog=$('blueprintDialog');for(const key of ['left','top','right','bottom','width','height','min-width','min-height','max-width','max-height'])dialog.style.removeProperty(key);
}
