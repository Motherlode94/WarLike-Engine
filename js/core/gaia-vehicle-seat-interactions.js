// WB 2.9e — Explicit, deterministic vehicle seat interaction transaction.
// No implicit player teleport. The actual character controller, pose and
// camera handoff must consume the returned action in Play runtime.
import {gaiaVehicleParkingInteraction} from './gaia-traffic-ai.js';
const validId=id=>(typeof id==='string'&&id.length>0)||(Number.isSafeInteger(id)&&id>=0);
export function planGaiaVehicleSeatTransition({spot,actor,vehicle,action='enter'}={}){
 if(!spot||!actor||!vehicle||!validId(actor.id)||!validId(vehicle.id)||
  !['enter','exit'].includes(action))throw Error('Invalid Gaia seat transition');
 const existing=vehicle.vehicleSystems?.seats?.driverId??null;
 const permitted=gaiaVehicleParkingInteraction(spot,actor,vehicle,{action});
 if(!permitted.allowed)return {allowed:false,action,reason:permitted.reason,
  actorId:actor.id,vehicleId:vehicle.id,nextDriverId:existing};
 if(action==='enter'&&existing!==null&&existing!==actor.id)return {
  allowed:false,action,reason:'driver-occupied',actorId:actor.id,vehicleId:vehicle.id,
  nextDriverId:existing};
 if(action==='exit'&&existing!==actor.id)return {
  allowed:false,action,reason:'not-driver',actorId:actor.id,vehicleId:vehicle.id,
  nextDriverId:existing};
 return {allowed:true,action,reason:'ready',actorId:actor.id,vehicleId:vehicle.id,
  nextDriverId:action==='enter'?actor.id:null,
  event:action==='enter'?'vehicle:driver-enter':'vehicle:driver-exit'};
}
export function applyGaiaVehicleSeatTransition(vehicle,decision){
 if(!vehicle||!decision?.allowed||decision.vehicleId!==vehicle.id||
  !validId(decision.actorId)||!['enter','exit'].includes(decision.action))
  throw Error('Invalid Gaia seat commit');
 const before=vehicle.vehicleSystems?.seats?.driverId??null;
 const next=decision.action==='enter'?decision.actorId:null;
 if(decision.action==='enter'&&before!==null&&before!==decision.actorId||
  decision.action==='exit'&&before!==decision.actorId)
  throw Error('Gaia seat state changed');
 // Atomic object replacement maintains other seats and vehicle systems.
 const result=structuredClone(vehicle);
 result.vehicleSystems??={};
 result.vehicleSystems.seats={...(result.vehicleSystems.seats||{}),driverId:next};
 return result;
}
