// WB 2.4 — Roadside ribbons derived from the authoritative Gaia road mesh.
// Metres, Y-up. No second road spline or terrain state is created.
import {roadSurfaceGeometry3d,validRoadSpline} from './gaia-road-spline.js';

export const GAIA_ROADSIDE_SCHEMA='warlike.road.amenities.v1';
const finite=Number.isFinite;
export function createGaiaRoadAmenities({sidewalkWidth=1.8,curbHeight=.14,markingWidth=.12,centerLine=true}={}){
 const data={schema:GAIA_ROADSIDE_SCHEMA,sidewalkWidth,curbHeight,markingWidth,centerLine};
 if(!validGaiaRoadAmenities(data))throw Error('Invalid Gaia road amenities');
 return data;
}
export function validGaiaRoadAmenities(a){
 return !!a&&a.schema===GAIA_ROADSIDE_SCHEMA
  &&finite(a.sidewalkWidth)&&a.sidewalkWidth>=.5&&a.sidewalkWidth<=10
  &&finite(a.curbHeight)&&a.curbHeight>=0&&a.curbHeight<=.5
  &&finite(a.markingWidth)&&a.markingWidth>=.03&&a.markingWidth<=.5
  &&typeof a.centerLine==='boolean';
}
function meshFromSections(sections){
 const positions=new Float32Array(sections.length*2*3),indices=new Uint32Array((sections.length-1)*6);
 for(let i=0;i<sections.length;i++){
  for(let s=0;s<2;s++){const p=sections[i][s];positions.set([p.x,p.y,p.z],(i*2+s)*3);}
  if(i){const a=(i-1)*2,b=a+1,c=i*2,d=c+1,k=(i-1)*6;
   indices.set([a,c,b,b,c,d],k);
  }
 }
 return {positions,indices,triangleCount:indices.length/3};
}
function shift(p,n,d,y=0){return {x:p.x+n.x*d,y:p.y+y,z:p.z+n.z*d};}
/**
 * Returns sidewalk surfaces, vertical curb faces and a centre-line ribbon.
 * Source road cross sections determine exact elevation and tangent direction.
 * Faces/triangles are suitable for one shared render/collider mesh, not boxes.
 * Intersection clipping and zebra crossings are a separate WB 2.4 stage.
 */
export function gaiaRoadAmenitiesMeshes(road,terrains,amenities,{segmentsPerSpan=12}={}){
 if(!validRoadSpline(road)||!validGaiaRoadAmenities(amenities))throw Error('Invalid Gaia roadside geometry');
 const {crossSections}=roadSurfaceGeometry3d(road,terrains,{segmentsPerSpan});
 const bands={leftSidewalk:[],rightSidewalk:[],leftCurb:[],rightCurb:[],centerLine:[]};
 for(let i=0;i<crossSections.length;i++){
  const current=crossSections[i],before=crossSections[Math.max(0,i-1)],after=crossSections[Math.min(i+1,crossSections.length-1)];
  const center=p=>({x:(p.left.x+p.right.x)/2,z:(p.left.z+p.right.z)/2});
  const prev=center(before),next=center(after),dx=next.x-prev.x,dz=next.z-prev.z,len=Math.hypot(dx,dz);
  if(len<1e-9)throw Error('Degenerate Gaia road tangent');
  const n={x:-dz/len,z:dx/len};
  // left and right are defined by the underlying road mesh, not re-sampled.
  const lh=current.left,rh=current.right,h=amenities.curbHeight,w=amenities.sidewalkWidth;
  bands.leftSidewalk.push([shift(lh,n,w,h),shift(lh,n,0,h)]);
  bands.rightSidewalk.push([shift(rh,n,0,h),shift(rh,n,-w,h)]);
  bands.leftCurb.push([shift(lh,n,0,h),shift(lh,n,0,0)]);
  bands.rightCurb.push([shift(rh,n,0,0),shift(rh,n,0,h)]);
  const mid={x:(lh.x+rh.x)/2,y:(lh.y+rh.y)/2,z:(lh.z+rh.z)/2},half=amenities.markingWidth/2;
  bands.centerLine.push([shift(mid,n,half,.003),shift(mid,n,-half,.003)]);
 }
 const output={leftSidewalk:meshFromSections(bands.leftSidewalk),rightSidewalk:meshFromSections(bands.rightSidewalk),leftCurb:meshFromSections(bands.leftCurb),rightCurb:meshFromSections(bands.rightCurb)};
 if(amenities.centerLine)output.centerLine=meshFromSections(bands.centerLine);
 return output;
}
