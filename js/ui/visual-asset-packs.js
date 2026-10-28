import {quaterniusModels3d} from '../assets/quaternius-game-assets.js';
import {catalog,urlFor} from '../assets/catalog.js';
import {freeSprites2d,freeModels3d,freeUiAssets,freeAudioAssets} from '../assets/free-game-assets.js';
import {allAssets3d,prefab3d,url3d} from '../assets/catalog-3d.js';
import {workspace} from '../core/workspaces.js';
import {state,notify} from '../core/state.js';
import {addPrefab} from '../core/scene.js';
import {record} from '../core/history.js';
import {playRecordedSound,unlockAudio} from '../core/audio.js';
import {gameProject} from '../core/game-project.js';
import {assignModelThumbnail} from './real-model-thumbnail.js';
import {assetCredits} from './asset-credits.js';
const universal=()=>quaterniusModels3d.find(a=>a.id==='quaternius-ual1-mannequin');
const PACKS=[
 {id:'kenney-platformer-2d',mode:'2d',name:'Kenney · Platformer Art Deluxe',type:'2d',assets:()=>freeSprites2d.filter(a=>a.pack==='platformer-art-deluxe')},
 {id:'kenney-dungeon-2d',mode:'2d',name:'Kenney · Tiny Dungeon',type:'2d',assets:()=>freeSprites2d.filter(a=>a.pack==='tiny-dungeon')},
 {id:'kenney-included-3d',mode:'3d',name:'Kenney · Modèles 3D inclus',type:'3d',assets:()=>freeModels3d},
 {id:'quaternius-monsters-3d',mode:'3d',name:'Quaternius · Ultimate Monsters',type:'3d',assets:()=>quaterniusModels3d.filter(a=>a.category==='Monsters')},
 {id:'quaternius-animations-3d',mode:'3d',name:'Quaternius · Animations Standard',type:'animation',assets:()=>universal().animationClips.map((name,index)=>({...universal(),id:'ual1-clip-'+index,name,clipName:name}))},
 {id:'kenney-ui',mode:'any',name:'Kenney · UI Pack',type:'ui',assets:()=>freeUiAssets},
 {id:'kenney-audio',mode:'any',name:'Kenney · Sons d’interface et RPG',type:'audio',assets:()=>freeAudioAssets},
 {id:'legacy-2d',mode:'2d',name:'Prototypage · SVG historiques',type:'2d',assets:()=>catalog.filter(a=>!a.spriteUrl)},
 {id:'external-3d',mode:'3d',name:'Modèles GLB externes · réseau requis',type:'3d',assets:()=>allAssets3d().filter(a=>a.shape==='glb'&&!['Kenney inclus','Quaternius inclus'].includes(a.collection)&&!/test|reference|morph|variant|transmission|texture coordinate|specular|clear coat|normal map/i.test(a.name))},
 {id:'prototype-3d',mode:'3d',name:'Prototypage · Primitives 3D',type:'3d',assets:()=>allAssets3d().filter(a=>a.shape!=='glb')}
];
const element=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text)el.textContent=text;return el};
export function initVisualAssetPacks(){
 const parent=document.querySelector('#projectContent');if(!parent||document.querySelector('#warlikeVisualPacks'))return;
 const root=element('section');root.id='warlikeVisualPacks';root.setAttribute('aria-label','Ressources gratuites Kenney');
 const toolbar=element('div','free-asset-toolbar'),title=element('strong','','Ressources du projet'),expand=element('button','','Agrandir'),select=element('select'),search=element('input');
 expand.type='button';expand.id='visualPackExpand';expand.setAttribute('aria-pressed','false');select.id='visualPackSelect';select.setAttribute('aria-label','Pack visuel');search.id='visualPackSearch';search.type='search';search.placeholder='Rechercher une ressource…';search.setAttribute('aria-label','Rechercher dans le pack');toolbar.append(title,expand,select,search);
 const info=element('p');info.id='visualPackInfo';const actions=element('div','free-asset-actions'),grid=element('div','free-asset-grid');grid.id='visualPackItems';root.append(toolbar,info,actions,grid);parent.prepend(root);
 let expanded=false,mode=workspace.mode,observer=null;
 const setExpanded=value=>{expanded=value;root.classList.toggle('warlike-asset-library-maximized',expanded);expand.textContent=expanded?'Réduire':'Agrandir';expand.setAttribute('aria-pressed',String(expanded))};expand.onclick=()=>setExpanded(!expanded);root.addEventListener('keydown',event=>{if(event.key==='Escape'&&expanded){setExpanded(false);event.stopPropagation()}});
 const button=(parent,label,action)=>{const b=element('button','',label);b.type='button';b.disabled=state.playing;b.onclick=action;parent.append(b);return b};
 const add=asset=>{
  if(state.playing)return;
  if(workspace.mode==='3d'){const entity=prefab3d(asset.id,state.nextId,120+(state.nextId%8)*45,120+(state.nextId%5)*40);if(!entity)return;state.nextId++;state.entities.push(entity);state.selected=[entity.id];record('Ajouter '+asset.name);notify()}
  else addPrefab(asset.id);
 };
 function render(){
  observer?.disconnect();const packs=PACKS.filter(p=>p.mode===workspace.mode||p.mode==='any'),previous=select.value;
  select.replaceChildren(...packs.map(p=>{const o=element('option','',p.name);o.value=p.id;return o}));select.value=packs.some(p=>p.id===previous)?previous:packs[0].id;
  const pack=packs.find(p=>p.id===select.value),query=search.value.trim().toLowerCase(),assets=pack.assets().filter(a=>(a.name+' '+(a.category||'')+' '+(a.packName||'')).toLowerCase().includes(query));
  info.textContent=assets.length+' ressources · '+(pack.id==='external-3d'?'Connexion requise':'Fichiers inclus dans le moteur et l’export Web')+(pack.id.startsWith('kenney')?' · Kenney · CC0-1.0':'');actions.replaceChildren();
  if(pack.type==='ui'){
   for(const [skin,label] of [['kenney-blue','Habillage bleu des menus'],['kenney-grey','Habillage gris des menus']])button(actions,label,()=>{gameProject.uiSkin=skin;record('Interface du jeu : '+skin);notify();info.textContent='Habillage appliqué aux menus de pause et de démarrage du jeu. Kenney · UI Pack · CC0-1.0'});
  }
  const fragment=document.createDocumentFragment();
  for(const asset of assets){
   const card=element('article','free-asset-card'),preview=element('button','free-asset-preview');preview.type='button';preview.dataset.assetId=asset.id;preview.disabled=state.playing;preview.title=pack.type==='audio'?'Écouter '+asset.name:pack.type==='ui'?'Sélectionner '+asset.name:'Ajouter '+asset.name;
   if(pack.type==='audio')preview.append(element('span','free-audio-symbol','▶'));
   else{const image=element('img');image.alt=asset.name;image.loading='lazy';image.draggable=false;
    if(asset.shape==='glb'){image.dataset.glbId=asset.id;image.alt='Chargement de '+asset.name;image.className='free-model-image'}else image.src=asset.spriteUrl||(pack.type==='3d'?url3d(asset.id):urlFor(asset.id));
    if(pack.type==='animation'){image.dataset.glbId=universal().id;image.className='free-model-image';image.alt='Mannequin Universal Animation Library'}
    if(asset.pixelArt)image.classList.add('pixel-art');preview.append(image);
   }
   preview.append(element('strong','free-asset-name',asset.name));
   preview.onclick=async()=>{
    if(pack.type==='animation'){let owner=state.entities.find(o=>state.selected.includes(o.id)&&o.model3dId===universal().id);if(!owner){owner=prefab3d(universal().id,state.nextId++,180,160);state.entities.push(owner)}Object.assign(owner,{animation3dClip:asset.clipName,animationAuto:false,animationPreview:true});state.selected=[owner.id];record('Animation Quaternius : '+asset.clipName);notify();info.textContent='Prévisualisation : '+asset.clipName+' · mannequin du pack Standard gratuit · Quaternius · CC0-1.0';return}
    if(pack.type==='audio'){unlockAudio();try{await playRecordedSound(asset.id,{cooldown:0});info.textContent='Écoute : '+asset.name+' · '+asset.packName+' · Kenney · CC0-1.0'}catch(error){info.textContent='Lecture impossible : '+error.message}return}
    if(pack.type==='ui'&&workspace.mode==='3d'){info.textContent=asset.name+' · Image UI. Les boutons ci-dessus appliquent l’habillage aux menus du jeu.';return}
    add(asset);
   };
   card.append(preview);if(asset.author)card.append(assetCredits(asset));
   if(pack.type==='audio')button(card,'Ajouter une Audio Source',()=>{if(state.playing)return;const object={id:state.nextId++,name:asset.name,type:'object',x:160,y:140,w:28,h:28,color:'#78aebf',collision3d:false,visible:false,audioEnabled:true,audioClip:asset.id,audioGain:.6,audioRange:18,audioInterval:3,audioLoop:false,audioSpatial:true};state.entities.push(object);state.selected=[object.id];record('Ajouter Audio Source Kenney');notify()});
   fragment.append(card);
  }
  grid.replaceChildren(fragment);
  observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);if(entry.target.isConnected)assignModelThumbnail(entry.target,entry.target.dataset.glbId)}},{root:expanded?root:null,rootMargin:'120px'});
  grid.querySelectorAll('img[data-glb-id]').forEach(image=>observer.observe(image));
 }
 select.onchange=()=>{search.value='';render();root.scrollTop=0};search.oninput=()=>{render();root.scrollTop=0};
 const upload=element('details','free-sprite-import'),summary=element('summary','','Importer mes sprites PNG'),input=element('input'),status=element('small');input.type='file';input.accept='image/png';input.multiple=true;input.setAttribute('aria-label','Importer de vrais sprites PNG');upload.append(summary,input,status);root.append(upload);
 input.onchange=async()=>{if(state.playing||workspace.mode!=='2d'){status.textContent='Ouvre un projet 2D en édition.';return}let count=0;for(const file of [...input.files].slice(0,24)){if(file.type!=='image/png'||file.size>1024*1024)continue;const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file)});state.entities.push({id:state.nextId++,name:file.name.replace(/\.png$/i,''),type:'object',x:120+count*30,y:100,w:64,h:64,color:'#96a5b8',spriteDataUrl:data});count++}if(count){state.selected=[state.entities.at(-1).id];record('Importer '+count+' PNG');notify()}status.textContent=count+' PNG ajoutés et intégrés au projet.';input.value=''};
 document.querySelectorAll('[data-warlike-open-pack]').forEach(b=>b.addEventListener('click',()=>{const requested=b.dataset.warlikeOpenPack;if(workspace.mode!==requested){const switcher=document.getElementById(requested==='3d'?'workspace3d':'workspace2d');if(!switcher?.disabled)switcher?.click();if(workspace.mode!==requested){document.getElementById('hubOpen')?.click();return}}document.getElementById('projectTab')?.click();document.querySelectorAll('.studio-menubar details[open]').forEach(d=>d.open=false);search.value='';render();root.scrollIntoView({block:'nearest'});select.focus()}));
 document.addEventListener('warlike:workspace',()=>{if(mode!==workspace.mode)select.value='';mode=workspace.mode;search.value='';render()});document.addEventListener('warlike:change',()=>{if(mode!==workspace.mode){select.value='';mode=workspace.mode;search.value='';render()}});render();
}
