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
const overlaps=(a,b,margin=0)=>a.x<b.x+b.w+margin&&a.x+a.w+margin>b.x&&a.y<b.y+(b.depth3d??b.h)+margin&&a.y+(a.depth3d??a.h)+margin>b.y;
/**
 * Reject a building footprint that crosses another authored road corridor.
 * Conservative segment-vs-expanded-footprint clipping preserves space for
 * vehicles and future sidewalks at perpendicular or oblique intersections.
 * The spline and all geometry are measured in Gaia metres.
 */
const segmentHitsBox=(a,b,minX,maxX,minZ,maxZ)=>{
 let enter=0,exit=1;
 const dX=b.x-a.x,dZ=b.z-a.z;
 for(const [p,q] of [[-dX,a.x-minX],[dX,maxX-a.x],[-dZ,a.z-minZ],[dZ,maxZ-a.z]]){
  if(Math.abs(p)<1e-12){if(q<0)return false;continue}
  const r=q/p;
  if(p<0)enter=Math.max(enter,r);
  else exit=Math.min(exit,r);
  if(enter>exit)return false;
 }
 return true;
};
export function cityFootprintCrossesRoad(building,road,{shoulder=1.5}={}){
 if(!validRoadSpline(road)||!Number.isFinite(shoulder)||shoulder<0||shoulder>20)
  throw Error('Invalid road corridor clearance');
 const depth=building?.depth3d??building?.h;
 if(!Number.isFinite(building?.x)||!Number.isFinite(building?.y)||!Number.isFinite(building?.w)||!Number.isFinite(depth)||building.w<=0||depth<=0)
  throw Error('Invalid city building footprint');
 const buffer=road.width/2+shoulder;
 const minX=building.x/64-buffer,maxX=(building.x+building.w)/64+buffer;
 const minZ=building.y/64-buffer,maxZ=(building.y+depth)/64+buffer;
 const points=sampleRoadSpline(road,{segmentsPerSpan:12});
 for(let i=1;i<points.length;i++)if(segmentHitsBox(points[i-1],points[i],minX,maxX,minZ,maxZ))return true;
 return false;
}

export function cityBuildingsAlongRoad(roadEntity,terrainEntities,existingEntities,{firstId=1,spacing=18,setback=4,maxBuildings=40,assets=['building-house','building-garage','building-hangar']}={}){
 const road=roadEntity?.roadSpline;
 if(!validRoadSpline(road))throw Error('City Builder needs a valid Gaia road');
 if(!Array.isArray(terrainEntities)||!Array.isArray(existingEntities))throw Error('City Builder needs Gaia terrain and scene entities');
 if(!Number.isSafeInteger(firstId)||firstId<1||!finite(spacing)||spacing<6||spacing>100||!finite(setback)||setback<1||setback>50||!Number.isInteger(maxBuildings)||maxBuildings<1||maxBuildings>200||!Array.isArray(assets)||!assets.length)
  throw Error('Invalid City Builder settings');
 const samples=sampleRoadSpline(road,{segmentsPerSpan:12});
 let total=0;for(let i=1;i<samples.length;i++)total+=length(samples[i-1],samples[i]);
 const added=[],occupied=[...existingEntities].filter(o=>Number.isFinite(o.x)&&Number.isFinite(o.y)&&Number.isFinite(o.w)&&o.w>0&&!o.roadSpline&&!o.terrainHeightfield);
 const crossRoads=existingEntities.filter(o=>o.id!==roadEntity.id&&o.enabled!==false&&validRoadSpline(o.roadSpline)).map(o=>o.roadSpline);
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
   if(occupied.some(o=>overlaps(building,o,64))||crossRoads.some(other=>cityFootprintCrossesRoad(building,other)))continue;
   occupied.push(building);added.push(building);
  }
 }
 return added;
}
