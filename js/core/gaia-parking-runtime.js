// WB 2.9f: Public runtime bridge, usable by a game or editor without
// importing editor code. Physics, transforms, camera and animation remain
// the responsibility of the active Play runtime.
import {planGaiaParkingSteering} from './gaia-parking-steering.js';
import {planGaiaVehicleSeatTransition,applyGaiaVehicleSeatTransition} from './gaia-vehicle-seat-interactions.js';

export function evaluateGaiaParkingRuntime(network,vehicleState,options){
 const inputs=planGaiaParkingSteering(network,vehicleState,options);
 return {inputs:{
  throttle:inputs.throttle,steer:inputs.steer,brake:inputs.brake,
  handbrake:inputs.handbrake
 },status:inputs.parking,steering:inputs.parkingSteering,
  targetSpeedMps:inputs.targetSpeedMps??0,
  nextTargetSpeedMps:inputs.nextTargetSpeedMps??0};
}
export function commitGaiaParkingSeatAction(vehicle,actor,spot,action){
 const decision=planGaiaVehicleSeatTransition({vehicle,actor,spot,action});
 if(!decision.allowed)return {allowed:false,reason:decision.reason,vehicle};
 return {allowed:true,reason:'ready',
  vehicle:applyGaiaVehicleSeatTransition(vehicle,decision),event:decision.event,
  actorId:decision.actorId};
}
