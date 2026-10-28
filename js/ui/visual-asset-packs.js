import {catalog, urlFor} from '../assets/catalog.js';
import {allAssets3d, prefab3d, url3d} from '../assets/catalog-3d.js';
import {workspace} from '../core/workspaces.js';
import {state,notify} from '../core/state.js';
import {addPrefab} from '../core/scene.js';
import {record} from '../core/history.js';

/** Visual asset browser. Uses the existing native 2D and 3D catalogs,
 * not fake GLB files or external model downloads. */
const PACKS = [
 {id:'genuine-3d', mode:'3d', name:'3D • Vrais modèles GLB', categories:['Characters','Vehicles','Props','Buildings','Nature','Weapons'], realOnly:true},
 {id:'starter-2d', mode:'2d', name:'2D • Starter', categories:['Characters','Props','Elements']},
 {id:'world-2d', mode:'2d', name:'2D • World & RPG', categories:['Buildings','Monsters','VFX']},
 {id:'combat-2d', mode:'2d', name:'2D • Combat & Racing', categories:['Weapons','Vehicles']},
 {id:'starter-3d', mode:'3d', name:'3D • Starter', categories:['Primitives','Nature','Terrain','Props']},
 {id:'world-3d', mode:'3d', name:'3D • World & Adventure', categories:['Buildings','Characters']},
 {id:'combat-3d', mode:'3d', name:'3D • FPS & Racing', categories:['Weapons','Vehicles']}
];
export function initVisualAssetPacks(){
 const parent=document.querySelector('#projectContent');
 if(!parent || document.querySelector('#warlikeVisualPacks'))return;
 const root=document.createElement('section');root.id='warlikeVisualPacks';
 root.setAttribute('aria-label','Packs visuels 2D et 3D');
 root.style.cssText='padding:12px;border-bottom:1px solid var(--border,#56616d);color:inherit;min-height:180px;resize:vertical;overflow:auto;box-sizing:border-box';
 root.innerHTML='<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px"><strong>▦ Asset Packs 2D / 3D</strong><button type="button" id="visualPackExpand" aria-pressed="false" title="Agrandir ou réduire la bibliothèque">⛶ Agrandir</button><select id="visualPackSelect" aria-label="Pack visuel"></select><input type="search" id="visualPackSearch" placeholder="Rechercher..." aria-label="Rechercher dans le pack" style="min-width:110px;flex:1"></div><p id="visualPackInfo" style="font-size:12px;opacity:.8;margin:4px 0 10px"></p><div id="visualPackItems" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(108px,1fr));gap:8px;min-height:140px;max-height:none;overflow:auto"></div>';
 parent.prepend(root);
 const expand=root.querySelector('#visualPackExpand');let expanded=false;
 const toggleExpanded=next=>{
  expanded=next;root.classList.toggle('warlike-asset-library-maximized',expanded);
  root.style.position=expanded?'fixed':'relative';root.style.inset=expanded?'3vh 3vw':'auto';root.style.width=expanded?'94vw':'auto';
  root.style.height=expanded?'94vh':'auto';root.style.zIndex=expanded?'99999':'auto';
  root.style.background=expanded?'var(--panel,#202934)':'transparent';root.style.border=expanded?'2px solid #7fa2bf':'none';
  root.style.boxShadow=expanded?'0 15px 75px #000a':'none';root.style.resize=expanded?'none':'vertical';
  expand.textContent=expanded?'↙ Réduire':'⛶ Agrandir';expand.setAttribute('aria-pressed',String(expanded));
 };
 expand.addEventListener('click',()=>toggleExpanded(!expanded));
 root.addEventListener('keydown',e=>{if(e.key==='Escape'&&expanded){toggleExpanded(false);e.stopPropagation()}});

 const uploadRow=document.createElement('div');uploadRow.style.cssText='padding:7px 0;display:flex;gap:8px;align-items:center;flex-wrap:wrap';
 const importSprite=document.createElement('input');importSprite.type='file';importSprite.accept='image/png';importSprite.multiple=true;importSprite.setAttribute('aria-label','Importer de vrais sprites PNG');
 const spriteInfo=document.createElement('small');spriteInfo.textContent='2D : importer des fichiers PNG (max 1 Mo chacun).';
 uploadRow.append(importSprite,spriteInfo);root.append(uploadRow);
 importSprite.addEventListener('change',async()=>{
  if(workspace.mode!=='2d'||state.playing){spriteInfo.textContent='Ouvre un projet 2D en mode édition.';return}
  const files=[...importSprite.files].slice(0,24);let count=0;
  for(const file of files){
   if(file.type!=='image/png'||file.size>1024*1024){spriteInfo.textContent='PNG requis, 1 Mo maximum par fichier.';continue}
   const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Lecture PNG impossible'));reader.readAsDataURL(file)});
   if(typeof data!=='string'||!data.startsWith('data:image/png;base64,'))continue;
   const name=file.name.replace(/\.png$/i,'').slice(0,80);
   const o={id:state.nextId++,name,type:'object',x:120+(count%5)*80,y:100+Math.floor(count/5)*80,w:64,h:64,color:'#96a5b8',spriteDataUrl:data};
   state.entities.push(o);state.selected=[o.id];count++;
  }
  if(count){record('Importer '+count+' sprites PNG');notify()}
  spriteInfo.textContent=count+' sprites PNG ajoutés dans la scène. Ils sont intégrés au fichier du projet.';
  importSprite.value='';
 });

 const select=root.querySelector('#visualPackSelect'),search=root.querySelector('#visualPackSearch'),grid=root.querySelector('#visualPackItems'),info=root.querySelector('#visualPackInfo');
 const render=()=>{
  const mode=workspace.mode==='3d'?'3d':'2d', valid=PACKS.filter(p=>p.mode===mode);
  const previous=select.value;
  select.replaceChildren(...valid.map(p=>{const o=document.createElement('option');o.value=p.id;o.textContent=p.name;return o}));
  select.value=valid.some(p=>p.id===previous)?previous:valid[0].id;
  const pack=PACKS.find(p=>p.id===select.value),query=search.value.trim().toLowerCase();
  const assets=(mode==='3d'?allAssets3d():catalog).filter(a=>pack.categories.includes(a.category) && (!pack.realOnly||(a.shape==='glb'&&!/test|reference|morph|variant|transmission|texture coordinate|specular|clear coat|normal map/i.test(a.name))) && (a.name+' '+a.category).toLowerCase().includes(query));
  info.textContent=assets.length+(pack.realOnly?' fichiers GLB de modèles identifiés · aperçu 3D non généré · chargement réseau à l’insertion':' éléments du catalogue, dont certains procéduraux')+' • Ajouter dans la scène';
  const fragment=document.createDocumentFragment();
  for(const asset of assets){
   const button=document.createElement('button');button.type='button';button.dataset.assetId=asset.id;button.dataset.mode=mode;
   button.title='Ajouter '+asset.name+' dans la scène'+(asset.license?' • '+asset.license:'');
   button.style.cssText='display:flex;flex-direction:column;align-items:center;gap:4px;padding:7px;border:1px solid #687888;border-radius:7px;background:transparent;color:inherit;cursor:pointer;min-width:0';
   const img=document.createElement('img');img.src=mode==='3d'?url3d(asset.id):urlFor(asset.id);img.alt='';img.loading='lazy';img.style.cssText='width:75px;height:72px;object-fit:contain';
   const name=document.createElement('small');name.textContent=asset.name;name.style.cssText='text-align:center;overflow-wrap:anywhere';
   if(asset.shape==='glb'){img.remove();const placeholder=document.createElement('div');placeholder.textContent='3D · GLB';placeholder.style.cssText='display:grid;place-items:center;width:75px;height:72px;border:1px dashed #7590a2;border-radius:8px;color:#b2d4ed;font-weight:700;font-size:12px';button.append(placeholder)}else button.append(img);button.append(name);if(asset.shape==='glb'){const tag=document.createElement('small');tag.textContent='GLB réel'+(asset.license?' · '+asset.license:'');tag.style.cssText='font-size:10px;opacity:.8;overflow-wrap:anywhere;text-align:center';button.append(tag)}fragment.append(button);
  }
  grid.replaceChildren(fragment);
 };
 const selectChange=()=>{search.value='';render()};
 select.addEventListener('change',selectChange);search.addEventListener('input',render);
 grid.addEventListener('click',e=>{
  const button=e.target.closest('button[data-asset-id]');if(!button || state.playing)return;
  if(button.dataset.mode==='3d'){
   if(workspace.mode!=='3d')return;
   const entity=prefab3d(button.dataset.assetId,state.nextId,120+(state.nextId%10)*25,100+(state.nextId%7)*25);
   if(!entity)return;
   state.nextId++;state.entities.push(entity);state.selected=[entity.id];record('Ajouter asset 3D : '+entity.name);notify();
  }else{
   if(workspace.mode!=='2d')return;
   addPrefab(button.dataset.assetId);
  }
 });
 document.querySelectorAll('[data-warlike-open-pack]').forEach(menuButton=>menuButton.addEventListener('click',()=>{
  const mode=menuButton.dataset.warlikeOpenPack;
  if(mode!==workspace.mode){
   const switcher=document.getElementById(mode==='3d'?'workspace3d':'workspace2d');
   if(switcher?.disabled){window.alert('Ce projet est verrouillé en '+workspace.mode.toUpperCase()+'. Ouvre le Hub et crée ou sélectionne un projet '+mode.toUpperCase()+'.');document.getElementById('hubOpen')?.click();return}
   switcher?.click();
   if(workspace.mode!==mode){window.alert('Impossible de changer de mode pour ce projet.');return}
  }
  document.getElementById('projectTab')?.click();
  document.querySelectorAll('.studio-menubar details[open]').forEach(d=>d.open=false);
  search.value='';
  render();
  root.scrollIntoView({block:'nearest',behavior:'smooth'});
  select.focus();
 }));
 let priorMode=workspace.mode;
 document.addEventListener('warlike:change',()=>{if(priorMode!==workspace.mode){priorMode=workspace.mode;search.value='';render()}});
 render();
}
