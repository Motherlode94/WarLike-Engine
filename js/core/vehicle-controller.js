// A portable attachable arcade Vehicle Controller, independent of a prefab/asset.
// Wheel suspension remains a separate future physics implementation.
export const defaultVehicleController=()=>({
 enabled:true,maxSpeed:300,acceleration:190,brakeForce:330,
 turnRate:135,drag:1.35,reverseRatio:.45,collisionRadius:24
});
export function inspectVehicleController(config){
 if(!config||typeof config!=='object'||Array.isArray(config))return ['Vehicle Controller : configuration invalide.'];
 const errors=[];
 for(const key of ['maxSpeed','acceleration','brakeForce','turnRate','drag','reverseRatio','collisionRadius']){
  if(!Number.isFinite(config[key])||config[key]<=0||config[key]>1e5)errors.push('Vehicle Controller : valeur invalide pour '+key);
 }
 if(Number.isFinite(config.reverseRatio)&&config.reverseRatio>1)errors.push('Vehicle Controller : marche arrière invalide.');
 return errors;
}
export const vehicleTuning=entity=>entity?.vehicleController?.enabled!==false&&entity?.vehicleController?entity.vehicleController:entity;
