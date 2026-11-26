import {rotationQuaternion3d} from './collider-3d.js';
// WarLike 3D Beta.3 lighting: real per-fragment directional, point and spot shading.
export const lighting={hour:14,speed:0,dayNight:false,sunEnabled:true,sunIntensity:1.25,ambient:.24};
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export const lightTypes=['point','spot'];
const activeLight=o=>o.enabled!==false&&o.sequenceEnabled!==false&&!o._sequenceDestroyed;
function lightVector(o,[x,y,z]){
 const q=rotationQuaternion3d(o),[qx,qy,qz,qw]=[q.x,q.y,q.z,q.w];
 const tx=2*(qy*z-qz*y),ty=2*(qz*x-qx*z),tz=2*(qx*y-qy*x);
 return [x+qw*tx+qy*tz-qz*ty,y+qw*ty+qz*tx-qx*tz,z+qw*tz+qx*ty-qy*tx];
}
export function updateLighting(dt,playing){if(playing&&lighting.dayNight&&lighting.speed>0)lighting.hour=(lighting.hour+Math.min(.1,Math.max(0,Number(dt)||0))*lighting.speed/3600)%24}
export function periodAt(hour=lighting.hour){const h=((Number(hour)||0)%24+24)%24;return h>=6&&h<8?'aube':h>=8&&h<18?'jour':h>=18&&h<20?'crépuscule':'nuit'}
export function sunAt(hour=lighting.hour,entities=null){
 const directional=Array.isArray(entities)?entities.filter(o=>o?.lightType==='directional'):[];
 // Disabled scene lights must not resurrect the legacy global sun.
 const sceneLight=directional.find(o=>activeLight(o)&&o.lightEnabled!==false)||directional[0];
 const enabled=sceneLight?activeLight(sceneLight)&&sceneLight.lightEnabled!==false:lighting.sunEnabled;
 const intensity=sceneLight&&Number.isFinite(Number(sceneLight.lightIntensity))?Math.max(0,Math.min(10,Number(sceneLight.lightIntensity))):lighting.sunIntensity;
 const theta=((hour-6)/24)*Math.PI*2;
 const altitude=Math.sin(theta),sun=Math.max(0,altitude),twilight=Math.max(0,1-Math.abs(altitude)*4),night=1-sun;
 const manual=sceneLight?.lightDirectionMode==='transform';
 return {direction:manual?lightVector(sceneLight,[0,0,-1]):[Math.cos(theta)*.45,Math.max(.08,altitude),Math.sin(theta)*.55],
 intensity:enabled?intensity*(manual?1:.07+.93*sun):0,
 ambient:Math.max(.035,lighting.ambient*(.3+.7*sun))+sun*.12,
 color:manual?colorRgb(sceneLight.lightColor||'#ffffff'):[1,.93-.21*twilight,.80-.28*twilight],
 sky:[.014+.31*sun+.11*twilight,.020+.49*sun+.045*twilight,.046+.71*sun+.065*twilight]};
}
export const validColor=value=>/^#[0-9a-f]{6}$/i.test(value||'')?value:'#ffd48b';
export const colorRgb=hex=>[1,3,5].map(i=>parseInt(validColor(hex).slice(i,i+2),16)/255);
export function lightFromEntity(o){
 if(!o||!activeLight(o)||!lightTypes.includes(o.lightType)||o.lightEnabled===false)return null;
 const intensity=clamp(Number(o.lightIntensity)||0,0,10),range=clamp(Number(o.lightRange)||5,.2,120);
 if(intensity<=0)return null;
 const position=[(o.x+o.w/2)/64,(Number(o.elevation3d)||0)+Math.max(.5,(Number(o.h)||64)/64), (o.y+(Number(o.depth3d??o.h)||64)/2)/64];
 // Keep the historical downward tilt for old scenes at zero X/Z rotation,
 // while applying the full authored orientation to spot lights.
 return {position,color:colorRgb(o.lightColor||'#ffd48b'),intensity,range,
 direction:lightVector(o,[0,-.45,1]),cone:Math.cos(clamp(Number(o.lightAngle)||40,5,170)*Math.PI/360),spot:o.lightType==='spot'};
}
export function visibleLights(entities,cam,max=8){
 return entities.map(lightFromEntity).filter(Boolean).sort((a,b)=>{
 const da=(a.position[0]-cam[0])**2+(a.position[2]-cam[2])**2,db=(b.position[0]-cam[0])**2+(b.position[2]-cam[2])**2;return da-db
 }).slice(0,max);
}
