// WarLike Studio editor gizmos, drawn in world space. Coordinates independent of zoom.
export const gizmoCenter=entities=>{
 if(!entities.length)return null;
 const points=entities.map(o=>({x:o.x+o.w/2,y:o.y+o.h/2}));
 return {x:points.reduce((s,p)=>s+p.x,0)/points.length,y:points.reduce((s,p)=>s+p.y,0)/points.length};
};
export function hitGizmo2d(point,entities,tool,zoom=1){
 const center=gizmoCenter(entities);if(!center||tool==='hand')return null;
 const s=1/Math.max(.1,zoom),dx=(point.x-center.x)/s,dy=(point.y-center.y)/s;
 if(tool==='move'){
  if(Math.abs(dx)<12&&Math.abs(dy)<12)return 'free';
  if(dx>14&&dx<83&&Math.abs(dy)<11)return 'x';
  if(dy< -14&&dy> -83&&Math.abs(dx)<11)return 'y';
 }else if(tool==='rotate'){
  if(Math.abs(Math.hypot(dx,dy)-56)<11)return 'rotate';
 }else if(tool==='scale'||tool==='rect'){
  if(Math.abs(dx-58)<13&&Math.abs(dy-58)<13)return 'uniform';
 }
 return null;
}
export function drawGizmo2d(ctx,entities,tool,zoom=1){
 const p=gizmoCenter(entities);if(!p||tool==='hand')return;
 const s=1/Math.max(.1,zoom);
 ctx.save();ctx.translate(p.x,p.y);ctx.scale(s,s);
 ctx.lineWidth=3;ctx.lineCap='round';ctx.lineJoin='round';
 if(tool==='move'){
  ctx.strokeStyle='#ef6565';ctx.fillStyle='#ef6565';
  ctx.beginPath();ctx.moveTo(3,0);ctx.lineTo(72,0);ctx.stroke();
  ctx.beginPath();ctx.moveTo(80,0);ctx.lineTo(64,-7);ctx.lineTo(64,7);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#69d978';ctx.fillStyle='#69d978';
  ctx.beginPath();ctx.moveTo(0,-3);ctx.lineTo(0,-72);ctx.stroke();
  ctx.beginPath();ctx.moveTo(0,-80);ctx.lineTo(-7,-64);ctx.lineTo(7,-64);ctx.closePath();ctx.fill();
  ctx.fillStyle='#f5dc77';ctx.fillRect(-6,-6,12,12);
 }else if(tool==='rotate'){
  ctx.strokeStyle='#76aaff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,56,-Math.PI*.8,Math.PI*.7);ctx.stroke();
  ctx.fillStyle='#76aaff';ctx.beginPath();ctx.arc(56,0,5,0,Math.PI*2);ctx.fill();
 }else if(tool==='scale'||tool==='rect'){
  ctx.strokeStyle='#f1cf65';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(58,58);ctx.stroke();
  ctx.fillStyle='#f1cf65';ctx.fillRect(51,51,14,14);
  ctx.fillStyle='#fff';ctx.fillRect(-5,-5,10,10);
 }
 ctx.restore();
}
