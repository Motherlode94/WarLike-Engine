// Gaia heightfield collision bridge. Scene ground coordinates use 64 pixels per metre.
// Terrain descriptor stores world-centred X/Z offsets and height samples in metres.
const n=v=>Number.isFinite(v)?v:null;
export const GAIA_TERRAIN_SCHEMA='warlike.terrain.heightfield.v1';
export function validTerrainHeightfield(t){
 return !!t&&t.schema===GAIA_TERRAIN_SCHEMA&&Number.isInteger(t.resolution)&&t.resolution>=2&&t.resolution<=257
 &&Number.isFinite(t.size)&&t.size>0&&t.size<=2048&&Number.isFinite(t.height)&&t.height>0&&t.height<=320
 &&Array.isArray(t.heights)&&t.heights.length===t.resolution*t.resolution
 &&t.heights.every(v=>Number.isFinite(v)&&v>=0&&v<=1)
 &&Number.isFinite(t.offsetX)&&Number.isFinite(t.offsetZ);
}
export function heightfieldAt3d(t,x,z){
 if(!validTerrainHeightfield(t))return null;
 const u=(x-t.offsetX)/t.size+.5,v=(z-t.offsetZ)/t.size+.5;
 if(u<0||u>1||v<0||v>1)return null;
 const n=t.resolution,fx=u*(n-1),fz=v*(n-1);
 const ix=Math.min(n-2,Math.floor(fx)),iz=Math.min(n-2,Math.floor(fz)),a=fx-ix,b=fz-iz;
 const heights=t.heights,i=iz*n+ix;
 return ((heights[i]*(1-a)+heights[i+1]*a)*(1-b)+(heights[i+n]*(1-a)+heights[i+n+1]*a)*b)*t.height;
}
export function terrainFloorAt3d(body,terrains){
 // Sample centre and four corners to avoid narrow bodies sinking between samples.
 const left=Number(body.x)||0,front=Number(body.y)||0,w=Math.max(1,Number(body.w)||32),d=Math.max(1,Number(body.depth3d)||Number(body.h)||32);
 const samples=[[left+w/2,front+d/2],[left+w*.12,front+d*.12],[left+w*.88,front+d*.12],[left+w*.12,front+d*.88],[left+w*.88,front+d*.88]];
 let floor=null,source=null;
 for(const entity of terrains){
  const t=entity.terrainHeightfield;
  if(!validTerrainHeightfield(t)||entity.enabled===false||entity.collision3d===false)continue;
  let top=null;
  for(const [px,pz] of samples){const h=heightfieldAt3d(t,px/64,pz/64);if(h!==null)top=top===null?h:Math.max(top,h)}
  if(top!==null&&(floor===null||top>floor)){floor=top;source=entity}
 }
 return floor===null?null:{height:floor,entity:source};
}
export function gaiaWorldToEntities(world,{firstId=1}={}){
 if(world?.schema!=='warlike.gaia.world.v1'||!Array.isArray(world.tiles)||world.tiles.length<1||world.tiles.length>16)throw Error('Monde Gaia invalide');
 return world.tiles.map((tile,i)=>{
  const t=tile?.collision;
  if(!validTerrainHeightfield(t))throw Error('Tuile Gaia invalide : '+i);
  return {id:firstId+i,name:'Gaia Terrain '+tile.tileX+'-'+tile.tileZ,type:'terrain3d',enabled:true,collision3d:true,solid3d:true,
    x:(t.offsetX-t.size/2)*64,y:(t.offsetZ-t.size/2)*64,elevation3d:0,w:t.size*64,depth3d:t.size*64,h:t.height*64,terrainHeightfield:structuredClone(t)};
 });
}
