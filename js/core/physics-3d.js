// WarLike 3D lightweight rigidbody simulation on the horizontal x/y plane plus elevation.
// Intended for prototyping, not a substitute for an industrial physics engine.
const finite=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
export const defaultRigidbody3d=()=>({enabled:true,kinematic:false,mass:1,gravity:15,restitution:.2,friction:.82,vx:0,vz:0,vy:0});
export const bounds3d=o=>({x:finite(o.x),z:finite(o.y),y:finite(o.elevation3d),w:Math.max(1,finite(o.w,32)),d:Math.max(1,finite(o.depth3d,o.h||32)),h:Math.max(1,finite(o.h,32))});
export const overlap3d=(a,b)=>{
 const A=bounds3d(a),B=bounds3d(b);
 return A.x<B.x+B.w&&A.x+A.w>B.x&&A.z<B.z+B.d&&A.z+A.d>B.z&&A.y<B.y+B.h/64&&A.y+A.h/64>B.y;
};
export function stepPhysics3d(entities,dt){
 const t=Math.min(.05,Math.max(0,finite(dt)));
 for(const o of entities){
  const rb=o.rigidbody3d;
  if(!rb?.enabled||rb.kinematic||o.playable3d||o.type==='player'||o.ai?.enabled)continue;
  const mass=Math.max(.01,finite(rb.mass,1));
  const previous={x:o.x,y:o.y,elevation3d:o.elevation3d};
  rb.vy=finite(rb.vy)-Math.max(0,finite(rb.gravity,15))*t;
  rb.vx=finite(rb.vx);rb.vz=finite(rb.vz);
  o.x=finite(o.x)+rb.vx*t;o.y=finite(o.y)+rb.vz*t;
  const solid=other=>other!==o&&other.collision3d!==false&&(other.solid3d===true||other.type==='object'||other.type==='mesh3d');
  if(entities.some(other=>solid(other)&&overlap3d(o,other))){
   o.x=previous.x;o.y=previous.y;rb.vx=-rb.vx*Math.min(1,Math.max(0,finite(rb.restitution,.2)));rb.vz=-rb.vz*Math.min(1,Math.max(0,finite(rb.restitution,.2)));
  }
  o.elevation3d=Math.max(0,finite(o.elevation3d)+rb.vy*t);
  if(o.elevation3d===0){rb.vy=Math.abs(rb.vy)>1?-rb.vy*Math.min(1,Math.max(0,finite(rb.restitution,.2))):0;const drag=Math.pow(Math.min(1,Math.max(0,finite(rb.friction,.82))),t*60);rb.vx*=drag;rb.vz*=drag}
  void mass;
 }
}
export function applyImpulse3d(o,x,y,z){
 const rb=o?.rigidbody3d;if(!rb?.enabled||rb.kinematic)return false;
 const mass=Math.max(.01,finite(rb.mass,1));
 rb.vx=finite(rb.vx)+finite(x)/mass;rb.vy=finite(rb.vy)+finite(y)/mass;rb.vz=finite(rb.vz)+finite(z)/mass;return true;
}
