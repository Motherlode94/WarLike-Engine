// Frame-rate independent arcade driving shared by 2D and 3D controllers.
// Speed is in WarLike scene units/sec. Rotation 0 faces negative ground Y/Z.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const towards=(value,target,maxDelta)=>value<target?Math.min(target,value+maxDelta):Math.max(target,value-maxDelta);
export function defaultArcadeTuning(source={}){
 const number=(key,fallback)=>Number.isFinite(Number(source[key]))&&Number(source[key])>0?Number(source[key]):fallback;
 return {maxSpeed:number('maxSpeed',300),acceleration:number('acceleration',190),
  brakeForce:number('brakeForce',330),turnRate:number('turnRate',135),
  drag:number('drag',1.35),reverseRatio:clamp(number('reverseRatio',.45),.15,.8)};
}
export function stepArcadeVehicle(current,controls,dt,tuning={}){
 const cfg=defaultArcadeTuning(tuning),step=clamp(Number(dt)||0,0,.1);
 const throttle=clamp(Number(controls.throttle)||0,-1,1),turn=clamp(Number(controls.steer)||0,-1,1);
 const handbrake=!!controls.handbrake;
 const speed0=Number.isFinite(current.speed)?current.speed:0,steer0=Number.isFinite(current.steer)?current.steer:0;
 let speed=speed0;
 if(throttle){
  const braking=speed0*throttle<-.5;
  speed+=throttle*(braking?cfg.brakeForce:cfg.acceleration)*step;
  if(braking&&Math.sign(speed)!==Math.sign(speed0))speed=0;
 }else{
  const resistance=12+Math.abs(speed)*cfg.drag;
  speed=towards(speed,0,resistance*step);
 }
 if(handbrake)speed=towards(speed,0,(cfg.brakeForce*.85+Math.abs(speed)*1.8)*step);
 speed=clamp(speed,-cfg.maxSpeed*cfg.reverseRatio,cfg.maxSpeed);
 if(Math.abs(speed)<.15&&throttle===0)speed=0;
 const steeringResponse=Number.isFinite(Number(tuning.steeringResponse))?clamp(Number(tuning.steeringResponse),1,16):5;
 const steer=towards(steer0,turn,step*(handbrake?steeringResponse*1.5:steeringResponse));
 const pace=Math.abs(speed)/cfg.maxSpeed;
 const lowSpeedFactor=clamp(Math.abs(speed)/50,0,1);
 const grip=Number.isFinite(Number(tuning.traction))?clamp(Number(tuning.traction),.4,2):1;
 const turnFactor=lowSpeedFactor*(1-.50*pace)*(handbrake?1.55:1)*grip;
 const rotation=(Number(current.rotation)||0)+steer*cfg.turnRate*turnFactor*Math.sign(speed||1)*step;
 const radians=rotation*Math.PI/180;
 return {speed,steer,rotation,dx:Math.sin(radians)*speed*step,dy:-Math.cos(radians)*speed*step,
  brakeLight:handbrake||(throttle*speed<0),handbrake};
}
export function moveVehicleWithCollision(vehicle,delta,blocked,{maxStep=10}={}){
 const steps=Math.max(1,Math.ceil(Math.hypot(delta.dx,delta.dy)/Math.max(1,maxStep)));
 let collision=false,travel=0;
 for(let i=0;i<steps;i++){
  const x=vehicle.x+delta.dx/steps,y=vehicle.y+delta.dy/steps;
  // Separating axes permits sliding against walls instead of stopping completely.
  if(!blocked(x,vehicle.y)){vehicle.x=x;travel++}else collision=true;
  if(!blocked(vehicle.x,y)){vehicle.y=y;travel++}else collision=true;
  if(collision)break;
 }
 return {collision,moved:travel>0};
}
