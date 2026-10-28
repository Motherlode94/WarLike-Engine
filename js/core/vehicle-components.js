// WarLike Vehicle Components: generic runtime data for 3D ground vehicles.
// These components are data-first and reusable by templates or imported prefabs.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finite=(n,def)=>Number.isFinite(Number(n))?Number(n):def;
export function vehicleComponents(entity){
 const settings=entity.vehicleSystems??={};
 settings.engine??={enabled:true,health:100,maxHealth:100};
 settings.fuel??={enabled:false,capacity:100,amount:100,burnPerSecond:.025};
 settings.seats??={capacity:Math.max(1,Math.round(finite(entity.seatCount,2))),driverId:null};
 settings.damage??={collisionScale:.03,disabledAtZero:true};
 settings.transmission??={mode:'automatic',gear:1,gears:5,reverseGear:-1};
 settings.telemetry??={distance:0,engineHours:0,lastSpeed:0};
 return settings;
}
export function canDriveVehicle(entity){
 const sys=vehicleComponents(entity);
 return sys.engine.enabled!==false && (!sys.damage.disabledAtZero||finite(sys.engine.health,100)>0)
  && (!sys.fuel.enabled||finite(sys.fuel.amount,0)>0);
}
export function tickVehicleSystems(entity,dt,{speed=0,throttle=0}={}){
 const sys=vehicleComponents(entity),step=clamp(finite(dt,0),0,.1);
 const speedValue=finite(speed,0),moving=Math.abs(speedValue)>1;
 if(moving)sys.telemetry.distance+=Math.abs(speedValue)*step;
 if(Math.abs(throttle)>.01&&canDriveVehicle(entity))sys.telemetry.engineHours+=step/3600;
 sys.telemetry.lastSpeed=speedValue;
 if(sys.transmission.mode==='automatic'){
  const max=Math.max(1,Math.trunc(finite(sys.transmission.gears,5)));
  const maxSpeed=Math.max(1,finite(entity.maxSpeed,300));
  sys.transmission.gear=speedValue< -1?-1:!moving?1:clamp(Math.ceil(Math.abs(speedValue)/maxSpeed*max),1,max);
 }
 if(sys.fuel.enabled&&Math.abs(throttle)>.01&&Math.abs(speed)>1){
  sys.fuel.amount=clamp(finite(sys.fuel.amount,0)-step*finite(sys.fuel.burnPerSecond,.025)*Math.abs(speed),0,finite(sys.fuel.capacity,100));
 }
 return {driveable:canDriveVehicle(entity),fuel:sys.fuel.amount,health:sys.engine.health,gear:sys.transmission.gear,distance:sys.telemetry.distance};
}
export function impactVehicle(entity,speed){
 const sys=vehicleComponents(entity);
 const loss=Math.max(0,Math.abs(finite(speed,0))-35)*clamp(finite(sys.damage.collisionScale,.03),0,1);
 sys.engine.health=clamp(finite(sys.engine.health,100)-loss,0,Math.max(1,finite(sys.engine.maxHealth,100)));
 return {damage:loss,health:sys.engine.health,disabled:!canDriveVehicle(entity)};
}
export function repairVehicle(entity,amount=25){
 const sys=vehicleComponents(entity);
 sys.engine.health=clamp(finite(sys.engine.health,100)+Math.max(0,finite(amount,25)),0,Math.max(1,finite(sys.engine.maxHealth,100)));
 return sys.engine.health;
}
export function refuelVehicle(entity,amount=25){
 const sys=vehicleComponents(entity);
 sys.fuel.amount=clamp(finite(sys.fuel.amount,0)+Math.max(0,finite(amount,25)),0,Math.max(1,finite(sys.fuel.capacity,100)));
 return sys.fuel.amount;
}

export function setVehicleEngine(entity,enabled){
 const sys=vehicleComponents(entity);
 sys.engine.enabled=Boolean(enabled);
 return canDriveVehicle(entity);
}
export function setVehicleGear(entity,gear){
 const sys=vehicleComponents(entity);
 if(sys.transmission.mode!=='manual')return false;
 const next=Math.trunc(finite(gear,0));
 if(next< -1||next>Math.max(1,Math.trunc(finite(sys.transmission.gears,5))))return false;
 sys.transmission.gear=next;return true;
}
export function vehicleSnapshot(entity){
 const s=vehicleComponents(entity);
 return {driveable:canDriveVehicle(entity),health:s.engine.health,fuel:s.fuel.amount,
  gear:s.transmission.gear,distance:s.telemetry.distance,driverId:s.seats.driverId};
}
