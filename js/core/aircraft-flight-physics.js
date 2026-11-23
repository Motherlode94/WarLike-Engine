// WarLike aircraft dynamics foundation: SI units (m, kg, s, N, Nm), right-handed y-up.
// Pure math. Does not write scene transforms or bypass collision / Rapier.
// Pass actual world-space basis vectors and rigidbody velocity from the physics backend.
const EPS=1e-8;
const zero=()=>({x:0,y:0,z:0});
const finite=(n,d=0)=>typeof n==='number'&&Number.isFinite(n)?n:d;
const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
const scale=(v,s)=>({x:v.x*s,y:v.y*s,z:v.z*s});
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
const length=v=>Math.hypot(v.x,v.y,v.z);
const unit=v=>{const m=length(v);return m>EPS?scale(v,1/m):zero()};
const clamp=(v,min,max)=>Math.min(max,Math.max(min,finite(v)));
const vec=(v,d)=>({x:finite(v?.x,d.x),y:finite(v?.y,d.y),z:finite(v?.z,d.z)});
const worldUp={x:0,y:1,z:0};

export const defaultAirplanePhysics=()=>({
 kind:'airplane',mass:1800,wingArea:16,airDensity:1.225,
 liftSlope:4.5,liftOffset:0.15,maxLiftCoefficient:1.5,stallAngleDeg:17,
 baseDragCoefficient:.035,inducedDragFactor:.065,sideForceCoefficient:.2,
 maxThrust:17000,controlTorque:3200,angularDamping:500
});
export const defaultHelicopterPhysics=()=>({
 kind:'helicopter',mass:2200,rotorArea:38,airDensity:1.225,
 maxThrust:42000,collectiveHover:.52,cyclicTiltDeg:14,
 maxForwardForce:3200,dragCoefficient:.7,referenceArea:7,
 controlTorque:2400,angularDamping:650
});
export function validateAircraftConfig(c){
 if(!c||typeof c!=='object'||!['airplane','helicopter'].includes(c.kind))return ['Aircraft: type invalide'];
 const errors=[];
 for(const key of ['mass','airDensity','maxThrust','controlTorque','angularDamping']){
  if(!Number.isFinite(c[key])||(key==='angularDamping'?c[key]<0:c[key]<=0))errors.push('Aircraft: '+key+' invalide');
 }
 const extra=c.kind==='airplane'
  ?['wingArea','liftSlope','liftOffset','maxLiftCoefficient','stallAngleDeg','baseDragCoefficient','inducedDragFactor','sideForceCoefficient']
  :['rotorArea','collectiveHover','cyclicTiltDeg','maxForwardForce','dragCoefficient','referenceArea'];
 for(const key of extra)if(!Number.isFinite(c[key]))errors.push('Aircraft: '+key+' invalide');
 if(c.kind==='airplane'&&(c.wingArea<=0||c.liftSlope<=0||c.maxLiftCoefficient<=0||c.stallAngleDeg<=0||c.stallAngleDeg>=90||c.baseDragCoefficient<0||c.inducedDragFactor<0||c.sideForceCoefficient<0))errors.push('Aircraft: aérodynamique invalide');
 if(c.kind==='helicopter'&&(c.rotorArea<=0||c.collectiveHover<0||c.collectiveHover>1||c.cyclicTiltDeg<0||c.cyclicTiltDeg>45||c.maxForwardForce<0||c.dragCoefficient<0||c.referenceArea<=0))errors.push('Aircraft: rotor invalide');
 return errors;
}
/**
 * Aircraft controls: throttle [0,1] (airplane engine), collective [0,1] (helicopter),
 * pitch/roll/yaw [-1,1]. World basis must be orthonormal: forward, up, right.
 * Returns forces/torques for a physics Rigidbody (excluding gravity by default).
 */
export function solveAircraftForces({config,velocity={x:0,y:0,z:0},wind={x:0,y:0,z:0},
 forward={x:0,y:0,z:-1},up=worldUp,right={x:1,y:0,z:0},
 angularVelocity=zero(),controls={},gravity=9.81,includeGravity=false}){
 const errors=validateAircraftConfig(config);if(errors.length)throw Error(errors.join('; '));
 const basis={forward:unit(vec(forward,{x:0,y:0,z:-1})),up:unit(vec(up,worldUp)),right:unit(vec(right,{x:1,y:0,z:0}))};
 if(length(basis.forward)<.9||length(basis.up)<.9||length(basis.right)<.9||
    Math.abs(dot(basis.forward,basis.up))>.01||Math.abs(dot(basis.forward,basis.right))>.01||Math.abs(dot(basis.up,basis.right))>.01)throw Error('Aircraft: repère local orthonormal requis');
 const v=vec(velocity,zero()),air=add(v,scale(vec(wind,zero()),-1));
 const speed=length(air),q=.5*config.airDensity*speed*speed;
 const throttle=clamp(controls.throttle,0,1),collective=clamp(controls.collective,0,1);
 const pitch=clamp(controls.pitch,-1,1),roll=clamp(controls.roll,-1,1),yaw=clamp(controls.yaw,-1,1);
 const omega=vec(angularVelocity,zero());
 let aeroForce=zero(),thrustForce=zero(),lift=0,drag=0,stalled=false,alpha=0;
 if(config.kind==='airplane'){
  const forwardSpeed=dot(air,basis.forward),verticalSpeed=dot(air,basis.up),lateralSpeed=dot(air,basis.right);
  alpha=Math.atan2(-verticalSpeed,forwardSpeed);
  const stallRad=config.stallAngleDeg*Math.PI/180;
  const rawCl=config.liftOffset+config.liftSlope*alpha;
  // Bounded nonlinear post-stall lift without discontinuity at the stall angle.
  const stallFactor=Math.abs(alpha)>stallRad?Math.max(.10,stallRad/Math.abs(alpha)):.999999999999;
  const cl=clamp(rawCl*stallFactor,-config.maxLiftCoefficient,config.maxLiftCoefficient);
  stalled=Math.abs(alpha)>stallRad || forwardSpeed<=0;
  const cd=config.baseDragCoefficient+config.inducedDragFactor*cl*cl+(stalled?.28:0);
  const liftDirection=unit(add(basis.up,scale(basis.forward,-Math.sin(alpha))));
  lift=q*config.wingArea*cl;
  drag=q*config.wingArea*cd;
  const sideForce=scale(basis.right,-q*config.wingArea*config.sideForceCoefficient*(speed>EPS?lateralSpeed/speed:0));
  aeroForce=add(add(scale(liftDirection,lift),scale(unit(air),-drag)),sideForce);
  thrustForce=scale(basis.forward,config.maxThrust*throttle);
 }else{
  // Rotor thrust is oriented by cyclic inputs, in body coordinates. Airframe drag
  // opposes relative wind; hover requires collective sufficient for mg.
  const tilt=config.cyclicTiltDeg*Math.PI/180;
  const rotorDirection=unit(add(basis.up,add(scale(basis.forward,pitch*Math.tan(tilt)),scale(basis.right,roll*Math.tan(tilt)))));
  thrustForce=scale(rotorDirection,config.maxThrust*collective);
  aeroForce=add(scale(air,-q*config.dragCoefficient*config.referenceArea/(speed||1)),
   scale(basis.forward,config.maxForwardForce*throttle));
  lift=dot(thrustForce,basis.up);
  drag=q*config.dragCoefficient*config.referenceArea;
 }
 const authority=config.controlTorque;
 const torque=add(add(scale(basis.right,pitch*authority),scale(basis.forward,roll*authority)),scale(basis.up,yaw*authority));
 const damping=scale(omega,-config.angularDamping);
 const gravityForce=includeGravity?{x:0,y:-config.mass*clamp(gravity,0,100),z:0}:zero();
 return {
  force:add(add(aeroForce,thrustForce),gravityForce),
  torque:add(torque,damping),
  lift,drag,airSpeed:speed,angleOfAttackDeg:alpha*180/Math.PI,stalled,
  thrust:config.kind==='airplane'?config.maxThrust*throttle:config.maxThrust*collective,
  gravityIncluded:Boolean(includeGravity)
 };
}
