// Opt-in Game Creator open-world behaviors. Shared coordinate plane in 2D and 3D.
export const worldRuntime={wanted:0,hordeActive:0,nearestThreat:0};
const limit=(n,min,max,fallback)=>Number.isFinite(Number(n))?Math.max(min,Math.min(max,Number(n))):fallback;
export function resetOpenWorld(){Object.assign(worldRuntime,{wanted:0,hordeActive:0,nearestThreat:0})}
export function updateOpenWorld(dt,player,entities,globals={}){
 if(!player||!Array.isArray(entities))return worldRuntime;
 dt=limit(dt,0,.1,0);
 const wanted=limit(globals.wantedLevel,0,5,0);
 worldRuntime.wanted=wanted;let infectedCount=0,nearest=Infinity;
 const px=limit(player.x,-1e7,1e7,0),py=limit(player.y,-1e7,1e7,0);
 for(const object of entities){
  if(!object||object===player)continue;
  const police=object.worldPoliceConfig,infected=object.worldInfectedConfig;
  if(police?.enabled===false||infected?.enabled===false)continue;
  if(!police&&!infected)continue;
  const dx=px-limit(object.x,-1e7,1e7,0),dy=py-limit(object.y,-1e7,1e7,0),distance=Math.hypot(dx,dy);
  if(infected)infectedCount++;
  const aggro=police?wanted>0&&distance<limit(police.range,20,2000,450):distance<limit(infected.range,20,2000,300);
  if(!aggro){if(object.worldChasing){object.worldChasing=false;object.worldTarget=null}continue}
  nearest=Math.min(nearest,distance);
  object.worldChasing=true;object.worldTarget={x:px,y:py};
  const speed=police?limit(police.speed,0,500,75)*(1+wanted*.12):limit(infected.speed,0,500,53);
  const travel=Math.min(Math.max(0,distance-26),speed*dt);
  if(distance>.001){object.x+=dx/distance*travel;object.y+=dy/distance*travel}
  object.animation='run';
 }
 worldRuntime.hordeActive=infectedCount;
 worldRuntime.nearestThreat=Number.isFinite(nearest)?nearest:0;
 return worldRuntime;
}
