// WB 2.3 — Native road crossings reuse the authored Gaia road splines.
// Coordinates are metres, Y-up; the same indexed triangles feed WebGL/Rapier.
import {sampleRoadSpline,validRoadSpline} from './gaia-road-spline.js';
import {heightfieldAt3d,validTerrainHeightfield} from './gaia-terrain-physics.js';
const finite=x=>Number.isFinite(x);
const cross=(ax,az,bx,bz)=>ax*bz-az*bx;
export const ROAD_JUNCTION_SCHEMA='warlike.road.junction.v1';

function intersectSegments(a,b,c,d){
 const rx=b.x-a.x,rz=b.z-a.z,sx=d.x-c.x,sz=d.z-c.z;
 const denom=cross(rx,rz,sx,sz),lenA=Math.hypot(rx,rz),lenB=Math.hypot(sx,sz);
 if(lenA<1e-8||lenB<1e-8||Math.abs(denom)/(lenA*lenB)<.2)return null;
 const qx=c.x-a.x,qz=c.z-a.z,t=cross(qx,qz,sx,sz)/denom,u=cross(qx,qz,rx,rz)/denom;
 if(t<0||t>1||u<0||u>1)return null;
 return {x:a.x+t*rx,z:a.z+t*rz,sine:Math.abs(denom)/(lenA*lenB)};
}
export function findGaiaRoadJunctions(roads,{segmentsPerSpan=8}={}){
 if(!Array.isArray(roads))throw Error('Road list required');
 const active=roads.filter(e=>e.enabled!==false&&validRoadSpline(e.roadSpline));
 const junctions=[];
 for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++){
  const first=active[i],second=active[j];
  const a=sampleRoadSpline(first.roadSpline,{segmentsPerSpan}),b=sampleRoadSpline(second.roadSpline,{segmentsPerSpan});
  for(let k=1;k<a.length;k++)for(let l=1;l<b.length;l++){
   const hit=intersectSegments(a[k-1],a[k],b[l-1],b[l]);
   if(!hit)continue;
   const radius=Math.min(36,Math.max(first.roadSpline.width,second.roadSpline.width)*.66/hit.sine);
   if(junctions.some(x=>x.roadIds[0]===first.id&&x.roadIds[1]===second.id&&Math.hypot(x.center.x-hit.x,x.center.z-hit.z)<radius*.35))continue;
   junctions.push({schema:ROAD_JUNCTION_SCHEMA,roadIds:[first.id,second.id],center:{x:hit.x,z:hit.z},radius:Number(radius.toFixed(5)),sides:12});
  }
 }
 return junctions;
}
export function validRoadJunction(j){
 return !!j&&j.schema===ROAD_JUNCTION_SCHEMA&&Array.isArray(j.roadIds)&&j.roadIds.length===2&&j.roadIds.every(id=>Number.isSafeInteger(id)&&id>0)&&j.roadIds[0]!==j.roadIds[1]&&finite(j.center?.x)&&finite(j.center?.z)&&finite(j.radius)&&j.radius>0&&j.radius<=36&&Number.isInteger(j.sides)&&j.sides>=8&&j.sides<=32;
}
export function roadJunctionEntity(id,j){
 if(!Number.isSafeInteger(id)||id<1||!validRoadJunction(j))throw Error('Invalid Gaia junction');
 const r=j.radius;
 return {id,name:'Gaia Junction '+id,type:'road-junction',x:(j.center.x-r)*64,y:(j.center.z-r)*64,w:r*128,h:r*128,
  color:'#34383f',collision3d:true,enabled:true,visible:true,roadJunction3d:structuredClone(j)};
}
/**
 * A single raised physical plateau avoids colliding intersection triangles.
 * It is bounded to junctions with reasonably matched levels; overpasses
 * cannot be silently joined into a drivable junction.
 */
export function roadJunctionBuffers3d(j,roads,terrains,{clearance=.035}={}){
 if(!validRoadJunction(j)||!Array.isArray(roads)||!Array.isArray(terrains))throw Error('Invalid junction geometry');
 if(!finite(clearance)||clearance<.005||clearance>.2)throw Error('Invalid junction clearance');
 const pair=j.roadIds.map(id=>roads.find(r=>r.id===id&&r.enabled!==false&&validRoadSpline(r.roadSpline)));
 if(pair.some(r=>!r))throw Error('Junction source road missing');
 // Flat plateau at highest Gaia height across the junction footprint.
 const sample=(x,z)=>{
  let height=null;
  for(const entity of terrains){
   const terrain=entity.terrainHeightfield;
   if(entity.enabled===false||!validTerrainHeightfield(terrain))continue;
   const y=heightfieldAt3d(terrain,x,z);
   if(y!==null)height=height===null?y:Math.max(height,y);
  }
  return height;
 };
 const center=sample(j.center.x,j.center.z);
 if(center===null)throw Error('Junction outside Gaia terrain');
 const corners=[];
 for(let i=0;i<j.sides;i++){
  const angle=i*Math.PI*2/j.sides;
  const x=j.center.x+Math.cos(angle)*j.radius,z=j.center.z+Math.sin(angle)*j.radius;
  const y=sample(x,z);
  if(y===null)throw Error('Junction reaches outside Gaia terrain');
  corners.push({x,y,z});
 }
 const height=Math.max(center,...corners.map(p=>p.y));
 // Conservative limit: do not hide an abrupt mountain slope behind a flat plaza.
 if(height-Math.min(center,...corners.map(p=>p.y))>1.25)throw Error('Junction needs terrain grading before physical construction');
 const roadOffsets=pair.map(r=>r.roadSpline.elevationOffset);
 const y=height+Math.max(...roadOffsets)+clearance;
 const vertices=[{x:j.center.x,y,z:j.center.z},...corners.map(p=>({x:p.x,y,z:p.z}))];
 const positions=new Float32Array(vertices.length*3);
 for(let i=0;i<vertices.length;i++)positions.set([vertices[i].x,vertices[i].y,vertices[i].z],3*i);
 const indices=new Uint32Array(j.sides*3),renderVertices=new Float32Array(j.sides*18);
 for(let i=0;i<j.sides;i++){
  const triangle=[0,(i+1)%j.sides+1,i+1];
  for(let k=0;k<3;k++){
   indices[i*3+k]=triangle[k];
   const v=vertices[triangle[k]];
   renderVertices.set([v.x,v.y,v.z,0,1,0],i*18+k*6);
  }
 }
 return {positions,indices,renderVertices,triangleCount:j.sides};
}
