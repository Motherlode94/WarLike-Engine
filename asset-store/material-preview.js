// Diagnose the actual materials serialized in a glTF 2.0 / GLB file.
// Never invent textures or override authored material colors at preview time.
const MAX=32*1024*1024;
export function inspectModelColors(buffer, filename='model.glb'){
 if(!(buffer instanceof ArrayBuffer)||buffer.byteLength<20||buffer.byteLength>MAX)throw Error('Fichier 3D vide ou trop volumineux.');
 let doc;
 if(/\.gltf$/i.test(filename)){
  doc=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(buffer));
 }else{
  const dv=new DataView(buffer);
  if(dv.getUint32(0,true)!==0x46546c67||dv.getUint32(4,true)!==2||dv.getUint32(8,true)!==buffer.byteLength||dv.getUint32(16,true)!==0x4e4f534a)throw Error('GLB 2.0 invalide.');
  const len=dv.getUint32(12,true);
  if(len<2||20+len>buffer.byteLength)throw Error('Section JSON GLB invalide.');
  doc=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(new Uint8Array(buffer,20,len)).trim());
 }
 if(doc?.asset?.version!=='2.0')throw Error('glTF 2.0 requis.');
 const materials=Array.isArray(doc.materials)?doc.materials:[];
 const textures=Array.isArray(doc.textures)?doc.textures:[];
 const images=Array.isArray(doc.images)?doc.images:[];
 const meshes=Array.isArray(doc.meshes)?doc.meshes:[];
 const primitives=meshes.flatMap(m=>Array.isArray(m.primitives)?m.primitives:[]);
 const vertexColors=primitives.filter(p=>Number.isInteger(p?.attributes?.COLOR_0)).length;
 const referencedMaterials=primitives.filter(p=>Number.isInteger(p?.material)).length;
 const baseColorTextures=materials.filter(m=>Number.isInteger(m?.pbrMetallicRoughness?.baseColorTexture?.index)).length;
 const coloredMaterials=materials.filter(m=>{const color=m?.pbrMetallicRoughness?.baseColorFactor;return Array.isArray(color)&&color.length>=3&&color.some((v,i)=>i<3&&Number.isFinite(v)&&v<.97);}).length;
 const externalImages=images.filter(x=>typeof x?.uri==='string'&&!x.uri.startsWith('data:')).map(x=>x.uri);
 const externalBuffers=(doc.buffers||[]).filter(x=>typeof x?.uri==='string'&&!x.uri.startsWith('data:')).map(x=>x.uri);
 let warning='';
 if(externalImages.length||externalBuffers.length)warning='Dépendances externes : ouvre le fichier à son URL d’origine ou exporte un GLB auto-contenu avec les textures.';
 else if(!materials.length&&!vertexColors)warning='Aucun matériau ni couleur de sommet dans le fichier : les couleurs doivent être exportées depuis le logiciel 3D.';
 else if(materials.length&&!referencedMaterials&&!vertexColors)warning='Les maillages ne référencent aucun matériau : vérifie l’export GLB.';
 else if(!baseColorTextures&&!coloredMaterials&&!vertexColors)warning='Le fichier ne contient ni texture de couleur ni couleur explicite ; le gris peut provenir de la source.';
 return {materials:materials.length,textures:textures.length,images:images.length,primitives:primitives.length,vertexColors,referencedMaterials,baseColorTextures,coloredMaterials,externalImages,externalBuffers,warning};
}
export function previewSourceUrl(resource,blob){
 // Preserve relative texture URIs for built-in same-origin glTF/GLB assets.
 if(typeof resource?.url==='string'&&resource.url.startsWith('./assets/')&&!resource.url.includes('..'))return new URL(resource.url,location.href).href;
 return URL.createObjectURL(blob);
}
