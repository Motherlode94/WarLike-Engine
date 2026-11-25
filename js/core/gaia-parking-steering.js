// WB 2.9d: opt-in parking manoeuvre input, never direct transform writes.
// The existing ground-vehicle Rapier wheel solver receives these same controls.
import {controlGaiaParkingVehicle,gaiaTrafficParkingSpots} from './gaia-traffic-ai.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function planGaiaParkingSteering(network,state={},options={}){
 const {parkingSpotId=null,parkingSpots=null,deltaSeconds=1/60,
  previousTargetSpeedMps=null,steeringGain=1.6,alignmentTolerance=.14}=options;
 if(!Number.isFinite(steeringGain)||steeringGain<=0||!Number.isFinite(alignmentTolerance)||
  alignmentTolerance<=0||alignmentTolerance>1)throw Error('Invalid Gaia parking steering');
 const spots=parkingSpots??gaiaTrafficParkingSpots(network);
 const stopped=controlGaiaParkingVehicle(network,state,{parkingSpotId,parkingSpots:spots,
  previousTargetSpeedMps,deltaSeconds});
 if(!parkingSpotId||!['approaching','stopped'].includes(stopped.parking))
  return {...stopped,parkingSteering:'inactive'};
 const spot=spots.find(s=>s.id===parkingSpotId);
 if(!spot)return {...stopped,parkingSteering:'inactive'};
 const p=state.position,f=state.forward;
 const fl=Math.hypot(f?.x||0,f?.z||0);
 if(!p||fl<1e-6)return {...stopped,throttle:0,brake:1,parkingSteering:'no-heading'};
 const dx=spot.approach.x-p.x,dz=spot.approach.z-p.z;
 const length=Math.hypot(dx,dz);
 if(length<1e-6)return {...stopped,parkingSteering:'at-approach'};
 const target={x:dx/length,z:dz/length},facing={x:f.x/fl,z:f.z/fl};
 const signed=Math.atan2(facing.x*target.z-facing.z*target.x,
  facing.x*target.x+facing.z*target.z);
 const steer=clamp(signed*steeringGain,-1,1);
 const needsAlignment=Math.abs(signed)>alignmentTolerance;
 // Keep all longitudinal limits and brakes from WB 2.9c; this planner
 // is a physical approach, not an automatic sideways snap into a stall.
 return {...stopped,steer,
  throttle:stopped.brake>0?0:Math.min(stopped.throttle,needsAlignment?.3:1),
  parkingSteering:needsAlignment?'aligning':'approaching'};
}
