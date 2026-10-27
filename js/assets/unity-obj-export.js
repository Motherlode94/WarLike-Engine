// Export static WarLike GLB triangle meshes as Wavefront OBJ, natively importable by Unity.
// Geometry is from the WarLike preview loader (centered/unit-normalized); materials,
// textures, bones, blend shapes and animations are NOT exported.
import {getModelGeometry,model3dById} from './real-models-3d.js';
export function geometryToObj(geometry,{name='WarLikeMesh',scale=1}={}){
 if(!geometry?.parts?.length||!Number.isFinite(scale)||scale<=0)throw Error('Maillage 3D invalide');
 const safe=String(name).replace(/[^A-Za-z0-9_-]/g,'_').slice(0,80)||'WarLikeMesh';
 const lines=['# WarLike Studio OBJ export - static geometry only','# Unity: place OBJ in Assets/ and inspect scale / normals','o '+safe];
 let vertexIndex=1,normalIndex=1,total=0;
 for(let partNumber=0;partNumber<geometry.parts.length;partNumber++){
  const vertices=geometry.parts[partNumber].vertices;
  if(!vertices||vertices.length%18!==0)throw Error('Triangles GLB mal formés');
  lines.push('g '+safe+'_part_'+partNumber);
  for(let i=0;i<vertices.length;i+=6){
   const x=vertices[i]*scale,y=vertices[i+1]*scale,z=vertices[i+2]*scale;
   if(![x,y,z].every(Number.isFinite))throw Error('Sommet invalide');
   lines.push('v '+x+' '+y+' '+z);
  }
  for(let i=0;i<vertices.length;i+=6){
   const nx=vertices[i+3],ny=vertices[i+4],nz=vertices[i+5];
   if(![nx,ny,nz].every(Number.isFinite))throw Error('Normale invalide');
   lines.push('vn '+nx+' '+ny+' '+nz);
  }
  for(let i=0;i<vertices.length;i+=18){
   lines.push('f '+[0,1,2].map(k=>(vertexIndex+k)+'//'+(normalIndex+k)).join(' '));
   vertexIndex+=3;normalIndex+=3;total++;
  }
 }
 if(!total)throw Error('Aucun triangle à exporter');
 return lines.join('\n')+'\n';
}
export async function exportModelForUnity(id){
 const asset=model3dById(id);if(!asset)throw Error('Modèle GLB introuvable');
 const geometry=await getModelGeometry(id);
 const obj=geometryToObj(geometry,{name:asset.name});
 const safe=asset.name.replace(/[^\w-]+/g,'_').slice(0,72)||'WarLikeMesh';
 const url=URL.createObjectURL(new Blob([obj],{type:'text/plain;charset=utf-8'}));
 try{
  const link=document.createElement('a');link.href=url;link.download=safe+'.obj';
  document.body.append(link);link.click();link.remove();
 }finally{setTimeout(()=>URL.revokeObjectURL(url),1000)}
 return {triangles:geometry.triangleCount,filename:safe+'.obj'};
}
