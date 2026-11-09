import {componentChoices,addObjectComponent,resetObjectComponent,removeObjectComponent,webDataComponentKinds,inspectorComponentRank} from '../core/component-definitions.js';
import {state,notify} from '../core/state.js';
import {record} from '../core/history.js';
import {workspace} from '../core/workspaces.js';
const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text)el.textContent=text;return el};
// The regular object inspector is deliberately limited to rendering and physics.
// Feature/genre components are attached by the relevant WarLike extension or prefab.
const primaryKinds=new Set(['collider2d','rigidbody2d','collider3d','rigidbody3d','joint3d','light','audio','cameraRig']);
const nativePrimaryKinds=new Set(['Rigidbody']);
const primaryCategory=(option)=>{
 if(/Collider|Rigidbody|Articulation|Joint/.test(option.name))return 'Physique';
 if(/Caméra|Camera|Audio|Lumière/.test(option.name))return 'Rendu et scène';
 return null;
};
export function openComponentBrowser(){
 const button=document.querySelector('#objectComponentBrowser>summary');
 if(button)button.click();
}
export function renderComponentBrowser(parent,owner,nativeCatalog,openScript){
 const root=make('details','inspector-add-component');root.id='objectComponentBrowser';
 const heading=make('summary','','Add Component');
 heading.setAttribute('aria-label','Add Component · composants essentiels Unity');
 root.append(heading);
 const options=componentChoices(workspace.mode).filter(d=>primaryKinds.has(d.id))
  .map(d=>({...d,runtime:'web',attached:!d.multiple&&owner[d.id]!=null,add:()=>addObjectComponent(owner,d.id,workspace.mode)}));
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
 const popup=make('div','unity-component-popup');
 popup.setAttribute('role','dialog');popup.setAttribute('aria-label','Ajouter un composant');
 popup.hidden=true;
 const search=make('input','unity-component-search');search.type='search';search.placeholder='Search';search.setAttribute('aria-label','Rechercher un composant');
 const list=make('div','component-browser-results'),hint=make('small','component-browser-hint');
 const title=make('div','unity-component-popup-title','Add Component');
 popup.append(title,search,list,hint);
 // A body-level popup avoids being clipped by the narrow, scrolling Inspector.
 document.body.append(popup);
 let opened=false;
 const position=()=>{
  if(!opened)return;
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
  window.removeEventListener('resize',position);
  heading.focus();
 };
 const outside=e=>{if(!popup.contains(e.target)&&!heading.contains(e.target))close()};
 const keyboard=e=>{
  if(e.key==='Escape'){e.preventDefault();close()}
  if(e.key==='ArrowDown'&&document.activeElement===search){e.preventDefault();list.querySelector('button:not(:disabled)')?.focus()}
 };
 const render=()=>{
  const query=search.value.trim().toLocaleLowerCase('fr');list.replaceChildren();let lastCategory='',count=0;
  for(const option of options.filter(o=>!query||(o.name+' '+o.description).toLocaleLowerCase('fr').includes(query)).sort((a,b)=>primaryCategory(a).localeCompare(primaryCategory(b))||a.name.localeCompare(b.name))){
   const category=primaryCategory(option)||'Autres';
   if(category!==lastCategory){list.append(make('h4','component-browser-category',category));lastCategory=category}
   const button=make('button','component-browser-option');button.type='button';button.dataset.componentId=option.id;
   button.disabled=state.playing||!!option.attached;
   button.append(make('strong','',option.name+(option.attached?' · ajouté':'')),make('small','',option.description));
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
  if(!count)list.append(make('p','component-browser-empty','Aucun composant trouvé.'));
  hint.textContent='Autres composants : gérés par les extensions ou les prefabs WarLike.';
 };
 heading.addEventListener('click',e=>{
  e.preventDefault();
  if(opened){close();return}
  // Unmount the previous dialog when the Inspector has been redrawn.
  document.querySelectorAll('body > .unity-component-popup').forEach(node=>{if(node!==popup)node.remove()});
  opened=true;root.open=false;search.value='';render();popup.hidden=false;position();
  document.addEventListener('pointerdown',outside,true);
  document.addEventListener('keydown',keyboard,true);
  window.addEventListener('resize',position);
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
