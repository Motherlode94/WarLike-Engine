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
 return settings;
}
export function canDriveVehicle(entity){
 const sys=vehicleComponents(entity);
 return sys.engine.enabled!==false && (!sys.damage.disabledAtZero||finite(sys.engine.health,100)>0)
  && (!sys.fuel.enabled||finite(sys.fuel.amount,0)>0);
}
export function tickVehicleSystems(entity,dt,{speed=0,throttle=0}={}){
 const sys=vehicleComponents(entity),step=clamp(finite(dt,0),0,.1);
 if(sys.fuel.enabled&&Math.abs(throttle)>.01&&Math.abs(speed)>1){
  sys.fuel.amount=clamp(finite(sys.fuel.amount,0)-step*finite(sys.fuel.burnPerSecond,.025)*Math.abs(speed),0,finite(sys.fuel.capacity,100));
 }
 return {driveable:canDriveVehicle(entity),fuel:sys.fuel.amount,health:sys.engine.health};
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
