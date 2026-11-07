// Optional 3D prefab model preview. Loads an actual GLB and the viewer on request.
export function setup3dPreview({onInstall,isInstalled}){
 const $=id=>document.getElementById(id),dialog=$('modelPreview'),root=$('modelViewport');
 if(!dialog||!root)return null;
 let asset=null,objectUrl=null,viewerPromise=null,requestId=0;
 const note=message=>{$('modelPreviewStatus').textContent=message};
 function clear(){root.querySelectorAll('model-viewer,img').forEach(x=>x.remove());if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=null}}
 function initViewer(){if(customElements.get('model-viewer'))return Promise.resolve();
  if(!viewerPromise)viewerPromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.type='module';script.src='https://cdn.jsdelivr.net/npm/@google/model-viewer@4.1.0/dist/model-viewer.min.js';script.onload=()=>customElements.whenDefined('model-viewer').then(resolve,reject);script.onerror=()=>reject(Error('Visualiseur 3D non accessible'));document.head.append(script)}).catch(error=>{viewerPromise=null;throw error});
  return viewerPromise;
 }
 const setClips=viewer=>{const names=viewer.availableAnimations||[],select=$('modelClips');select.replaceChildren(new Option(names.length?'Animation désactivée':'Aucun clip disponible',''));for(const name of names)select.append(new Option(name,name));select.disabled=!names.length;if(names.length){select.value=names[0];viewer.animationName=names[0];viewer.play();}};
 async function loadModel(){
  const selected=asset,id=++requestId;clear();note('Lecture du modèle GLB réel…');$('modelLoad').disabled=true;
  try{
   const url=new URL(selected.url);
   if(url.origin!==location.origin||!url.pathname.includes('/assets/free/')||!url.pathname.toLowerCase().endsWith('.glb'))throw Error('Source du modèle non autorisée');
   const response=await fetch(url.href,{credentials:'same-origin'});if(!response.ok)throw Error('HTTP '+response.status);
   const size=Number(response.headers.get('content-length')||0);if(size>25*1024*1024)throw Error('Modèle supérieur à 25 Mo');
   const blob=await response.blob();if(blob.size<12||blob.size>25*1024*1024)throw Error('Fichier invalide');
   const header=new DataView(await blob.slice(0,12).arrayBuffer());
   if(header.getUint32(0,true)!==0x46546c67||header.getUint32(4,true)!==2||header.getUint32(8,true)!==blob.size)throw Error('Signature GLB invalide');
   await initViewer();if(id!==requestId||!dialog.open)return;
   objectUrl=URL.createObjectURL(blob);const view=document.createElement('model-viewer');
   view.src=objectUrl;view.setAttribute('camera-controls','');view.setAttribute('shadow-intensity','1');
   view.setAttribute('environment-image','neutral');view.setAttribute('alt','Modèle 3D : '+selected.name);
   view.style.cssText='width:100%;height:100%';
   view.addEventListener('load',()=>{setClips(view);note('Modèle chargé · souris : rotation / molette : zoom')});
   view.addEventListener('error',()=>note('Impossible de rendre ce GLB avec le visualiseur.'));
   root.append(view);
  }catch(error){if(id===requestId)note('Aperçu impossible : '+error.message)}
  finally{if(id===requestId)$('modelLoad').disabled=false}
 }
 function open(selected){requestId++;clear();asset=selected;$('modelPreviewName').textContent=selected.name;
  $('modelPreviewInfo').textContent=selected.author+' · '+selected.packName+' · '+selected.category+' · '+(selected.triangles?selected.triangles+' triangles · ':'')+(selected.animationClips||0)+' clips · '+selected.license;
  $('modelSource').href=selected.source;$('modelScale').value='1';$('modelScaleText').textContent='1×';$('modelCollision').checked=selected.category!=='Nature';
  $('modelClips').replaceChildren(new Option('Aucun clip chargé',''));$('modelClips').disabled=true;
  $('modelInstall').disabled=isInstalled(selected);$('modelInstall').textContent=isInstalled(selected)?'✓ Déjà installé':'Installer le prefab';
  note('Clique sur Charger la 3D pour visualiser le véritable modèle.');if(selected.thumb){const img=document.createElement('img');img.src=selected.thumb;img.alt='Aperçu de '+selected.name;img.style.cssText='max-width:90%;max-height:90%;object-fit:contain';root.append(img)}
  dialog.showModal();
 }
 $('modelLoad').onclick=loadModel;
 $('modelClose').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{requestId++;clear();asset=null});
 $('modelClips').onchange=e=>{const view=root.querySelector('model-viewer');if(!view)return;if(e.target.value){view.animationName=e.target.value;view.play()}else view.pause()};
 $('modelScale').oninput=e=>$('modelScaleText').textContent=e.target.value+'×';
 $('modelInstall').onclick=()=>{if(!asset)return;try{const result=onInstall(asset,{scale:Number($('modelScale').value),collision:$('modelCollision').checked});note(result.installed?'✓ Prefab 3D installé dans la bibliothèque.':'Ce prefab existe déjà et n’a pas été écrasé.');$('modelInstall').disabled=true;$('modelInstall').textContent='✓ Installé'}catch(e){note('Installation : '+e.message)}};
 return {open};
}
