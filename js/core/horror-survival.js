// Shared optional survival-horror state for both original WarLike workspaces.
export const horror={enabled:false,flashlight:true,battery:100,fear:0,threat:0,toggleHeld:false,noise:0,alerts:[],jumpscare:0};
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
export function resetHorror(){Object.assign(horror,{enabled:false,flashlight:true,battery:100,fear:0,threat:0,toggleHeld:false,noise:0,alerts:[],jumpscare:0})}
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
// Lightweight hearing/vision and search memory, shared between 2D and 3D.
export function updateHorrorPerception(dt,player,entities,keys=new Set()){
 if(!horror.enabled||!player)return;
 dt=clamp(Number.isFinite(dt)?dt:0,0,.1);
 const running=keys.has('shift'),crouched=keys.has('control')||keys.has('c');
 horror.noise=crouched?.08:running?1:.38;
 const px=Number(player.x||0),py=Number(player.y||0);
 for(const enemy of entities||[]){
  if(!enemy||enemy===player||!['chase','guard','patrol','search'].includes(enemy.behavior))continue;
  const dx=px-Number(enemy.x||0),dy=py-Number(enemy.y||0),distance=Math.hypot(dx,dy);
  const vision=crouched?125:230,hearing=70+220*horror.noise;
  const spotted=distance<vision,heard=distance<hearing&&horror.noise>.25;
  const ai=enemy.horrorAI??={awareness:0,searchTimer:0,lastKnown:null};
  if(spotted||heard){ai.awareness=clamp(ai.awareness+dt*(spotted?1.1:.55),0,1);ai.lastKnown={x:px,y:py};ai.searchTimer=5}
  else{ai.awareness=clamp(ai.awareness-dt*.18,0,1);ai.searchTimer=Math.max(0,ai.searchTimer-dt)}
  ai.state=ai.awareness>.65?'chase':ai.searchTimer>0?'search':'patrol';
  if(ai.state==='chase'||ai.state==='search'){
   const target=ai.state==='chase'?{x:px,y:py}:ai.lastKnown;
   if(target&&distance>25){const dx2=target.x-Number(enemy.x||0),dy2=target.y-Number(enemy.y||0),len=Math.hypot(dx2,dy2)||1,speed=ai.state==='chase'?75:33;
    enemy.x+=dx2/len*speed*dt;enemy.y+=dy2/len*speed*dt;
   }
  }
 }
}
export function playHorrorSting(){
 try{
  const AudioContextClass=globalThis.AudioContext||globalThis.webkitAudioContext;
  if(!AudioContextClass)return false;
  const audio=new AudioContextClass(),osc=audio.createOscillator(),gain=audio.createGain(),now=audio.currentTime;
  osc.type='sawtooth';osc.frequency.setValueAtTime(130,now);osc.frequency.exponentialRampToValueAtTime(45,now+.4);
  gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.1,now+.025);gain.gain.exponentialRampToValueAtTime(.0001,now+.45);
  osc.connect(gain);gain.connect(audio.destination);osc.start(now);osc.stop(now+.46);
  osc.onended=()=>audio.close();
  return true;
 }catch{return false}
}
export function triggerHorrorJumpscare(message='DANGER !'){
 horror.jumpscare=1.1;playHorrorSting();horror.alerts.push(String(message).slice(0,100));if(horror.alerts.length>5)horror.alerts.shift();
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
 if(horror.jumpscare>0){ctx.fillStyle='rgba(139,14,35,'+Math.min(.32,horror.jumpscare*.24)+')';ctx.fillRect(0,0,w,h)}
 ctx.restore();
}
