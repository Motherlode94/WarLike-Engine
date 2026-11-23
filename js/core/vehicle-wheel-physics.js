// Vehicle wheel force model. SI units: m, kg, s, N, Nm.
// Pure calculations: the Rapier adapter applies forces at each wheel contact.
const finite=(v,d=0)=>typeof v==='number'&&Number.isFinite(v)?v:d;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,finite(v)));
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
const scale=(a,k)=>({x:a.x*k,y:a.y*k,z:a.z*k});
const norm=v=>{const m=Math.hypot(v.x,v.y,v.z);return m>1e-9?scale(v,1/m):{x:0,y:0,z:0}};
export const defaultWheelPhysics=()=>({
 radius:.36,restLength:.35,travel:.22,spring:32000,damper:4300,
 grip:1.05,rollingResistance:.015,driven:true,steering:false,braking:true
});
export function validateWheelPhysics(c){
 const errors=[];
 if(!c||typeof c!=='object')return ['Wheel physics: missing configuration'];
 for(const k of ['radius','restLength','travel','spring','damper','grip','rollingResistance']){
  if(!Number.isFinite(c[k])||c[k]<0)errors.push('Wheel physics: invalid '+k);
 }
 if(c.radius<=0||c.spring<=0||c.restLength<c.travel)errors.push('Wheel physics: invalid suspension geometry');
 return errors;
}
/**
 * contact: {distance,normal,point}; distance is wheel-anchor to surface along suspension axis.
 * wheel: authored wheel physics configuration.
 * state: {velocity,forward,right,up,angularVelocity,position,centerOfMass}.
 * inputs: {throttle,brake,steer,handbrake}; all bounded to [-1,1] or [0,1].
 * The caller must raycast against the live physics world (excluding this chassis).
 * Never apply forces without a valid contact.
 */
export function solveWheelForces({wheel,contact,state,inputs={},dt,driveForce=0,brakeForce=0,effectiveMass=0}){
 if(validateWheelPhysics(wheel).length)throw Error('Invalid wheel configuration');
 if(!(dt>0&&Number.isFinite(dt)))throw Error('Wheel physics requires a positive fixed timestep');
 if(!contact||!Number.isFinite(contact.distance))return {grounded:false,force:{x:0,y:0,z:0},normalForce:0,compression:0,slip:0};
 const normal=norm(contact.normal||{x:0,y:1,z:0});
 // Y is world-up: a wall, an underside or an inverted face cannot support a wheel.
 // A sloped drivable surface still has a positive upward normal.
 if(Math.hypot(normal.x,normal.y,normal.z)<.5||normal.y<=.15)return {grounded:false,force:{x:0,y:0,z:0},normalForce:0,compression:0,slip:0};
 const maxLength=wheel.restLength+wheel.travel;
 const length=clamp(contact.distance-wheel.radius,0,maxLength);
 if(contact.distance>wheel.radius+maxLength)return {grounded:false,force:{x:0,y:0,z:0},normalForce:0,compression:0,slip:0};
 const compression=clamp(wheel.restLength-length,0,wheel.travel);
 const v=state.velocity||{x:0,y:0,z:0},omega=state.angularVelocity||{x:0,y:0,z:0};
 const arm={x:finite(contact.point?.x)-finite(state.centerOfMass?.x),y:finite(contact.point?.y)-finite(state.centerOfMass?.y),z:finite(contact.point?.z)-finite(state.centerOfMass?.z)};
 const pointVelocity=add(v,{x:omega.y*arm.z-omega.z*arm.y,y:omega.z*arm.x-omega.x*arm.z,z:omega.x*arm.y-omega.y*arm.x});
 const normalSpeed=dot(pointVelocity,normal);
 const normalForce=Math.max(0,wheel.spring*compression-wheel.damper*normalSpeed);
 const project=v=>add(v,scale(normal,-dot(v,normal)));
 let forward=norm(project(state.forward||{x:0,y:0,z:-1}));
 if(Math.hypot(forward.x,forward.y,forward.z)<.1)return {grounded:false,force:{x:0,y:0,z:0},normalForce:0,compression:0,slip:0};
 let right=norm({x:forward.y*normal.z-forward.z*normal.y,y:forward.z*normal.x-forward.x*normal.z,z:forward.x*normal.y-forward.y*normal.x});
 const steer=wheel.steering?clamp(inputs.steer,-1,1)*.6:0;
 const steeredForward=add(scale(forward,Math.cos(steer)),scale(right,Math.sin(steer)));
 right=add(scale(right,Math.cos(steer)),scale(forward,-Math.sin(steer)));
 forward=steeredForward;
 const longitudinal=dot(pointVelocity,forward),lateral=dot(pointVelocity,right);
 const throttle=clamp(inputs.throttle,-1,1),brake=clamp(inputs.brake,0,1),handbrake=clamp(inputs.handbrake,0,1);
 const drive=wheel.driven?clamp(driveForce,0,1e7)*throttle:0;
 const stopping=(wheel.braking?brake:0)+handbrake;
 // Brakes oppose *actual* wheel travel. At rest they must not produce thrust
 // in the direction opposite to the driver's throttle command.
 const brakeDirection=Math.abs(longitudinal)>1e-3?Math.sign(longitudinal):0;
 // A brake must not reverse a wheel's velocity in a single fixed step.
 // Limit its impulse to the wheel's effective longitudinal momentum.
 // Existing standalone callers without an effective mass retain the legacy model.
 const requestedBrake=clamp(brakeForce,0,1e7)*clamp(stopping,0,1);
 const maxStoppingForce=Number.isFinite(effectiveMass)&&effectiveMass>0
  ?Math.abs(longitudinal)*effectiveMass/dt:Infinity;
 const brakeApplied=brakeDirection*Math.min(requestedBrake,maxStoppingForce);
 const requestedLong=drive-brakeApplied;
 const rolling=normalForce*wheel.rollingResistance*Math.sign(longitudinal);
 const longitudinalForce=requestedLong-rolling;
 // Cancel sideways contact velocity over the fixed step using a wheel's share
 // of chassis mass, then limit the result by the combined tire friction circle.
 // The old normalForce * .16 damping did not account for dt or chassis mass,
 // allowing persistent sideways drift especially on heavy tracked vehicles.
 // Keep the legacy fallback for callers that do not supply an effective mass.
 const lateralForce=-lateral*(Number.isFinite(effectiveMass)&&effectiveMass>0?effectiveMass/dt:normalForce*.16);
 const cap=normalForce*wheel.grip;
 const magnitude=Math.hypot(longitudinalForce,lateralForce);
 const factor=magnitude>cap&&magnitude>0?cap/magnitude:1;
 const force=add(scale(normal,normalForce),add(scale(forward,longitudinalForce*factor),scale(right,lateralForce*factor)));
 return {grounded:true,force,normalForce,compression,slip:Math.abs(lateral),point:contact.point};
}
