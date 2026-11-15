import {MAX_IMPORTED_GLB_BYTES} from './model-capacity.js';
// Convert a GLB with sidecar images into a self-contained GLB before storage/export.
const maximum=MAX_IMPORTED_GLB_BYTES;
export async function packageGlb(buffer,resolve){
 if(!(buffer instanceof ArrayBuffer)||buffer.byteLength>maximum)throw Error('GLB invalide ou supérieur à 64 Mo.');
 const view=new DataView(buffer);
 if(buffer.byteLength<20||view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==buffer.byteLength)throw Error('GLB 2.0 invalide');
 let json,bin,chunkCount=0,offset=12;
 for(;offset<buffer.byteLength;){
  if(offset+8>buffer.byteLength)throw Error('En-tête de chunk GLB incomplet');
  const length=view.getUint32(offset,true),type=view.getUint32(offset+4,true);offset+=8;
  if(length%4!==0||offset+length>buffer.byteLength)throw Error('Chunk GLB incomplet ou non aligné');
  if(type===0x4e4f534a){if(chunkCount!==0||json)throw Error('Chunk JSON GLB invalide');json=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(new Uint8Array(buffer,offset,length)));}
  if(type===0x004e4942){if(bin)throw Error('Plusieurs chunks binaires GLB');bin=new Uint8Array(buffer,offset,length);}
  offset+=length;chunkCount++;
 }
 if(!json||!bin||json.asset?.version!=='2.0'||!Array.isArray(json.buffers)||json.buffers.length!==1||!Number.isSafeInteger(json.buffers[0].byteLength)||json.buffers[0].byteLength>bin.byteLength)throw Error('GLB sans géométrie intégrée ou structure invalide');
 if(json.buffers?.some(b=>b.uri))throw Error('Buffers externes : exporter un GLB avec géométrie intégrée.');
 const chunks=[bin];let size=bin.byteLength;const images=new Map();
 for(const image of json.images||[]){
  if(!image.uri)continue;
  let saved=images.get(image.uri);
  if(!saved){
   if(!resolve)throw Error('Texture externe manquante : '+image.uri+'. Importe le dossier complet.');
   const resource=await resolve(image.uri);if(!resource||!(resource.bytes instanceof Uint8Array||resource.bytes instanceof ArrayBuffer))throw Error('Texture externe invalide : '+image.uri);const bytes=new Uint8Array(resource.bytes);
   const mimeType=resource.mimeType?.split(';')[0];
   if(!['image/png','image/jpeg','image/webp'].includes(mimeType)||!bytes.length)throw Error('Texture non prise en charge : '+image.uri);
   const padding=(4-size%4)%4;size+=padding;chunks.push(new Uint8Array(padding),bytes);
   if(size+bytes.length>maximum)throw Error('GLB et textures : maximum 64 Mo.');
   json.bufferViews??=[];saved={bufferView:json.bufferViews.length,mimeType};json.bufferViews.push({buffer:0,byteOffset:size,byteLength:bytes.length});images.set(image.uri,saved);size+=bytes.length;
  }
  delete image.uri;Object.assign(image,saved);
 }
 if(!images.size)return buffer;
 json.buffers=[{byteLength:size}];const text=new TextEncoder().encode(JSON.stringify(json)),jsonSize=Math.ceil(text.length/4)*4,binSize=Math.ceil(size/4)*4,total=28+jsonSize+binSize;
 if(total>maximum)throw Error('GLB et textures : maximum 64 Mo.');
 const result=new Uint8Array(total),header=new DataView(result.buffer);header.setUint32(0,0x46546c67,true);header.setUint32(4,2,true);header.setUint32(8,total,true);header.setUint32(12,jsonSize,true);header.setUint32(16,0x4e4f534a,true);result.fill(32,20,20+jsonSize);result.set(text,20);header.setUint32(20+jsonSize,binSize,true);header.setUint32(24+jsonSize,0x004e4942,true);
 let outputOffset=28+jsonSize;for(const chunk of chunks){result.set(chunk,outputOffset);outputOffset+=chunk.length;}return result.buffer;
}
export async function imageResource(response){
 if(!response.ok)throw Error('Texture : HTTP '+response.status);
 if(Number(response.headers.get('content-length'))>maximum)throw Error('Texture trop volumineuse.');
 const reader=response.body?.getReader(),chunks=[];let size=0;
 if(reader){try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>maximum){await reader.cancel();throw Error('Texture trop volumineuse.');}chunks.push(value);}}finally{reader.releaseLock();}}
 else{const bytes=new Uint8Array(await response.arrayBuffer());size=bytes.length;chunks.push(bytes);}
 if(size>maximum)throw Error('Texture trop volumineuse.');const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return {bytes,mimeType:response.headers.get('content-type')};
}
