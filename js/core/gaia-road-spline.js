// WB 1.1 — Gaia-backed road geometry. No separate terrain database.
// Points and widths are in metres; entity x/y and 2D coordinates are 64 units/m.
import {heightfieldAt3d,validTerrainHeightfield} from './gaia-terrain-physics.js';

export const ROAD_SPLINE_SCHEMA='warlike.road.spline.v1';
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const clonePoint=p=>({x:p.x,z:p.z});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const lerp=(a,b,t)=>a+(b-a)*t;
const interp=(p0,p1,p2,p3,t)=>{
 // Centripetal-safe cubic Hermite: local segment tangents are clamped to
 // segment length, preventing loops or overshoot on uneven control spacing.
 const len=distance(p1,p2);
 const tangent=(prev,next)=> {
  const d=distance(prev,next)||1;
  const magnitude=Math.min(len,d/2);
  return {x:(next.x-prev.x)/d*magnitude,z:(next.z-prev.z)/d*magnitude};
 };
 const a=tangent(p0,p2),b=tangent(p1,p3),t2=t*t,t3=t2*t;
 return {x:(2*t3-3*t2+1)*p1.x+(t3-2*t2+t)*a.x+(-2*t3+3*t2)*p2.x+(t3-t2)*b.x,
  z:(2*t3-3*t2+1)*p1.z+(t3-2*t2+t)*a.z+(-2*t3+3*t2)*p2.z+(t3-t2)*b.z};
};

export function validRoadSpline(road){
 return !!road&&road.schema===ROAD_SPLINE_SCHEMA
  &&Array.isArray(road.points)&&road.points.length>=2&&road.points.length<=256
  &&road.points.every(p=>finite(p?.x)&&finite(p?.z))
  &&road.points.some((p,i)=>i>0&&distance(p,road.points[i-1])>1e-6)
  &&finite(road.width)&&road.width>=1&&road.width<=60
  &&finite(road.elevationOffset)&&road.elevationOffset>=0&&road.elevationOffset<=10;
}
export function createRoadSpline(points,{width=6,elevationOffset=.05}={}){
 const road={schema:ROAD_SPLINE_SCHEMA,points:points?.map(clonePoint),width,elevationOffset};
 if(!validRoadSpline(road))throw Error('Invalid road spline geometry');
 return road;
}
export function sampleRoadSpline(road,{segmentsPerSpan=12}={}){
 if(!validRoadSpline(road))throw Error('Invalid road spline');
 if(!Number.isInteger(segmentsPerSpan)||segmentsPerSpan<1||segmentsPerSpan>64)throw Error('Invalid road sample density');
 const source=road.points.filter((p,i,a)=>i===0||distance(p,a[i-1])>1e-6);
 const samples=[];
 for(let i=0;i<source.length-1;i++){
  const a=source[Math.max(0,i-1)],b=source[i],c=source[i+1],d=source[Math.min(source.length-1,i+2)];
  for(let j=0;j<segmentsPerSpan;j++)samples.push(interp(a,b,c,d,j/segmentsPerSpan));
 }
 samples.push(clonePoint(source[source.length-1]));
 return samples;
}
function roadHeightAt(terrains,x,z){
 let height=null;
 for(const entry of terrains){
  const t=entry?.terrainHeightfield||entry;
  if(!validTerrainHeightfield(t)||entry?.enabled===false)continue;
  const y=heightfieldAt3d(t,x,z);
  if(y!==null)height=height===null?y:Math.max(y,height);
 }
 return height;
}
export function roadSurfaceGeometry3d(road,terrains,{segmentsPerSpan=12}={}){
 if(!Array.isArray(terrains))throw Error('Gaia terrain list required');
 const samples=sampleRoadSpline(road,{segmentsPerSpan}),crossSections=[];
 for(let i=0;i<samples.length;i++){
  const p=samples[i],prev=samples[Math.max(0,i-1)],next=samples[Math.min(samples.length-1,i+1)];
  const dx=next.x-prev.x,dz=next.z-prev.z,len=Math.hypot(dx,dz);
  if(len<1e-9)continue;
  const nx=-dz/len,nz=dx/len,half=road.width/2;
  const left={x:p.x+nx*half,z:p.z+nz*half},right={x:p.x-nx*half,z:p.z-nz*half};
  const ly=roadHeightAt(terrains,left.x,left.z),ry=roadHeightAt(terrains,right.x,right.z),cy=roadHeightAt(terrains,p.x,p.z);
  // Failing explicitly prevents creating floating or invisible sections at
  // Gaia tile boundaries. Multi-tile roads need actual adjacent Gaia tiles.
  if(ly===null||ry===null||cy===null)throw Error('Road crosses outside Gaia terrain coverage');
  // A peaked Gaia ridge can be taller at the centreline than both shoulders.
  // Keep the drivable triangle above the centre as well as both edges.
  const surfaceHeight=Math.max(ly,ry,cy)+road.elevationOffset;
  crossSections.push({left:{...left,y:surfaceHeight},right:{...right,y:surfaceHeight}});
 }
 if(crossSections.length<2)throw Error('Road requires two non-degenerate sections');
 const vertices=[],triangles=[];
 for(const {left,right} of crossSections)vertices.push(left,right);
 for(let i=0;i<crossSections.length-1;i++){
  const a=2*i,b=a+1,c=a+2,d=a+3;
  // Upward-facing winding in Y-up world coordinates for the road surface.
  triangles.push([a,c,b],[b,c,d]);
 }
 // These very same indexed triangles are the authoritative road-surface
 // geometry for the future renderer AND physics bridge; no fake collider.
 return {vertices,triangles,crossSections};
}
export function roadPolyline2d(road,{segmentsPerSpan=12,unitsPerMeter=64}={}){
 if(!finite(unitsPerMeter)||unitsPerMeter<=0)throw Error('Invalid scene scale');
 return sampleRoadSpline(road,{segmentsPerSpan}).map(p=>({x:p.x*unitsPerMeter,y:p.z*unitsPerMeter}));
}
export function roadSplineEntity(id,road,{name='Gaia Road'}={}){
 if(!Number.isSafeInteger(id)||id<1||!validRoadSpline(road))throw Error('Invalid Gaia road entity');
 return {id,name,type:'road',roadSpline:structuredClone(road),enabled:true,visible:true};
}

/** Edit an authored road without altering any Gaia height samples. */
export function editRoadSpline(road,{action,index,point,width}){
 if(!validRoadSpline(road))throw Error('Invalid road spline');
 const next=structuredClone(road);
 if(action==='width')next.width=width;
 else if(action==='append'){
  if(next.points.length>=256)throw Error('Road control point limit reached');
  next.points.push(point);
 }else if(action==='move'){
  if(!Number.isInteger(index)||index<0||index>=next.points.length)throw Error('Invalid control point');
  next.points[index]=point;
 }else throw Error('Unknown road edit');
 if(!validRoadSpline(next)||next.points.some((p,i)=>i&&distance(p,next.points[i-1])<1e-4))
  throw Error('Invalid road edit geometry');
 return next;
}

/**
 * Shared authoritative road surface for WebGL and Rapier. World coordinates,
 * metres and Y-up; each visual triangle uses exactly the same vertices as
 * the corresponding collider triangle. No duplicate road height solver.
 */
export function roadSurfaceBuffers3d(road,terrains,options={}){
 const surface=roadSurfaceGeometry3d(road,terrains,options);
 const positions=new Float32Array(surface.vertices.length*3);
 for(let i=0;i<surface.vertices.length;i++){
  const p=surface.vertices[i];positions.set([p.x,p.y,p.z],i*3);
 }
 const indices=new Uint32Array(surface.triangles.length*3);
 const renderVertices=new Float32Array(surface.triangles.length*18);
 for(let i=0;i<surface.triangles.length;i++){
  const triangle=surface.triangles[i],a=surface.vertices[triangle[0]],b=surface.vertices[triangle[1]],c=surface.vertices[triangle[2]];
  const ux=b.x-a.x,uy=b.y-a.y,uz=b.z-a.z,vx=c.x-a.x,vy=c.y-a.y,vz=c.z-a.z;
  const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,length=Math.hypot(nx,ny,nz)||1;
  for(let j=0;j<3;j++){
   const index=triangle[j],p=surface.vertices[index],offset=i*18+j*6;
   indices[i*3+j]=index;
   renderVertices.set([p.x,p.y,p.z,nx/length,ny/length,nz/length],offset);
  }
 }
 return {positions,indices,renderVertices,triangleCount:surface.triangles.length};
}
