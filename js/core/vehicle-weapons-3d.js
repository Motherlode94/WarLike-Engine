// Optional mounted vehicle weapons. Uses existing 3D scene entities and stats.
// No weapon system is created for civilian vehicles unless configured.
import {raycastScene3d,collisionBox3d} from './collision-3d.js';
import {damage} from './gameplay-components.js';
const limit=(n,min,max,def)=>Number.isFinite(Number(n))?Math.min(max,Math.max(min,Number(n))):def;
export function vehicleWeaponConfig(car){
 const config=car?.vehicleWeapon;
 if(config?.enabled===false)return null;
 if(!config?.enabled)return null;
 return {range:limit(config.range,60,1600,600),damage:limit(config.damage,1,500,25),
  cooldown:limit(config.cooldown,.08,10,.45),arc:limit(config.arc,5,180,38)};
}
export function fireVehicleWeapon(car,entities,elapsed=0){
 const weapon=vehicleWeaponConfig(car);
 if(!weapon||!car||(car.stats?.health??car.hp??100)<=0)return {fired:false,reason:'weapon-disabled'};
 if((car._weaponCooldown||0)>0)return {fired:false,reason:'cooldown'};
 car._weaponCooldown=weapon.cooldown;
 const angle=(Number(car.rotation)||0)*Math.PI/180;
 const fx=Math.sin(angle),fy=-Math.cos(angle);
 let target=null,closest=Infinity;
 for(const entity of entities){
  if(entity===car||entity._hiddenInVehicle||entity._modeEliminated||entity.collision3d===false)continue;
  if(entity.type!=='character'&&entity.type!=='player'&&entity.ai?.enabled!==true&&!(entity.type==='mesh3d'&&(entity.stats||Number.isFinite(entity.hp)||entity.tacticalUnit)))continue;
  if((entity.stats?.health??entity.hp??100)<=0)continue;
  if(entity.team!=null&&car.team!=null&&entity.team===car.team)continue;
  const dx=(entity.x+(entity.w||0)/2)-(car.x+(car.w||0)/2),dy=(entity.y+(entity.depth3d||entity.h||0)/2)-(car.y+(car.depth3d||car.h||0)/2);
  const distance=Math.hypot(dx,dy);
  if(distance<20||distance>weapon.range||distance>=closest)continue;
  const dot=(dx*fx+dy*fy)/distance;
  if(dot<Math.cos(weapon.arc*Math.PI/360))continue;
  const a=collisionBox3d(car),b=collisionBox3d(entity),from=[(a.x+a.w/2)/64,(a.z+a.h*.8)/64,(a.y+a.d/2)/64],to=[(b.x+b.w/2)/64,(b.z+b.h*.6)/64,(b.y+b.d/2)/64],ray=to.map((v,i)=>v-from[i]);
  const hit=raycastScene3d(from,ray,entities,{exclude:car,maxDistance:Math.hypot(...ray)+.01,target:o=>o===entity});
  if(hit?.entity!==entity)continue;
  closest=distance;target=entity;
 }
 car._weaponFlash=.16;
 if(!target)return {fired:true,hit:false};
 damage(target,weapon.damage);
 target._battlefieldThreat=car.vehicleSystems?.seats?.driverId??car.id;
 target._hit=.2;
 return {fired:true,hit:true,target:target.name||String(target.id),damage:weapon.damage};
}
export function tickVehicleWeapon(car,dt){
 if(!car)return;
 car._weaponCooldown=Math.max(0,(car._weaponCooldown||0)-Math.max(0,Number(dt)||0));
 car._weaponFlash=Math.max(0,(car._weaponFlash||0)-Math.max(0,Number(dt)||0));
}
