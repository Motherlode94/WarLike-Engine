// Gaia 3D preview uses the existing WebGL offscreen camera pass.
// Frame all enabled terrain tiles in metres, not the editor selection's
// legacy pixel-based transform. The preview must not mutate scene data.
import {validTerrainHeightfield} from './gaia-terrain-physics.js';
const finite=(v,d)=>Number.isFinite(v)?v:d;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export function gaiaPreviewFrame(entities,{yaw=-.7,pitch=.65,zoom=1}={}){
 const tiles=(entities||[]).filter(o=>o?.enabled!==false&&validTerrainHeightfield(o.terrainHeightfield));
 if(!tiles.length)return null;
 let x0=Infinity,x1=-Infinity,z0=Infinity,z1=-Infinity,y0=Infinity,y1=-Infinity;
 for(const entity of tiles){
  const t=entity.terrainHeightfield,half=t.size/2,offset=finite(entity.elevation3d,0);
  x0=Math.min(x0,t.offsetX-half);x1=Math.max(x1,t.offsetX+half);
  z0=Math.min(z0,t.offsetZ-half);z1=Math.max(z1,t.offsetZ+half);
  // Height is measured from the existing Gaia heightfield, not a second terrain.
  let minimum=Infinity,maximum=-Infinity;
  for(const sample of t.heights){minimum=Math.min(minimum,sample);maximum=Math.max(maximum,sample)}
  y0=Math.min(y0,offset+minimum*t.height);y1=Math.max(y1,offset+maximum*t.height);
 }
 const size=Math.max(1,x1-x0,z1-z0,(y1-y0)*2);
 return {target:[(x0+x1)/2,(y0+y1)/2,(z0+z1)/2],
  yaw:finite(yaw,-.7),pitch:clamp(finite(pitch,.65),.15,1.4),
  radius:size*clamp(finite(zoom,1),.45,3)*1.35,
  tiles:tiles.length,dimensions:[x1-x0,y1-y0,z1-z0]};
}
