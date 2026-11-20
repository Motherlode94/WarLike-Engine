// WarLike Editor project documents. Authoring assets are versioned project-local
// JSON documents; no implied runtime support until an importer consumes the type.
import {gameProject} from '../core/game-project.js';
import {mountAnimatorControllerProjectAssets,createNativeAnimatorControllerFromSelection} from './project-animator-assets.js';
const types={
 folder:{label:'Dossier',data:{children:[]}},
 scene:{label:'Scène',data:{entities:[],camera:{x:0,y:0,zoom:1},mode:'3d'}},
 material:{label:'Material',data:{shader:'standard',color:'#ffffff',metallic:0,roughness:.8}},
 physicMaterial:{label:'Physic Material',data:{friction:.5,restitution:0}},
 // Legacy placeholder format retained solely for reading older local documents.
 animatorController:{label:'Animator Controller (ancien document)',data:{parameters:[],states:[],transitions:[]}},
 animationClip:{label:'Animation Clip',data:{duration:1,loop:true,curves:[]}},
 avatarMask:{label:'Avatar Mask',data:{bones:[]}},
 audioMixer:{label:'Audio Mixer',data:{groups:[{name:'Master',gain:1}]}},
 renderTexture:{label:'Render Texture',data:{width:1024,height:1024,format:'rgba8'}},
 spriteAtlas:{label:'Sprite Atlas',data:{sprites:[]}},
 timeline:{label:'Timeline',data:{tracks:[],duration:10}},
 terrainLayer:{label:'Terrain Layer',data:{diffuse:null,normal:null,tileSize:[10,10]}},
 prefab:{label:'Prefab',data:{entities:[],rootId:null}},
 shaderGraph:{label:'Shader Graph',data:{nodes:[],connections:[]}}
};
export const projectCreateTypes=types;
const key=()=>`warlike.editor.assets.v1:${encodeURIComponent(gameProject.id||'untitled')}`;
const clone=value=>JSON.parse(JSON.stringify(value));
export function listProjectDocuments(){
 try{const result=JSON.parse(localStorage.getItem(key())||'[]');return Array.isArray(result)?result.filter(a=>a&&types[a.type]&&typeof a.id==='string'):[]}catch{return []}
}
function persist(items){localStorage.setItem(key(),JSON.stringify(items))}
export function createProjectDocument(type){
 if(type==='animatorController')throw Error('Utilise la ressource native Animator Controller du projet.');
 if(!types[type])throw Error('Type de document inconnu');
 const items=listProjectDocuments();
 const prefix=types[type].label;
 let suffix=1;while(items.some(a=>a.name===prefix+' '+suffix))suffix++;
 const asset={id:globalThis.crypto?.randomUUID?.()||String(Date.now())+'-'+Math.random().toString(36).slice(2),type,name:prefix+' '+suffix,version:1,createdAt:new Date().toISOString(),data:clone(types[type].data)};
 items.push(asset);persist(items);document.dispatchEvent(new Event('warlike:project-documents-changed'));return asset;
}
export function removeProjectDocument(id){
 const before=listProjectDocuments(),after=before.filter(a=>a.id!==id);
 if(after.length===before.length)return false;persist(after);document.dispatchEvent(new Event('warlike:project-documents-changed'));return true;
}
export function downloadProjectDocument(asset){
 const blob=new Blob([JSON.stringify(asset,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=asset.name.replace(/[^a-z0-9_.-]+/gi,'-')+'.warlike.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function mountProjectCreateBrowser(){
 const host=document.querySelector('#projectContent'),toolbar=document.querySelector('#projectPanel > .bottom-tabs');if(!toolbar||!host)return;
 const menu=document.createElement('details');menu.className='warlike-project-create';menu.innerHTML='<summary>＋ Créer un asset</summary>';
 const options=document.createElement('div');options.className='warlike-project-create-options';
 for(const [type,definition] of Object.entries(types)){
  if(type==='animatorController')continue;
  const button=document.createElement('button');button.type='button';button.textContent=definition.label;
  button.onclick=()=>{try{createProjectDocument(type);menu.open=false}catch(error){window.alert('Création impossible : '+error.message)}};
  options.append(button);
 }
 const animator=document.createElement('button');animator.type='button';animator.textContent='Animator Controller';
 animator.title='Créer une véritable ressource Animator Controller depuis le GameObject sélectionné.';
 animator.onclick=()=>{
  try{createNativeAnimatorControllerFromSelection();menu.open=false}
  catch(error){window.alert('Création impossible : '+error.message)}
 };
 options.prepend(animator);
 // The Project dock clips overflow; a top-layer popover keeps the native
 // menu interactive without changing dock dimensions or breaking other panels.
 options.setAttribute('popover','manual');
 const closeMenu=()=>{if(options.matches(':popover-open'))options.hidePopover();menu.open=false};
 const placeMenu=()=>{
  const r=menu.getBoundingClientRect(),width=240;
  options.style.position='fixed';
  options.style.left=Math.max(8,Math.min(window.innerWidth-width-8,r.right-width))+'px';
  options.style.top=Math.max(8,Math.min(window.innerHeight-90,r.bottom+4))+'px';
  options.style.width=width+'px';
 };
 menu.addEventListener('toggle',()=>{
  if(menu.open){placeMenu();options.showPopover()}
  else if(options.matches(':popover-open'))options.hidePopover();
 });
 document.addEventListener('pointerdown',event=>{
  if(menu.open&&!menu.contains(event.target)&&!options.contains(event.target))closeMenu();
 });
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu.open)closeMenu()});
 options.addEventListener('click',event=>{if(event.target.closest('button'))closeMenu()});
 // Keep only the trigger inside the clipped Project dock: even a popover
 // must not inherit an ancestor <details> content box or its overflow.
 toolbar.append(menu);document.body.append(options);
 const panel=document.createElement('section');panel.className='warlike-project-documents';
 const heading=document.createElement('h4');heading.textContent='Documents du projet';panel.append(heading);
 const list=document.createElement('div');list.className='warlike-project-document-list';panel.append(list);
 host.querySelector('.asset-body')?.before(panel);
 const animatorSection=mountAnimatorControllerProjectAssets(host);
 if(animatorSection)host.querySelector('.asset-body')?.before(animatorSection);
 function draw(){
  const assets=listProjectDocuments();panel.hidden=!assets.length;list.replaceChildren();
  for(const asset of assets){
   const row=document.createElement('div');row.className='warlike-project-document';
   const name=document.createElement('span');name.textContent=asset.name;
   const download=document.createElement('button');download.type='button';download.textContent='Exporter';download.title='Télécharger le document JSON éditable';download.onclick=()=>downloadProjectDocument(asset);
   const remove=document.createElement('button');remove.type='button';remove.textContent='Supprimer';remove.title='Supprimer ce document du projet';remove.onclick=()=>{if(confirm('Supprimer '+asset.name+' ?'))removeProjectDocument(asset.id)};
   row.append(name,download,remove);list.append(row);
  }
 }
 document.addEventListener('warlike:project-documents-changed',draw);
 document.addEventListener('warlike:project-opened',draw);
 draw();
}
