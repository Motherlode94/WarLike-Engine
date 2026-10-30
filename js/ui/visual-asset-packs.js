import {lifeTownSprites} from '../assets/life-sprites-2d.js';
import {uniqueAssets,filterAssetRecords,paginateAssets} from '../core/asset-browser.js';
import {survivalSprites2d} from '../assets/survival-sprites-2d.js';
import {prefabsForMode,readPrefabs,instantiatePrefab} from '../core/prefab-library.js';
import {importedModels3d} from '../assets/real-models-3d.js';
import {captureGameScene,sceneDefinition} from '../core/game-project.js';
import {quaterniusModels3d} from '../assets/quaternius-game-assets.js';
import {catalog,urlFor} from '../assets/catalog.js';
import {freeSprites2d,freeModels3d,freeUiAssets,freeAudioAssets} from '../assets/free-game-assets.js';
import {allAssets3d,prefab3d,url3d,get3dAsset} from '../assets/catalog-3d.js';
import {workspace} from '../core/workspaces.js';
import {state,notify} from '../core/state.js';
import {addPrefab} from '../core/scene.js';
import {record} from '../core/history.js';
import {playRecordedSound,unlockAudio} from '../core/audio.js';
import {gameProject} from '../core/game-project.js';
import {assignModelThumbnail} from './real-model-thumbnail.js';
import {assetCredits} from './asset-credits.js';
import {makeWindowResizable} from './resizable-window.js';
const universal=()=>quaterniusModels3d.find(a=>a.id==='quaternius-ual1-mannequin');
const includedModels=[...freeModels3d,...quaterniusModels3d];
const categoryNames={Characters:'Personnages',Weapons:'Armes et munitions',Vehicles:'Véhicules',Monsters:'Monstres',Animals:'Animaux',Nature:'Nature',Buildings:'Bâtiments et modules',Food:'Nourriture',Props:'Accessoires'};
const groupedPacks=new Map();for(const asset of includedModels){const key=asset.author+' / '+asset.pack;if(!groupedPacks.has(key))groupedPacks.set(key,[]);groupedPacks.get(key).push(asset)}
const packGroups=[...groupedPacks.values()];
const PACKS=[
 {id:'project-scenes',mode:'any',name:'Projet · Scènes',type:'scene',assets:()=>gameProject.scenes.length?gameProject.scenes.map(a=>({...a,sceneId:a.id,id:'scene-file-'+a.id,filename:a.id+'.scene.json'})):[{id:'scene-file-'+gameProject.activeSceneId,sceneId:gameProject.activeSceneId,name:'Scène actuelle',filename:gameProject.activeSceneId+'.scene.json'}]},
 {id:'project-scripts',mode:'any',name:'Projet · Scripts C#',type:'script',assets:()=>state.entities.filter(o=>o.csharpScript).map(o=>({id:'script-file-'+o.id,name:o.csharpScript.name||o.name+'.cs',filename:o.csharpScript.name||o.name+'.cs',ownerId:o.id}))},
 {id:'project-prefabs',mode:'any',name:'Projet · Prefabs enregistrés',type:'prefab',assets:()=>prefabsForMode(readPrefabs(),workspace.mode).map(p=>{const asset=get3dAsset(p.components?.model3dId||p.components?.assetId);return {...asset,id:p.id,name:p.name,prefabRecord:p,previewModelId:asset?.id,filename:p.name+'.prefab.json'}})},
 {id:'project-imports',mode:'3d',name:'Projet · GLB importés',type:'3d',assets:()=>[...importedModels3d.values()].filter(a=>a.file||a.sourcePath)},
 {id:'included-all-3d',mode:'3d',name:'Tous les modèles inclus',type:'3d',assets:()=>includedModels},
 {id:'kenney-tiny-town-2d',mode:'2d',name:'Kenney · Tiny Town',type:'2d',assets:()=>lifeTownSprites},
 {id:'kenney-platformer-2d',mode:'2d',name:'Kenney · Platformer Art Deluxe',type:'2d',assets:()=>freeSprites2d.filter(a=>a.pack==='platformer-art-deluxe')},
 {id:'kenney-survival-isometric-2d',mode:'2d',name:'Kenney · Survie · Rendus isométriques',type:'2d',assets:()=>survivalSprites2d},
 {id:'kenney-dungeon-2d',mode:'2d',name:'Kenney · Tiny Dungeon',type:'2d',assets:()=>freeSprites2d.filter(a=>a.pack==='tiny-dungeon')},
 {id:'kenney-included-3d',mode:'3d',name:'Kenney · Modèles 3D inclus',type:'3d',assets:()=>freeModels3d},
 {id:'quaternius-monsters-3d',mode:'3d',name:'Quaternius · Ultimate Monsters',type:'3d',assets:()=>quaterniusModels3d.filter(a=>a.pack==='ultimate-monsters')},
 {id:'quaternius-animations-3d',mode:'3d',name:'Quaternius · Animations Standard',type:'animation',assets:()=>universal().animationClips.map((name,index)=>({...universal(),id:'ual1-clip-'+index,name,clipName:name}))},
 ...packGroups.map(assets=>({id:'pack-'+assets[0].author.toLowerCase()+'-'+assets[0].pack,mode:'3d',name:assets[0].author+' · '+assets[0].packName,type:'3d',assets:()=>assets})),
 {id:'kenney-ui',mode:'any',name:'Kenney · UI Pack',type:'ui',assets:()=>freeUiAssets},
 {id:'kenney-audio',mode:'any',name:'Kenney · Sons d’interface et RPG',type:'audio',assets:()=>freeAudioAssets},
 {id:'legacy-2d',mode:'2d',name:'Prototypage · SVG historiques',type:'2d',assets:()=>catalog.filter(a=>!a.spriteUrl)},
 {id:'external-3d',mode:'3d',name:'Modèles GLB externes · réseau requis',type:'3d',assets:()=>allAssets3d().filter(a=>a.shape==='glb'&&!['Kenney inclus','Quaternius inclus'].includes(a.collection)&&!/test|reference|morph|variant|transmission|texture coordinate|specular|clear coat|normal map/i.test(a.name))},
 {id:'prototype-3d',mode:'3d',name:'Prototypage · Primitives 3D',type:'3d',assets:()=>allAssets3d().filter(a=>a.shape!=='glb')}
];
const element=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text)el.textContent=text;return el};
export function initVisualAssetPacks(){
 const parent=document.querySelector('#projectContent');if(!parent||document.querySelector('#warlikeVisualPacks'))return;
 const root=element('section');root.id='warlikeVisualPacks';root.setAttribute('aria-label','Bibliothèque Kenney et Quaternius intégrée');
 const toolbar=element('div','free-asset-toolbar'),title=element('strong','','Ressources du projet'),expand=element('button','','Agrandir'),select=element('select'),search=element('input');
 expand.type='button';expand.id='visualPackExpand';expand.setAttribute('aria-pressed','false');select.id='visualPackSelect';select.setAttribute('aria-label','Pack visuel');search.id='visualPackSearch';search.type='search';search.placeholder='Rechercher une ressource…';search.setAttribute('aria-label','Rechercher dans le pack');toolbar.append(title,expand,select,search);
 const filters=element('div','free-asset-filters'),author=element('select'),category=element('select'),animated=element('label'),animatedInput=element('input');
 author.id='visualPackAuthor';author.setAttribute('aria-label','Auteur des modèles');category.id='visualPackCategory';category.setAttribute('aria-label','Catégorie des modèles');
 for(const name of ['Tous les auteurs','Kenney','Quaternius']){const option=element('option','',name);option.value=name==='Tous les auteurs'?'':name;author.append(option)}
 for(const [value,name] of [['','Toutes les catégories'],...Object.entries(categoryNames)]){const option=element('option','',name);option.value=value;category.append(option)}
 animatedInput.type='checkbox';animatedInput.id='visualPackAnimated';animated.append(animatedInput,document.createTextNode('Avec animations'));filters.append(author,category,animated);
 const info=element('p');info.id='visualPackInfo';const actions=element('div','free-asset-actions'),grid=element('div','free-asset-grid');grid.id='visualPackItems';
 const pager=element('nav','free-asset-pager'),previousPage=element('button','','← Précédent'),pageLabel=element('span'),nextPage=element('button','','Suivant →');pager.setAttribute('aria-label','Pages de ressources');previousPage.type=nextPage.type='button';pageLabel.id='visualPackPage';pageLabel.setAttribute('aria-live','polite');const jump=element('select'),sizeChoice=element('select');jump.id='visualPackPageJump';jump.setAttribute('aria-label','Aller à la page');sizeChoice.setAttribute('aria-label','Ressources par page');for(const n of [24,48,96,192]){const o=element('option','',n+' par page');o.value=n;sizeChoice.append(o)}sizeChoice.value='48';jump.onchange=()=>{page=Number(jump.value);render();grid.scrollTop=0};sizeChoice.onchange=()=>{pageSize=Number(sizeChoice.value);page=1;render();grid.scrollTop=0};pager.append(previousPage,pageLabel,jump,nextPage,sizeChoice);
 const folders=element('nav','visual-pack-folders');folders.id='visualPackFolders';folders.setAttribute('aria-label','Dossiers du projet et des ressources');const results=element('div','visual-pack-results'),browser=element('div','unity-project-browser'),viewToggle=element('button','','☷ Liste');viewToggle.type='button';viewToggle.id='visualPackView';viewToggle.setAttribute('aria-pressed','false');toolbar.append(viewToggle);let listView=false;viewToggle.onclick=()=>{listView=!listView;grid.classList.toggle('free-asset-list',listView);viewToggle.textContent=listView?'▦ Grille':'☷ Liste';viewToggle.setAttribute('aria-pressed',String(listView))};results.append(info,actions,pager,grid);browser.append(folders,results);root.append(toolbar,filters,browser);
 const oldContent=[...parent.children],advanced=element('details','unity-project-advanced'),advancedTitle=element('summary','','Importer des fichiers et gérer mes prefabs');advanced.id='projectAdvancedFiles';advanced.append(advancedTitle,...oldContent);parent.append(root,advanced);advanced.addEventListener('toggle',()=>{root.hidden=advanced.open;if(!advanced.open)render()});
 const folderFolds={};
 let expanded=false,mode=workspace.mode,observer=null,page=1,pageSize=48,lastProjectSignature='';
 const setExpanded=value=>{expanded=value;root.classList.toggle('warlike-asset-library-maximized',expanded);if(!expanded)for(const prop of ['left','top','right','bottom','width','height','min-width','min-height','max-width','max-height'])root.style.removeProperty(prop);expand.textContent=expanded?'Réduire':'Agrandir';expand.setAttribute('aria-pressed',String(expanded))};expand.onclick=()=>setExpanded(!expanded);root.addEventListener('keydown',event=>{if(event.key==='Escape'&&expanded){setExpanded(false);event.stopPropagation()}});
 makeWindowResizable(root,{enabled:()=>expanded,minWidth:400,minHeight:280,controls:false,storageKey:'warlike.window.bounds.asset-library',moveHandle:toolbar});
 const button=(parent,label,action)=>{const b=element('button','',label);b.type='button';b.disabled=state.playing;b.onclick=action;parent.append(b);return b};
 const add=asset=>{
  if(state.playing)return;
  if(workspace.mode==='3d'){const entity=prefab3d(asset.id,state.nextId,120+(state.nextId%8)*45,120+(state.nextId%5)*40);if(!entity)return;state.nextId++;state.entities.push(entity);state.selected=[entity.id];record('Ajouter '+asset.name);notify()}
  else addPrefab(asset.id);
 };
 const projectSignature=()=>JSON.stringify([gameProject.activeSceneId,gameProject.scenes.map(s=>[s.id,s.name]),state.entities.filter(o=>o.csharpScript).map(o=>[o.id,o.name,o.csharpScript.name]),[...importedModels3d.keys()],readPrefabs().map(p=>[p.id,p.name,p.mode,p.components?.type])]);
 function render(){
  observer?.disconnect();const packs=PACKS.filter(p=>p.mode===workspace.mode||p.mode==='any').sort((a,b)=>Number(a.id.startsWith('project-'))-Number(b.id.startsWith('project-'))),previous=select.value;
  select.replaceChildren(...packs.map(p=>{const o=element('option','',p.name+' · '+uniqueAssets(p.assets()).length);o.value=p.id;return o}));select.value=packs.some(p=>p.id===previous)?previous:packs[0].id;
  const pack=packs.find(p=>p.id===select.value),modelPack=pack.type==='3d';
  filters.hidden=!modelPack;
  const packAssets=uniqueAssets(pack.assets()),assets=filterAssetRecords(packAssets,{query:search.value,author:modelPack?author.value:'',category:modelPack?category.value:'',animated:modelPack&&animatedInput.checked,categoryNames}),result=paginateAssets(assets,{page,size:pageSize});page=result.page;
  previousPage.disabled=page===1;nextPage.disabled=page===result.pages;pageLabel.textContent='Page '+page+' / '+result.pages;pager.hidden=result.pages===1&&packAssets.length<=24;
  jump.replaceChildren(...Array.from({length:result.pages},(_,i)=>{const o=element('option','','Page '+(i+1));o.value=i+1;return o}));jump.value=String(page);
  const noun={scene:'scènes',script:'scripts C#',prefab:'prefabs enregistrés','3d':'modèles 3D','2d':'sprites',animation:'animations',ui:'images UI',audio:'sons'}[pack.type];
  info.textContent=result.start+'–'+result.end+' affichés · '+result.total+' résultats / '+packAssets.length+' '+noun+' dans '+pack.name;
  Object.assign(info.dataset,{visible:String(result.visible),total:String(packAssets.length),filtered:String(result.total),start:String(result.start),end:String(result.end)});actions.replaceChildren();
  folders.replaceChildren();const folderButton=(label,action,active=false,count=null)=>{const button=element('button');button.type='button';button.classList.toggle('active',active);button.append(element('span','','▱ '+label));if(count!==null)button.append(element('small','',String(count)));button.onclick=action;return button};
  const choose=id=>{select.value=id;search.value='';author.value='';category.value='';animatedInput.checked=false;page=1;render();grid.scrollTop=0};
  folders.append(element('strong','','Assets'));
  for(const [id,label] of [['project-scenes','Scènes'],['project-scripts','Scripts'],['project-prefabs','Prefabs enregistrés'],['project-imports','Imports']]){const filePack=packs.find(p=>p.id===id);if(filePack)folders.append(folderButton(label,()=>choose(id),pack.id===id,uniqueAssets(filePack.assets()).length))}
  folders.append(element('hr'));
  if(workspace.mode==='3d'){
   folders.append(folderButton('Tous les modèles',()=>choose('included-all-3d'),pack.id==='included-all-3d'&&!category.value,pack.id==='included-all-3d'&&!category.value?result.total:uniqueAssets(includedModels).length));
   for(const [value,label] of Object.entries(categoryNames))folders.append(folderButton(label,()=>{select.value='included-all-3d';category.value=value;author.value='';search.value='';animatedInput.checked=false;page=1;render();grid.scrollTop=0},pack.id==='included-all-3d'&&category.value===value,pack.id==='included-all-3d'&&category.value===value?result.total:filterAssetRecords(includedModels,{category:value}).length));
  }
  for(const authorName of ['Kenney','Quaternius']){const group=element('details'),heading=element('summary','','▱ '+authorName);group.open=folderFolds[authorName]??false;group.append(heading);group.addEventListener('toggle',()=>folderFolds[authorName]=group.open);for(const p of packs.filter(p=>!p.id.startsWith('project-')&&p.name.startsWith(authorName)&&!['kenney-included-3d','quaternius-monsters-3d','quaternius-animations-3d'].includes(p.id)))group.append(folderButton(p.name.replace(authorName+' · ',''),()=>choose(p.id),pack.id===p.id,pack.id===p.id?result.total:uniqueAssets(p.assets()).length));folders.append(group)}
  folders.append(folderButton('Mes fichiers / Importer',()=>advanced.open=true));
  if(pack.type==='ui'){
   for(const [skin,label] of [['kenney-blue','Habillage bleu des menus'],['kenney-grey','Habillage gris des menus']])button(actions,label,()=>{gameProject.uiSkin=skin;record('Interface du jeu : '+skin);notify();info.textContent='Habillage appliqué aux menus de pause et de démarrage du jeu. Kenney · UI Pack · CC0-1.0'});
  }
  const fragment=document.createDocumentFragment();
  for(const asset of result.items){
   const card=element('article','free-asset-card'),preview=element('button','free-asset-preview');preview.type='button';preview.dataset.assetId=asset.id;preview.disabled=state.playing;preview.title=pack.type==='audio'?'Écouter '+asset.name:pack.type==='ui'?'Sélectionner '+asset.name:'Ajouter '+asset.name;
   if(['scene','script'].includes(pack.type))preview.append(element('span','free-file-icon',pack.type==='scene'?'◫':'C#'));
   else if(pack.type==='prefab'&&!asset.previewModelId)preview.append(element('span','free-file-icon','◇'));
   else if(pack.type==='audio')preview.append(element('span','free-audio-symbol','▶'));
   else{const image=element('img');image.alt=asset.name;image.loading='lazy';image.draggable=false;
    if(asset.shape==='glb'){image.dataset.glbId=asset.previewModelId||asset.id;image.alt='Chargement de '+asset.name;image.className='free-model-image'}else image.src=asset.spriteUrl||(pack.type==='3d'?url3d(asset.id):urlFor(asset.id));
    if(pack.type==='animation'){image.dataset.glbId=universal().id;image.className='free-model-image';image.alt='Mannequin Universal Animation Library'}
    if(asset.pixelArt)image.classList.add('pixel-art');preview.append(image);
   }
   preview.append(element('strong','free-asset-name',asset.name));
   if(modelPack)preview.append(element('small','free-asset-meta',(categoryNames[asset.category]||asset.category)+(asset.animationClips?.length?' · '+asset.animationClips.length+' animations':'')));
   if(asset.filename||asset.url)preview.append(element('small','free-asset-file',asset.filename||asset.url.split('/').pop()));
   preview.onclick=async()=>{
    if(state.playing)return;
    if(pack.type==='scene'){captureGameScene(state.entities,state.camera,{name:sceneDefinition(gameProject.activeSceneId)?.name||'Scène principale'});const scene=sceneDefinition(asset.sceneId);if(scene){gameProject.activeSceneId=scene.id;state.entities=structuredClone(scene.entities);state.camera=structuredClone(scene.camera);state.selected=[];state.nextId=Math.max(0,...state.entities.map(o=>o.id))+1;record('Ouvrir la scène '+scene.name);notify();document.dispatchEvent(new Event('warlike:project'))}return}
    if(pack.type==='script'){state.selected=[asset.ownerId];notify();document.getElementById('openCsharpRuntime')?.click();document.getElementById('csharpScriptLoad')?.click();return}
    if(pack.type==='prefab'){const entity=instantiatePrefab(asset.prefabRecord,state.nextId++,160,160);state.entities.push(entity);state.selected=[entity.id];record('Instancier '+asset.name);notify();return}
    if(pack.type==='animation'){let owner=state.entities.find(o=>state.selected.includes(o.id)&&o.model3dId===universal().id);if(!owner){owner=prefab3d(universal().id,state.nextId++,180,160);state.entities.push(owner)}Object.assign(owner,{animation3dClip:asset.clipName,animationAuto:false,animationPreview:true});state.selected=[owner.id];record('Animation Quaternius : '+asset.clipName);notify();info.textContent='Prévisualisation : '+asset.clipName+' · mannequin du pack Standard gratuit · Quaternius · CC0-1.0';return}
    if(pack.type==='audio'){unlockAudio();try{await playRecordedSound(asset.id,{cooldown:0});info.textContent='Écoute : '+asset.name+' · '+asset.packName+' · Kenney · CC0-1.0'}catch(error){info.textContent='Lecture impossible : '+error.message}return}
    if(pack.type==='ui'&&workspace.mode==='3d'){info.textContent=asset.name+' · Image UI. Les boutons ci-dessus appliquent l’habillage aux menus du jeu.';return}
    add(asset);
   };
   card.append(preview);if(asset.author)preview.append(element('small','free-asset-meta',asset.author+' · CC0'));
   if(pack.type==='audio')button(card,'Ajouter une Audio Source',()=>{if(state.playing)return;const object={id:state.nextId++,name:asset.name,type:'object',x:160,y:140,w:28,h:28,color:'#78aebf',collision3d:false,visible:false,audioEnabled:true,audioClip:asset.id,audioGain:.6,audioRange:18,audioInterval:3,audioLoop:false,audioSpatial:true};state.entities.push(object);state.selected=[object.id];record('Ajouter Audio Source Kenney');notify()});
   fragment.append(card);
  }
  grid.replaceChildren(fragment);if(!result.total)grid.append(element('p','free-asset-empty','Aucune ressource ne correspond aux filtres. Efface la recherche ou change de catégorie.'));lastProjectSignature=projectSignature();
  observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);if(entry.target.isConnected)assignModelThumbnail(entry.target,entry.target.dataset.glbId)}},{root:expanded?root:null,rootMargin:'120px'});
  grid.querySelectorAll('img[data-glb-id]').forEach(image=>observer.observe(image));
 }
 const resetPage=()=>{page=1;render();root.scrollTop=0;grid.scrollTop=0};
 select.onchange=()=>{search.value='';author.value='';category.value='';animatedInput.checked=false;resetPage()};search.oninput=resetPage;author.onchange=category.onchange=animatedInput.onchange=resetPage;
 previousPage.onclick=()=>{page--;render();root.scrollTop=0;grid.scrollTop=0};nextPage.onclick=()=>{page++;render();root.scrollTop=0;grid.scrollTop=0};
 const upload=element('details','free-sprite-import'),summary=element('summary','','Importer mes sprites PNG'),input=element('input'),status=element('small');input.type='file';input.accept='image/png';input.multiple=true;input.setAttribute('aria-label','Importer de vrais sprites PNG');upload.append(summary,input,status);results.append(upload);
 input.onchange=async()=>{if(state.playing||workspace.mode!=='2d'){status.textContent='Ouvre un projet 2D en édition.';return}let count=0;for(const file of [...input.files].slice(0,24)){if(file.type!=='image/png'||file.size>1024*1024)continue;const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file)});state.entities.push({id:state.nextId++,name:file.name.replace(/\.png$/i,''),type:'object',x:120+count*30,y:100,w:64,h:64,color:'#96a5b8',spriteDataUrl:data});count++}if(count){state.selected=[state.entities.at(-1).id];record('Importer '+count+' PNG');notify()}status.textContent=count+' PNG ajoutés et intégrés au projet.';input.value=''};
 document.querySelectorAll('[data-warlike-open-pack]').forEach(b=>b.addEventListener('click',()=>{const requested=b.dataset.warlikeOpenPack;if(workspace.mode!==requested){const switcher=document.getElementById(requested==='3d'?'workspace3d':'workspace2d');if(!switcher?.disabled)switcher?.click();if(workspace.mode!==requested){document.getElementById('hubOpen')?.click();return}}document.getElementById('projectTab')?.click();document.querySelectorAll('.studio-menubar details[open]').forEach(d=>d.open=false);search.value='';render();root.scrollIntoView({block:'nearest'});select.focus()}));
 document.addEventListener('warlike:workspace',()=>{if(mode!==workspace.mode)select.value='';mode=workspace.mode;search.value='';render()});document.addEventListener('warlike:change',()=>{if(mode!==workspace.mode){select.value='';mode=workspace.mode;search.value='';render()}else if(projectSignature()!==lastProjectSignature)render()});document.addEventListener('warlike:project',render);document.addEventListener('warlike:prefabs',render);window.addEventListener('storage',event=>{if(event.key==='warlike.prefabs.library.v1')render()});render();
}
