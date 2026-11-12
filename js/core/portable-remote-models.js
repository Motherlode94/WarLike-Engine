import {packageGlb,imageResource} from '../assets/glb-package.js';
import {embeddedGlbImage,resolveGlbTextureUrl} from '../assets/real-models-3d.js';

// A remote model is portable only when the GLB and every sidecar image are
// included in the exported archive. No implicit network fallback at runtime.
const maxRemoteGlb=25*1024*1024;
export function portableRemoteModelDescriptor(asset){
 if(!asset||!/^[a-zA-Z0-9_-]{1,120}$/.test(asset.id))
  throw Error('Identifiant de modèle distant invalide.');
 return {id:asset.id,name:asset.name,category:asset.category,shape:'glb',
  license:asset.license||'Licence à vérifier',url:'./assets/remote/'+asset.id+'.glb'};
}
export async function portableRemoteModelBytes(asset,{fetcher=fetch}={}){
 const descriptor=portableRemoteModelDescriptor(asset);
 let url;
 try{url=new URL(asset.url)}catch{throw Error('URL de modèle distant invalide : '+asset.name)}
 if(url.protocol!=='https:'||!url.pathname.toLowerCase().endsWith('.glb')||url.username||url.password)
  throw Error('Modèle distant : URL HTTPS directe vers .glb requise — '+asset.name);
 const fetchResource=async target=>{
  let response;
  try{response=await fetcher(target,{mode:'cors',credentials:'omit',redirect:'follow'})}
  catch(e){throw Error('Ressource distante non disponible pour l’export '+asset.name+' : '+String(e.message||e))}
  if(!response?.ok)throw Error('Téléchargement du modèle/texture '+asset.name+' : HTTP '+(response?.status||'inconnu'));
  if(response.url){
   const redirected=new URL(response.url);
   if(redirected.origin!==url.origin||redirected.protocol!=='https:')
    throw Error('Redirection de ressource hors du domaine du modèle : '+asset.name);
  }
  return response;
 };
 const response=await fetchResource(url.href);
 if(Number(response.headers?.get?.('content-length')||0)>maxRemoteGlb)
  throw Error('Modèle distant trop volumineux : '+asset.name);
 const buffer=await response.arrayBuffer();
 if(buffer.byteLength>maxRemoteGlb)throw Error('Modèle distant trop volumineux : '+asset.name);
 const packaged=await packageGlb(buffer,async uri=>{
  if(typeof uri==='string'&&uri.startsWith('data:'))return embeddedGlbImage(uri);
  const resolved=resolveGlbTextureUrl(uri,url.href);
  if(!resolved)throw Error('Texture externe invalide ou hors domaine : '+uri);
  return imageResource(await fetchResource(resolved));
 });
 return {descriptor,bytes:new Uint8Array(packaged)};
}
