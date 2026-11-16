// Deterministic glTF 2.0 sphere with known texels. This is a material test
// instrument; representative character/vehicle/prop GLBs are checked separately.
import {deflateSync} from 'node:zlib';
import {crc32} from '../js/core/game-build.js';
function png(rgba){
 const chunk=(kind,data)=>{const name=Buffer.from(kind),body=Buffer.concat([name,data]),out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);body.copy(out,4);out.writeUInt32BE(crc32(body),out.length-4);return out;};
 const header=Buffer.alloc(13);header.writeUInt32BE(1);header.writeUInt32BE(1,4);header[8]=8;header[9]=6;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(Buffer.from([0,...rgba]))),chunk('IEND',Buffer.alloc(0))]).toString('base64');
}
export function materialProbeGlb({maps=true,normalScale=1}={}){
 const positions=[],normals=[],uv=[],indices=[],rows=16,cols=24;
 for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){const p=j/rows*Math.PI,t=i/cols*Math.PI*2,v=[Math.sin(p)*Math.cos(t),Math.cos(p),Math.sin(p)*Math.sin(t)];positions.push(...v);normals.push(...v);uv.push(i/cols,j/rows);}
 for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i,b=a+cols+1;indices.push(a,b,a+1,a+1,b,b+1);}
 const chunks=[],views=[],accessors=[];let length=0;
 const add=(array,type,componentType)=>{const data=Buffer.from(array.buffer);views.push({buffer:0,byteOffset:length,byteLength:data.length});chunks.push(data);length+=data.length;accessors.push({bufferView:views.length-1,componentType,type,count:array.length/({VEC3:3,VEC2:2,SCALAR:1}[type])});return accessors.length-1;};
 const pos=add(new Float32Array(positions),'VEC3',5126),normal=add(new Float32Array(normals),'VEC3',5126),texcoord=add(new Float32Array(uv),'VEC2',5126),index=add(new Uint16Array(indices),'SCALAR',5123);
 const material={pbrMetallicRoughness:{baseColorFactor:[.65,.35,.12,1],metallicFactor:.8,roughnessFactor:.65},emissiveFactor:[.04,.02,.01]};
 const colors=[[180,140,90,255],[195,150,235,255],[255,80,180,255],[85,85,85,255],[100,150,240,255]],images=colors.map(c=>({uri:'data:image/png;base64,'+png(c)}));
 if(maps){material.pbrMetallicRoughness.baseColorTexture={index:0};material.normalTexture={index:1,scale:normalScale};material.pbrMetallicRoughness.metallicRoughnessTexture={index:2};material.occlusionTexture={index:3,strength:.7};material.emissiveTexture={index:4};}
 const model={asset:{version:'2.0',generator:'WarLike material validation probe'},buffers:[{byteLength:length}],bufferViews:views,accessors,images,textures:images.map((_,source)=>({source})),materials:[material],meshes:[{primitives:[{attributes:{POSITION:pos,NORMAL:normal,TEXCOORD_0:texcoord,TEXCOORD_1:texcoord},indices:index,material:0}]}],nodes:[{mesh:0}],scenes:[{nodes:[0]}],scene:0};
 return encodeGlb(model,Buffer.concat(chunks));
}
export function encodeGlb(model,binary){
 const text=Buffer.from(JSON.stringify(model)),jsonSize=Math.ceil(text.length/4)*4,binSize=Math.ceil(binary.length/4)*4,out=Buffer.alloc(28+jsonSize+binSize);out.writeUInt32LE(0x46546c67);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);out.writeUInt32LE(jsonSize,12);out.writeUInt32LE(0x4e4f534a,16);out.fill(32,20,20+jsonSize);text.copy(out,20);out.writeUInt32LE(binSize,20+jsonSize);out.writeUInt32LE(0x004e4942,24+jsonSize);binary.copy(out,28+jsonSize);return out.buffer.slice(out.byteOffset,out.byteOffset+out.length);
}
export function rewriteProbe(edit){const input=materialProbeGlb(),v=new DataView(input),length=v.getUint32(12,true),model=JSON.parse(new TextDecoder().decode(new Uint8Array(input,20,length)));edit(model);return encodeGlb(model,Buffer.from(input,28+length));}
