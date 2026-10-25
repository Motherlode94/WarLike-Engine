// Shared optional survival-horror state for both original WarLike workspaces.
export const horror={enabled:false,flashlight:true,battery:100,fear:0,threat:0,toggleHeld:false};
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
export function resetHorror(){Object.assign(horror,{enabled:false,flashlight:true,battery:100,fear:0,threat:0,toggleHeld:false})}
export function updateHorror(dt,player,entities,keys=new Set()){
 if(!horror.enabled||!player)return horror;
 dt=clamp(Number.isFinite(dt)?dt:0,0,.1);
 const toggle=keys.has('l');if(toggle&&!horror.toggleHeld&&horror.battery>0)horror.flashlight=!horror.flashlight;
 horror.toggleHeld=toggle;
 if(horror.flashlight){horror.battery=clamp(horror.battery-dt*1.8,0,100);if(horror.battery<=0)horror.flashlight=false}
 else horror.battery=clamp(horror.battery+dt*.35,0,100);
 const cx=Number(player.x||0)+Number(player.w||0)/2,cy=Number(player.y||0)+Number(player.h||0)/2;
 let threat=0;
 for(const o of entities||[]){
  if(!o||o===player||!['chase','guard','patrol'].includes(o.behavior))continue;
  const dist=Math.hypot(Number(o.x||0)+Number(o.w||0)/2-cx,Number(o.y||0)+Number(o.h||0)/2-cy);
  threat=Math.max(threat,clamp(1-dist/330,0,1));
 }
 horror.threat=threat;
 horror.fear=clamp(horror.fear+dt*(threat*16-(horror.flashlight?3:0)-(!threat?5:0)),0,100);
 return horror;
}
export function drawHorrorHud(ctx,w,h,player,camera){
 if(!horror.enabled||!player)return;
 ctx.save();ctx.fillStyle='#100d18dc';ctx.fillRect(14,15,182,68);
 ctx.font='bold 12px system-ui';ctx.fillStyle='#e7dfce';ctx.fillText('SURVIVAL HORROR · L : lampe',22,32);
 for(const [label,value,y,color] of [['BATTERIE',horror.battery,42,'#d1b65c'],['PEUR',horror.fear,63,'#ae6074']]){
  ctx.fillStyle='#b4afac';ctx.font='10px system-ui';ctx.fillText(label,22,y+5);
  ctx.fillStyle='#34303b';ctx.fillRect(82,y-3,100,9);
  ctx.fillStyle=color;ctx.fillRect(82,y-3,value,9);
 }
 if(horror.flashlight&&horror.battery>0&&camera){
  const x=(Number(player.x||0)+Number(player.w||0)/2)*camera.zoom+camera.x;
  const y=(Number(player.y||0)+Number(player.h||0)/2)*camera.zoom+camera.y;
  const light=ctx.createRadialGradient(x,y,8,x,y,180*camera.zoom);
  light.addColorStop(0,'rgba(255,244,194,.19)');light.addColorStop(1,'rgba(255,244,194,0)');
  ctx.fillStyle=light;ctx.fillRect(0,0,w,h);
 }
 ctx.restore();
}
