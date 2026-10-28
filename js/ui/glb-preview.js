// Preview the same GLB triangles, UVs and embedded color textures used in scene.
import {getModelGeometry,getTextureImage} from '../assets/real-models-3d.js';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export async function renderGlbPreview(canvas,id){
 const ctx=canvas.getContext('2d');if(!ctx)return;
 const width=canvas.width,height=canvas.height,data=await getModelGeometry(id),faces=[];
 ctx.clearRect(0,0,width,height);
 const stride=Math.max(1,Math.ceil(data.triangleCount/6000));let index=0;
 const yaw=-.65,pitch=.38,cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
 const project=(x,y,z)=>{const xr=x*cy-z*sy,zr=x*sy+z*cy,yr=y*cp-zr*sp;return [width/2+xr*width*.83,height*.54-yr*height*.83,y*sp+zr*cp]};
 for(const part of data.parts){
  const a=part.vertices,base=part.color||[.75,.8,.85,1];let texture=null;
  if(part.texture){const image=await getTextureImage(part.texture);const sample=document.createElement('canvas');sample.width=image.width;sample.height=image.height;const context=sample.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0);texture={image,pixels:context.getImageData(0,0,image.width,image.height).data,width:image.width,height:image.height}}
  const wrapped=(value,mode)=>mode===33071?clamp(value,0,.999999):mode===33648?1-Math.abs(((value%2)+2)%2-1):((value%1)+1)%1;
  for(let i=0;i+17<a.length;i+=18){if(index++%stride)continue;
   const p=[project(a[i],a[i+1],a[i+2]),project(a[i+6],a[i+7],a[i+8]),project(a[i+12],a[i+13],a[i+14])];
   const dx=p[1][0]-p[0][0],dy=p[1][1]-p[0][1],ex=p[2][0]-p[0][0],ey=p[2][1]-p[0][1];
   if(Math.abs(dx*ey-dy*ex)<.02)continue;
   const shade=clamp(.82+.2*(a[i+4]||0)+.12*(a[i+3]||0),.45,1.04);
   let rgb=base.slice(0,3).map(v=>Math.round(clamp(v*shade,0,1)*255));
   if(texture){
    const offset=i/3,u=(part.texcoords[offset]+part.texcoords[offset+2]+part.texcoords[offset+4])/3,v=(part.texcoords[offset+1]+part.texcoords[offset+3]+part.texcoords[offset+5])/3;
    const x=Math.min(texture.width-1,Math.floor(wrapped(u,part.texture.wrapS)*texture.width)),y=Math.min(texture.height-1,Math.floor(wrapped(v,part.texture.wrapT)*texture.height)),pixel=(y*texture.width+x)*4;
    if(part.alphaMode!=='OPAQUE'&&texture.pixels[pixel+3]<16)continue;
    rgb=rgb.map((_,k)=>Math.round(texture.pixels[pixel+k]*base[k]*Math.min(1,shade)));
   }
   faces.push({p,z:(p[0][2]+p[1][2]+p[2][2])/3,color:'rgb('+rgb.join(',')+')'});
  }
 }
 faces.sort((a,b)=>a.z-b.z);
 for(const face of faces){ctx.beginPath();ctx.moveTo(face.p[0][0],face.p[0][1]);ctx.lineTo(face.p[1][0],face.p[1][1]);ctx.lineTo(face.p[2][0],face.p[2][1]);ctx.closePath();ctx.fillStyle=face.color;ctx.fill()}
 if(!faces.length)throw Error('Aucune face visible');
}
