import {solidBody3d,collisionBox3d,segmentBox3d} from './collision-3d.js';
import {solidCollider2d,colliderRect2d} from './physics-2d.js';
// Bounded scene-space FX shared by Canvas 2D and the batched WebGL particle renderer.
const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const fxPresets={energy:{color:'#64e9ff',gravity:0,speed:45},fire:{color:'#ff9b42',gravity:-35,speed:35},electric:{color:'#9acbff',gravity:0,speed:75},smoke:{color:'#a8b6c5',gravity:-15,speed:20},heal:{color:'#75ffc4',gravity:-18,speed:30},portal:{color:'#b995ff',gravity:0,speed:20}};
export const defaultFxEmitter=()=>({enabled:true,preview:false,kind:'energy',color:'#64e9ff',rate:14,scale:1,lifetime:.8,speed:45,gravity:0,endColor:'#ffffff',sizeCurve:[{time:0,value:.4},{time:.2,value:1},{time:1,value:0}],alphaCurve:[{time:0,value:1},{time:1,value:0}],trail:false,collision:false,shape:'burst',direction:0,spread:360,drag:0});
export const fxRuntime={particles:[],rings:[],clock:0,quality:'standard',shake:0,sequence:1};
const limits=()=>({low:280,standard:800,high:1600}[fxRuntime.quality]||800);
export function setFxQuality(value){fxRuntime.quality=['low','standard','high'].includes(value)?value:'standard';if(fxRuntime.particles.length>limits())fxRuntime.particles.splice(0,fxRuntime.particles.length-limits())}
export function resetFxRuntime(){fxRuntime.particles.length=0;fxRuntime.rings.length=0;fxRuntime.clock=0;fxRuntime.shake=0;fxRuntime.sequence=1}
export const fxColor=value=>/^#[0-9a-f]{6}$/i.test(String(value))?value:'#64e9ff';
const random=seed=>{let x=seed|0;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296}};
export function emitFx(kind,position,{color,scale=1,count=18,lifetime=.65,speed,gravity,mode='2d',ring=false,shake=0,endColor,sizeCurve,alphaCurve,trail=false,collision=false,ownerId=null,shape='burst',direction=0,spread=360,drag=0}={}){
 const preset=Object.hasOwn(fxPresets,kind)?fxPresets[kind]:fxPresets.energy,tint=fxColor(color||preset.color),factor=clamp(n(scale,1),.1,12),rng=random(fxRuntime.sequence++*17923),amount=Math.min(Math.max(0,Math.floor(n(count))),limits()-fxRuntime.particles.length);
 for(let i=0;i<amount;i++){const angle=shape==='cone'?(n(direction)-clamp(n(spread,45),0,360)/2+rng()*clamp(n(spread,45),0,360))*Math.PI/180:rng()*Math.PI*2,velocity=Math.max(0,n(speed,preset.speed))*factor*(.35+rng()*.65),life=clamp(n(lifetime,.65),.06,8)*(.6+rng()*.4);fxRuntime.particles.push({x:n(position.x),y:n(position.y),z:n(position.z),vx:Math.cos(angle)*velocity,vy:Math.sin(angle)*velocity,vz:mode==='3d'?(rng()-.3)*velocity:0,gravity:n(gravity,preset.gravity),age:0,life,size:(kind==='smoke'?14:4+rng()*5)*factor,color:tint,endColor:fxColor(endColor||tint),sizeCurve,alphaCurve,trail:trail?[]:null,collision:!!collision,ownerId,drag:clamp(n(drag),0,10),kind,mode})}
 if((ring||kind==='portal')&&fxRuntime.rings.length<64)fxRuntime.rings.push({x:n(position.x),y:n(position.y),z:n(position.z),radius:Math.max(8,n(scale,1)*64),plane:kind==='portal'?'vertical':'ground',color:tint,age:0,life:clamp(n(lifetime,.65),.1,4),mode});
 fxRuntime.shake=Math.max(fxRuntime.shake,clamp(n(shake),0,1));return amount;
}
export function tickFxRuntime(entities,dt,mode='2d'){
 const frame=clamp(n(dt),0,.1);if(!frame)return;fxRuntime.clock+=frame;fxRuntime.shake=Math.max(0,fxRuntime.shake-frame*2.8);
 const solids=entities.filter(o=>mode==='3d'?solidBody3d(o):solidCollider2d(o));
 for(const p of fxRuntime.particles){const previous={x:p.x,y:p.y,z:p.z};p.age+=frame;const drag=Math.exp(-n(p.drag)*frame);p.vx*=drag;p.vy*=drag;p.vz*=drag;p.vz-=p.mode==='3d'?p.gravity*frame:0;p.vy+=p.mode==='2d'?p.gravity*frame:0;p.x+=p.vx*frame;p.y+=p.vy*frame;p.z=Math.max(0,p.z+p.vz*frame);
  if(p.collision&&solids.some(o=>{if(o.id===p.ownerId)return false;const b=p.mode==='3d'?collisionBox3d(o):{...colliderRect2d(o),d:colliderRect2d(o).h,z:-100000,h:200000};return segmentBox3d(previous,{x:p.x,y:p.y,z:p.z},b)!==null}))p.age=p.life;
  if(p.trail){p.trail.push(previous);if(p.trail.length>10)p.trail.shift()}
  const t=clamp(p.age/p.life,0,1);p.renderSize=p.size*sampleFxCurve(p.sizeCurve,t,.65+(1-t)*.6);p.renderAlpha=clamp(sampleFxCurve(p.alphaCurve,t,1-t),0,1);p.renderColor=mixFxColor(p.color,p.endColor||p.color,t);
 }
 fxRuntime.particles=fxRuntime.particles.filter(p=>p.age<p.life);for(const ring of fxRuntime.rings)ring.age+=frame;fxRuntime.rings=fxRuntime.rings.filter(r=>r.age<r.life);
 for(const o of entities){const cfg=o.fxEmitter;if(!cfg?.enabled||o.sequenceEnabled===false||o._sequenceDestroyed||o.simulationNode?.health<=0||o.simulationNode?.kind==='consumer'&&!o.simulationNode.powered)continue;
  o._fxAccumulator=Math.min(8,n(o._fxAccumulator)+clamp(n(cfg.rate,14),0,120)*frame*(fxRuntime.quality==='low'?.5:1));const count=Math.floor(o._fxAccumulator);if(!count)continue;o._fxAccumulator-=count;
  emitFx(cfg.kind,{x:n(o.x)+n(o.w,32)/2,y:n(o.y)+n(mode==='3d'?o.depth3d??o.h:o.h,32)/2,z:mode==='3d'?n(o.elevation3d)*64+n(o.h,32)*.6:0},{...cfg,count,mode,ownerId:o.id});
 }
}
export function drawFx2d(ctx,camera,width,height,entities=[]){
 ctx.save();ctx.translate(camera.x,camera.y);ctx.scale(camera.zoom,camera.zoom);
 for(const p of fxRuntime.particles){if(p.mode!=='2d')continue;const fade=p.renderAlpha??1-p.age/p.life,r=Math.max(.01,p.renderSize??p.size*(.65+fade*.6)),color=p.renderColor||p.color;ctx.globalCompositeOperation=p.kind==='smoke'?'source-over':'lighter';ctx.globalAlpha=fade*.8;
  const glow=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r*2.5);glow.addColorStop(0,color);glow.addColorStop(.25,color+'bb');glow.addColorStop(1,color+'00');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(p.x,p.y,r*2.5,0,Math.PI*2);ctx.fill();
  if(p.trail?.length){ctx.strokeStyle=color;ctx.lineWidth=Math.max(1,r*.4);ctx.beginPath();ctx.moveTo(p.trail[0].x,p.trail[0].y);for(const point of p.trail)ctx.lineTo(point.x,point.y);ctx.lineTo(p.x,p.y);ctx.stroke()}
  if(p.kind==='electric'){ctx.strokeStyle='#e2f8ff';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(p.x-p.vx*.025,p.y-p.vy*.025);ctx.lineTo(p.x,p.y);ctx.stroke()}
 }
 ctx.globalCompositeOperation='lighter';for(const ring of fxRuntime.rings){if(ring.mode!=='2d')continue;const t=ring.age/ring.life;ctx.globalAlpha=(1-t)*.8;ctx.strokeStyle=ring.color;ctx.shadowColor=ring.color;ctx.shadowBlur=12;ctx.lineWidth=2+3*(1-t);ctx.beginPath();ctx.arc(ring.x,ring.y,Math.max(1,ring.radius*t),0,Math.PI*2);ctx.stroke()}
 for(const o of entities){if(!(o.heroState?.shield>0)||o.visible===false)continue;ctx.globalAlpha=.5;ctx.strokeStyle=fxColor(o.superhero?.color);ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=12;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(o.x+o.w/2,o.y+o.h/2,o.w*.72,o.h*.66,0,0,Math.PI*2);ctx.stroke()}
 ctx.restore();
 if(fxRuntime.shake>0){ctx.save();ctx.globalAlpha=fxRuntime.shake*.075;ctx.fillStyle='#b3efff';ctx.fillRect(0,0,width,height);ctx.restore()}
}

export function sampleFxCurve(points,time,fallback=1){
 const sorted=(Array.isArray(points)?points:[]).filter(p=>p&&Number.isFinite(Number(p.time))&&Number.isFinite(Number(p.value))).map(p=>({time:clamp(n(p.time),0,1),value:clamp(n(p.value),0,3)})).sort((a,b)=>a.time-b.time).slice(0,8);if(!sorted.length)return fallback;if(time<=sorted[0].time)return sorted[0].value;if(time>=sorted.at(-1).time)return sorted.at(-1).value;const i=sorted.findIndex(p=>p.time>=time),a=sorted[i-1],b=sorted[i];return a.value+(b.value-a.value)*(time-a.time)/Math.max(.00001,b.time-a.time);
}
export function mixFxColor(a,b,t){const first=fxColor(a),second=fxColor(b);return '#'+[1,3,5].map(i=>Math.round(parseInt(first.slice(i,i+2),16)+(parseInt(second.slice(i,i+2),16)-parseInt(first.slice(i,i+2),16))*t).toString(16).padStart(2,'0')).join('')}
