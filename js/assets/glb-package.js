// Convert a GLB with sidecar images into a self-contained GLB before storage/export.
const maximum=25*1024*1024;
export async function packageGlb(buffer,resolve){
 const view=new DataView(buffer);
 if(buffer.byteLength<20||view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==buffer.byteLength)throw Error('GLB 2.0 invalide');
 let json,bin;
 for(let offset=12;offset+8<=buffer.byteLength;){const length=view.getUint32(offset,true),type=view.getUint32(offset+4,true);offset+=8;if(offset+length>buffer.byteLength)throw Error('Chunk GLB incomplet');if(type===0x4e4f534a)json=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,offset,length)));if(type===0x004e4942)bin=new Uint8Array(buffer,offset,length);offset+=length;}
 if(!json||!bin)throw Error('GLB sans géométrie intégrée');
 if(json.buffers?.some(b=>b.uri))throw Error('Buffers externes : exporter un GLB avec géométrie intégrée.');
 const chunks=[bin];let size=bin.byteLength;const images=new Map();
 for(const image of json.images||[]){
  if(!image.uri)continue;
  let saved=images.get(image.uri);
  if(!saved){
   if(!resolve)throw Error('Texture externe manquante : '+image.uri+'. Importe le dossier complet.');
   const resource=await resolve(image.uri),bytes=new Uint8Array(resource.bytes);
   const mimeType=resource.mimeType?.split(';')[0];
   if(!['image/png','image/jpeg','image/webp'].includes(mimeType)||!bytes.length)throw Error('Texture non prise en charge : '+image.uri);
   const padding=(4-size%4)%4;size+=padding;chunks.push(new Uint8Array(padding),bytes);
   if(size+bytes.length>maximum)throw Error('GLB et textures : maximum 25 Mo.');
   json.bufferViews??=[];saved={bufferView:json.bufferViews.length,mimeType};json.bufferViews.push({buffer:0,byteOffset:size,byteLength:bytes.length});images.set(image.uri,saved);size+=bytes.length;
  }
  delete image.uri;Object.assign(image,saved);
 }
 if(!images.size)return buffer;
 json.buffers=[{byteLength:size}];const text=new TextEncoder().encode(JSON.stringify(json)),jsonSize=Math.ceil(text.length/4)*4,binSize=Math.ceil(size/4)*4,total=28+jsonSize+binSize;
 if(total>maximum)throw Error('GLB et textures : maximum 25 Mo.');
 const result=new Uint8Array(total),header=new DataView(result.buffer);header.setUint32(0,0x46546c67,true);header.setUint32(4,2,true);header.setUint32(8,total,true);header.setUint32(12,jsonSize,true);header.setUint32(16,0x4e4f534a,true);result.fill(32,20,20+jsonSize);result.set(text,20);header.setUint32(20+jsonSize,binSize,true);header.setUint32(24+jsonSize,0x004e4942,true);
 let offset=28+jsonSize;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length;}return result.buffer;
}
export async function imageResource(response){
 if(!response.ok)throw Error('Texture : HTTP '+response.status);
 if(Number(response.headers.get('content-length'))>maximum)throw Error('Texture trop volumineuse.');
 const reader=response.body?.getReader(),chunks=[];let size=0;
 if(reader){try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>maximum){await reader.cancel();throw Error('Texture trop volumineuse.');}chunks.push(value);}}finally{reader.releaseLock();}}
 else{const bytes=new Uint8Array(await response.arrayBuffer());size=bytes.length;chunks.push(bytes);}
 if(size>maximum)throw Error('Texture trop volumineuse.');const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return {bytes,mimeType:response.headers.get('content-type')};
}
