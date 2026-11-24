// WB 2.4 — Streetscape geometry from the same Gaia road surface as Rapier.
// No new terrain and no duplicate road spline source. World coordinates: metres.
import {roadSurfaceGeometry3d,validRoadSpline} from './gaia-road-spline.js';
import {validRoadJunction} from './gaia-road-junctions.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const hypot=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const lerp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
function accumulator(){
 const vertices=[],triangles=[];
 const tri=(a,b,c,top=false)=>{
  const x=b.x-a.x,z=b.z-a.z,px=c.x-a.x,pz=c.z-a.z;
  if(top&&z*px-x*pz<0)[b,c]=[c,b]; // correct +Y winding
  const start=vertices.length;vertices.push(a,b,c);triangles.push(start,start+1,start+2);
 };
 const quad=(a,b,c,d,top=false)=>{tri(a,b,c,top);tri(a,c,d,top)};
 const build=()=>{
  const positions=new Float32Array(vertices.length*3),indices=new Uint32Array(triangles),
   renderVertices=new Float32Array(vertices.length*6);
  for(let i=0;i<vertices.length;i++){
   const p=vertices[i];positions.set([p.x,p.y,p.z],i*3);
  }
  for(let i=0;i<vertices.length;i+=3){
   const a=vertices[i],b=vertices[i+1],c=vertices[i+2];
   const ux=b.x-a.x,uy=b.y-a.y,uz=b.z-a.z,
    vx=c.x-a.x,vy=c.y-a.y,vz=c.z-a.z;
   const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,n=Math.hypot(nx,ny,nz)||1;
   for(let k=0;k<3;k++){const p=vertices[i+k];renderVertices.set([p.x,p.y,p.z,nx/n,ny/n,nz/n],(i+k)*6)}
  }
  return {positions,indices,renderVertices,triangleCount:triangles.length/3};
 };
 return {tri,quad,build};
}
function arclength(sections){
 const distances=[0];for(let i=1;i<sections.length;i++){
  const a=sections[i-1],b=sections[i],centerA={x:(a.left.x+a.right.x)/2,z:(a.left.z+a.right.z)/2},
   centerB={x:(b.left.x+b.right.x)/2,z:(b.left.z+b.right.z)/2};
  distances.push(distances[i-1]+hypot(centerA,centerB));
 }
 return distances;
}
function sectionAt(sections,distances,distance){
 if(distance<0||distance>distances.at(-1))return null;
 for(let i=1;i<distances.length;i++){
  if(distances[i]<distance)continue;
  const span=distances[i]-distances[i-1];if(span<1e-9)continue;
  const t=clamp((distance-distances[i-1])/span,0,1);
  return {left:lerp(sections[i-1].left,sections[i].left,t),right:lerp(sections[i-1].right,sections[i].right,t)};
 }
 return sections.at(-1);
}
export function roadStreetscapeBuffers3d(road,terrains,junctions=[],{sidewalkWidth=1.8,curbHeight=.12,stripeWidth=.48}={}){
 if(!validRoadSpline(road)||!Array.isArray(terrains)||!Array.isArray(junctions))throw Error('Invalid Gaia streetscape sources');
 if(!Number.isFinite(sidewalkWidth)||sidewalkWidth<.6||sidewalkWidth>6||
    !Number.isFinite(curbHeight)||curbHeight<.04||curbHeight>.35||
    !Number.isFinite(stripeWidth)||stripeWidth<.15||stripeWidth>.7)throw Error('Invalid streetscape geometry settings');
 const sections=roadSurfaceGeometry3d(road,terrains).crossSections,sidewalk=accumulator(),crosswalk=accumulator();
 const curbPanels=accumulator(),distances=arclength(sections);
 for(const side of ['left','right']){
  const crossSections=sections.map(section=>{
   const inside=section[side],opposite=section[side==='left'?'right':'left'];
   const delta={x:inside.x-opposite.x,z:inside.z-opposite.z},n=Math.hypot(delta.x,delta.z)||1;
   const outside={x:inside.x+delta.x/n*sidewalkWidth,y:inside.y+curbHeight,z:inside.z+delta.z/n*sidewalkWidth};
   return {foot:{...inside},inner:{...inside,y:inside.y+curbHeight},outside};
  });
  for(let i=1;i<crossSections.length;i++){
   const a=crossSections[i-1],b=crossSections[i];
   sidewalk.quad(a.inner,a.outside,b.outside,b.inner,true);
   curbPanels.quad(a.foot,b.foot,b.inner,a.inner);
  }
 }
 const legal=junctions.filter(j=>validRoadJunction(j));
 for(const junction of legal){
  let nearest=-1,distance=Infinity;
  for(let i=0;i<sections.length;i++){
   const s=sections[i],cx=(s.left.x+s.right.x)/2,cz=(s.left.z+s.right.z)/2;
   const d=Math.hypot(cx-junction.center.x,cz-junction.center.z);
   if(d<distance){distance=d;nearest=i}
  }
  if(nearest<0||distance>road.width/2+junction.radius)continue;
  const centre=distances[nearest];
  // Four bars on each approach, outside the physical junction plateau.
  for(const sign of [-1,1])for(let n=0;n<4;n++){
   const d=centre+sign*(junction.radius+1.6+n*.9);
   const start=sectionAt(sections,distances,d-stripeWidth/2),end=sectionAt(sections,distances,d+stripeWidth/2);
   if(!start||!end)continue;
   const lift=p=>({...p,y:p.y+.012});
   crosswalk.quad(lift(start.left),lift(start.right),lift(end.right),lift(end.left),true);
  }
 }
 return {sidewalks:sidewalk.build(),curbs:curbPanels.build(),crosswalks:crosswalk.build()};
}
