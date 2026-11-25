// WarLike Editor-only 2D Tile Palette: paint/erase directly onto serialized scene entities.
// Pointer capture listeners run before the regular selection/transform tooling.
import {state,notify} from '../core/state.js';
import {workspace} from '../core/workspaces.js';
import {record} from '../core/history.js';
import {toWorld} from '../core/camera.js';
import {defaultTilemap2d,paintTile2d,TILE_TYPES} from '../core/tilemap-2d.js';

export function createTilemap2d(){
 if(state.playing||workspace.mode!=='2d')return null;
 const id=state.nextId++;
 const tilemap2d=defaultTilemap2d();
 const entity={id,name:'Tilemap 2D '+id,type:'tilemap',x:0,y:0,w:tilemap2d.tileSize*tilemap2d.columns,h:tilemap2d.tileSize*tilemap2d.rows,color:'#6e8194',visible:true,solid2d:false,collision3d:false,tilemap2d};
 state.entities.push(entity);state.selected=[id];record('Créer Tilemap 2D');notify();return entity;
}
export function initTilemapEditor2d(canvas){
 const host=document.querySelector('#viewport')||canvas.parentElement;
 if(!host)return;
 const bar=document.createElement('div');bar.className='warlike-tilemap-toolbar';
 bar.style.cssText='position:absolute;z-index:25;left:12px;bottom:12px;display:flex;gap:5px;align-items:center;flex-wrap:wrap;max-width:calc(100% - 24px);padding:7px;background:#162334ee;border:1px solid #50647a;border-radius:8px;color:#e7f2ff;font:12px system-ui';
 const create=document.createElement('button');create.type='button';create.textContent='＋ Tilemap';
 create.title='Créer un Tilemap2D éditable dans la Hierarchy';
 create.onclick=()=>{const entity=createTilemap2d();if(entity){editing=true;toggle.textContent='Peinture : active';drawState()}};
 const toggle=document.createElement('button');toggle.type='button';toggle.textContent='Peindre';toggle.title='Activer/désactiver le pinceau 2D';
 const select=document.createElement('select');select.title='Palette de tuiles';
 for(const [id,data] of Object.entries(TILE_TYPES)){const option=document.createElement('option');option.value=id;option.textContent=data.label;select.append(option)}
 const erase=document.createElement('option');erase.value='erase';erase.textContent='Effacer';select.append(erase);
 const info=document.createElement('span');info.textContent='Sélectionne un Tilemap';
 bar.append(create,toggle,select,info);
 host.append(bar);
 let editing=false,stroke=null;
 const selected=()=>state.entities.find(e=>state.selected.includes(e.id)&&e.tilemap2d)||null;
 const drawState=()=>{const visible=workspace.mode==='2d'&&!state.playing;bar.hidden=!visible;bar.style.display=visible?'flex':'none';const active=selected();toggle.disabled=!active;info.textContent=active?active.name:'Sélectionne un Tilemap';toggle.setAttribute('aria-pressed',String(editing))};
 toggle.onclick=()=>{editing=!editing;toggle.textContent=editing?'Peinture : active':'Peindre';drawState()};
 const pointerWorld=e=>{
  const r=canvas.getBoundingClientRect();return toWorld({x:(e.clientX-r.left)*canvas.clientWidth/r.width,y:(e.clientY-r.top)*canvas.clientHeight/r.height});
 };
 const draw=e=>{
  const entity=selected();if(!entity)return false;
  const w=pointerWorld(e),changed=paintTile2d(entity,w.x,w.y,select.value);
  if(changed){stroke.moved=true;notify()}
  return changed;
 };
 canvas.addEventListener('pointerdown',e=>{
  if(!editing||state.playing||workspace.mode!=='2d'||e.button!==0||e.altKey||!selected())return;
  e.preventDefault();e.stopImmediatePropagation();
  stroke={pointer:e.pointerId,moved:false};
  canvas.setPointerCapture(e.pointerId);
  draw(e);
 },true);
 canvas.addEventListener('pointermove',e=>{
  if(!stroke||e.pointerId!==stroke.pointer)return;
  e.preventDefault();e.stopImmediatePropagation();draw(e);
 },true);
 const finish=e=>{
  if(!stroke||e.pointerId!==stroke.pointer)return;
  e.stopImmediatePropagation();if(stroke.moved)record('Peindre Tilemap 2D');
  stroke=null;drawState();
 };
 canvas.addEventListener('pointerup',finish,true);
 canvas.addEventListener('pointercancel',finish,true);
 canvas.addEventListener('lostpointercapture',finish,true);
 document.addEventListener('warlike:change',drawState);
 document.getElementById('workspace2d')?.addEventListener('click',drawState);
 document.getElementById('workspace3d')?.addEventListener('click',drawState);
 drawState();
}
