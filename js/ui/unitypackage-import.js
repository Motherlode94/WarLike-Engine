import {decodeUnityPackage} from '../core/unitypackage.js';
import {registerLocalModel} from '../assets/real-models-3d.js';
import {persistLocalModel} from '../core/local-asset-library.js';
// Browser import shelf: resource inspection and extraction; no Unity C#/scene execution.
export function initUnityPackageImport(){
 const button=document.getElementById('unityPackageImport'),file=document.getElementById('unityPackageFile'),panel=document.getElementById('unityPackageResults');
 if(!button||!file||!panel)return;
 let urls=[];
 const cleanup=()=>{for(const url of urls)URL.revokeObjectURL(url);urls=[]};
 button.onclick=()=>file.click();
 file.onchange=async()=>{
  const upload=file.files?.[0];if(!upload)return;
  cleanup();panel.hidden=false;panel.replaceChildren();
  const heading=document.createElement('strong');heading.textContent='Import UnityPackage — '+upload.name;panel.append(heading);
  const status=document.createElement('p');status.textContent='Analyse locale de l’archive…';panel.append(status);
  try{
   const assets=await decodeUnityPackage(await upload.arrayBuffer());
   status.textContent=assets.length+' ressource(s) identifiée(s). Aperçu et extraction des médias compatibles ; fichiers Unity natifs non exécutés.';
   if(!assets.length)return;
   const list=document.createElement('div');list.className='unitypackage-list';
   for(const asset of assets){
    const row=document.createElement('div');row.className='unitypackage-item';
    const name=document.createElement('span');name.textContent=asset.path+' · '+(asset.kind==='convert'?'conversion 3D nécessaire':asset.kind);
    name.title=asset.path;row.append(name);
    const ext=asset.path.split('.').pop().toLowerCase();
    const mime=({png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',wav:'audio/wav',mp3:'audio/mpeg',ogg:'audio/ogg',glb:'model/gltf-binary',gltf:'model/gltf+json'})[ext]||'application/octet-stream';
    const url=URL.createObjectURL(new Blob([asset.data],{type:mime}));urls.push(url);
    if(asset.kind==='image'){const img=document.createElement('img');img.src=url;img.alt='Aperçu '+asset.path;img.loading='lazy';row.append(img)}
    if(asset.kind==='audio'){const audio=document.createElement('audio');audio.controls=true;audio.preload='none';audio.src=url;row.append(audio)}
    const save=document.createElement('a');save.href=url;save.download=asset.path.split('/').pop()||'asset';save.textContent='↓ Extraire';row.append(save);
    if(asset.kind==='model'&&ext==='glb'){
     const add=document.createElement('button');add.type='button';add.textContent='＋ Ajouter à la bibliothèque 3D';
     add.onclick=async()=>{
      add.disabled=true;add.textContent='Import en cours…';
      try{
       const file3d=new File([asset.data],asset.path.split('/').pop(),{type:'model/gltf-binary'});
       const model=registerLocalModel(file3d);
       await persistLocalModel(model);
       add.textContent='✓ GLB enregistré — actualiser la bibliothèque';
       document.dispatchEvent(new Event('warlike:assetschanged'));
      }catch(error){add.disabled=false;add.textContent='Réessayer : '+String(error.message||error)}
     };row.append(add);
    }
    list.append(row);
   }
   panel.append(list);
  }catch(error){status.textContent='Import impossible : '+String(error.message||error)}
  finally{file.value=''}
 };
 window.addEventListener('pagehide',cleanup);
}
