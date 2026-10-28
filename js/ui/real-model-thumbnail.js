import {renderGlbPreview} from './glb-preview.js';
import {model3dById} from '../assets/real-models-3d.js';
import {getModelGeometry} from '../assets/real-models-3d.js';
// Thumbnail is rendered from the real mesh triangles, not a generic prefab symbol.
// Simple software raster preview (no additional WebGL contexts).
const thumbCache=new Map();
export async function realModelThumbnail(id){
 if(thumbCache.has(id))return thumbCache.get(id);
 const task=(async()=>{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=160;
  await renderGlbPreview(canvas,id);return canvas.toDataURL('image/png');
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
