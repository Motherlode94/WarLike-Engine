// WarLike static glTF 2.0 GLB mesh loader. No eval, scripts or external binary executables.
// Supports embedded GLB, node hierarchy/TRS, material baseColorFactor, triangle indices.
export const realModels3d=[
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
export const importedModels3d=new Map();
const modelCache=new Map();
const maxBytes=25*1024*1024;
export function registerLocalModel(file){
 if(!file||!/.glb$/i.test(file.name))throw Error('Format requis : .glb (glTF binaire).');
 if(file.size>maxBytes)throw Error('Fichier trop volumineux (maximum 25 Mo).');
 const id='local-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
 const item={id,name:file.name.replace(/\.glb$/i,''),category:'Imported 3D',shape:'glb',license:'Fichier local, licence à vérifier',file};
 importedModels3d.set(id,item);return item;
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
 parseGlb(bytes.buffer); // Verify GLB structure and meshes before registering it.
 const name=decodeURIComponent(url.pathname.split('/').pop()||'external.glb');
 const file=new File([bytes],name,{type:'model/gltf-binary'});
 const model=registerLocalModel(file);
 model.category=['Characters','Monsters','Vehicles','Weapons','Props','Buildings','Imported 3D'].includes(category)?category:'Imported 3D';
 model.license=license;
 model.sourceUrl=url.href;
 return model;
}
export const model3dById=id=>realModels3d.find(a=>a.id===id)||importedModels3d.get(id)||null;
const identity=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
const mul=(a,b)=>{const o=new Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o};
const transform=(m,p,w=1)=>[m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12]*w,m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13]*w,m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]*w];
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
 const count=({SCALAR:1,VEC2:2,VEC3:3,VEC4:4})[a.type];
 if(!count||a.count>3000000)throw Error('Données GLB invalides');
 const stride=v.byteStride||type.size*count,offset=(v.byteOffset||0)+(a.byteOffset||0);
 if(stride<type.size*count||offset+(a.count-1)*stride+type.size*count>binary.byteLength)throw Error('Buffer GLB incomplet');
 const dv=new DataView(binary.buffer,binary.byteOffset,binary.byteLength),out=[];
 for(let i=0;i<a.count;i++)for(let j=0;j<count;j++)out.push(dv[type.method](offset+i*stride+j*type.size,true));
 return {data:out,count,components:count};
}
export function parseGlb(buffer){
 if(buffer.byteLength>maxBytes)throw Error('GLB supérieur à 25 Mo');
 const v=new DataView(buffer);if(buffer.byteLength<20||v.getUint32(0,true)!==0x46546c67||v.getUint32(4,true)!==2||v.getUint32(8,true)!==buffer.byteLength)throw Error('GLB 2.0 invalide');
 let offset=12,json=null,binary=null;
 while(offset+8<=buffer.byteLength){const length=v.getUint32(offset,true),type=v.getUint32(offset+4,true);offset+=8;if(offset+length>buffer.byteLength)throw Error('Chunk GLB incomplet');
 if(type===0x4e4f534a)json=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,offset,length)));
 if(type===0x004e4942)binary=new Uint8Array(buffer,offset,length);offset+=length;
 }
 if(!json||!binary||!Array.isArray(json.meshes))throw Error('GLB sans géométrie intégrée');
 const roots=json.scenes?.[json.scene||0]?.nodes||json.nodes?.map((_,i)=>i)||[],parts=[];
 const walk=(idx,parent,depth)=>{
  if(depth>64||parts.length>300)return;
  const node=json.nodes?.[idx];if(!node)return;
  const m=mul(parent,matrixFromNode(node));
  for(const primitive of (json.meshes?.[node.mesh]?.primitives||[])){
   if(primitive.mode!==undefined&&primitive.mode!==4||primitive.extensions)continue;
   if(primitive.attributes?.POSITION===undefined)continue;
   const pos=readAccessor(json,binary,primitive.attributes.POSITION);
   const norm=primitive.attributes.NORMAL===undefined?null:readAccessor(json,binary,primitive.attributes.NORMAL);
   let idxs=primitive.indices===undefined?Array.from({length:pos.count},(_,i)=>i):readAccessor(json,binary,primitive.indices).data;
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
   const color=pbr.baseColorFactor||[.75,.78,.82,1];
   const roughness=Math.max(.04,Math.min(1,Number(pbr.roughnessFactor??1)));
   const metallic=Math.max(0,Math.min(1,Number(pbr.metallicFactor??0)));
   const vertices=[];
   for(let i=0;i<idxs.length;i+=3){const points=[];
    for(let j=0;j<3;j++){const vi=idxs[i+j];if(vi>=pos.count||vi<0)throw Error('Index GLB invalide');points.push(transform(m,pos.data.slice(vi*3,vi*3+3)))}
    const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
    const delta=(a,b)=>a.map((n,k)=>n-b[k]),normal=cross(delta(points[1],points[0]),delta(points[2],points[0]));
    const len=Math.hypot(...normal)||1;const flat=normal.map(n=>n/len);
    for(let j=0;j<3;j++){let n=flat;if(norm){const raw=transform(m,norm.data.slice(idxs[i+j]*3,idxs[i+j]*3+3),0);const l=Math.hypot(...raw)||1;n=raw.map(z=>z/l)}vertices.push(...points[j],...n)}
   }
   if(vertices.length)parts.push({vertices:new Float32Array(vertices),color,roughness,metallic});
  }
  for(const child of node.children||[])walk(child,m,depth+1);
 };
 for(const root of roots)walk(root,identity(),0);
 if(!parts.length)throw Error('Aucun triangle compatible dans ce GLB');
 const xyz=[[],[],[]];for(const part of parts)for(let j=0;j<part.vertices.length;j+=6)for(let k=0;k<3;k++)xyz[k].push(part.vertices[j+k]);
 const min=xyz.map(a=>a.reduce((n,v)=>Math.min(n,v),Infinity)),max=xyz.map(a=>a.reduce((n,v)=>Math.max(n,v),-Infinity));
 const size=max.map((n,k)=>Math.max(.0001,n-min[k])),center=max.map((n,k)=>(n+min[k])/2);
 // A single uniform scale preserves proportions. Per-axis normalization turned humans into distorted blocks.
 const longest=Math.max(...size);
 for(const part of parts)for(let j=0;j<part.vertices.length;j+=6)for(let k=0;k<3;k++)part.vertices[j+k]=(part.vertices[j+k]-center[k])/longest;
 return {parts,triangleCount:parts.reduce((sum,p)=>sum+p.vertices.length/18,0),source:json.asset?.generator||'glTF 2.0'};
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
  return parseGlb(buffer);
 })();
 modelCache.set(id,task);
 try{return await task}catch(e){modelCache.delete(id);throw e}
}
