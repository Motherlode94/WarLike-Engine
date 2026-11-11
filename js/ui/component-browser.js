import {componentChoices,addObjectComponent,resetObjectComponent,removeObjectComponent,webDataComponentKinds,inspectorComponentRank} from '../core/component-definitions.js';
import {state,notify} from '../core/state.js';
import {record} from '../core/history.js';
import {workspace} from '../core/workspaces.js';
const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text)el.textContent=text;return el};
// The Add Component picker lists every component supported by the current
// project mode. Existing entities and unknown legacy component data are untouched.
const featuredKinds=new Set(['collider2d','rigidbody2d','collider3d','rigidbody3d','joint3d','cameraRig','controller2d','controller3d','animatorGraph','ai','sequence','stats','inventory','webScripts','warScripts']);
const nativePrimaryKinds=new Set(['Rigidbody']);
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
  .map(d=>({...d,runtime:'web',attached:d.id==='sequence'?false:owner[d.id]!=null,add:()=>addObjectComponent(owner,d.id,workspace.mode)}));
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
   options.push({
    id:'data-'+kind,name:kind+' (C#)',category:'Physique',
    description:'Rigidbody natif via pont .NET local.',runtime:'dotnet',
    attached:owner.csharpComponents?.some(c=>c.kind===kind),
    add:()=>{owner.csharpComponents??=[];owner.csharpComponents.push({kind,...structuredClone(defaults)});return true}
   });
  }
 }
 // Preserve the existing Script Studio entry point, without crowding the default picker.
 options.push({id:'script',name:'Script C# local',category:'Extensions',description:'Ouvrir le script C# de cet objet dans Script Studio.',runtime:'dotnet',add:()=>{openScript();return false}});
 const popup=make('div','unity-component-popup');
 popup.setAttribute('role','dialog');popup.setAttribute('aria-label','Ajouter un composant');
 popup.hidden=true;
 const search=make('input','unity-component-search');search.type='search';search.placeholder='Rechercher : physique, IA, animation, script…';search.setAttribute('aria-label','Rechercher un composant');
 const list=make('div','component-browser-results'),hint=make('small','component-browser-hint');
 const title=make('div','unity-component-popup-title','Add Component');
 popup.append(title,search,list,hint);
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
  if(e.key==='Escape'){e.preventDefault();close()}
  if(e.key==='ArrowDown'&&document.activeElement===search){e.preventDefault();list.querySelector('button:not(:disabled)')?.focus()}
 };
 const render=()=>{
  const query=search.value.trim().toLocaleLowerCase('fr');list.replaceChildren();let count=0;
  const matched=orderComponentBrowserOptions(options.filter(o=>componentBrowserMatches(o,query)));
  const categories=new Map();
  for(const option of matched){
   const group=featuredKinds.has(option.id)&&!query?'Essentiels':componentBrowserCategory(option);
   if(!categories.has(group))categories.set(group,[]);
   categories.get(group).push(option);
  }
  for(const [category,entries] of categories){
   list.append(make('h4','component-browser-category',category));
   for(const option of entries){
    const button=make('button','component-browser-option');button.type='button';button.dataset.componentId=option.id;
    button.disabled=state.playing||!!option.attached;
    button.title=option.description;
    const runtimeLabel=option.runtime==='dotnet'?' · .NET local':' · Web';
    button.append(make('strong','',option.name+(option.attached?' · ajouté':'')),make('small','',option.description+runtimeLabel));
    button.onclick=()=>{
     close();
     if(option.add()){
      record('Ajouter '+option.name);notify();
      requestAnimationFrame(()=>{
       const card=[...document.querySelectorAll('#properties>.inspector-component')].find(el=>el.dataset.componentKey===option.id||el.dataset.componentTitle===option.name);
       if(card){card.open=true;card.scrollIntoView({block:'nearest'})}
      });
     }
    };
    list.append(button);count++;
   }
  }
  if(!count)list.append(make('p','component-browser-empty','Aucun composant trouvé pour cette recherche.'));
  hint.textContent=count+' composants disponibles · Web = Play navigateur ; .NET local = pont C# requis. Les composants déjà présents restent intacts.';
 };
 heading.addEventListener('click',e=>{
  e.preventDefault();
  if(opened){close();return}
  // Unmount the previous dialog when the Inspector has been redrawn.
  document.querySelectorAll('body > .unity-component-popup').forEach(node=>{if(node!==popup)node.remove()});
  opened=true;root.open=false;search.value='';render();popup.hidden=false;position();
  document.addEventListener('pointerdown',outside,true);
  document.addEventListener('keydown',keyboard,true);
  window.addEventListener('resize',schedulePosition);
  document.addEventListener('scroll',schedulePosition,true);
  window.addEventListener('pointermove',schedulePosition,{passive:true});
  search.focus();
 });
 search.addEventListener('input',render);
 parent.append(root);return root;
}
export function finishInspector(root,owner,templates,nativeCatalog,renderNative,openScript){
 renderNative(root,owner);
 const keyByTitle={'Aventure · Journal et quête':'adventure','Aventure · Interaction ciblée':'adventureInteractable','Survie · Besoins et fabrication':'survival','Survie · Ressource ou campement':'survivalNode','Survie · Cycle jour / nuit':'survivalWorld','Animator · Graphe d’états':'animatorGraph','Super-héros · Pouvoirs':'superhero','Progression RPG':'rpgProgression','Émetteur FX':'fxEmitter','Simulation · Réseau et monde':'simulationNode','Unité tactique RTS':'tacticalUnit','Collider 3D':'collider3d','Articulation 3D':'joint3d','Box Collider 2D':'collider2d','Rigidbody 2D':'rigidbody2d','Contrôleur de personnage 2D':'controller2d','Stats · Santé et endurance':'stats','Inventaire':'inventory','IA · Perception et navigation':'ai','Contrôleur de personnage 3D':'controller3d','Physics 3D • Rigidbody':'rigidbody3d'};
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
