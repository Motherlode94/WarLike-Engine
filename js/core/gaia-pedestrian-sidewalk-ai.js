// WB 2.8b.2 — opted-in autonomous sidewalk walking.
// Derive every footpath from existing Gaia road geometry; no duplicate road data.
// All points and movement are in metres (XZ). Rapier resolves actual displacement.
import {sampleRoadSpline,validRoadSpline} from './gaia-road-spline.js';
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const lerp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});
export function gaiaSidewalkPath(road,{side='right',sidewalkWidth=1.8}={}){
 if(!validRoadSpline(road)||!['left','right'].includes(side)||
 !Number.isFinite(sidewalkWidth)||sidewalkWidth<.6||sidewalkWidth>6)throw Error('Invalid Gaia sidewalk');
 const sampled=sampleRoadSpline(road),sign=side==='left'?1:-1,offset=road.width/2+sidewalkWidth/2;
 return sampled.map((p,i)=>{
  const a=sampled[Math.max(0,i-1)],b=sampled[Math.min(sampled.length-1,i+1)];
  const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz)||1;
  return {x:p.x-sign*dz/length*offset,z:p.z+sign*dx/length*offset};
 });
}
function nearestProgress(points,point){
 let best={distance:Infinity,progress:0},elapsed=0;
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);
  if(length<1e-8)continue;
  const t=clamp(((point.x-a.x)*dx+(point.z-a.z)*dz)/(length*length),0,1);
  const projected=lerp(a,b,t),d=distance(point,projected);
  if(d<best.distance)best={distance:d,progress:elapsed+t*length};
  elapsed+=length;
 }
 return {...best,length:elapsed};
}
function atProgress(points,progress){
 let elapsed=0;
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],length=distance(a,b);
  if(length<1e-8)continue;
  if(progress<=elapsed+length)return lerp(a,b,clamp((progress-elapsed)/length,0,1));
  elapsed+=length;
 }
 return points.at(-1);
}
/**
 * Pure physical movement intent. Never writes transforms, velocities, or saved
 * route assets. Caller must resolve the step through moveRapierCharacter3d().
 */
export function planGaiaPedestrianSidewalkStep(entities,config,position,dt){
 if(!Array.isArray(entities)||!position||![position.x,position.z,dt].every(Number.isFinite)||dt<=0)return {status:'invalid',dx:0,dz:0};
 if(!config?.enabled)return {status:'disabled',dx:0,dz:0};
 const roads=entities.filter(e=>e.enabled!==false&&validRoadSpline(e.roadSpline));
 const candidates=config.roadId?roads.filter(e=>e.id===config.roadId):roads;
 let best=null;
 for(const road of candidates){
  for(const side of (config.side==='left'||config.side==='right'?[config.side]:['left','right'])){
   const width=road.roadStreetscape3d?.sidewalkWidth??1.8;
   let points;try{points=gaiaSidewalkPath(road.roadSpline,{side,sidewalkWidth:width})}catch{continue}
   const nearest=nearestProgress(points,position);
   if(!best||nearest.distance<best.nearest.distance)best={road,side,points,nearest};
  }
 }
 if(!best||best.nearest.distance>2.5)return {status:'off-sidewalk',dx:0,dz:0};
 const speed=clamp(Number(config.speedMps)||1.2,.25,2.2);
 let direction=config.direction===-1?-1:1;
 if(best.nearest.progress>=best.nearest.length-.35)direction=-1;
 if(best.nearest.progress<=.35)direction=1;
 const destination=atProgress(best.points,clamp(best.nearest.progress+direction*Math.max(.7,speed*dt*3),0,best.nearest.length));
 const vx=destination.x-position.x,vz=destination.z-position.z,length=Math.hypot(vx,vz);
 if(length<1e-5)return {status:'waiting',dx:0,dz:0,roadId:best.road.id,side:best.side,direction};
 const step=Math.min(speed*dt,length);
 return {status:'walking',dx:vx/length*step,dz:vz/length*step,roadId:best.road.id,side:best.side,direction};
}
