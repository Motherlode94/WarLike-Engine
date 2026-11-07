// Check the actual bundled asset before recording a prefab reference.
// This module verifies bytes and structure; it does not claim physics/animation compatibility.
export async function verifyBundledGlb(asset,{fetcher=fetch,origin=location.origin}={}){
 if(!asset?.bundled||typeof asset.url!=='string')throw Error('Modèle intégré requis.');
 const url=new URL(asset.url,origin);
 if(url.origin!==origin||!/^\/assets\/free\/(kenney|quaternius)\/[a-z0-9_./-]+\.glb$/i.test(url.pathname)||url.pathname.includes('..'))throw Error('Source GLB non autorisée.');
 const res=await fetcher(url.href,{credentials:'same-origin'});
 if(!res.ok)throw Error('GLB inaccessible : HTTP '+res.status);
 const declared=Number(res.headers?.get('content-length')||0);
 if(declared>25*1024*1024)throw Error('GLB supérieur à 25 Mo.');
 const data=await res.arrayBuffer();
 if(data.byteLength<20||data.byteLength>25*1024*1024)throw Error('Taille GLB invalide.');
 const view=new DataView(data),jsonBytes=view.getUint32(12,true);
 if(view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==data.byteLength||view.getUint32(16,true)!==0x4e4f534a||jsonBytes>data.byteLength-20)throw Error('Structure GLB 2.0 invalide.');
 const model=JSON.parse(new TextDecoder().decode(new Uint8Array(data,20,jsonBytes)).replace(/\u0000+$/g,'').trim());
 if(model.asset?.version!=='2.0'||!Array.isArray(model.meshes)||!model.meshes.length)throw Error('Aucun maillage dans ce GLB.');
 return {url:url.href,bytes:data.byteLength,meshes:model.meshes.length,animations:model.animations?.length||0};
}
