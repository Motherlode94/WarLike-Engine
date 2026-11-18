// WarLike Ocean foundation shared by 2D gameplay and 3D mesh rendering.
// Deterministic Gerstner wave sampling in world coordinates; not fluid simulation.
const clamp=(n,lo,hi)=>Math.min(hi,Math.max(lo,n));
const number=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
export const oceanDefaults=Object.freeze({
 enabled:true,level:0,amplitude:.15,wavelength:7,speed:1.4,
 steepness:.35,directionX:1,directionZ:.25,secondaryWaves:3,
 density:1000,drag:.6
});
export function oceanSettings(value={}){
 const v={...oceanDefaults,...(value&&typeof value==='object'?value:{})};
 for(const [k,lo,hi] of [['level',-10000,10000],['amplitude',0,10],['wavelength',.25,1000],['speed',0,30],['steepness',0,.85],['secondaryWaves',1,6],['density',1,20000],['drag',0,20]])v[k]=clamp(number(v[k],oceanDefaults[k]),lo,hi);
 v.secondaryWaves=Math.round(v.secondaryWaves);
 v.directionX=number(v.directionX,1);v.directionZ=number(v.directionZ,.25);
 const len=Math.hypot(v.directionX,v.directionZ);
 if(len<1e-7){v.directionX=1;v.directionZ=0}else{v.directionX/=len;v.directionZ/=len}
 v.enabled=v.enabled!==false;
 return v;
}
export function oceanSample(x,z,time,options={}){
 const w=oceanSettings(options);
 if(!w.enabled)return {x,z,height:w.level,normal:[0,1,0],offsetX:0,offsetZ:0};
 x=number(x,0);z=number(z,0);time=number(time,0);
 const count=w.secondaryWaves;
 let height=w.level,dx=0,dz=0,dhdx=0,dhdz=0;
 for(let i=0;i<count;i++){
  const angle=i*.72,ca=Math.cos(angle),sa=Math.sin(angle);
  const u=w.directionX*ca-w.directionZ*sa,v=w.directionX*sa+w.directionZ*ca;
  const wavelength=w.wavelength/(1+i*.79),k=2*Math.PI/wavelength;
  const amplitude=w.amplitude/(count*(1+i*.42));
  const phase=k*(u*x+v*z)-time*w.speed*Math.sqrt(9.81*k)+(i*.81);
  const cs=Math.cos(phase),sn=Math.sin(phase);
  height+=amplitude*sn;
  dhdx+=amplitude*k*u*cs;dhdz+=amplitude*k*v*cs;
  const drift=w.steepness*amplitude*cs;
  dx+=u*drift;dz+=v*drift;
 }
 const length=Math.hypot(-dhdx,1,-dhdz)||1;
 return {x:x+dx,z:z+dz,height,normal:[-dhdx/length,1/length,-dhdz/length],offsetX:dx,offsetZ:dz};
}
// Pure, frame-rate-independent force estimates. The physics backend owns integration.
export function waterBuoyancy3d(body,water,time,gravity=9.81){
 const w=oceanSettings(water);
 const x=number(body?.x,0),z=number(body?.z,0);
 const surface=oceanSample(x,z,time,w);
 const volume=Math.max(0,number(body?.volume,0)),height=Math.max(1e-6,number(body?.height,1));
 const centerY=number(body?.y,0);
 const submerged=clamp((surface.height-(centerY-height/2))/height,0,1);
 const density=Math.max(0,number(body?.density,500));
 const displaced=volume*submerged;
 return {submerged,forceY:displaced*w.density*gravity,
  netForceY:displaced*w.density*gravity-volume*density*gravity,
  dragFactor:w.drag*submerged,surfaceHeight:surface.height};
}
// The 2D counterpart uses the same water height along the X axis and an area
// (per meter thickness) instead of a physical 3D volume.
export function waterBuoyancy2d(body,water,time,gravity=9.81){
 const w=oceanSettings(water);
 const sample=oceanSample(number(body?.x,0),0,time,w);
 const height=Math.max(1e-6,number(body?.height,1));
 const submerged=clamp((sample.height-(number(body?.y,0)-height/2))/height,0,1);
 const area=Math.max(0,number(body?.area,0));
 const density=Math.max(0,number(body?.density,500));
 return {submerged,forceY:area*submerged*w.density*gravity,
 netForceY:area*(submerged*w.density-density)*gravity,
 dragFactor:w.drag*submerged,surfaceHeight:sample.height};
}
