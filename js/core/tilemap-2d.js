// Serializable Tilemap2D shared by Editor, Canvas2D Play and Web export.
// Tile indices are stored in sparse cells: { "column,row": "grass" | "wall" | "water" }.
export const TILE_TYPES=Object.freeze({
 grass:{label:'Herbe',color:'#48895e',solid:false},
 earth:{label:'Terre',color:'#ac8051',solid:false},
 wall:{label:'Mur',color:'#657187',solid:true},
 stone:{label:'Pierre',color:'#8494a5',solid:true},
 water:{label:'Eau',color:'#3877a5',solid:false}
});
const atlasCache=new Map();
export function tileAtlasDefinition2d(map,kind){
 const atlas=map?.atlas,m=/^atlas:(\d+)$/.exec(kind);
 if(!atlas||!m||!Number.isInteger(atlas.columns)||!Number.isInteger(atlas.rows)||atlas.columns<1||atlas.rows<1||atlas.columns*atlas.rows>4096)return null;
 const index=Number(m[1]);if(index>=atlas.columns*atlas.rows)return null;
 return {index,solid:atlas.solidTiles?.includes(index)===true};
}
function atlasImage(atlas){
 if(typeof Image==='undefined'||typeof atlas?.dataUrl!=='string'||!atlas.dataUrl.startsWith('data:image/png;base64,'))return null;
 if(!atlasCache.has(atlas.dataUrl)){if(atlasCache.size>=16)atlasCache.delete(atlasCache.keys().next().value);const image=new Image();image.src=atlas.dataUrl;atlasCache.set(atlas.dataUrl,image);}
 return atlasCache.get(atlas.dataUrl);
}
const validNumber=(v,fallback)=>Number.isFinite(Number(v))?Number(v):fallback;
export const tileSizeFor=tilemap=>Math.max(8,Math.min(128,Math.round(validNumber(tilemap?.tileSize,32))));
export const defaultTilemap2d=()=>({tileSize:32,columns:20,rows:12,cells:{},visible:true});
export function tileAt(entity,x,y){
 const map=entity?.tilemap2d;if(!map)return null;
 const size=tileSizeFor(map);
 const col=Math.floor((x-(Number(entity.x)||0))/size),row=Math.floor((y-(Number(entity.y)||0))/size);
 if(col<0||row<0||col>=map.columns||row>=map.rows)return null;
 return {col,row,key:col+','+row};
}
export function tilemapLayers2d(map){
 return [{name:'Base',cells:map.cells||{},visible:true,collision:true},...(Array.isArray(map.layers)?map.layers.filter(l=>l&&typeof l.cells==='object'&&l.cells):[])];
}
export function activeTileCells2d(map){
 const layer=Number.isInteger(map.activeLayer)&&map.activeLayer>0?map.layers?.[map.activeLayer-1]:null;
 return layer?(layer.cells||(layer.cells={})): (map.cells||(map.cells={}));
}
export function paintTile2d(entity,x,y,kind='grass'){
 const tile=tileAt(entity,x,y);if(!tile)return false;
 if(kind!=='erase'&&!Object.hasOwn(TILE_TYPES,kind)&&!tileAtlasDefinition2d(entity.tilemap2d,kind))return false;
 const cells=activeTileCells2d(entity.tilemap2d);
 const previous=cells[tile.key]||null,next=kind==='erase'?null:kind;
 if(previous===next)return false;
 if(next)cells[tile.key]=next;else delete cells[tile.key];
 return true;
}
export function tilemapColliders2d(entities){
 const colliders=[];
 for(const entity of entities){
  const map=entity?.tilemap2d;if(!map||entity.enabled===false||entity.collider2d?.enabled===false)continue;
  const size=tileSizeFor(map);
  for(const layer of tilemapLayers2d(map)){if(layer.collision===false)continue;for(const [key,tile] of Object.entries(layer.cells)){
   if(!TILE_TYPES[tile]?.solid&&!tileAtlasDefinition2d(map,tile)?.solid)continue;
   const match=/^(\d+),(\d+)$/.exec(key);if(!match)continue;
   const col=Number(match[1]),row=Number(match[2]);
   if(col>=map.columns||row>=map.rows)continue;
   colliders.push({id:entity.id,x:(Number(entity.x)||0)+col*size,y:(Number(entity.y)||0)+row*size,w:size,h:size,collider2d:{enabled:true,isTrigger:false},_tilemapOwnerId:entity.id});
  }}
 }
 return colliders;
}
export function renderTilemap2d(ctx,entity,{editor=false,showGrid=true}={}){
 const map=entity?.tilemap2d;if(!map||map.visible===false)return;
 const size=tileSizeFor(map),x=Number(entity.x)||0,y=Number(entity.y)||0;
 for(const layer of tilemapLayers2d(map)){if(layer.visible===false)continue;for(const [key,kind] of Object.entries(layer.cells)){
  const atlasTile=tileAtlasDefinition2d(map,kind),type=TILE_TYPES[kind],m=/^(\d+),(\d+)$/.exec(key);
  if((!type&&!atlasTile)||!m)continue;const col=Number(m[1]),row=Number(m[2]);
  if(col>=map.columns||row>=map.rows)continue;
  const px=x+col*size,py=y+row*size;
  if(atlasTile){const image=atlasImage(map.atlas);if(image?.complete&&image.naturalWidth&&image.naturalHeight){const fw=image.naturalWidth/map.atlas.columns,fh=image.naturalHeight/map.atlas.rows;ctx.drawImage(image,atlasTile.index%map.atlas.columns*fw,Math.floor(atlasTile.index/map.atlas.columns)*fh,fw,fh,px,py,size,size);}continue;}ctx.fillStyle=type.color;ctx.fillRect(px,py,size,size);
  if(type.solid){ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(px,py,size,Math.max(2,size*.16));}
 }}
 if(editor&&showGrid){
  ctx.save();ctx.strokeStyle='rgba(140,205,226,.27)';ctx.lineWidth=1;
  ctx.beginPath();
  for(let col=0;col<=map.columns;col++){const xx=x+col*size+.5;ctx.moveTo(xx,y);ctx.lineTo(xx,y+map.rows*size);}
  for(let row=0;row<=map.rows;row++){const yy=y+row*size+.5;ctx.moveTo(x,yy);ctx.lineTo(x+map.columns*size,yy);}
  ctx.stroke();ctx.restore();
 }
}

/** Bounded, sparse tile painting operations shared by editor tools. */
export function paintTileArea2d(entity,from,to,kind,tool='rectangle'){
 const map=entity?.tilemap2d;
 if(!map||!Number.isInteger(map.columns)||!Number.isInteger(map.rows)||map.columns<1||map.rows<1||map.columns*map.rows>262144)return 0;
 if(kind!=='erase'&&!Object.hasOwn(TILE_TYPES,kind)&&!tileAtlasDefinition2d(entity.tilemap2d,kind))return 0;
 if(!from||!to||![from.col,from.row,to.col,to.row].every(Number.isInteger))return 0;
 const inside=(x,y)=>x>=0&&y>=0&&x<map.columns&&y<map.rows;
 if(!inside(from.col,from.row)||!inside(to.col,to.row))return 0;
 const size=tileSizeFor(map),ox=Number(entity.x)||0,oy=Number(entity.y)||0;
 let changed=0;
 const paint=(x,y)=>{if(paintTile2d(entity,ox+(x+.5)*size,oy+(y+.5)*size,kind))changed++;};
 if(tool==='rectangle'){
  for(let y=Math.min(from.row,to.row);y<=Math.max(from.row,to.row);y++)for(let x=Math.min(from.col,to.col);x<=Math.max(from.col,to.col);x++)paint(x,y);
 }else if(tool==='line'){
  let x=from.col,y=from.row;const dx=Math.abs(to.col-x),dy=-Math.abs(to.row-y),sx=x<to.col?1:-1,sy=y<to.row?1:-1;let error=dx+dy;
  while(true){paint(x,y);if(x===to.col&&y===to.row)break;const e=2*error;if(e>=dy){error+=dy;x+=sx}if(e<=dx){error+=dx;y+=sy}}
 }else if(tool==='fill'){
  const target=activeTileCells2d(map)[from.col+','+from.row]??null;
  if(target===(kind==='erase'?null:kind))return 0;
  const queue=[[from.col,from.row]],seen=new Set([from.col+','+from.row]);
  for(let i=0;i<queue.length;i++){const [x,y]=queue[i];if((activeTileCells2d(map)[x+','+y]??null)!==target)continue;paint(x,y);
   for(const [nx,ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){const key=nx+','+ny;if(inside(nx,ny)&&!seen.has(key)){seen.add(key);queue.push([nx,ny]);}}
  }
 }
 return changed;
}

/** Cardinal adjacency: N=1, E=2, S=4, W=8. Uses the active layer only. */
export function terrainMask2d(map,col,row,kinds){
 if(!Number.isInteger(col)||!Number.isInteger(row)||!Array.isArray(kinds)||!map)return 0;
 const cells=activeTileCells2d(map),same=new Set(kinds);let mask=0;
 for(const [dx,dy,bit] of [[0,-1,1],[1,0,2],[0,1,4],[-1,0,8]]){const x=col+dx,y=row+dy;if(x>=0&&y>=0&&x<map.columns&&y<map.rows&&same.has(cells[x+','+y]))mask|=bit;}
 return mask;
}
export function connectTerrain2d(map,variants){
 if(!map||!Array.isArray(variants)||variants.length!==16||variants.some(v=>typeof v!=='string'||!tileAtlasDefinition2d(map,v)))return 0;
 const cells=activeTileCells2d(map),kinds=new Set(variants),updates=[];
 for(const [key,kind] of Object.entries(cells)){if(!kinds.has(kind)||!/^\d+,\d+$/.test(key))continue;const [x,y]=key.split(',').map(Number);if(x>=map.columns||y>=map.rows)continue;const next=variants[terrainMask2d(map,x,y,variants)];if(next!==kind)updates.push([key,next]);}
 for(const [key,kind] of updates)cells[key]=kind;return updates.length;
}

/** Capture a bounded rectangle on the active layer, retaining sparse offsets. */
export function captureTilePattern2d(map,from,to,name='Pattern'){
 if(!map||!from||!to||![from.col,from.row,to.col,to.row].every(Number.isInteger))return null;
 const x=Math.min(from.col,to.col),y=Math.min(from.row,to.row),width=Math.abs(to.col-from.col)+1,height=Math.abs(to.row-from.row)+1;
 if(x<0||y<0||x+width>map.columns||y+height>map.rows||width*height>4096)return null;
 const cells=activeTileCells2d(map),tiles={};
 for(let row=0;row<height;row++)for(let col=0;col<width;col++){const kind=cells[(x+col)+','+(y+row)];if(Object.hasOwn(TILE_TYPES,kind)||tileAtlasDefinition2d(map,kind))tiles[col+','+row]=kind;}
 if(!Object.keys(tiles).length)return null;
 return {name:String(name).trim().slice(0,60)||'Pattern',width,height,tiles};
}
export function stampTilePattern2d(map,origin,pattern){
 if(!map||!origin||!pattern||![origin.col,origin.row,pattern.width,pattern.height].every(Number.isInteger)||pattern.width<1||pattern.height<1||pattern.width*pattern.height>4096||origin.col<0||origin.row<0||origin.col+pattern.width>map.columns||origin.row+pattern.height>map.rows||!pattern.tiles||typeof pattern.tiles!=='object')return 0;
 const updates=[];
 for(const [key,kind] of Object.entries(pattern.tiles)){if(!/^\d+,\d+$/.test(key)||!Object.hasOwn(TILE_TYPES,kind)&&!tileAtlasDefinition2d(map,kind))return 0;const [x,y]=key.split(',').map(Number);if(x>=pattern.width||y>=pattern.height)return 0;updates.push([(origin.col+x)+','+(origin.row+y),kind]);}
 const cells=activeTileCells2d(map);let changed=0;for(const [key,kind] of updates)if(cells[key]!==kind){cells[key]=kind;changed++;}return changed;
}
