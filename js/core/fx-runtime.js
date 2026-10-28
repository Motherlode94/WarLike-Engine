// Bounded scene-space FX shared by Canvas 2D and the batched WebGL particle renderer.
const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const fxPresets={energy:{color:'#64e9ff',gravity:0,speed:45},fire:{color:'#ff9b42',gravity:-35,speed:35},electric:{color:'#9acbff',gravity:0,speed:75},smoke:{color:'#a8b6c5',gravity:-15,speed:20},heal:{color:'#75ffc4',gravity:-18,speed:30},portal:{color:'#b995ff',gravity:0,speed:20}};
export const defaultFxEmitter=()=>({enabled:true,preview:false,kind:'energy',color:'#64e9ff',rate:14,scale:1,lifetime:.8,speed:45,gravity:0});
export const fxRuntime={particles:[],rings:[],clock:0,quality:'standard',shake:0,sequence:1};
const limits=()=>({low:280,standard:800,high:1600}[fxRuntime.quality]||800);
export function setFxQuality(value){fxRuntime.quality=['low','standard','high'].includes(value)?value:'standard';if(fxRuntime.particles.length>limits())fxRuntime.particles.splice(0,fxRuntime.particles.length-limits())}
export function resetFxRuntime(){fxRuntime.particles.length=0;fxRuntime.rings.length=0;fxRuntime.clock=0;fxRuntime.shake=0;fxRuntime.sequence=1}
export const fxColor=value=>/^#[0-9a-f]{6}$/i.test(String(value))?value:'#64e9ff';
const random=seed=>{let x=seed|0;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296}};
export function emitFx(kind,position,{color,scale=1,count=18,lifetime=.65,speed,gravity,mode='2d',ring=false,shake=0}={}){
 const preset=Object.hasOwn(fxPresets,kind)?fxPresets[kind]:fxPresets.energy,tint=fxColor(color||preset.color),factor=clamp(n(scale,1),.1,12),rng=random(fxRuntime.sequence++*17923),amount=Math.min(Math.max(0,Math.floor(n(count))),limits()-fxRuntime.particles.length);
 for(let i=0;i<amount;i++){const angle=rng()*Math.PI*2,velocity=Math.max(0,n(speed,preset.speed))*factor*(.35+rng()*.65),life=clamp(n(lifetime,.65),.06,8)*(.6+rng()*.4);fxRuntime.particles.push({x:n(position.x),y:n(position.y),z:n(position.z),vx:Math.cos(angle)*velocity,vy:Math.sin(angle)*velocity,vz:mode==='3d'?(rng()-.3)*velocity:0,gravity:n(gravity,preset.gravity),age:0,life,size:(kind==='smoke'?14:4+rng()*5)*factor,color:tint,kind,mode})}
 if((ring||kind==='portal')&&fxRuntime.rings.length<64)fxRuntime.rings.push({x:n(position.x),y:n(position.y),z:n(position.z),radius:Math.max(8,n(scale,1)*64),plane:kind==='portal'?'vertical':'ground',color:tint,age:0,life:clamp(n(lifetime,.65),.1,4),mode});
 fxRuntime.shake=Math.max(fxRuntime.shake,clamp(n(shake),0,1));return amount;
}
export function tickFxRuntime(entities,dt,mode='2d'){
 const frame=clamp(n(dt),0,.1);if(!frame)return;fxRuntime.clock+=frame;fxRuntime.shake=Math.max(0,fxRuntime.shake-frame*2.8);
 for(const p of fxRuntime.particles){p.age+=frame;p.vz-=mode==='3d'?p.gravity*frame:0;p.vy+=mode==='2d'?p.gravity*frame:0;p.x+=p.vx*frame;p.y+=p.vy*frame;p.z=Math.max(0,p.z+p.vz*frame)}
 fxRuntime.particles=fxRuntime.particles.filter(p=>p.age<p.life);for(const ring of fxRuntime.rings)ring.age+=frame;fxRuntime.rings=fxRuntime.rings.filter(r=>r.age<r.life);
 for(const o of entities){const cfg=o.fxEmitter;if(!cfg?.enabled||o.sequenceEnabled===false||o._sequenceDestroyed||o.simulationNode?.health<=0||o.simulationNode?.kind==='consumer'&&!o.simulationNode.powered)continue;
  o._fxAccumulator=Math.min(8,n(o._fxAccumulator)+clamp(n(cfg.rate,14),0,120)*frame*(fxRuntime.quality==='low'?.5:1));const count=Math.floor(o._fxAccumulator);if(!count)continue;o._fxAccumulator-=count;
  emitFx(cfg.kind,{x:n(o.x)+n(o.w,32)/2,y:n(o.y)+n(mode==='3d'?o.depth3d??o.h:o.h,32)/2,z:mode==='3d'?n(o.elevation3d)*64+n(o.h,32)*.6:0},{...cfg,count,mode});
 }
}
export function drawFx2d(ctx,camera,width,height,entities=[]){
 ctx.save();ctx.translate(camera.x,camera.y);ctx.scale(camera.zoom,camera.zoom);
 for(const p of fxRuntime.particles){if(p.mode!=='2d')continue;const fade=1-p.age/p.life,r=p.size*(.65+fade*.6);ctx.globalCompositeOperation=p.kind==='smoke'?'source-over':'lighter';ctx.globalAlpha=fade*.8;
  const glow=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r*2.5);glow.addColorStop(0,p.color);glow.addColorStop(.25,p.color+'bb');glow.addColorStop(1,p.color+'00');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(p.x,p.y,r*2.5,0,Math.PI*2);ctx.fill();
  if(p.kind==='electric'){ctx.strokeStyle='#e2f8ff';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(p.x-p.vx*.025,p.y-p.vy*.025);ctx.lineTo(p.x,p.y);ctx.stroke()}
 }
 ctx.globalCompositeOperation='lighter';for(const ring of fxRuntime.rings){if(ring.mode!=='2d')continue;const t=ring.age/ring.life;ctx.globalAlpha=(1-t)*.8;ctx.strokeStyle=ring.color;ctx.shadowColor=ring.color;ctx.shadowBlur=12;ctx.lineWidth=2+3*(1-t);ctx.beginPath();ctx.arc(ring.x,ring.y,Math.max(1,ring.radius*t),0,Math.PI*2);ctx.stroke()}
 for(const o of entities){if(!(o.heroState?.shield>0)||o.visible===false)continue;ctx.globalAlpha=.5;ctx.strokeStyle=fxColor(o.superhero?.color);ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=12;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(o.x+o.w/2,o.y+o.h/2,o.w*.72,o.h*.66,0,0,Math.PI*2);ctx.stroke()}
 ctx.restore();
 if(fxRuntime.shake>0){ctx.save();ctx.globalAlpha=fxRuntime.shake*.075;ctx.fillStyle='#b3efff';ctx.fillRect(0,0,width,height);ctx.restore()}
}
