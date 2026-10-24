import {getModelGeometry} from '../assets/real-models-3d.js';
// Thumbnail is rendered from the real mesh triangles, not a generic prefab symbol.
// Simple software raster preview (no additional WebGL contexts).
const thumbCache=new Map();
export async function realModelThumbnail(id){
 if(thumbCache.has(id))return thumbCache.get(id);
 const task=(async()=>{
  const model=await getModelGeometry(id);
  const size=120,canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas 2D unavailable');
  ctx.fillStyle='#1a2e3f';ctx.fillRect(0,0,size,size);
  const triangles=[];
  for(const part of model.parts){
   const a=part.vertices,col=part.color||[.8,.8,.85,1];
   // Limit work for detailed meshes; the displayed preview is intentionally approximate.
   const stride=Math.max(1,Math.ceil(a.length/18/18000));
   for(let index=0;index+17<a.length;index+=18*stride){
    const poly=[];
    for(let j=0;j<3;j++){
     const off=index+j*6,x=a[off],y=a[off+1],z=a[off+2];
     const rx=.78*x+.62*z,rz=-.62*x+.78*z;
     const ry=.91*y-.41*rz,depth=.41*y+.91*rz;
     poly.push({x:size/2+rx*76,y:size/2-ry*76,depth});
    }
    const ex=poly[1].x-poly[0].x,ey=poly[1].y-poly[0].y,fx=poly[2].x-poly[0].x,fy=poly[2].y-poly[0].y;
    if(Math.abs(ex*fy-ey*fx)<.005)continue;
    const brightness=Math.max(.48,Math.min(1, .75 + (ex*fy-ey*fx)*.0006));
    const rgb=col.slice(0,3).map(n=>Math.round(Math.max(0,Math.min(1,n*brightness))*255));
    triangles.push({poly,depth:poly.reduce((n,p)=>n+p.depth,0)/3,color:'rgb('+rgb.join(',')+')'});
   }
  }
  triangles.sort((a,b)=>a.depth-b.depth);
  for(const t of triangles){ctx.beginPath();ctx.moveTo(t.poly[0].x,t.poly[0].y);ctx.lineTo(t.poly[1].x,t.poly[1].y);ctx.lineTo(t.poly[2].x,t.poly[2].y);ctx.closePath();ctx.fillStyle=t.color;ctx.fill()}
  return canvas.toDataURL('image/png');
 })();
 thumbCache.set(id,task);
 try{return await task}catch(error){thumbCache.delete(id);throw error}
}
export function assignModelThumbnail(image,id){
 image.src='./assets/3d-real.svg';image.alt='Aperçu du modèle '+id+' en chargement';
 realModelThumbnail(id).then(src=>{
  if(!image.isConnected)return;
  image.src=src;image.alt='Aperçu de la géométrie réelle du modèle 3D';
 }).catch(error=>{
  if(image.isConnected){image.alt='Modèle GLB non disponible : '+error.message;image.title=image.alt}
 });
}
