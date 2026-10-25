// WarLike rendering controls shared by the existing 2D/3D workspaces.
const KEY='warlike.render.quality.v1';
const defaults={lighting2d:true,ambient2d:.72,lightRadius2d:210,shadows2d:true,exposure3d:1.15,fog3d:.01};
const clamp=(v,a,b,d)=>Number.isFinite(Number(v))?Math.min(b,Math.max(a,Number(v))):d;
export const renderQuality={...defaults};
export const horrorProfile={ambient2d:.24,lightRadius2d:125,exposure3d:.68,fog3d:.035};
export function applyHorrorAtmosphere(){return setRenderQuality(horrorProfile)}
export function setRenderQuality(next){
 if('lighting2d'in next)renderQuality.lighting2d=!!next.lighting2d;
 if('shadows2d'in next)renderQuality.shadows2d=!!next.shadows2d;
 if('ambient2d'in next)renderQuality.ambient2d=clamp(next.ambient2d,.15,1,.72);
 if('lightRadius2d'in next)renderQuality.lightRadius2d=clamp(next.lightRadius2d,60,600,210);
 if('exposure3d'in next)renderQuality.exposure3d=clamp(next.exposure3d,.4,2.5,1.15);
 if('fog3d'in next)renderQuality.fog3d=clamp(next.fog3d,0,.045,.01);
 return renderQuality;
}
export function loadRenderQuality(storage=globalThis.localStorage){
 try{setRenderQuality(JSON.parse(storage?.getItem(KEY)||'{}'))}catch{}return renderQuality;
}
export function saveRenderQuality(storage=globalThis.localStorage){try{storage?.setItem(KEY,JSON.stringify(renderQuality));return true}catch{return false}}
export function drawLighting2d(ctx,entities,camera,width,height){
 if(!renderQuality.lighting2d)return;
 ctx.save();
 ctx.fillStyle='rgba(7,12,23,'+((1-renderQuality.ambient2d)*.76).toFixed(3)+')';ctx.fillRect(0,0,width,height);
 ctx.globalCompositeOperation='screen';
 for(const o of entities){
  if(!o||o.lightEnabled===false||!['point','spot'].includes(o.lightType))continue;
  const intensity=clamp(o.lightIntensity,0,10,1),radius=clamp(o.lightRange,1,120,10)*renderQuality.lightRadius2d/10;
  const x=(Number(o.x||0)+Number(o.w||0)/2)*camera.zoom+camera.x;
  const y=(Number(o.y||0)+Number(o.h||0)/2)*camera.zoom+camera.y;
  const r=radius*camera.zoom;if(r<=0||x+r<0||y+r<0||x-r>width||y-r>height)continue;
  const color=/^#[0-9a-f]{6}$/i.test(o.lightColor)?o.lightColor:'#fff0c9';
  const cr=parseInt(color.slice(1,3),16),cg=parseInt(color.slice(3,5),16),cb=parseInt(color.slice(5,7),16);
  const gradient=ctx.createRadialGradient(x,y,0,x,y,r);
  gradient.addColorStop(0,'rgba('+cr+','+cg+','+cb+','+Math.min(.55,intensity*.13)+')');
  gradient.addColorStop(.5,'rgba('+cr+','+cg+','+cb+','+Math.min(.17,intensity*.035)+')');
  gradient.addColorStop(1,'rgba('+cr+','+cg+','+cb+',0)');
  ctx.fillStyle=gradient;ctx.fillRect(x-r,y-r,2*r,2*r);
 }
 ctx.restore();
}
