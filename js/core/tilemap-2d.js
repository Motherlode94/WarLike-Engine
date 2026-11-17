// Serializable Tilemap2D shared by Editor, Canvas2D Play and Web export.
// Tile indices are stored in sparse cells: { "column,row": "grass" | "wall" | "water" }.
export const TILE_TYPES=Object.freeze({
 grass:{label:'Herbe',color:'#48895e',solid:false},
 earth:{label:'Terre',color:'#ac8051',solid:false},
 wall:{label:'Mur',color:'#657187',solid:true},
 stone:{label:'Pierre',color:'#8494a5',solid:true},
 water:{label:'Eau',color:'#3877a5',solid:false}
});
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
export function paintTile2d(entity,x,y,kind='grass'){
 const tile=tileAt(entity,x,y);if(!tile)return false;
 if(kind!=='erase'&&!Object.hasOwn(TILE_TYPES,kind))return false;
 const cells=entity.tilemap2d.cells||(entity.tilemap2d.cells={});
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
  for(const [key,tile] of Object.entries(map.cells||{})){
   if(!TILE_TYPES[tile]?.solid)continue;
   const match=/^(\d+),(\d+)$/.exec(key);if(!match)continue;
   const col=Number(match[1]),row=Number(match[2]);
   if(col>=map.columns||row>=map.rows)continue;
   colliders.push({id:entity.id,x:(Number(entity.x)||0)+col*size,y:(Number(entity.y)||0)+row*size,w:size,h:size,collider2d:{enabled:true,isTrigger:false},_tilemapOwnerId:entity.id});
  }
 }
 return colliders;
}
export function renderTilemap2d(ctx,entity,{editor=false,showGrid=true}={}){
 const map=entity?.tilemap2d;if(!map||map.visible===false)return;
 const size=tileSizeFor(map),x=Number(entity.x)||0,y=Number(entity.y)||0;
 for(const [key,kind] of Object.entries(map.cells||{})){
  const type=TILE_TYPES[kind],m=/^(\d+),(\d+)$/.exec(key);
  if(!type||!m)continue;const col=Number(m[1]),row=Number(m[2]);
  if(col>=map.columns||row>=map.rows)continue;
  const px=x+col*size,py=y+row*size;
  ctx.fillStyle=type.color;ctx.fillRect(px,py,size,size);
  if(type.solid){ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(px,py,size,Math.max(2,size*.16));}
 }
 if(editor&&showGrid){
  ctx.save();ctx.strokeStyle='rgba(140,205,226,.27)';ctx.lineWidth=1;
  ctx.beginPath();
  for(let col=0;col<=map.columns;col++){const xx=x+col*size+.5;ctx.moveTo(xx,y);ctx.lineTo(xx,y+map.rows*size);}
  for(let row=0;row<=map.rows;row++){const yy=y+row*size+.5;ctx.moveTo(x,yy);ctx.lineTo(x+map.columns*size,yy);}
  ctx.stroke();ctx.restore();
 }
}
