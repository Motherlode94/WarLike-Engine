// WarLike Editor-only 2D Tile Palette: paint/erase directly onto serialized scene entities.
// Pointer capture listeners run before the regular selection/transform tooling.
import {state,notify} from '../core/state.js';
import {workspace} from '../core/workspaces.js';
import {record} from '../core/history.js';
import {toWorld} from '../core/camera.js';
import {defaultTilemap2d,paintTile2d,paintTileArea2d,tileAt,TILE_TYPES,tilemapLayers2d,connectTerrain2d,captureTilePattern2d,stampTilePattern2d,paintRoad2d,stampDistrict2d} from '../core/tilemap-2d.js';

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
 const tool=document.createElement('select');tool.setAttribute('aria-label','Outil de peinture Tilemap');
 for(const [value,label] of [['brush','Pinceau'],['line','Ligne'],['rectangle','Rectangle'],['fill','Remplissage'],['patternCapture','Capturer motif'],['patternStamp','Poser motif'],['road','Route'],['district','Quartier']]){const option=document.createElement('option');option.value=value;option.textContent=label;tool.append(option);}
 const layerSelect=document.createElement('select');layerSelect.setAttribute('aria-label','Couche TileMap');
 const layerAdd=document.createElement('button');layerAdd.type='button';layerAdd.textContent='＋ Couche';
 const layerVisible=document.createElement('button');layerVisible.type='button';layerVisible.textContent='Visibilité';
 const layerCollision=document.createElement('button');layerCollision.type='button';layerCollision.textContent='Collision';
 function refreshLayers(owner){const map=owner?.tilemap2d;const layers=map?tilemapLayers2d(map):[];layerSelect.replaceChildren(...layers.map((l,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=l.name;return option;}));layerSelect.value=String(map?.activeLayer??0);layerAdd.disabled=!map||state.playing;layerSelect.disabled=!map||state.playing;layerVisible.disabled=layerCollision.disabled=!map||!(map.activeLayer>0)||state.playing;}
 layerSelect.onchange=()=>{const map=selected()?.tilemap2d;if(!map||state.playing||stroke)return;map.activeLayer=Number(layerSelect.value);record('TileMap · Couche active');notify();};
 layerAdd.onclick=()=>{const map=selected()?.tilemap2d;if(!map||state.playing||stroke)return;map.layers??=[];if(map.layers.length>=15)return;const name=prompt('Nom de la couche','Décoration '+(map.layers.length+1));if(!name?.trim())return;map.layers.push({name:name.trim().slice(0,60),cells:{},visible:true,collision:false});map.activeLayer=map.layers.length;record('TileMap · Ajouter couche');notify();};
 layerVisible.onclick=()=>{const map=selected()?.tilemap2d,l=map?.layers?.[(map.activeLayer??0)-1];if(!l||state.playing||stroke)return;l.visible=l.visible===false;record('TileMap · Visibilité');notify();};
 layerCollision.onclick=()=>{const map=selected()?.tilemap2d,l=map?.layers?.[(map.activeLayer??0)-1];if(!l||state.playing||stroke)return;l.collision=l.collision===false;record('TileMap · Collision');notify();};
 const connect=document.createElement('button');connect.type='button';connect.textContent='Raccorder terrain';connect.title='Atlas de 16 variantes dans l’ordre des masques N=1 E=2 S=4 O=8';
 connect.onclick=()=>{const map=selected()?.tilemap2d;if(state.playing||stroke||!map?.atlas)return;const input=prompt('Indices des 16 variantes (masques 0–15), séparés par virgules',Array.from({length:16},(_,i)=>i).join(','));if(input===null)return;const values=input.split(',').map(s=>s.trim());if(values.length!==16||values.some(v=>!/^\d+$/.test(v)))return;const count=connectTerrain2d(map,values.map(v=>'atlas:'+Number(v)));if(count){record('TileMap · Raccords terrain');notify();}}; 
 const patternSelect=document.createElement('select');patternSelect.setAttribute('aria-label','Motif TileMap');let patternOwner=null;
 function refreshPatterns(owner){const previous=patternOwner===owner?patternSelect.value:'';patternOwner=owner;const patterns=owner?.tilemap2d?.patterns||[];patternSelect.replaceChildren(...patterns.map((p,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=p.name;return option;}));if(previous!==''&&patterns[Number(previous)])patternSelect.value=previous;patternSelect.disabled=state.playing||!patterns.length;}
 const urbanWidth=document.createElement('input');urbanWidth.type='number';urbanWidth.min='1';urbanWidth.max='9';urbanWidth.value='3';urbanWidth.setAttribute('aria-label','Largeur route en tuiles');
 bar.append(create,toggle,tool,select,layerSelect,layerAdd,layerVisible,layerCollision,connect,patternSelect,urbanWidth,info);
 const dock=document.getElementById('tileMapContent'),setDock=document.getElementById('tileSetContent');
 const palette=document.createElement('div');palette.className='wb2d-palette';
 if(dock){bar.style.cssText='display:flex;gap:5px;align-items:center;flex-wrap:wrap;padding:5px';dock.append(bar,palette);}else host.append(bar);
 const swatches=new Map();
 for(const [id,data] of Object.entries(TILE_TYPES)){const b=document.createElement('button');b.type='button';b.className='wb2d-tile';const color=document.createElement('span');color.style.background=data.color;b.append(color,document.createTextNode(data.label));b.onclick=()=>{select.value=id;refreshPalette();};palette.append(b);swatches.set(id,b);}
 function refreshPalette(){for(const [id,b] of swatches){b.classList.toggle('active',select.value===id);b.setAttribute('aria-pressed',String(select.value===id));}for(const b of palette.querySelectorAll('[data-atlas]')){const chosen=b.dataset.tileId===select.value;b.classList.toggle('active',chosen);b.setAttribute('aria-pressed',String(chosen));}}
 select.addEventListener('change',refreshPalette);refreshPalette();
 if(setDock){const title=document.createElement('strong');title.textContent='TileSet · Tuiles intégrées';setDock.append(title);for(const data of Object.values(TILE_TYPES)){const row=document.createElement('div');row.className='wb2d-tile-definition';const color=document.createElement('span');color.style.background=data.color;row.append(color,document.createTextNode(data.label+' — '+(data.solid?'Collision solide':'Sans collision')));setDock.append(row);}}
 const atlasControls=document.createElement('div'),atlasFile=document.createElement('input'),atlasCols=document.createElement('input'),atlasRows=document.createElement('input'),atlasStatus=document.createElement('span');atlasFile.type='file';atlasFile.accept='image/png';for(const [input,label] of [[atlasCols,'Colonnes'],[atlasRows,'Lignes']]){input.type='number';input.min='1';input.max='64';input.value='1';input.setAttribute('aria-label',label);atlasControls.append(document.createTextNode(label+' '),input);}atlasControls.append(atlasFile,atlasStatus);setDock?.append(atlasControls);
 const collisionEditor=document.createElement('div'),collisionTitle=document.createElement('strong'),collisionGrid=document.createElement('div');collisionTitle.textContent='Collisions des tuiles PNG';collisionGrid.className='wb2d-palette';collisionEditor.append(collisionTitle,collisionGrid);setDock?.append(collisionEditor);
 let shownAtlas=null;
 function renderAtlasCollisions(atlas,owner){
  collisionGrid.replaceChildren();if(!atlas||!owner||!Number.isInteger(atlas.columns)||!Number.isInteger(atlas.rows)||atlas.columns<1||atlas.rows<1||atlas.columns*atlas.rows>4096)return;
  for(let index=0;index<atlas.columns*atlas.rows;index++){
   const button=document.createElement('button'),thumb=document.createElement('span');button.type='button';button.className='wb2d-tile';button.disabled=state.playing;
   thumb.style.backgroundImage='url("'+atlas.dataUrl+'")';thumb.style.backgroundSize=(atlas.columns*100)+'% '+(atlas.rows*100)+'%';thumb.style.backgroundPosition=(atlas.columns===1?0:(index%atlas.columns)*100/(atlas.columns-1))+'% '+(atlas.rows===1?0:Math.floor(index/atlas.columns)*100/(atlas.rows-1))+'%';
   const refresh=()=>{const solid=atlas.solidTiles?.includes(index)===true;button.setAttribute('aria-pressed',String(solid));button.setAttribute('aria-label','Tuile '+index+' : '+(solid?'solide':'traversable'));button.replaceChildren(thumb,document.createTextNode(index+' '+(solid?'■':'□')));};
   refresh();button.onclick=()=>{if(state.playing||selected()!==owner||owner.tilemap2d.atlas!==atlas)return;const values=new Set(Array.isArray(atlas.solidTiles)?atlas.solidTiles:[]);if(values.has(index))values.delete(index);else values.add(index);atlas.solidTiles=[...values].sort((a,b)=>a-b);refresh();record('TileSet · Collision tuile '+index);notify();};collisionGrid.append(button);
  }
 }
 function syncAtlas(){
  const atlas=selected()?.tilemap2d?.atlas;if(shownAtlas===atlas)return;shownAtlas=atlas;renderAtlasCollisions(atlas,selected());
  const previous=select.value;
  select.querySelectorAll('[data-atlas]').forEach(e=>e.remove());palette.querySelectorAll('[data-atlas]').forEach(e=>e.remove());
  if(!atlas){refreshPalette();return;}
  if(!Number.isInteger(atlas.columns)||!Number.isInteger(atlas.rows)||atlas.columns<1||atlas.rows<1||atlas.columns*atlas.rows>4096){refreshPalette();return;}
  for(let index=0;index<atlas.columns*atlas.rows;index++){const id='atlas:'+index,option=document.createElement('option');option.value=id;option.textContent='Atlas '+index;option.dataset.atlas='';select.append(option);
   const button=document.createElement('button'),thumb=document.createElement('span');button.type='button';button.className='wb2d-tile';button.dataset.atlas='';button.dataset.tileId=id;button.setAttribute('aria-label','Tuile atlas '+index);thumb.style.backgroundImage='url("'+atlas.dataUrl+'")';thumb.style.backgroundSize=(atlas.columns*100)+'% '+(atlas.rows*100)+'%';thumb.style.backgroundPosition=(atlas.columns===1?0:(index%atlas.columns)*100/(atlas.columns-1))+'% '+(atlas.rows===1?0:Math.floor(index/atlas.columns)*100/(atlas.rows-1))+'%';button.append(thumb,document.createTextNode(String(index)));button.onclick=()=>{select.value=id;refreshPalette();};palette.append(button);}
  if([...select.options].some(o=>o.value===previous))select.value=previous;refreshPalette();
 }
 atlasFile.onchange=()=>{const owner=selected(),file=atlasFile.files?.[0],columns=Number(atlasCols.value),rows=Number(atlasRows.value);if(state.playing||!owner||!file||file.type!=='image/png'||file.size>2*1024*1024||!Number.isInteger(columns)||!Number.isInteger(rows)||columns<1||rows<1||columns>64||rows>64){atlasStatus.textContent='PNG ≤ 2 Mio, grille 1–64 et TileMap sélectionné requis.';return;}
 if(owner.tilemap2d.atlas&&(tilemapLayers2d(owner.tilemap2d).some(l=>Object.values(l.cells).some(v=>String(v).startsWith('atlas:')))||owner.tilemap2d.patterns?.some(p=>Object.values(p.tiles||{}).some(v=>String(v).startsWith('atlas:'))))){atlasStatus.textContent='Efface les cellules de l’atlas précédent avant de le remplacer.';return;}
 const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>{if(state.playing||selected()!==owner||img.naturalWidth%columns||img.naturalHeight%rows){atlasStatus.textContent='Grille incompatible ou sélection modifiée.';return;}owner.tilemap2d.atlas={dataUrl:reader.result,columns,rows};record('TileSet · Importer atlas PNG');atlasStatus.textContent='Atlas importé';notify();};img.onerror=()=>atlasStatus.textContent='PNG invalide.';img.src=reader.result;};reader.readAsDataURL(file);};
 document.addEventListener('warlike:bottom-tab',e=>{if(e.detail.tab!=='tilemap'){editing=false;toggle.textContent='Peindre';drawState();}});
 let editing=false,stroke=null;
 const selected=()=>state.entities.find(e=>state.selected.includes(e.id)&&e.tilemap2d)||null;
 const drawState=()=>{const visible=workspace.mode==='2d'&&!state.playing;bar.hidden=!visible;bar.style.display=visible?'flex':'none';const active=selected();toggle.disabled=!active;info.textContent=active?active.name:'Sélectionne un Tilemap';toggle.setAttribute('aria-pressed',String(editing));syncAtlas();refreshLayers(active);refreshPatterns(active);};
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
  if(stroke||!editing||state.playing||workspace.mode!=='2d'||e.button!==0||e.altKey||!selected())return;
  e.preventDefault();e.stopImmediatePropagation();
  const entity=selected(),w=pointerWorld(e),start=tileAt(entity,w.x,w.y);if(!start)return;
  stroke={pointer:e.pointerId,moved:false,owner:entity,start,last:start,tool:tool.value,kind:select.value};
  canvas.setPointerCapture(e.pointerId);
  if(stroke.tool==='district'){const pattern=entity.tilemap2d.patterns?.[Number(patternSelect.value)];if(pattern){const input=prompt('Colonnes,lignes,espacement','2,2,1');if(input!==null){const [cols,rows,gap]=input.split(',').map(Number);stroke.moved=stampDistrict2d(entity.tilemap2d,start,pattern,cols,rows,gap)>0;if(stroke.moved)notify();}}}
  else if(stroke.tool==='patternStamp'){const pattern=entity.tilemap2d.patterns?.[Number(patternSelect.value)];stroke.moved=stampTilePattern2d(entity.tilemap2d,start,pattern)>0;if(stroke.moved)notify();}
  else if(stroke.tool==='brush')draw(e);
  else if(stroke.tool==='fill'){stroke.moved=paintTileArea2d(stroke.owner,start,start,stroke.kind,'fill')>0;if(stroke.moved)notify();}
 },true);
 canvas.addEventListener('pointermove',e=>{
  if(!stroke||e.pointerId!==stroke.pointer)return;
  e.preventDefault();e.stopImmediatePropagation();if(state.playing||selected()!==stroke.owner)return;const w=pointerWorld(e),cell=tileAt(stroke.owner,w.x,w.y);if(!cell)return;if(stroke.tool==='brush'){if(paintTileArea2d(stroke.owner,stroke.last,cell,stroke.kind,'line')){stroke.moved=true;notify();}}stroke.last=cell;
 },true);
 const finish=e=>{
  if(!stroke||e.pointerId!==stroke.pointer)return;
  e.stopImmediatePropagation();if(e.type==='pointerup'&&!state.playing&&selected()===stroke.owner&&stroke.tool==='road'){const w=pointerWorld(e),end=tileAt(stroke.owner,w.x,w.y);if(end)stroke.moved=paintRoad2d(stroke.owner,stroke.start,end,stroke.kind,Number(urbanWidth.value))>0;}if(e.type==='pointerup'&&!state.playing&&selected()===stroke.owner&&stroke.tool==='patternCapture'){const w=pointerWorld(e),end=tileAt(stroke.owner,w.x,w.y),map=stroke.owner.tilemap2d;if(end&&(map.patterns?.length??0)<64){const name=prompt('Nom du motif','Motif '+((map.patterns?.length??0)+1));if(name?.trim()){const pattern=captureTilePattern2d(map,stroke.start,end,name);if(pattern){(map.patterns??=[]).push(pattern);stroke.moved=true;}}}}if(e.type==='pointerup'&&!state.playing&&selected()===stroke.owner&&['line','rectangle'].includes(stroke.tool)){const w=pointerWorld(e),end=tileAt(stroke.owner,w.x,w.y);if(end)stroke.moved=paintTileArea2d(stroke.owner,stroke.start,end,stroke.kind,stroke.tool)>0;}if(stroke.moved){record('Peindre Tilemap 2D');notify();}
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
