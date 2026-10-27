import {loadCommunityPacks,installCommunityPack,uninstallCommunityPack,installedCommunityPacks} from '../core/community-plugins.js';
import {state,notify} from '../core/state.js';
let dialog;
export function initCommunityManager(){
 loadCommunityPacks();
 const open=document.getElementById('warlikeOpenCommunity');
 if(!open)return;
 dialog=document.createElement('dialog');dialog.id='warlikeCommunityManager';
 const shell=document.createElement('section');shell.className='warlike-community-shell';
 const header=document.createElement('header');
 const title=document.createElement('h2');title.textContent='WarLike Open Ecosystem';
 const close=document.createElement('button');close.type='button';close.textContent='Fermer';close.onclick=()=>dialog.close();
 header.append(title,close);
 const description=document.createElement('p');description.textContent='Installe des packs communautaires JSON : recettes Blueprint déclaratives, sans scripts externes ni permissions système.';
 const row=document.createElement('div');row.className='warlike-community-actions';
 const picker=document.createElement('input');picker.type='file';picker.accept='.json,application/json';picker.setAttribute('aria-label','Importer un pack JSON');
 const label=document.createElement('label');label.textContent='Importer un pack .json';label.append(picker);
 const list=document.createElement('div');list.className='warlike-community-list';
 const status=document.createElement('p');status.setAttribute('role','status');
 function render(){
  list.replaceChildren();
  const packs=installedCommunityPacks();
  if(!packs.length){const empty=document.createElement('p');empty.textContent='Aucun pack installé. Importe un manifest JSON depuis ton ordinateur.';list.append(empty);return}
  for(const pack of packs){
   const card=document.createElement('article');card.className='warlike-community-pack';
   const heading=document.createElement('strong');heading.textContent=pack.name+' · v'+pack.version;
   const subtitle=document.createElement('small');subtitle.textContent='Par '+pack.author+' · '+pack.recipes.length+' recette(s)';
   const desc=document.createElement('p');desc.textContent=pack.description||'Pack communautaire';
   const names=document.createElement('small');names.textContent='Blueprint : '+pack.recipes.map(r=>r.name).join(', ');
   const remove=document.createElement('button');remove.type='button';remove.textContent='Désinstaller';
   remove.disabled=state.playing;
   remove.onclick=()=>{
    if(state.playing){status.textContent='Arrête Play pour modifier les packs.';return}
    try{uninstallCommunityPack(pack.id);status.textContent='Pack désinstallé : '+pack.name;render();notify()}
    catch(error){status.textContent=error.message}
   };
   card.append(heading,subtitle,desc,names,remove);list.append(card);
  }
 }
 picker.onchange=async()=>{
  const file=picker.files?.[0];if(!file)return;
  if(state.playing){status.textContent='Arrête Play avant toute installation.';picker.value='';return}
  try{
   if(file.size>131072)throw Error('Pack trop volumineux (128 Ko max).');
   const source=JSON.parse(await file.text());
   const pack=installCommunityPack(source);
   status.textContent=pack.name+' installé. Les recettes sont disponibles dans Inspector → Quick Start.';
   render();notify();
  }catch(error){status.textContent='Installation refusée : '+error.message}
  finally{picker.value=''}
 };
 row.append(label);shell.append(header,description,row,status,list);dialog.append(shell);document.body.append(dialog);
 open.addEventListener('click',()=>{render();dialog.showModal()});
}
