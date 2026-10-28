// Optional mounted vehicle weapons. Uses existing 3D scene entities and stats.
// No weapon system is created for civilian vehicles unless configured.
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
 if(!weapon||!car)return {fired:false,reason:'weapon-disabled'};
 if((car._weaponCooldown||0)>0)return {fired:false,reason:'cooldown'};
 car._weaponCooldown=weapon.cooldown;
 const angle=(Number(car.rotation)||0)*Math.PI/180;
 const fx=Math.sin(angle),fy=-Math.cos(angle);
 let target=null,closest=Infinity;
 for(const entity of entities){
  if(entity===car||entity._hiddenInVehicle||entity._modeEliminated||entity.collision3d===false)continue;
  if(entity.type!=='character'&&entity.type!=='player'&&entity.ai?.enabled!==true&&entity.type!=='mesh3d')continue;
  if((entity.stats?.health??entity.hp??100)<=0)continue;
  if(entity.team!=null&&car.team!=null&&entity.team===car.team)continue;
  const dx=(entity.x+(entity.w||0)/2)-(car.x+(car.w||0)/2),dy=(entity.y+(entity.depth3d||entity.h||0)/2)-(car.y+(car.depth3d||car.h||0)/2);
  const distance=Math.hypot(dx,dy);
  if(distance<20||distance>weapon.range||distance>=closest)continue;
  const dot=(dx*fx+dy*fy)/distance;
  if(dot<Math.cos(weapon.arc*Math.PI/360))continue;
  closest=distance;target=entity;
 }
 car._weaponFlash=.16;
 if(!target)return {fired:true,hit:false};
 if(target.stats){target.stats.health=Math.max(0,(Number(target.stats.health)||0)-weapon.damage)}
 else target.hp=Math.max(0,(Number(target.hp)||100)-weapon.damage);
 target._hit=.2;
 return {fired:true,hit:true,target:target.name||String(target.id),damage:weapon.damage};
}
export function tickVehicleWeapon(car,dt){
 if(!car)return;
 car._weaponCooldown=Math.max(0,(car._weaponCooldown||0)-Math.max(0,Number(dt)||0));
 car._weaponFlash=Math.max(0,(car._weaponFlash||0)-Math.max(0,Number(dt)||0));
}
