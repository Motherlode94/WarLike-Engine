import {packageGlb,imageResource} from './glb-package.js';
import {packagedModels3d} from './imported-models-3d.js';
import {quaterniusModels3d} from './quaternius-game-assets.js';
import {readAnimationRig,normalMatrix3,transformNormal as applyNormal} from '../core/gltf-animation.js';
import {freeModels3d} from './free-game-assets.js';
// WarLike static glTF 2.0 GLB mesh loader. No eval, scripts or external binary executables.
// Supports embedded GLB, node hierarchy/TRS, material baseColorFactor, triangle indices.
export const realModels3d=[...freeModels3d,...quaterniusModels3d,
 {id:'real-specular-test',name:'Specular Material Test',category:'Props',shape:'glb',scale:1,url:'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/SpecularTest/glTF-Binary/SpecularTest.glb',license:'CC-BY-4.0 • Ed Mackey'},
 {id:'real-normal-tangent-test',name:'Normal Map Geometry Reference',category:'Props',shape:'glb',scale:1,url:'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/NormalTangentTest/glTF-Binary/NormalTangentTest.glb',license:'CC0 • Ed Mackey'},
 {id:'real-texture-coordinate-test',name:'Textured Geometry Reference',category:'Props',shape:'glb',scale:1,url:'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/TextureCoordinateTest/glTF-Binary/TextureCoordinateTest.glb',license:'CC0 • Ed Mackey'},
 {id:'real-transmission-test',name:'Transmission Material Test',category:'Props',shape:'glb',scale:1,url:'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/TransmissionTest/glTF-Binary/TransmissionTest.glb',license:'CC0 • Adobe'},
 {id:'real-clear-coat-car-paint',name:'Clear Coat Car Paint — material reference',category:'Props',shape:'glb',scale:1,url:'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/ClearCoatCarPaint/glTF-Binary/ClearCoatCarPaint.glb',license:'CC0 • Eric Chadwick'},
 {id:'real-pot-of-coals',name:'Pot of Coals',category:'Props',shape:'glb',scale:1,url:'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/PotOfCoals/glTF-Binary/PotOfCoals.glb',license:'CC-BY-4.0 • Darmstadt Graphics Group'},

 {id:'real-iridescent-dish-with-olives',name:'Dish With Olives',category:'Props',shape:'glb',scale:1,url:'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/IridescentDishWithOlives/glTF-Binary/IridescentDishWithOlives.glb',license:'CC-BY-4.0 • Wayfair'},

 {id:'real-morph-primitives-test',name:'Morph Primitives Test',category:'Props',shape:'glb',scale:1,url:'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/MorphPrimitivesTest/glTF-Binary/MorphPrimitivesTest.glb',license:'CC-BY-4.0 • ft-lab'},

 {id:'real-animated-morph-cube',name:'Animated Morph Cube',category:'Props',shape:'glb',scale:1,url:'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/AnimatedMorphCube/glTF-Binary/AnimatedMorphCube.glb',license:'CC0 • Microsoft • morph non animé'},

 {id:'real-materials-variants-shoe',name:'Materials Variants Shoe',category:'Props',shape:'glb',scale:1,url:'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/MaterialsVariantsShoe/glTF-Binary/MaterialsVariantsShoe.glb',license:'CC-BY-4.0 • Shopify'},

 {id:'real-sheen-chair',name:'Sheen Chair',category:'Props',shape:'glb',scale:1,url:'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/SheenChair/glTF-Binary/SheenChair.glb',license:'CC0 • Wayfair'},

 {id:'real-barramundi-fish',name:'Barramundi Fish',category:'Characters',shape:'glb',scale:1,url:'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/BarramundiFish/glTF-Binary/BarramundiFish.glb',license:'CC0 • Microsoft'},

 {id:'real-rigged-figure',name:'Rigged Figure — vrai personnage GLB',category:'Characters',shape:'glb',scale:1,url:'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/RiggedFigure/glTF-Binary/RiggedFigure.glb',license:'CC-BY-4.0 • Cesium • animations non prises en charge'},
 {id:'real-avocado',name:'Avocado — objet 3D',category:'Props',shape:'glb',scale:1,url:'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Avocado/glTF-Binary/Avocado.glb',license:'CC0 • Microsoft'},
 {id:'real-water-bottle',name:'Water Bottle — objet PBR',category:'Props',shape:'glb',scale:1,url:'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/WaterBottle/glTF-Binary/WaterBottle.glb',license:'CC0 • Microsoft'},
 {id:'real-cesium-milk-truck',name:'Cesium Milk Truck — véhicule GLB',category:'Vehicles',shape:'glb',scale:1,url:'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CesiumMilkTruck/glTF-Binary/CesiumMilkTruck.glb',license:'CC-BY-4.0 • Cesium • logo Cesium présent'},
 {id:'real-cesium-man',name:'Cesium Man',category:'Characters',shape:'glb',scale:1,url:'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CesiumMan/glTF-Binary/CesiumMan.glb',license:'CC-BY-4.0 • Cesium'},
 {id:'real-fox',name:'Fox',category:'Characters',shape:'glb',scale:1,url:'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Fox/glTF-Binary/Fox.glb',license:'Consulter la licence du modèle • Khronos'},
 {id:'real-duck',name:'Duck',category:'Props',shape:'glb',scale:1,url:'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Duck/glTF-Binary/Duck.glb',license:'Consulter la licence du modèle • Khronos'},
 {id:'real-lantern',name:'Lantern',category:'Props',shape:'glb',scale:1,url:'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Lantern/glTF-Binary/Lantern.glb',license:'Consulter la licence du modèle • Khronos'},
 {id:'real-boombox',name:'BoomBox',category:'Props',shape:'glb',scale:1,url:'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/BoomBox/glTF-Binary/BoomBox.glb',license:'Consulter la licence du modèle • Khronos'},
 {id:'real-toycar',name:'Toy Car',category:'Vehicles',shape:'glb',scale:1,url:'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/ToyCar/glTF-Binary/ToyCar.glb',license:'Consulter la licence du modèle • Khronos'},
 {id:'real-antique-camera',name:'Antique Camera',category:'Props',shape:'glb',scale:1,url:'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/AntiqueCamera/glTF-Binary/AntiqueCamera.glb',license:'Consulter la licence du modèle • Khronos'}
];
export const importedModels3d=new Map(packagedModels3d.map(asset=>[asset.id,asset]));
const modelCache=new Map();
const maxBytes=25*1024*1024;
export function registerLocalModel(file,{id=null,license='Fichier local, licence à vérifier'}={}){
 if(!file||!/.glb$/i.test(file.name))throw Error('Format requis : .glb (glTF binaire).');
 if(file.size>maxBytes)throw Error('Fichier trop volumineux (maximum 25 Mo).');
 if(id!==null&&!/^library-[a-f0-9]{24}$/.test(id))throw Error('Identifiant de modèle Library invalide.');
 const modelId=id||'local-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
 const item={id:modelId,name:file.name.replace(/\.glb$/i,''),category:'Imported 3D',shape:'glb',license,file};
 importedModels3d.set(modelId,item);return item;
}
/** Import an external GLB into the current project session. Remote hosts must permit CORS. */
export async function registerRemoteModel(address,{category='Imported 3D',license='Licence à vérifier'}={}){
 let url;
 try{url=new URL(String(address).trim())}catch{throw Error('URL de modèle invalide')}
 if(url.protocol!=='https:'||!url.pathname.toLowerCase().endsWith('.glb')||url.username||url.password)throw Error('Lien HTTPS direct vers un fichier .glb requis');
 const response=await fetch(url.href,{mode:'cors',credentials:'omit',redirect:'follow'});
 if(!response.ok)throw Error('Téléchargement GLB : HTTP '+response.status);
 const declared=Number(response.headers.get('content-length')||0);
 if(declared>maxBytes)throw Error('Modèle trop volumineux (25 Mo maximum)');
 const chunks=[];let loaded=0;
 if(response.body){
  const reader=response.body.getReader();
  try{while(true){const {done,value}=await reader.read();if(done)break;loaded+=value.byteLength;if(loaded>maxBytes){await reader.cancel();throw Error('Modèle trop volumineux (25 Mo maximum)')}chunks.push(value)}}
  finally{reader.releaseLock()}
 }else{
  const data=new Uint8Array(await response.arrayBuffer());loaded=data.byteLength;if(loaded>maxBytes)throw Error('Modèle trop volumineux (25 Mo maximum)');chunks.push(data);
 }
 const bytes=new Uint8Array(loaded);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
 const packed=await packageGlb(bytes.buffer,async uri=>{const address=new URL(uri,url);if(address.protocol!=='https:'&&!/^data:image\/(png|jpeg|webp);base64,/i.test(uri))throw Error('URL de texture non autorisée.');return imageResource(await fetch(address.href,{mode:'cors',credentials:'omit'}));});
 parseGlb(packed);
 const name=decodeURIComponent(url.pathname.split('/').pop()||'external.glb');
 const file=new File([packed],name,{type:'model/gltf-binary'});
 const model=registerLocalModel(file);
 model.category=['Characters','Monsters','Vehicles','Weapons','Props','Buildings','Imported 3D'].includes(category)?category:'Imported 3D';
 model.license=license;
 model.sourceUrl=url.href;
 return model;
}
const bundledModelLookup=new Map(realModels3d.map(asset=>[asset.id,asset]));
export const model3dById=id=>bundledModelLookup.get(id)||importedModels3d.get(id)||null;
const identity=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
const mul=(a,b)=>{const o=new Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o};
const transform=(m,p,w=1)=>[m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12]*w,m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13]*w,m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]*w];
// Inverse transpose of the node's linear transform, including nonuniform scale.
export const transformNormal=(m,n)=>applyNormal(normalMatrix3(m),...n);
const matrixFromNode=node=>{
 if(node.matrix?.length===16)return node.matrix;
 const [x,y,z,w]=node.rotation||[0,0,0,1],s=node.scale||[1,1,1],t=node.translation||[0,0,0];
 return [(1-2*(y*y+z*z))*s[0],(2*(x*y+z*w))*s[0],(2*(x*z-y*w))*s[0],0,
 (2*(x*y-z*w))*s[1],(1-2*(x*x+z*z))*s[1],(2*(y*z+x*w))*s[1],0,
 (2*(x*z+y*w))*s[2],(2*(y*z-x*w))*s[2],(1-2*(x*x+y*y))*s[2],0,t[0],t[1],t[2],1];
};
const types={5120:{size:1,method:'getInt8'},5121:{size:1,method:'getUint8'},5122:{size:2,method:'getInt16'},5123:{size:2,method:'getUint16'},5125:{size:4,method:'getUint32'},5126:{size:4,method:'getFloat32'}};
function readAccessor(json,binary,index){
 const a=json.accessors?.[index],v=json.bufferViews?.[a?.bufferView],type=types[a?.componentType];
 if(!a||!v||!type||a.sparse)throw Error('Accessor glTF non pris en charge');
 if(v.buffer!==undefined&&v.buffer!==0)throw Error('GLB externe non pris en charge');
 const count=({SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16})[a.type];
 if(!count||!Number.isSafeInteger(a.count)||a.count<1||a.count>3000000)throw Error('Données GLB invalides');
 const stride=v.byteStride||type.size*count,offset=(v.byteOffset||0)+(a.byteOffset||0);
 if(!Number.isSafeInteger(stride)||!Number.isSafeInteger(offset)||offset<0||stride<type.size*count||(a.byteOffset||0)+(a.count-1)*stride+type.size*count>v.byteLength||offset+(a.count-1)*stride+type.size*count>binary.byteLength)throw Error('Buffer GLB incomplet');
 const dv=new DataView(binary.buffer,binary.byteOffset,binary.byteLength),out=[];
 for(let i=0;i<a.count;i++)for(let j=0;j<count;j++){let value=dv[type.method](offset+i*stride+j*type.size,true);if(a.normalized&&a.componentType!==5126){const maximum=({5120:127,5121:255,5122:32767,5123:65535,5125:4294967295})[a.componentType];value=Math.max(-1,value/maximum)}if(!Number.isFinite(value))throw Error('Valeur GLB non finie');out.push(value)}
 // Accessor count is the number of elements, not the number of components
 // per element (POSITION is VEC3 even when the mesh has thousands of vertices).
 return {data:out,count:a.count,components:count};
}
// Images carried as data URIs are self-contained just like image bufferViews.
export function embeddedGlbImage(uri){
 const match=/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]*={0,2})$/i.exec(uri||'');
 if(!match)throw Error('Image GLB intégrée invalide : PNG, JPEG ou WebP en base64 requis');
 let binary;try{binary=atob(match[2])}catch{throw Error('Image GLB : base64 invalide')}
 if(!binary.length)throw Error('Image GLB intégrée vide');
 return {mimeType:match[1].toLowerCase(),bytes:Uint8Array.from(binary,c=>c.charCodeAt(0))};
}
export function parseGlb(buffer,{baseUrl,allowStaticRig=false}={}){
 if(buffer.byteLength>maxBytes)throw Error('GLB supérieur à 25 Mo');
 const v=new DataView(buffer);if(buffer.byteLength<20||v.getUint32(0,true)!==0x46546c67||v.getUint32(4,true)!==2||v.getUint32(8,true)!==buffer.byteLength)throw Error('GLB 2.0 invalide');
 let offset=12,json=null,binary=null;
 while(offset+8<=buffer.byteLength){const length=v.getUint32(offset,true),type=v.getUint32(offset+4,true);offset+=8;if(offset+length>buffer.byteLength)throw Error('Chunk GLB incomplet');
 if(type===0x4e4f534a)json=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,offset,length)));
 if(type===0x004e4942)binary=new Uint8Array(buffer,offset,length);offset+=length;
 }
 if(!json||!binary||!Array.isArray(json.meshes))throw Error('GLB sans géométrie intégrée');
 const supported=new Set(['KHR_materials_unlit','KHR_texture_transform','KHR_mesh_quantization','KHR_materials_emissive_strength']);
 for(const extension of json.extensionsRequired||[])if(!supported.has(extension))throw Error('Extension GLB requise non prise en charge : '+extension);
 const accessorCache=new Map();const accessor=index=>{if(!accessorCache.has(index))accessorCache.set(index,readAccessor(json,binary,index));return accessorCache.get(index)};
 const rig=readAnimationRig(json,accessor,{allowStatic:allowStaticRig});
 const childNodes=new Set((json.nodes||[]).flatMap(n=>n.children||[]));
 const roots=json.scenes?.[json.scene||0]?.nodes||(json.nodes||[]).map((_,i)=>i).filter(i=>!childNodes.has(i)),parts=[],visiting=new Set();
 const walk=(idx,parent,depth)=>{
  if(depth>64||visiting.has(idx))throw Error('Hiérarchie GLB cyclique ou trop profonde');
  if(parts.length>300)throw Error('GLB : trop de primitives');
  const node=json.nodes?.[idx];if(!node)return;
  visiting.add(idx);
  const m=mul(parent,matrixFromNode(node)),normalTransform=normalMatrix3(m);
  for(const primitive of (json.meshes?.[node.mesh]?.primitives||[])){
   if(primitive.mode!==undefined&&primitive.mode!==4)continue;
   if(primitive.extensions?.KHR_draco_mesh_compression)throw Error('GLB Draco : décompresser le modèle avant import.');
   if(primitive.attributes?.POSITION===undefined)continue;
   const pos=accessor(primitive.attributes.POSITION);
   const norm=primitive.attributes.NORMAL===undefined?null:accessor(primitive.attributes.NORMAL);
   const colors=primitive.attributes.COLOR_0===undefined?null:accessor(primitive.attributes.COLOR_0);
   let idxs=primitive.indices===undefined?Array.from({length:pos.count},(_,i)=>i):accessor(primitive.indices).data;
   // Some sample GLBs contain invalid triangles in optional meshes.
   // Ignore only affected faces, preserving the rest of the real geometry.
   const clean=[];
   for(let k=0;k+2<idxs.length;k+=3){
    const a=idxs[k],b=idxs[k+1],c=idxs[k+2];
    if([a,b,c].every(i=>Number.isSafeInteger(i)&&i>=0&&i<pos.count))clean.push(a,b,c);
   }
   idxs=clean;
   if(idxs.length%3)continue;
   const pbr=json.materials?.[primitive.material]?.pbrMetallicRoughness||{};
   const color=pbr.baseColorFactor||[1,1,1,1];
   const roughness=Math.max(.04,Math.min(1,Number(pbr.roughnessFactor??1)));
   const metallic=Math.max(0,Math.min(1,Number(pbr.metallicFactor??1)));
   const textureInfo=pbr.baseColorTexture,textureTransform=textureInfo?.extensions?.KHR_texture_transform;
   const uvIndex=textureTransform?.texCoord??textureInfo?.texCoord??0;
   const uvAccessor=primitive.attributes['TEXCOORD_'+uvIndex];
   const uv=uvAccessor===undefined?null:accessor(uvAccessor);
   const image=json.images?.[json.textures?.[textureInfo?.index]?.source];
   let texture=null;
   if(image&&uv){
    const imageView=json.bufferViews?.[image.bufferView];
    if(imageView&&(!imageView.buffer||imageView.buffer===0)&&['image/png','image/jpeg','image/webp'].includes(image.mimeType)){
     const start=imageView.byteOffset||0,end=start+imageView.byteLength;
     if(end>binary.byteLength)throw Error('Texture GLB incomplète');
     const sampler=json.samplers?.[json.textures[textureInfo.index].sampler]||{};
     texture={bytes:binary.slice(start,end),mimeType:image.mimeType,wrapS:sampler.wrapS||10497,wrapT:sampler.wrapT||10497};
    }
    else if(typeof image.uri==='string'&&image.uri.startsWith('data:')){
     const sampler=json.samplers?.[json.textures[textureInfo.index].sampler]||{};
     texture={...embeddedGlbImage(image.uri),wrapS:sampler.wrapS||10497,wrapT:sampler.wrapT||10497};
    }
    else if(baseUrl&&image.uri&&!/^(?:[a-z]+:|\/\/)/i.test(image.uri)&&/\.(png|jpe?g|webp)$/i.test(image.uri)){
     const sampler=json.samplers?.[json.textures[textureInfo.index].sampler]||{};
     texture={url:new URL(image.uri,baseUrl).href,wrapS:sampler.wrapS||10497,wrapT:sampler.wrapT||10497};
    }
   }
   const vertices=[],texcoords=[],vertexColors=[];
   for(let i=0;i<idxs.length;i+=3){const points=[];
    for(let j=0;j<3;j++){const vi=idxs[i+j];if(vi>=pos.count||vi<0)throw Error('Index GLB invalide');points.push(transform(m,pos.data.slice(vi*3,vi*3+3)))}
    const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
    const delta=(a,b)=>a.map((n,k)=>n-b[k]),normal=cross(delta(points[1],points[0]),delta(points[2],points[0]));
    const len=Math.hypot(...normal)||1;const flat=normal.map(n=>n/len);
    for(let j=0;j<3;j++){let n=flat;if(norm){const raw=applyNormal(normalTransform,...norm.data.slice(idxs[i+j]*3,idxs[i+j]*3+3));const l=Math.hypot(...raw)||1;n=raw.map(z=>z/l)}vertices.push(...points[j],...n);
     if(colors){const offset=idxs[i+j]*colors.components;vertexColors.push(...colors.data.slice(offset,offset+3),colors.components===4?colors.data[offset+3]:1);}
     if(texture){
      let u=uv.data[idxs[i+j]*uv.components],v=uv.data[idxs[i+j]*uv.components+1];
      const scale=textureTransform?.scale||[1,1],offset=textureTransform?.offset||[0,0],angle=textureTransform?.rotation||0;
      const x=u*scale[0],y=v*scale[1];
      texcoords.push(offset[0]+Math.cos(angle)*x-Math.sin(angle)*y,offset[1]+Math.sin(angle)*x+Math.cos(angle)*y);
     }
    }
   }
   const motion=rig?{nodeIndex:idx,skinIndex:node.skin,indices:new Uint32Array(idxs),vertexIds:new Uint32Array([...new Set(idxs)]),positions:new Float32Array(pos.data),normals:norm?new Float32Array(norm.data):null,...(node.skin!==undefined&&primitive.attributes.JOINTS_0!==undefined?{joints:new Uint16Array(accessor(primitive.attributes.JOINTS_0).data),weights:new Float32Array(accessor(primitive.attributes.WEIGHTS_0).data),influences:accessor(primitive.attributes.JOINTS_0).components}:{})}:null;
   if(vertices.length)parts.push({...(motion?{motion}:{}),vertices:new Float32Array(vertices),color,roughness,metallic,unlit:!!json.materials?.[primitive.material]?.extensions?.KHR_materials_unlit,emissive:(json.materials?.[primitive.material]?.emissiveFactor||[0,0,0]).map(v=>v*(json.materials?.[primitive.material]?.extensions?.KHR_materials_emissive_strength?.emissiveStrength??1)),...(colors?{vertexColors:new Float32Array(vertexColors)}:{}),...(texture?{texture,texcoords:new Float32Array(texcoords)}:{}),alphaMode:json.materials?.[primitive.material]?.alphaMode||'OPAQUE',alphaCutoff:json.materials?.[primitive.material]?.alphaCutoff??.5});
  }
  for(const child of node.children||[])walk(child,m,depth+1);
  visiting.delete(idx);
 };
 for(const root of roots)walk(root,identity(),0);
 if(!parts.length)throw Error('Aucun triangle compatible dans ce GLB');
 const xyz=[[],[],[]];for(const part of parts)for(let j=0;j<part.vertices.length;j+=6)for(let k=0;k<3;k++)xyz[k].push(part.vertices[j+k]);
 const min=xyz.map(a=>a.reduce((n,v)=>Math.min(n,v),Infinity)),max=xyz.map(a=>a.reduce((n,v)=>Math.max(n,v),-Infinity));
 const size=max.map((n,k)=>Math.max(.0001,n-min[k])),center=max.map((n,k)=>(n+min[k])/2);
 // A single uniform scale preserves proportions. Per-axis normalization turned humans into distorted blocks.
 const longest=Math.max(...size);
 for(const part of parts)for(let j=0;j<part.vertices.length;j+=6)for(let k=0;k<3;k++)part.vertices[j+k]=(part.vertices[j+k]-center[k])/longest;
 return {parts,rig,normalizationCenter:center,normalizationScale:longest,normalizedSize:size.map(value=>value/longest),triangleCount:parts.reduce((sum,p)=>sum+p.vertices.length/18,0),source:json.asset?.generator||'glTF 2.0'};
}
export async function getModelGeometry(id){
 if(modelCache.has(id))return modelCache.get(id);
 const item=model3dById(id);if(!item)throw Error('Modèle introuvable');
 const task=(async()=>{
  let buffer;
  if(item.file)buffer=await item.file.arrayBuffer();
  else{
   let result;
   try{result=await fetch(item.url,{mode:'cors',credentials:'omit'})}
   catch(error){throw Error('Accès réseau/CORS au GLB impossible : '+String(error?.message||error))}
   if(!result.ok)throw Error('Téléchargement du GLB : HTTP '+result.status);
   const declared=Number(result.headers.get('content-length')||0);
   if(declared>maxBytes)throw Error('GLB de plus de 25 Mo — import refusé');
   if(result.body){
    const reader=result.body.getReader(),chunks=[];let length=0;
    try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;
     if(length>maxBytes){await reader.cancel();throw Error('GLB de plus de 25 Mo — import refusé')}
     chunks.push(value)
    }}finally{reader.releaseLock()}
    const bytes=new Uint8Array(length);let offset=0;
    for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
    buffer=bytes.buffer;
   }else{
    buffer=await result.arrayBuffer();
   }
  }
  return parseGlb(buffer,{baseUrl:item.url?new URL(item.url,new URL('../../',import.meta.url)).href:undefined,allowStaticRig:item.category==='Vehicles'});
 })();
 modelCache.set(id,task);
 try{return await task}catch(e){modelCache.delete(id);throw e}
}

// Decode once per material image; the same image feeds WebGL and library previews.
const textureImages=new WeakMap();
const sharedTextureImages=new Map();
export async function getTextureImage(texture){
 if(!texture)return null;
 if(textureImages.has(texture))return textureImages.get(texture);
 const task=texture.url?(sharedTextureImages.get(texture.url)|| (async()=>{
  const response=await fetch(texture.url,{mode:'cors',credentials:'omit'});
  if(!response.ok)throw Error('Texture du modèle indisponible : HTTP '+response.status);
  const blob=await response.blob();if(blob.size>8*1024*1024)throw Error('Texture supérieure à 8 Mo');
  return createImageBitmap(blob);
 })()):createImageBitmap(new Blob([texture.bytes],{type:texture.mimeType}));
 if(texture.url){sharedTextureImages.set(texture.url,task);if(sharedTextureImages.size>256)sharedTextureImages.delete(sharedTextureImages.keys().next().value)}
 textureImages.set(texture,task);
 try{return await task}catch(error){textureImages.delete(texture);if(texture.url)sharedTextureImages.delete(texture.url);throw error}
}
