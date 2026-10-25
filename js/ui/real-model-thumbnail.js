import {model3dById} from '../assets/real-models-3d.js';
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
const thumbnailPlaceholder=(title,subtitle)=>{
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" rx="10" fill="#1a2e3f"/><text x="60" y="54" fill="#b9d8e7" font-size="12" text-anchor="middle" font-family="Arial">'+title+'</text><text x="60" y="74" fill="#86a7ba" font-size="10" text-anchor="middle" font-family="Arial">'+subtitle+'</text></svg>';
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
};
export function assignModelThumbnail(image,id){
 const entry=model3dById(id);
 const official=entry?.url?.match(/\/Models\/([^/]+)\/glTF-Binary\/[^/]+\.glb(?:\?.*)?$/);
 const screenshots=official?['jpg','png'].map(ext=>'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/'+encodeURIComponent(official[1])+'/screenshot/screenshot.'+ext):[];
 const token=(Number(image.dataset.thumbToken)||0)+1;
 image.dataset.thumbToken=String(token);
 image.dataset.modelStatus='loading';
 image.src=thumbnailPlaceholder('GLB','Chargement…');
 image.alt='Chargement de la miniature de '+(entry?.name||id);
 let attempt=0;
 const current=()=>image.dataset.thumbToken===String(token);
 const renderGeometry=()=>{
  if(!current())return;
  image.onerror=null;
  image.dataset.modelStatus='loading';
  image.src=thumbnailPlaceholder('GLB','Calcul aperçu…');
  realModelThumbnail(id).then(src=>{
   if(!current())return;
   image.onerror=null;
   image.src=src;
   image.dataset.modelStatus='ready';
   image.alt='Aperçu de la géométrie du modèle '+(entry?.name||id);
   image.title='Aperçu géométrique calculé du modèle GLB, sans reproduction des textures';
  }).catch(error=>{
   if(!current())return;
   image.onerror=null;
   image.src=thumbnailPlaceholder('GLB','Indisponible');
   image.dataset.modelStatus='error';
   image.title='Aperçu impossible : '+String(error?.message||error);
   console.warn('[WarLike Thumbnail]',id,error);
  });
 };
 const tryScreenshot=()=>{
  if(!current())return;
  if(attempt>=screenshots.length){renderGeometry();return}
  const url=screenshots[attempt++];
  image.onerror=tryScreenshot;
  image.onload=()=>{
   if(!current())return;
   image.onerror=null;image.onload=null;
   image.dataset.modelStatus='reference';
   image.alt='Image officielle de référence pour '+(entry?.name||id);
   image.title='Capture officielle Khronos ; modèle GLB chargé séparément en scène';
  };
  image.src=url;
 };
 if(entry?.thumbnailUrl){
  image.onload=()=>{
   if(!current())return;
   image.onload=null;image.onerror=null;
   image.dataset.modelStatus='reference';
   image.alt='Vignette officielle du modèle '+(entry.name||id);
   image.title='Vignette du modèle réel — source Polygonal Mind';
  };
  image.onerror=()=>{image.onload=null;renderGeometry()};
  image.src=entry.thumbnailUrl;
 }else tryScreenshot();
}
