import {state,notify} from '../core/state.js';
import {workspace} from '../core/workspaces.js';
import {record} from '../core/history.js';
import {addEntity,deleteSelected,duplicateSelected} from '../core/scene.js';
import {prefab3d,get3dAsset} from '../assets/catalog-3d.js';
import {getAsset} from '../assets/catalog.js';
import {view3d,sceneCamera3d,groundHit3d} from '../core/viewport-3d.js';
import {copySelectedObjects,pasteObjectsFromClipboard} from './clipboard-controls.js';
import {isTypingTarget} from '../core/editor-clipboard.js';
import {openComponentBrowser} from './component-browser.js';
export function frameEditorSelection(){
 if(state.playing)return;
 if(workspace.mode==='3d'){document.getElementById('view3dFocus')?.click();return}
 const objects=state.entities.filter(o=>state.selected.includes(o.id));if(!objects.length)return;
 const minX=Math.min(...objects.map(o=>o.x)),minY=Math.min(...objects.map(o=>o.y)),maxX=Math.max(...objects.map(o=>o.x+o.w)),maxY=Math.max(...objects.map(o=>o.y+o.h)),host=document.getElementById('viewport');
 state.camera.x=host.clientWidth/2-(minX+maxX)/2*state.camera.zoom;state.camera.y=host.clientHeight/2-(minY+maxY)/2*state.camera.zoom;
}
export function initDesktopInteractions(){
 if(document.body.dataset.desktopInteractions)return;document.body.dataset.desktopInteractions='true';document.body.classList.add('warlike-desktop');
 for(const id of ['canvas','canvas3d']){const c=document.getElementById(id);c.tabIndex=0;c.setAttribute('aria-keyshortcuts','F Q W E R T');c.addEventListener('pointerdown',()=>c.focus({preventScroll:true}))}
 const menu=document.createElement('div');menu.id='warlikeDesktopMenu';menu.className='desktop-context-menu';menu.hidden=true;menu.setAttribute('role','menu');document.body.append(menu);
 let anchor=null,right=null,lastRight=null,pan=null;
 const close=()=>{menu.hidden=true;menu.replaceChildren();document.body.classList.remove('desktop-menu-open')};
 const action=(label,run,disabled=false,key='')=>({label,run,disabled,key});
 const create=(kind,point)=>{
  if(workspace.mode==='3d'){const o=prefab3d(kind==='character'?'free-mini-characters-character-male-a':'primitive-cube',state.nextId++);if(!o)return;o.x=point.x-o.w/2;o.y=point.y-(o.depth3d||o.h)/2;state.entities.push(o);state.selected=[o.id];record('Créer '+o.name);notify()}
  else{addEntity(kind);const o=state.entities.find(o=>state.selected.includes(o.id));if(o){o.x=point.x-o.w/2;o.y=point.y-o.h/2;record('Placer '+o.name);notify()}}
 };
 function open(event){
  const target=event.target;anchor=target;let items=[];const inHub=document.body.classList.contains('hub-open');
  if(inHub){const row=target.closest('.hub-project-card');if(row){items=[...row.querySelectorAll('.hub-project-commands button,.hub-project-favorite')].map(b=>action(b.classList.contains('hub-project-favorite')?'Épingler / détacher':b.textContent,()=>b.click(),b.disabled))}else items=[action('Nouveau projet',()=>document.getElementById('hubNewProject').click()),action('Apparence',()=>document.querySelector('[data-hub-tab="appearance"]').click())]}
  else if(target.closest('#blueprintDialog')){const toolbar=document.querySelector('.bp-graph-toolbar');items=[...toolbar?.querySelectorAll('button')||[]].map(b=>action(b.textContent,()=>b.click(),state.playing||b.disabled));}
  else if(target.closest('.free-asset-card')){const card=target.closest('.free-asset-card'),preview=card.querySelector('.free-asset-preview'),asset=get3dAsset(preview?.dataset.assetId)||getAsset(preview?.dataset.assetId);items=[action(preview?.title||'Ouvrir la ressource',()=>preview?.click(),state.playing||preview?.disabled)];if(asset?.author)items.push(action('Auteur, licence et pack',()=>{document.dispatchEvent(new Event('warlike:open-sources'));const search=document.querySelector('#hubAboutSources input[type=search]');search.value=asset.packName||asset.author;search.dispatchEvent(new Event('input'))}));}
  else if(target.closest('.inspector-component>summary')){const card=target.closest('.inspector-component');items=[...card.querySelectorAll('.unity-component-menu button')].map(b=>action(b.textContent,()=>b.click(),b.disabled));}
  else if(target.closest('#objects,#viewport,#properties,#projectContent')){
   const row=target.closest('[data-object-id]');if(row&&!state.selected.includes(Number(row.dataset.objectId))){state.selected=[Number(row.dataset.objectId)];notify()}
   const has=state.selected.length>0,canvas=document.getElementById(workspace.mode==='3d'?'canvas3d':'canvas'),r=canvas.getBoundingClientRect(),zoom=Number.parseFloat(getComputedStyle(document.body).zoom)||1;
   let point={x:160,y:120};if(target.closest('#viewport')){if(workspace.mode==='3d'){const hit=groundHit3d(event.clientX-r.left,event.clientY-r.top,sceneCamera3d(view3d.target,view3d.yaw,view3d.pitch,view3d.radius),r.width,r.height);if(hit)point={x:hit[0]*64,y:hit[2]*64}}else point={x:((event.clientX-r.left)/zoom-state.camera.x)/state.camera.zoom,y:((event.clientY-r.top)/zoom-state.camera.y)/state.camera.zoom}}
   items=[action('Créer un GameObject',()=>create('object',point)),action('Créer un personnage',()=>create('character',point)),null,action('Cadrer la sélection',frameEditorSelection,!has,'F'),action('Copier',copySelectedObjects,!has,'Ctrl+C'),action('Coller',pasteObjectsFromClipboard,false,'Ctrl+V'),action('Dupliquer',duplicateSelected,!has,'Ctrl+D'),null,action('Ajouter un composant…',openComponentBrowser,!has),action('Ouvrir Blueprint',()=>document.getElementById('openBlueprint').click(),!has),action('Supprimer',deleteSelected,!has,'Suppr')];
  }
  if(!items.length){close();return}close();for(const item of items){if(!item){menu.append(document.createElement('hr'));continue}const b=document.createElement('button');b.type='button';b.setAttribute('role','menuitem');b.disabled=item.disabled;b.append(document.createTextNode(item.label));if(item.key){const k=document.createElement('kbd');k.textContent=item.key;b.append(k)}b.onclick=()=>{close();item.run()};menu.append(b)}
  const scale=Number.parseFloat(getComputedStyle(document.body).zoom)||1;menu.style.zoom=String(1/scale);menu.hidden=false;menu.style.left=event.clientX+'px';menu.style.top=event.clientY+'px';const bounds=menu.getBoundingClientRect();menu.style.left=Math.max(4,Math.min(event.clientX,innerWidth-bounds.width-5))+'px';menu.style.top=Math.max(4,Math.min(event.clientY,innerHeight-bounds.height-5))+'px';document.body.classList.add('desktop-menu-open');menu.querySelector('button:not(:disabled)')?.focus({preventScroll:true});
 }
 document.addEventListener('contextmenu',event=>{
  if(isTypingTarget(event.target)||event.target.closest('a[href]'))return;event.preventDefault();if(state.playing)return;
  if(right){right.event={target:event.target,clientX:event.clientX,clientY:event.clientY};return}
  if(lastRight?.moved&&performance.now()-lastRight.time<500)return;open(event);
 });
 document.addEventListener('pointerdown',event=>{
  if(!menu.contains(event.target))close();
  if(event.button===2)right={x:event.clientX,y:event.clientY,moved:false,event:null};
  if(event.button===1){event.preventDefault();const board=event.target.closest('.bp-canvas');if(board){pan={board,x:event.clientX,y:event.clientY,left:board.scrollLeft,top:board.scrollTop};board.setPointerCapture(event.pointerId)}}
 },true);
 document.addEventListener('pointermove',event=>{if(right&&Math.hypot(event.clientX-right.x,event.clientY-right.y)>4)right.moved=true;if(pan){pan.board.scrollLeft=pan.left-(event.clientX-pan.x);pan.board.scrollTop=pan.top-(event.clientY-pan.y)}},true);
 document.addEventListener('pointerup',()=>{pan=null;if(!right)return;const finished=right;right=null;lastRight={moved:finished.moved,time:performance.now()};if(finished.event&&!finished.moved&&!state.playing)open(finished.event)},true);
 document.addEventListener('warlike:scene-navigation',()=>{if(right)right.moved=true});document.addEventListener('pointercancel',()=>{right=null;pan=null;close()});window.addEventListener('blur',()=>{close();right=null;pan=null});window.addEventListener('resize',close);document.addEventListener('wheel',()=>{if(!menu.hidden)close()},{capture:true,passive:true});
 document.addEventListener('keydown',event=>{
  if(!menu.hidden){const buttons=[...menu.querySelectorAll('button:not(:disabled)')];if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();anchor?.focus?.({preventScroll:true});return}if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();event.stopPropagation();const index=buttons.indexOf(document.activeElement),next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;buttons[next]?.focus();return}}
  if(document.body.classList.contains('hub-open')||document.querySelector('#blueprintDialog:not([hidden])'))return;
  const key=event.key.toLowerCase();if((event.ctrlKey||event.metaKey)&&key==='s'){event.preventDefault();if(state.playing)return;if(document.activeElement?.id==='csharpScriptSource')document.getElementById('csharpScriptSave')?.click();else document.activeElement?.blur();document.getElementById(event.shiftKey?'save':'hubSave')?.click();return}
  if(isTypingTarget(event.target)||isTypingTarget(document.activeElement))return;
  if((event.ctrlKey||event.metaKey)&&key==='p'){event.preventDefault();document.getElementById('play').click();return}
  if(key==='f'&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!state.playing&&!view3d.drag){event.preventDefault();frameEditorSelection()}
 });
 document.addEventListener('wheel',event=>{if(event.ctrlKey){event.preventDefault();event.stopPropagation();if(document.body.classList.contains('hub-open'))return;const scale=document.getElementById('editorScale');scale.value=String(Math.max(75,Math.min(140,Number(scale.value)+(event.deltaY<0?5:-5))));scale.dispatchEvent(new Event('input'))}},{capture:true,passive:false});
 const windowMenu=[...document.querySelectorAll('#studioMenus>details')].find(d=>d.querySelector('summary')?.textContent.trim()==='Window')?.querySelector('.studio-dropdown');
 if(windowMenu){const full=document.createElement('button');full.type='button';full.textContent='Plein écran';full.onclick=()=>{full.closest('details').open=false;if(document.fullscreenElement)document.exitFullscreen?.();else document.documentElement.requestFullscreen?.().catch(()=>{})};windowMenu.append(full)}
 document.addEventListener('dblclick',event=>{if(event.target.closest('.hierarchy-object-label'))frameEditorSelection()});
}
