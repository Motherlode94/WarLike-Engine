// Shared WarLike stylized water: editor-safe visual water, not fluid physics.
export const waterDefaults=Object.freeze({enabled:true,style:'lagoon',color:'#238fbb',deepColor:'#114e87',foamColor:'#d9faff',opacity:.8,amplitude:.15,frequency:1.3,speed:1,foam:.65,segments:24});
export const waterSettings=(input={})=>{
 const o={...waterDefaults,...(input&&typeof input==='object'?input:{})};
 for(const [key,min,max] of [['opacity',.05,1],['amplitude',0,2],['frequency',.1,8],['speed',0,8],['foam',0,1],['segments',4,80]]){const n=Number(o[key]);o[key]=Number.isFinite(n)?Math.max(min,Math.min(max,n)):waterDefaults[key]}
 o.segments=Math.round(o.segments);
 for(const key of ['color','deepColor','foamColor'])if(!/^#[\da-f]{6}$/i.test(o[key]))o[key]=waterDefaults[key];
 o.style=['lagoon','ocean','river','magic'].includes(o.style)?o.style:'lagoon';
 o.enabled=o.enabled!==false;return o;
};
export const waterColor=(hex,alpha=1)=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).concat(alpha);
export function waterHeight(x,z,time,config={}){
 const w=waterSettings(config),t=time*w.speed;
 return w.amplitude*(.56*Math.sin(x*w.frequency+t+z*.23)+.29*Math.sin(z*w.frequency*.9-t*.74+x*.38)+.15*Math.sin((x+z)*w.frequency*1.7+t*1.4));
}
export function waterSurface3d(width,depth,time,config={}){
 const w=waterSettings(config),nx=w.segments,nz=Math.max(4,Math.min(80,Math.round(nx*depth/Math.max(.1,width))));
 const result=[],point=(x,z)=>[x,waterHeight(x,z,time,w),z],triangle=(a,b,c)=>{
  const u=b.map((v,i)=>v-a[i]),v=c.map((v,i)=>v-a[i]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
  const size=Math.hypot(...n)||1;const normal=n.map(v=>(n[1]<0?-v:v)/size);
  for(const p of [a,b,c])result.push(...p,...normal);
 };
 for(let z=0;z<nz;z++)for(let x=0;x<nx;x++){
  const a=point(width*(x/nx-.5),depth*(z/nz-.5)),b=point(width*((x+1)/nx-.5),depth*(z/nz-.5));
  const c=point(width*((x+1)/nx-.5),depth*((z+1)/nz-.5)),d=point(width*(x/nx-.5),depth*((z+1)/nz-.5));
  triangle(a,c,b);triangle(a,d,c);
 }
 return new Float32Array(result);
}
export function drawWater2d(ctx,o,time){
 const w=waterSettings(o.water2d);if(!w.enabled)return;
 const [x,y,width,height]=[o.x,o.y,Math.max(1,o.w),Math.max(1,o.h)],count=Math.max(12,Math.min(150,Math.ceil(width/8)));
 const surface=px=>y+height*.14+waterHeight((px-x)/40,0,time,w)*Math.min(36,height*.22);
 ctx.save();ctx.globalAlpha*=w.opacity;
 const gradient=ctx.createLinearGradient(x,y,x,y+height);gradient.addColorStop(0,w.color);gradient.addColorStop(.55,w.color);gradient.addColorStop(1,w.deepColor);
 ctx.beginPath();ctx.moveTo(x,surface(x));
 for(let i=1;i<=count;i++){const px=x+width*i/count;ctx.lineTo(px,surface(px))}
 ctx.lineTo(x+width,y+height);ctx.lineTo(x,y+height);ctx.closePath();ctx.fillStyle=gradient;ctx.fill();
 if(w.foam>0){
  ctx.strokeStyle=w.foamColor;ctx.globalAlpha*=w.foam*.8;ctx.lineWidth=Math.max(1,Math.min(4,height*.03));
  ctx.beginPath();for(let i=0;i<=count;i++){const px=x+width*i/count;if(!i)ctx.moveTo(px,surface(px));else ctx.lineTo(px,surface(px))}ctx.stroke();
  for(let row=0;row<3;row++){ctx.beginPath();const yy=y+height*(.33+row*.2);
   for(let i=0;i<=count;i++){const px=x+width*i/count,py=yy+Math.sin((px-x)*.045*w.frequency+time*w.speed+row)*Math.min(6,height*.04);if(!i)ctx.moveTo(px,py);else ctx.lineTo(px,py)}
   ctx.lineWidth=Math.max(1,height*.012);ctx.stroke();
  }
 }
 ctx.restore();
}
