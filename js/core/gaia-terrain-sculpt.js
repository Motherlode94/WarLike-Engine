// Authoring primitives for the existing Gaia heightfield schema.
// All brush coordinates are world metres, and all samples are normalized 0..1.
import {GAIA_TERRAIN_SCHEMA,validTerrainHeightfield} from './gaia-terrain-physics.js';
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export const terrainLayers=Object.freeze(['grass','soil','rock','sand']);
export const terrainBrushModes=Object.freeze(['raise','lower','smooth','flatten','paint']);

export function initializeEditableTerrain(entity,{resolution=33,maxHeight=8}={}){
 if(!entity||typeof entity!=='object')throw Error('Terrain entity required');
 if(entity.terrainHeightfield&&validTerrainHeightfield(entity.terrainHeightfield))return entity.terrainHeightfield;
 resolution=Math.round(clamp(Number(resolution)||33,2,65));
 const width=Math.max(1,Number(entity.w)||1280)/64;
 const depth=Math.max(1,Number(entity.depth3d)||Number(entity.w)||1280)/64;
 if(Math.abs(width-depth)>1e-5)throw Error('Gaia square terrain required');
 const size=width;
 const t={schema:GAIA_TERRAIN_SCHEMA,resolution,size,height:clamp(Number(maxHeight)||8,1,320),
  offsetX:(Number(entity.x)||0)/64+width/2,
  offsetZ:(Number(entity.y)||0)/64+depth/2,
  heights:Array(resolution*resolution).fill(0),paint:Array(resolution*resolution).fill('grass')};
 entity.terrainHeightfield=t;
 entity.terrainRevision3d=(Number(entity.terrainRevision3d)||0)+1;
 entity.visible=true;
 return t;
}
export function applyTerrainBrush(entity,{mode='raise',x,z,radius=2,strength=.8,targetHeight=0,layer='grass'}={}){
 const t=entity?.terrainHeightfield;
 if(!validTerrainHeightfield(t)||!terrainBrushModes.includes(mode))throw Error('Gaia editable terrain required');
 if(!Number.isFinite(x)||!Number.isFinite(z))throw Error('Invalid brush coordinates');
 const n=t.resolution,spacing=t.size/(n-1);
 radius=clamp(Number(radius)||2,spacing*.5,128);
 strength=clamp(Number(strength)||0,0,16);
 layer=terrainLayers.includes(layer)?layer:'grass';
 const original=t.heights.slice();let changed=0;
 for(let iz=0;iz<n;iz++)for(let ix=0;ix<n;ix++){
  const px=t.offsetX-t.size/2+ix*spacing,pz=t.offsetZ-t.size/2+iz*spacing;
  const dist=Math.hypot(px-x,pz-z);if(dist>=radius)continue;
  const i=iz*n+ix,weight=(1-dist/radius)**2;
  if(mode==='paint'){
   if(t.paint[i]!==layer){t.paint[i]=layer;changed++}continue;
  }
  const old=original[i],alpha=clamp(strength*weight,0,1);
  let next=old;
  if(mode==='raise')next=old+strength*weight/t.height;
  if(mode==='lower')next=old-strength*weight/t.height;
  if(mode==='flatten')next=old+(clamp(targetHeight/t.height,0,1)-old)*alpha;
  if(mode==='smooth'){
   let sum=0,count=0;
   for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
    const a=ix+dx,b=iz+dz;if(a>=0&&b>=0&&a<n&&b<n){sum+=original[b*n+a];count++}
   }
   next=old+((sum/count)-old)*alpha;
  }
  next=clamp(next,0,1);
  if(Math.abs(next-old)>1e-9){t.heights[i]=next;changed++}
 }
 if(changed)entity.terrainRevision3d=(Number(entity.terrainRevision3d)||0)+1;
 return changed;
}
export function terrainSurfaceMesh3d(t){
 if(!validTerrainHeightfield(t))throw Error('Invalid terrain heightfield');
 const n=t.resolution,points=[],colors=[],layerColors={
  grass:[.38,.61,.30,1],soil:[.44,.31,.22,1],rock:[.53,.55,.59,1],sand:[.81,.72,.49,1]
 };
 const get=(x,z)=>[t.size*(x/(n-1)-.5),t.heights[z*n+x]*t.height,t.size*(z/(n-1)-.5)];
 const addTriangle=(a,b,c,ia,ib,ic)=>{
  const u=b.map((v,i)=>v-a[i]),v=c.map((val,i)=>val-a[i]);
  const normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
  const len=Math.hypot(...normal)||1,sign=normal[1]<0?-1:1;
  for(const [p,i] of [[a,ia],[b,ib],[c,ic]]){
   points.push(...p,...normal.map(v=>v/len*sign));
   colors.push(...(layerColors[t.paint?.[i]]||layerColors.grass));
  }
 };
 for(let z=0;z<n-1;z++)for(let x=0;x<n-1;x++){
  const i=z*n+x,a=get(x,z),b=get(x+1,z),c=get(x+1,z+1),d=get(x,z+1);
  addTriangle(a,c,b,i,i+n+1,i+1);addTriangle(a,d,c,i,i+n,i+n+1);
 }
 return {vertices:new Float32Array(points),colors:new Float32Array(colors)};
}
