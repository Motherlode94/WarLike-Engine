import {loadCommunityPacks,installCommunityPack,uninstallCommunityPack,installedCommunityPacks,previewCommunityPack} from '../core/community-plugins.js';
import {communityCatalog,loadCatalogEntry} from '../core/community-catalog.js';
import {state,notify} from '../core/state.js';
let dialog;
export function initCommunityManager(){
 if(dialog)return;
 loadCommunityPacks();
 const open=document.getElementById('warlikeOpenCommunity');
 if(!open)return;
 dialog=document.createElement('dialog');dialog.id='warlikeCommunityManager';
 const shell=document.createElement('section');shell.className='warlike-community-shell';
 const header=document.createElement('header');
 const title=document.createElement('h2');title.textContent='WarLike Open Ecosystem';
 const close=document.createElement('button');close.type='button';close.textContent='Fermer';close.onclick=()=>dialog.close();
 header.append(title,close);
 const description=document.createElement('p');description.textContent='Packs Blueprint sans code exécutable. Vérifie chaque manifest avant de l’installer.';
 const row=document.createElement('div');row.className='warlike-community-actions';
 const picker=document.createElement('input');picker.type='file';picker.accept='.json,application/json';picker.setAttribute('aria-label','Importer un pack JSON');
 const label=document.createElement('label');label.textContent='Importer un pack .json';label.append(picker);
 const search=document.createElement('input');search.type='search';search.placeholder='Rechercher un pack…';search.setAttribute('aria-label','Rechercher dans les packs');
 const catalogHeading=document.createElement('h3');catalogHeading.textContent='Catalogue intégré · exemples officiels';
 const catalog=document.createElement('div');catalog.className='warlike-community-list';
 const installedHeading=document.createElement('h3');installedHeading.textContent='Mes packs installés';
 const list=document.createElement('div');list.className='warlike-community-list';
 const status=document.createElement('p');status.setAttribute('role','status');
 const preview=document.createElement('section');preview.className='warlike-community-preview';preview.hidden=true;
 const previewTitle=document.createElement('strong');
 const previewDetails=document.createElement('pre');
 const buttons=document.createElement('div');buttons.className='warlike-community-actions';
 const confirm=document.createElement('button');confirm.type='button';confirm.textContent='Installer le pack validé';
 const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Annuler';cancel.onclick=()=>{preview.hidden=true;pending=null};
 buttons.append(confirm,cancel);preview.append(previewTitle,previewDetails,buttons);
 let pending=null;
 const matches=(...strings)=>strings.join(' ').toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase());
 const message=value=>{status.textContent=value};
 const present=input=>{
  if(state.playing){message('Arrête Play avant de modifier les packs.');return}
  const information=previewCommunityPack(input);
  pending=information.action==='same-version'||information.action==='downgrade'?null:information.pack;
  previewTitle.textContent=information.pack.name+' · v'+information.pack.version;
  previewDetails.textContent=[
   'Auteur : '+information.pack.author,
   'Identifiant : '+information.pack.id,
   'API : '+information.pack.apiVersion,
   'Compatible : '+information.pack.modes.map(mode=>mode.toUpperCase()).join(' / '),
   'État : '+(information.action==='install'?'Nouvelle installation':information.action==='upgrade'?'Mise à jour '+information.installedVersion+' → '+information.pack.version:information.action==='same-version'?'Déjà installé':'Version antérieure refusée'),
   'Permissions autorisées : '+information.permissions.join(' ; '),
   'Recettes ('+information.recipes.length+') :',
   ...information.recipes.map(recipe=>' • '+recipe.name+' ['+recipe.modes.map(m=>m.toUpperCase()).join('/')+'] ('+recipe.event+') : '+recipe.actions.join(', '))
  ].join('\n');
  confirm.disabled=!pending;
  confirm.textContent=information.action==='upgrade'?'Mettre à jour le pack':'Installer le pack validé';
  preview.hidden=false;
 };
 function render(){
  list.replaceChildren();catalog.replaceChildren();
  for(const item of communityCatalog.filter(item=>matches(item.title,item.category,item.description))){
   const card=document.createElement('article');card.className='warlike-community-pack';
   const heading=document.createElement('strong');heading.textContent=item.title+' · '+item.category;
   const desc=document.createElement('p');desc.textContent=item.description;
   const inspect=document.createElement('button');inspect.type='button';inspect.textContent='Voir le manifest';
   inspect.disabled=state.playing;
   inspect.onclick=async()=>{
    if(state.playing)return;
    inspect.disabled=true;
    try{present(await loadCatalogEntry(item.id))}
    catch(error){message('Catalogue : '+error.message)}
    finally{inspect.disabled=state.playing}
   };
   card.append(heading,desc,inspect);catalog.append(card);
  }
  if(!catalog.childElementCount){const empty=document.createElement('p');empty.textContent='Aucun résultat dans le catalogue.';catalog.append(empty)}
  const packs=installedCommunityPacks().filter(pack=>matches(pack.name,pack.author,pack.description,...pack.recipes.map(r=>r.name)));
  if(!packs.length){const empty=document.createElement('p');empty.textContent='Aucun pack installé pour ce filtre.';list.append(empty);return}
  for(const pack of packs){
   const card=document.createElement('article');card.className='warlike-community-pack';
   const heading=document.createElement('strong');heading.textContent=pack.name+' · v'+pack.version;
   const subtitle=document.createElement('small');subtitle.textContent='Par '+pack.author+' · '+pack.recipes.length+' recette(s) · '+pack.modes.map(m=>m.toUpperCase()).join('/');
   const desc=document.createElement('p');desc.textContent=pack.description||'Pack communautaire';
   const names=document.createElement('small');names.textContent='Blueprint : '+pack.recipes.map(r=>r.name).join(', ');
   const remove=document.createElement('button');remove.type='button';remove.textContent='Désinstaller';
   remove.disabled=state.playing;
   remove.onclick=()=>{
    if(state.playing){message('Arrête Play pour modifier les packs.');return}
    try{uninstallCommunityPack(pack.id);message('Pack désinstallé : '+pack.name);preview.hidden=true;pending=null;render();notify()}
    catch(error){message(error.message)}
   };
   card.append(heading,subtitle,desc,names,remove);list.append(card);
  }
 }
 confirm.onclick=()=>{
  if(!pending||state.playing){message('Installation non autorisée pendant Play.');return}
  try{const installed=installCommunityPack(pending);message(installed.name+' · v'+installed.version+' installé. Recettes disponibles dans Inspector → Quick Start.');pending=null;preview.hidden=true;render();notify()}
  catch(error){message('Installation refusée : '+error.message)}
 };
 picker.onchange=async()=>{
  const file=picker.files?.[0];if(!file)return;
  try{
   if(file.size>131072)throw Error('Pack trop volumineux (128 Ko max).');
   const input=JSON.parse(await file.text());
   present(input);
  }catch(error){message('Manifest refusé : '+error.message)}
  finally{picker.value=''}
 };
 search.addEventListener('input',render);
 row.append(label);
 shell.append(header,description,row,search,catalogHeading,catalog,installedHeading,list,preview,status);
 dialog.append(shell);document.body.append(dialog);
 open.addEventListener('click',()=>{preview.hidden=true;pending=null;render();dialog.showModal()});
 document.getElementById('warlikeOpenBlueprintBuilders')?.addEventListener('click',()=>{preview.hidden=true;pending=null;search.value='Builder';render();dialog.showModal();search.focus()});
}
