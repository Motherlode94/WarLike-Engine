// Aircraft pilot inputs. Stateful power levers, momentary flight controls.
// Keys use the same resolved 3D vehicle context as vehicle-3d.js.
// No direct transform movement: Rapier exclusively owns the aircraft pose.
const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number.isFinite(value)?value:0));
const pressed=(keys,...names)=>names.some(name=>keys?.has(name));
export function aircraftPilotInput(kind,previous={},keys=new Set(),dt=0){
 if(kind!=='airplane'&&kind!=='helicopter')throw Error('Unknown aircraft profile');
 const step=clamp(dt,0,.1),delta=(Number(pressed(keys,'w','z'))-Number(pressed(keys,'s')))*step*.55;
 const throttle=clamp((previous.throttle??0)+delta,0,1);
 const collective=clamp((previous.collective??0)+delta,0,1);
 // Pitch is a transient stick, not a direct camera rotation.
 const pitch=Number(pressed(keys,'arrowup','i'))-Number(pressed(keys,'arrowdown','k'));
 const roll=Number(pressed(keys,'arrowright','l'))-Number(pressed(keys,'arrowleft','j'));
 const yaw=Number(pressed(keys,'d'))-Number(pressed(keys,'a','q'));
 return {
  throttle:kind==='airplane'?throttle:clamp(previous.throttle??0,0,1),
  collective:kind==='helicopter'?collective:clamp(previous.collective??0,0,1),
  pitch:clamp(pitch,-1,1),roll:clamp(roll,-1,1),yaw:clamp(yaw,-1,1)
 };
}
export function releaseAircraftControls(previous={}){
 return {throttle:clamp(previous.throttle??0,0,1),collective:clamp(previous.collective??0,0,1),pitch:0,roll:0,yaw:0};
}
export function canSafelyExitAircraft(vehicle,limit=2.5){
 // Do not teleport the occupant out of an airborne aircraft. This is a
 // conservative scene-level check, not a parachute/ejection simulation.
 return Number.isFinite(vehicle?.elevation3d)&&vehicle.elevation3d<=limit;
}
