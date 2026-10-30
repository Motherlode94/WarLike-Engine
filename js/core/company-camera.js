// Ground-plane tactical camera. Position and bounds use scene units.
export function moveCompanyCamera(target,yaw,keys,dt,bounds={minX:0,maxX:3200,minY:0,maxY:1900}){
 const right=Number(keys.has('arrowright')||keys.has('d'))-Number(keys.has('arrowleft')||keys.has('a')||keys.has('q'));
 const forward=Number(keys.has('arrowup')||keys.has('w')||keys.has('z'))-Number(keys.has('arrowdown')||keys.has('s'));
 if(!right&&!forward)return target;
 const length=Math.hypot(right,forward),speed=Number.isFinite(dt)?Math.max(0,Math.min(.1,dt))*20*(keys.has('shift')?1.7:1):0;
 const x=target[0]+(right*Math.cos(yaw)-forward*Math.sin(yaw))/length*speed;
 const z=target[2]+(-right*Math.sin(yaw)-forward*Math.cos(yaw))/length*speed;
 return [Math.max(bounds.minX/64,Math.min(bounds.maxX/64,x)),target[1],Math.max(bounds.minY/64,Math.min(bounds.maxY/64,z))];
}
