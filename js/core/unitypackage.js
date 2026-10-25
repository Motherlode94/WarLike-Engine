// Unity .unitypackage is a gzip-compressed tar of GUID/asset, GUID/pathname, GUID/asset.meta.
// Safe browser-side extraction; Unity scripts, shaders, scenes and prefab YAML are NOT executable.
const decoder=new TextDecoder();
const str=(bytes)=>decoder.decode(bytes).replace(/\0.*$/s,'').trim();
export function parseTar(bytes,{maxEntries=10000,maxEntryBytes=100*1024*1024}={}){
 const files=new Map();let offset=0,entries=0;
 while(offset+512<=bytes.byteLength){
  const header=bytes.subarray(offset,offset+512);
  if(header.every(v=>v===0))break;
  const name=str(header.subarray(0,100)),prefix=str(header.subarray(345,500));
  const raw=str(header.subarray(124,136));
  const size=parseInt(raw.replace(/[^0-7].*$/,''),8);
  if(!Number.isSafeInteger(size)||size<0||size>maxEntryBytes)throw Error('Entrée UnityPackage invalide ou trop volumineuse');
  if(++entries>maxEntries)throw Error('Archive comportant trop de fichiers');
  const start=offset+512,end=start+size;
  if(end>bytes.byteLength)throw Error('Archive TAR tronquée');
  const path=prefix?prefix+'/'+name:name;
  if(path&&header[156]!==53&&header[156]!==50)files.set(path,bytes.slice(start,end));
  offset=start+Math.ceil(size/512)*512;
 }
 return files;
}
export function packageAssets(files){
 const records=new Map();
 for(const [key,bytes] of files){
  const match=/^([^/]+)\/(asset|pathname|asset\.meta)$/.exec(key);if(!match)continue;
  const [,guid,kind]=match;
  if(!/^[a-z0-9_-]{8,64}$/i.test(guid))continue;
  const record=records.get(guid)||{guid};
  if(kind==='asset')record.data=bytes;
  if(kind==='pathname')record.path=str(bytes).replace(/\\/g,'/');
  if(kind==='asset.meta')record.meta=str(bytes);
  records.set(guid,record);
 }
 return [...records.values()].filter(v=>v.data&&v.path&&!v.path.startsWith('/')&&!v.path.split('/').includes('..')).map(v=>({
  ...v,
  kind:/\.(png|jpe?g|gif|webp)$/i.test(v.path)?'image':/\.(mp3|wav|ogg)$/i.test(v.path)?'audio':/\.(glb|gltf)$/i.test(v.path)?'model':/\.(fbx|obj)$/i.test(v.path)?'convert': 'unsupported'
 })).sort((a,b)=>a.path.localeCompare(b.path));
}
export async function decodeUnityPackage(bytes){
 if(!(bytes instanceof Uint8Array))bytes=new Uint8Array(bytes);
 if(bytes.byteLength>100*1024*1024)throw Error('Archive de plus de 100 Mo : importe une archive plus petite');
 if(bytes[0]!==0x1f||bytes[1]!==0x8b)throw Error('Ce fichier ne ressemble pas à une archive .unitypackage gzip');
 if(typeof DecompressionStream==='undefined')throw Error('Ce navigateur ne prend pas en charge DecompressionStream gzip');
 const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
 const tar=new Uint8Array(await new Response(stream).arrayBuffer());
 if(tar.byteLength>350*1024*1024)throw Error('Archive décompressée trop volumineuse (350 Mo)');
 return packageAssets(parseTar(tar));
}
