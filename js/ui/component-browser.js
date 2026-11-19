import {componentChoices,addObjectComponent,resetObjectComponent,removeObjectComponent,webDataComponentKinds,inspectorComponentRank} from '../core/component-definitions.js';
import {state,notify} from '../core/state.js';
import {record} from '../core/history.js';
import {workspace} from '../core/workspaces.js';
import {portableComponentKinds,webComponentKinds} from '../core/runtime-capabilities.js';
const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text)el.textContent=text;return el};
// The Add Component picker lists every component supported by the current
// project mode. Existing entities and unknown legacy component data are untouched.
const featuredKinds=new Set(['collider2d','rigidbody2d','collider3d','rigidbody3d','joint3d','cameraRig','controller2d','controller3d','animatorGraph','ai','sequence','stats','inventory','webScripts','warScripts']);
// Native entries are real components, not prefabs. Web portability is reported per kind.
const nativePrimaryKinds=new Set(['Weapon','Damageable','Health','Projectile','Rigidbody','Team','Score','Respawn','DeathmatchRules','SpawnPoint','AmmoPickup','HealthPickup','KillZone','ObjectiveZone','AutoRotate','LinearMotion','FollowActor','VehicleController','TacticalSquad','Roleplay','RacingRules','SimulationEconomy','RpgProgression','FourXEmpire']);
const nativeCategories=Object.freeze({
 Weapon:'Gameplay',Damageable:'Gameplay',Health:'Gameplay',Projectile:'Gameplay',
 Rigidbody:'Physics',Team:'Gameplay',Score:'Gameplay',Respawn:'Gameplay',DeathmatchRules:'Gameplay',
 SpawnPoint:'Gameplay',AmmoPickup:'Gameplay',HealthPickup:'Gameplay',KillZone:'Gameplay',ObjectiveZone:'Gameplay',
 AutoRotate:'Movement',LinearMotion:'Movement',FollowActor:'Navigation',
 VehicleController:'Vehicles',TacticalSquad:'Navigation',
 Roleplay:'Gameplay',RacingRules:'Gameplay',SimulationEconomy:'Gameplay',RpgProgression:'Gameplay',FourXEmpire:'Gameplay'
});
const unityCategories=Object.freeze({
 Animation:['animatorGraph','spriteAnimation2d'],
 Audio:['audio'],
 Constraints:['joint3d'],
 Effects:['fxEmitter'],
 Event:['sequence','adventureInteractable'],
 Input:['cameraRig'],
 Movement:['controller2d','controller3d'],
 Vehicles:['data-VehicleController'],
 Layout:['uiCanvas','uiRect','uiElement'],
 Mesh:['spriteRenderer2d','tilemap2d'],
 Navigation:['ai','tacticalUnit','data-FollowActor','data-TacticalSquad'],
 'Physics 2D':['collider2d','rigidbody2d','joint2d','effector2d'],
 Physics:['collider3d','rigidbody3d','grab3d','data-Rigidbody'],
 Rendering:['light','sceneCamera3d','camera2d','environmentProbe3d'],
 Scripts:['webScripts','warScripts'],
 Gameplay:['stats','inventory','adventureInteractable','superhero','rpgProgression','horrorHideConfig','horrorFearConfig','data-Weapon','data-Damageable','data-Health','data-Projectile','data-Team','data-Score','data-Respawn','data-DeathmatchRules','data-SpawnPoint','data-AmmoPickup','data-HealthPickup','data-KillZone','data-ObjectiveZone','data-Roleplay','data-RacingRules','data-SimulationEconomy','data-RpgProgression','data-FourXEmpire']
});
const categoryById=new Map(Object.entries(unityCategories).flatMap(([group,ids])=>ids.map(id=>[id,group])));
export const unityComponentCategory=option=>categoryById.get(option.id)||(
 option.id?.startsWith('data-')?(nativeCategories[option.id.slice(5)]||'Miscellaneous'):option.runtime==='dotnet'?'Scripts':option.category==='Personnage'?'Gameplay':option.category==='Intelligence artificielle'?'Navigation':'Miscellaneous'
);
const categoryOrder=['Animation','Audio','Constraints','Effects','Event','Input','Layout','Mesh','Miscellaneous','Movement','Navigation','Physics 2D','Physics','Vehicles','Playables','Rendering','Scripts','Gameplay'];
export const unityComponentCategories=options=>[...new Set(options.map(unityComponentCategory))].sort((a,b)=>{
 const ai=categoryOrder.indexOf(a),bi=categoryOrder.indexOf(b);
 return (ai<0?999:ai)-(bi<0?999:bi)||a.localeCompare(b,'en');
});

export const componentBrowserCategory=option=>{
 if(option.id==='script')return 'Scripts';
 if(['collider2d','rigidbody2d','collider3d','rigidbody3d','joint3d'].includes(option.id))return 'Physique';
 if(['cameraRig','light','audio'].includes(option.id))return 'Rendu et scène';
 if(['webScripts','warScripts'].includes(option.id))return 'Scripts';
 return option.category||'Autres';
};
export const componentBrowserMatches=(option,query)=>!query||[option.name,option.category,option.description,option.id,option.runtime].some(part=>String(part||'').toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr')));
export const orderComponentBrowserOptions=options=>[...options].sort((a,b)=>
 Number(!featuredKinds.has(a.id))-Number(!featuredKinds.has(b.id))||
 componentBrowserCategory(a).localeCompare(componentBrowserCategory(b),'fr')||
 a.name.localeCompare(b.name,'fr')
);
export function openComponentBrowser(){
 const button=document.querySelector('#objectComponentBrowser>summary');
 if(button)button.click();
}
export function renderComponentBrowser(parent,owner,nativeCatalog,openScript){
 const root=make('details','inspector-add-component');root.id='objectComponentBrowser';
 const heading=make('summary','','Add Component');
 heading.setAttribute('aria-label','Ajouter un composant WarLike');
 root.append(heading);
 const options=componentChoices(workspace.mode)
  .map(d=>({...d,runtime:d.runtime||'web',attached:d.id==='sequence'?false:owner[d.id]!=null,add:()=>addObjectComponent(owner,d.id,workspace.mode)}));
 if(workspace.mode==='3d')options.push({
  id:'light',name:'Lumière ponctuelle',category:'Rendu et scène',
  description:'Éclaire la scène 3D.',runtime:'web',
  attached:!!owner.lightType&&owner.lightType!=='none',
  add:()=>{Object.assign(owner,{lightType:'point',lightEnabled:true,lightColor:'#ffd48b',lightIntensity:3,lightRange:13,lightAngle:45});return true}
 });
 options.push({
  id:'audio',name:'Audio Source',category:'Rendu et scène',
  description:'Son spatial et clip audio.',runtime:'web',
  attached:owner.audioEnabled!==undefined,
  add:()=>{Object.assign(owner,{audioEnabled:true,audioClip:'kenney-interface-sounds-click_001',audioGain:.6,audioRange:18,audioInterval:3});return true}
 });
 for(const [category,kinds] of Object.entries(nativeCatalog)){
  for(const [kind,defaults] of Object.entries(kinds)){
   if(!nativePrimaryKinds.has(kind))continue;
   const portable=portableComponentKinds.has(kind)||webComponentKinds.has(kind);
   options.push({
    id:'data-'+kind,name:kind,category:nativeCategories[kind]||category,
    description:portable
     ?'Composant de comportement Web existant ; réglages enregistrés dans l’objet. Vérifier son effet dans Play et export.'
     :'Composant natif nécessitant le pont .NET local. Non disponible en export Web.',
    runtime:portable?'web':'dotnet',
    attached:owner.csharpComponents?.some(c=>c.kind===kind),
    add:()=>{
     owner.csharpComponents??=[];
     if(owner.csharpComponents.some(c=>c.kind===kind))return false;
     owner.csharpComponents.push({kind,...structuredClone(defaults),...(portable?{runtime:'web'}:{})});
     return true;
    }
   });
  }
 }
 // Script Studio is an editor tool, never a fake attachable component.
 // It remains accessible through its dedicated Inspector/toolbar action.
 const popup=make('div','unity-component-popup');
 popup.setAttribute('role','dialog');popup.setAttribute('aria-label','Ajouter un composant');
 popup.hidden=true;
 const search=make('input','unity-component-search');search.type='search';search.placeholder='Rechercher : physique, IA, animation, script…';search.setAttribute('aria-label','Rechercher un composant');
 const list=make('div','component-browser-results'),hint=make('small','component-browser-hint');
 const trail=make('nav','component-browser-breadcrumb');trail.setAttribute('aria-label','Navigation catégories');
 let activeCategory=null;
 const title=make('div','unity-component-popup-title','Add Component');
 popup.append(title,search,trail,list,hint);
 // A body-level popup avoids being clipped by the narrow, scrolling Inspector.
 document.body.append(popup);
 let opened=false;
 let positionFrame=0;
 const schedulePosition=()=>{if(!opened||positionFrame)return;positionFrame=requestAnimationFrame(()=>{positionFrame=0;position()})};
 const position=()=>{
  if(!opened)return;
  if(!heading.isConnected){close();popup.remove();return}
  const anchor=heading.getBoundingClientRect(),width=Math.min(330,Math.max(240,window.innerWidth-16));
  popup.style.width=width+'px';
  popup.style.left=Math.max(8,Math.min(window.innerWidth-width-8,anchor.left+(anchor.width-width)/2))+'px';
  const above=window.innerHeight-anchor.bottom<300&&anchor.top>300;
  popup.style.top=above?'auto':Math.max(8,anchor.bottom+5)+'px';
  popup.style.bottom=above?Math.max(8,window.innerHeight-anchor.top+5)+'px':'auto';
 };
 const close=()=>{
  if(!opened)return;opened=false;popup.hidden=true;root.open=false;
  document.removeEventListener('pointerdown',outside,true);
  document.removeEventListener('keydown',keyboard,true);
  window.removeEventListener('resize',schedulePosition);
  document.removeEventListener('scroll',schedulePosition,true);
  window.removeEventListener('pointermove',schedulePosition);
  if(positionFrame){cancelAnimationFrame(positionFrame);positionFrame=0}
  if(heading.isConnected)heading.focus();
 };
 const outside=e=>{if(!popup.contains(e.target)&&!heading.contains(e.target))close()};
 const keyboard=e=>{
  if(e.key==='Escape'){e.preventDefault();if(activeCategory&&!search.value.trim()){activeCategory=null;render()}else close()}
  if(e.key==='ArrowDown'&&document.activeElement===search){e.preventDefault();list.querySelector('button:not(:disabled)')?.focus()}
 };
 const attach=option=>{
  close();
  if(option.add()){
   record('Ajouter '+option.name);notify();
   requestAnimationFrame(()=>{
    const card=[...document.querySelectorAll('#properties>.inspector-component')].find(el=>el.dataset.componentKey===option.id||el.dataset.componentTitle===option.name);
    if(card){card.open=true;card.scrollIntoView({block:'nearest'})}
   });
  }
 };
 const render=()=>{
  const query=search.value.trim();list.replaceChildren();trail.replaceChildren();
  const matched=orderComponentBrowserOptions(options.filter(o=>componentBrowserMatches(o,query)));
  const hasQuery=!!query;
  const back=make('button','component-browser-back',activeCategory?'‹  Composants':'Composants');
  back.type='button';back.disabled=!activeCategory||hasQuery;
  back.onclick=()=>{activeCategory=null;render();search.focus()};
  trail.append(back);
  if(activeCategory&&!hasQuery)trail.append(make('span','component-browser-current','› '+activeCategory));
  const renderOption=option=>{
   const button=make('button','component-browser-option');button.type='button';button.dataset.componentId=option.id;
   button.disabled=state.playing||!!option.attached;
   button.title=option.description;
   const runtimeLabel=option.runtime==='dotnet'?' · .NET local':option.runtime==='unverified'?' · Données seules, Play/export non intégrés':' · Web';
   button.append(make('strong','',option.name+(option.attached?' · ajouté':'')),make('small','',option.description+runtimeLabel));
   button.onclick=()=>attach(option);list.append(button);
  };
  if(!hasQuery&&!activeCategory){
   // Unity-style home: categories first. No demos, templates or editor actions.
   for(const category of unityComponentCategories(matched)){
    const members=matched.filter(option=>unityComponentCategory(option)===category);
    const button=make('button','component-browser-folder');
    button.type='button';button.dataset.category=category;
    button.append(make('span','',category),make('span','component-browser-chevron','›'));
    button.title=members.length+' composants';
    button.onclick=()=>{activeCategory=category;render()};
    list.append(button);
   }
   hint.textContent=matched.length+' composants réels · Ouvre une catégorie ou recherche par nom.';
  }else{
   const items=activeCategory&&!hasQuery?matched.filter(option=>unityComponentCategory(option)===activeCategory):matched;
   if(hasQuery)list.append(make('h4','component-browser-category','Résultats de recherche'));
   for(const option of items)renderOption(option);
   if(!items.length)list.append(make('p','component-browser-empty','Aucun composant trouvé pour cette recherche.'));
   hint.textContent=items.length+' composants disponibles · Web = Play navigateur ; .NET local = pont C# requis ; données seules = aucun runtime certifié. Les composants déjà présents restent intacts.';
  }
 };

 heading.addEventListener('click',e=>{
  e.preventDefault();
  if(opened){close();return}
  // Unmount the previous dialog when the Inspector has been redrawn.
  document.querySelectorAll('body > .unity-component-popup').forEach(node=>{if(node!==popup)node.remove()});
  opened=true;root.open=false;activeCategory=null;search.value='';render();popup.hidden=false;position();
  document.addEventListener('pointerdown',outside,true);
  document.addEventListener('keydown',keyboard,true);
  window.addEventListener('resize',schedulePosition);
  document.addEventListener('scroll',schedulePosition,true);
  window.addEventListener('pointermove',schedulePosition,{passive:true});
  search.focus();
 });
 search.addEventListener('input',()=>{if(search.value.trim())activeCategory=null;render()});
 parent.append(root);return root;
}
export function finishInspector(root,owner,templates,nativeCatalog,renderNative,openScript){
 renderNative(root,owner);
 const keyByTitle={'Aventure · Journal et quête':'adventure','Aventure · Interaction ciblée':'adventureInteractable','Survie · Besoins et fabrication':'survival','Survie · Ressource ou campement':'survivalNode','Survie · Cycle jour / nuit':'survivalWorld','Animator · Graphe d’états':'animatorGraph','Super-héros · Pouvoirs':'superhero','Progression RPG':'rpgProgression','Émetteur FX':'fxEmitter','Simulation · Réseau et monde':'simulationNode','Unité tactique RTS':'tacticalUnit','Collider 3D':'collider3d','Articulation 3D':'joint3d','Collider 2D':'collider2d','Box Collider 2D':'collider2d','Rigidbody 2D':'rigidbody2d','Articulation 2D':'joint2d','Zone de forces 2D':'effector2d','Contrôleur de personnage 2D':'controller2d','Stats · Santé et endurance':'stats','Inventaire':'inventory','IA · Perception et navigation':'ai','Contrôleur de personnage 3D':'controller3d','Physics 3D • Rigidbody':'rigidbody3d'};
 const cards=[...root.children].filter(el=>el.matches('.inspector-component'));
 for(const card of cards){
  const title=card.dataset.componentTitle||card.querySelector('summary')?.textContent||'';card.dataset.componentTitle=title;
  const key=keyByTitle[title];if(key)card.dataset.componentKey=key;
  const body=card.querySelector(':scope>.component-content');
  if(key&&body){
   const actions=make('div','warlike-component-actions');
   for(const [label,operation] of [['Réinitialiser',resetObjectComponent],['Supprimer',removeObjectComponent]]){const button=make('button','',label);button.type='button';button.disabled=state.playing;button.onclick=()=>{if(operation(owner,key)){record(label+' '+title);notify()}};actions.append(button)}body.append(actions);
  }
 }
 cards.sort((a,b)=>{
  const rank=card=>card.dataset.runtime==='dotnet'?80:inspectorComponentRank(card.dataset.componentTitle);
  return rank(a)-rank(b);
 });
 const header=root.querySelector('.inspector-object');if(header){
  const actions=make('div','inspector-object-actions'),blueprint=make('button','','⬡ Blueprint');blueprint.type='button';blueprint.onclick=()=>{state.selected=[owner.id];document.getElementById('openBlueprint')?.click()};const ping=make('button','','Repérer');ping.type='button';ping.title='Repérer cet objet dans Hierarchy';ping.onclick=()=>{const row=[...document.querySelectorAll('#objects [data-object-id]')].find(row=>row.dataset.objectId===String(owner.id));if(!row)return;for(const group of [row.parentElement,row.parentElement?.parentElement])if(group?.tagName==='DETAILS')group.open=true;row.scrollIntoView({block:'nearest'});row.classList.remove('inspector-ping');requestAnimationFrame(()=>row.classList.add('inspector-ping'))};actions.append(ping,blueprint);header.append(actions);
  const meta=header.querySelector('small');if(meta)meta.textContent=(workspace.mode==='3d'?'GameObject 3D':'GameObject 2D')+' · '+cards.length+' composants';
 }
 root.append(...cards);
 for(const card of cards){const actions=card.querySelector(':scope>.warlike-component-actions,:scope>.component-content>.warlike-component-actions');if(!actions)continue;actions.classList.add('unity-component-menu');actions.hidden=true;const menu=make('button','component-menu-toggle','⋮');menu.type='button';menu.title='Actions du composant';menu.setAttribute('aria-label','Actions : '+card.dataset.componentTitle);menu.setAttribute('aria-expanded','false');menu.onclick=event=>{event.preventDefault();event.stopPropagation();actions.hidden=!actions.hidden;menu.setAttribute('aria-expanded',String(!actions.hidden));card.classList.toggle('component-menu-open',!actions.hidden)};card.querySelector(':scope>summary')?.append(menu);card.append(actions)}
 renderComponentBrowser(root,owner,nativeCatalog,openScript);
 if(templates)root.append(templates);
 const remove=root.querySelector('.delete-object');if(remove)root.append(remove);
}
