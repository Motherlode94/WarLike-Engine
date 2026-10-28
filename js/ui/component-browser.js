import {componentChoices,addObjectComponent,resetObjectComponent,removeObjectComponent,webDataComponentKinds,inspectorComponentRank} from '../core/component-definitions.js';
import {state,notify} from '../core/state.js';
import {record} from '../core/history.js';
import {workspace} from '../core/workspaces.js';
let scope='web';
const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text)el.textContent=text;return el};
export function openComponentBrowser(){
 const browser=document.querySelector('#objectComponentBrowser');
 if(!browser)return;
 browser.open=true;browser.scrollIntoView({block:'nearest'});browser.querySelector('input[type=search]')?.focus();
}
export function renderComponentBrowser(parent,owner,nativeCatalog,openScript){
 const root=make('details','inspector-add-component');root.id='objectComponentBrowser';
 const heading=make('summary','','＋ Ajouter un composant');root.append(heading);
 const content=make('div','component-browser-body'),search=make('input');search.type='search';search.placeholder='Rechercher : santé, IA, déclencheur…';search.setAttribute('aria-label','Rechercher un composant');
 const tabs=make('div','component-browser-tabs'),list=make('div','component-browser-results'),hint=make('small','component-browser-hint');
 const options=componentChoices(workspace.mode).map(d=>({...d,runtime:'web',attached:!d.multiple&&owner[d.id]!=null,add:()=>addObjectComponent(owner,d.id,workspace.mode)}));
 if(workspace.mode==='3d')options.push(
  {id:'light',name:'Lumière ponctuelle',category:'Affichage',description:'Éclaire la scène 3D.',runtime:'web',attached:!!owner.lightType&&owner.lightType!=='none',add:()=>Object.assign(owner,{lightType:'point',lightEnabled:true,lightColor:'#ffd48b',lightIntensity:3,lightRange:13,lightAngle:45})});
 options.push({id:'audio',name:'Audio Source',category:'Audio',description:'Son spatial et clip audio.',runtime:'web',attached:owner.audioEnabled!==undefined,add:()=>Object.assign(owner,{audioEnabled:true,audioClip:'kenney-interface-sounds-click_001',audioGain:.6,audioRange:18,audioInterval:3})});
 for(const [category,kinds] of Object.entries(nativeCatalog))for(const [kind,defaults] of Object.entries(kinds))options.push({id:'data-'+kind,name:kind,category:category.replace(' / C#',''),description:webDataComponentKinds.has(kind)?'Composant utilisable en Play Web.':'Exécution dans le runtime C# local.',runtime:webDataComponentKinds.has(kind)?'web':'dotnet',attached:owner.csharpComponents?.some(c=>c.kind===kind),add:()=>{owner.csharpComponents??=[];owner.csharpComponents.push({kind,...structuredClone(defaults)});return true}});
 options.push({id:'script',name:'Script C# local',category:'Scripts',description:'Ouvrir le script de cet objet dans le panneau C#.',runtime:'dotnet',add:()=>{openScript();return false}});
 const render=()=>{
  list.replaceChildren();const query=search.value.trim().toLocaleLowerCase('fr');let category=null,count=0;
  const found=options.filter(d=>d.runtime===scope&&(!query||(d.name+' '+d.category+' '+d.description).toLocaleLowerCase('fr').includes(query))).sort((a,b)=>a.category.localeCompare(b.category)||a.name.localeCompare(b.name));
  for(const option of found){
   if(category!==option.category){category=option.category;list.append(make('h4','component-browser-category',category))}
   const button=make('button','component-browser-option');button.type='button';button.dataset.componentId=option.id;button.disabled=state.playing||!!option.attached;
   button.append(make('strong','',option.name+(option.attached?' · ajouté':'')),make('small','',option.description));
   button.onclick=()=>{if(option.add()){record('Ajouter '+option.name);notify();requestAnimationFrame(()=>{const card=[...document.querySelectorAll('#properties>.inspector-component')].find(el=>el.dataset.componentKey===option.id||el.dataset.componentTitle===option.name);if(card){card.open=true;card.scrollIntoView({block:'nearest'})}})}};
   list.append(button);count++;
  }
  if(!count)list.append(make('p','component-browser-empty','Aucun composant ne correspond à cette recherche.'));
  hint.textContent=scope==='web'?'Ces composants utilisent le runtime du jeu Web.':'Le pont .NET local est requis pour exécuter ces composants C#.';
  tabs.querySelectorAll('button').forEach(button=>{button.classList.toggle('active',button.dataset.scope===scope);button.setAttribute('aria-pressed',String(button.dataset.scope===scope))});
 };
 for(const [id,title] of [['web','Jeu Web'],['dotnet','C# local']]){const tab=make('button','',title);tab.type='button';tab.dataset.scope=id;tab.onclick=()=>{scope=id;render()};tabs.append(tab)}
 search.addEventListener('input',render);root.addEventListener('toggle',()=>{if(root.open)search.focus()});content.append(search,tabs,hint,list);root.append(content);parent.append(root);render();return root;
}
export function finishInspector(root,owner,templates,nativeCatalog,renderNative,openScript){
 renderNative(root,owner);
 const keyByTitle={'Super-héros · Pouvoirs':'superhero','Progression RPG':'rpgProgression','Émetteur FX':'fxEmitter','Simulation · Réseau et monde':'simulationNode','Unité tactique RTS':'tacticalUnit','Box Collider 2D':'collider2d','Rigidbody 2D':'rigidbody2d','Contrôleur de personnage 2D':'controller2d','Stats · Santé et endurance':'stats','Inventaire':'inventory','IA · Perception et navigation':'ai','Contrôleur de personnage 3D':'controller3d','Physics 3D • Rigidbody':'rigidbody3d'};
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
  const actions=make('div','inspector-object-actions'),blueprint=make('button','','⬡ Blueprint');blueprint.type='button';blueprint.onclick=()=>document.getElementById('openBlueprint')?.click();actions.append(blueprint);header.append(actions);
  const meta=header.querySelector('small');if(meta)meta.textContent=(workspace.mode==='3d'?'GameObject 3D':'GameObject 2D')+' · '+cards.length+' composants';
 }
 root.append(...cards);
 for(const card of cards){const actions=card.querySelector(':scope>.warlike-component-actions,:scope>.component-content>.warlike-component-actions');if(!actions)continue;actions.classList.add('unity-component-menu');actions.hidden=true;const menu=make('button','component-menu-toggle','⋮');menu.type='button';menu.title='Actions du composant';menu.setAttribute('aria-label','Actions : '+card.dataset.componentTitle);menu.setAttribute('aria-expanded','false');menu.onclick=event=>{event.preventDefault();event.stopPropagation();actions.hidden=!actions.hidden;menu.setAttribute('aria-expanded',String(!actions.hidden));card.classList.toggle('component-menu-open',!actions.hidden)};card.querySelector(':scope>summary')?.append(menu);card.append(actions)}
 renderComponentBrowser(root,owner,nativeCatalog,openScript);
 if(templates)root.append(templates);
 const remove=root.querySelector('.delete-object');if(remove)root.append(remove);
}
