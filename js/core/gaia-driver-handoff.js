// WB 2.9g — deterministic driver ownership guard for playable 3D vehicles.
// Does not mutate entities or override the active physics/camera controller.
export function gaiaDriverSeatAccess(vehicle,actorId,action='enter'){
 if(!vehicle||actorId==null||!['enter','exit'].includes(action))
  return {allowed:false,reason:'invalid-driver-action'};
 const occupant=vehicle.vehicleSystems?.seats?.driverId??null;
 if(action==='enter'&&occupant!=null&&occupant!==actorId)
  return {allowed:false,reason:'driver-occupied'};
 if(action==='exit'&&occupant!==actorId)
  return {allowed:false,reason:'not-driver'};
 return {allowed:true,reason:'ready'};
}
