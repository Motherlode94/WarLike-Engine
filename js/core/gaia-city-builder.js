// WB 2.1 — Create actual city buildings from existing WarLike 3D assets.
// Roads and Gaia heightfields remain authoritative; this module never
// creates another terrain or moves the source road.
import {sampleRoadSpline,validRoadSpline} from './gaia-road-spline.js';
import {heightfieldAt3d,validTerrainHeightfield} from './gaia-terrain-physics.js';
import {prefab3d} from '../assets/catalog-3d.js';

const length=(a,b)=>Math.hypot(b.x-a.x,b.z-a.z);
const finite=n=>Number.isFinite(n);
const tilesAt=(tiles,x,z)=>{
 let h=null;
 for(const tile of tiles){
  if(tile.enabled===false||!validTerrainHeightfield(tile.terrainHeightfield))continue;
  const y=heightfieldAt3d(tile.terrainHeightfield,x,z);
  if(y!==null)h=h===null?y:Math.max(h,y);
 }
 return h;
};
function sampleAtDistance(samples,target){
 let distance=0;
 for(let i=1;i<samples.length;i++){
  const a=samples[i-1],b=samples[i],seg=length(a,b);
  if(seg<1e-7)continue;
  if(distance+seg>=target){
   const t=(target-distance)/seg;
   return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,tangent:{x:(b.x-a.x)/seg,z:(b.z-a.z)/seg}};
  }
  distance+=seg;
 }
 return null;
}
const overlaps=(a,b,margin=0)=>a.x<a.x+a.w&&b.x<b.x+b.w&&a.x<b.x+b.w+margin&&a.x+a.w+margin>b.x&&a.y<b.y+b.depth3d+margin&&a.y+(a.depth3d??a.h)+margin>b.y;
export function cityBuildingsAlongRoad(roadEntity,terrainEntities,existingEntities,{firstId=1,spacing=18,setback=4,maxBuildings=40,assets=['building-house','building-garage','building-hangar']}={}){
 const road=roadEntity?.roadSpline;
 if(!validRoadSpline(road))throw Error('City Builder needs a valid Gaia road');
 if(!Array.isArray(terrainEntities)||!Array.isArray(existingEntities))throw Error('City Builder needs Gaia terrain and scene entities');
 if(!Number.isSafeInteger(firstId)||firstId<1||!finite(spacing)||spacing<6||spacing>100||!finite(setback)||setback<1||setback>50||!Number.isInteger(maxBuildings)||maxBuildings<1||maxBuildings>200||!Array.isArray(assets)||!assets.length)
  throw Error('Invalid City Builder settings');
 const samples=sampleRoadSpline(road,{segmentsPerSpan:12});
 let total=0;for(let i=1;i<samples.length;i++)total+=length(samples[i-1],samples[i]);
 const added=[],occupied=[...existingEntities].filter(o=>Number.isFinite(o.x)&&Number.isFinite(o.y)&&Number.isFinite(o.w)&&o.w>0&&!o.roadSpline&&!o.terrainHeightfield);
 for(let distance=spacing/2;distance<total-spacing/3&&added.length<maxBuildings;distance+=spacing){
  const p=sampleAtDistance(samples,distance);if(!p)break;
  for(const side of [-1,1]){
   if(added.length>=maxBuildings)break;
   const assetId=assets[(added.length+Math.floor(distance/spacing))%assets.length];
   const building=prefab3d(assetId,firstId+added.length);
   if(!building||!building.w||!building.depth3d||building.collision3d===false)continue;
   const normal={x:-p.tangent.z,z:p.tangent.x};
   const lateral=road.width/2+setback+Math.max(building.w,building.depth3d)/128;
   const cx=p.x+normal.x*lateral*side,cz=p.z+normal.z*lateral*side;
   const halfX=building.w/128,halfZ=building.depth3d/128;
   const corners=[[cx-halfX,cz-halfZ],[cx+halfX,cz-halfZ],[cx-halfX,cz+halfZ],[cx+halfX,cz+halfZ]];
   const heights=corners.map(([x,z])=>tilesAt(terrainEntities,x,z));
   if(heights.some(h=>h===null)||Math.max(...heights)-Math.min(...heights)>.75)continue;
   const center=tilesAt(terrainEntities,cx,cz);
   if(center===null)continue;
   building.x=Math.round(cx*64-building.w/2);
   building.y=Math.round(cz*64-building.depth3d/2);
   building.elevation3d=Math.max(...heights);
   building.rotation=Math.atan2(p.tangent.x,p.tangent.z)*180/Math.PI;
   building.citySourceRoadId=roadEntity.id;
   building.cityGenerator='warlike.city.roads.v1';
   if(occupied.some(o=>overlaps(building,o,64)))continue;
   occupied.push(building);added.push(building);
  }
 }
 return added;
}
