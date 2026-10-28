// Real mesh previews derived from the actual GLB triangles, not generic cubes.
// Lightweight software projection for library thumbnails; 3D viewport uses WebGL.
import {getModelGeometry} from '../assets/real-models-3d.js';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export async function renderGlbPreview(canvas,id){
 const ctx=canvas.getContext('2d');if(!ctx)return;
 const width=canvas.width,height=canvas.height;
 ctx.clearRect(0,0,width,height);
 const data=await getModelGeometry(id);
 const faces=[];
 // Subsample very dense assets to keep thumbnail painting responsive.
 let total=0;for(const part of data.parts)total+=part.vertices.length/18;
 const stride=Math.max(1,Math.ceil(total/5000));
 let index=0;
 const yaw=-.65,pitch=.38,cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
 const project=(x,y,z)=>{
  const xr=x*cy-z*sy,zr=x*sy+z*cy,yr=y*cp-zr*sp,depth=y*sp+zr*cp;
  return [width/2+xr*width*.75,height*.54-yr*height*.75,depth];
 };
 for(const part of data.parts){
  const a=part.vertices;const base=part.color||[.75,.8,.85,1];
  for(let i=0;i+17<a.length;i+=18){if(index++%stride)continue;
   const p=[project(a[i],a[i+1],a[i+2]),project(a[i+6],a[i+7],a[i+8]),project(a[i+12],a[i+13],a[i+14])];
   const dx=p[1][0]-p[0][0],dy=p[1][1]-p[0][1],ex=p[2][0]-p[0][0],ey=p[2][1]-p[0][1];
   if(Math.abs(dx*ey-dy*ex)<.14)continue;
   const shade=clamp(.78+(.25*(a[i+4]||0))+.12*(a[i+3]||0),.38,1.05);
   faces.push({p,z:(p[0][2]+p[1][2]+p[2][2])/3,color:'rgb('+[0,1,2].map(k=>Math.round(clamp(base[k]*shade,0,1)*255)).join(',')+')'});
  }
 }
 faces.sort((a,b)=>a.z-b.z);
 for(const face of faces){
  ctx.beginPath();ctx.moveTo(face.p[0][0],face.p[0][1]);ctx.lineTo(face.p[1][0],face.p[1][1]);ctx.lineTo(face.p[2][0],face.p[2][1]);ctx.closePath();ctx.fillStyle=face.color;ctx.fill();
 }
 if(!faces.length)throw Error('Aucune face visible');
}
