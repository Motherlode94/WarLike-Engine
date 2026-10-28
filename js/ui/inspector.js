import {renderHeroForgeInspector} from './hero-forge-inspector.js';
import {renderPhysics2d} from './physics-2d-inspector.js';
import {renderSceneHierarchy} from './hierarchy-view.js';
import {renderAnimator3d} from './animator-3d.js';
import {freeAudioAssets} from '../assets/free-game-assets.js';
import {assetCredits} from './asset-credits.js';
import {componentChoices,addObjectComponent,resetObjectComponent,removeObjectComponent,webDataComponentKinds,inspectorComponentRank} from '../core/component-definitions.js';
import {newSequence} from '../core/logic-sequences.js';
import {finishInspector as finishComponentInspector,openComponentBrowser} from './component-browser.js';
import {communityRecipes,applyCommunityRecipe} from '../core/community-plugins.js';
import {threatFactions,threatRelations,threatProfile} from '../core/threat-intelligence.js';
import {get3dAsset} from '../assets/catalog-3d.js';
import {defaultRigidbody3d,applyImpulse3d} from '../core/physics-3d.js';
import {recipes,applyRecipe} from '../core/gameplay-recipes.js';
import {defaultStats,defaultInventory,defaultAi,defaultController,inventoryAdd,inventoryRemove,equipItem} from '../core/gameplay-components.js';
import {renderSequenceEditor} from './logic-sequence-editor.js';
import {workspace} from '../core/workspaces.js';
import {lightTypes,validColor} from '../core/lighting.js';
import {soundChoices,importSoundFile,previewSound,audioClips} from '../core/audio-sources.js';
import {isElement,elementDefaults} from '../core/game-elements.js';
import {isHome} from '../core/housing.js';
import {modeDefaults,modeNames,roleNames} from '../core/game-modes.js';
import {defaults as buildingDefaults,getBuilding} from '../assets/buildings.js';
import {availableClips} from '../assets/animation-vfx.js';
import {defaultLogic,eventTypes,actionTypes,conditionTypes} from '../core/visual-logic.js';
import {getAsset} from '../assets/catalog.js';
import {state,active,notify} from '../core/state.js';
import {record} from '../core/history.js';
import {deleteSelected} from '../core/scene.js';
let inspectorFieldSerial=0;
function field(parent,o,key,label,type='number'){const line=document.createElement('div');line.className='property-row';const name=document.createElement('label');name.textContent=label;const input=document.createElement('input');input.id='inspector-field-'+(++inspectorFieldSerial);name.htmlFor=input.id;input.type=type;input.value=o[key]??(type==='number'?0:'');input.disabled=state.playing;input.onchange=()=>{const v=type==='number'?Number(input.value):input.value;if(type==='number'&&!Number.isFinite(v))return;if(['w','h'].includes(key)&&v<=0)return;o[key]=v;record('Inspector : '+label);notify()};line.append(name,input);parent.append(line)}
const colorsPreset=['#41cdb5','#ffffff','#1b2535','#ef5350','#ff9f43','#ffd166','#74c96c','#4f9ce9','#9b78ef','#e667b4','#926b4c','#9daab5'];
const normalizedHex=value=>/^#[0-9a-f]{6}$/i.test(String(value||''))?String(value).toLowerCase():'#8195ef';
function colorPalette(parent,o,key,label='Couleur'){
 const root=document.createElement('div');root.className='warlike-color-editor';
 const title=document.createElement('label');title.textContent=label;root.append(title);
 const controls=document.createElement('div');controls.className='warlike-color-controls';
 const picker=document.createElement('input');picker.type='color';picker.value=normalizedHex(o[key]);picker.disabled=state.playing;picker.title='Choisir une couleur';
 const hex=document.createElement('input');hex.type='text';hex.maxLength=7;hex.value=picker.value;hex.disabled=state.playing;hex.spellcheck=false;hex.placeholder='#RRGGBB';hex.setAttribute('aria-label','Couleur hexadécimale');
 const apply=value=>{const candidate=normalizedHex(value);o[key]=candidate;if(key==='color')o.colorCustomized=true;picker.value=candidate;hex.value=candidate;record('Inspector : '+label);notify()};
 picker.addEventListener('input',()=>{o[key]=picker.value;if(key==='color')o.colorCustomized=true;hex.value=picker.value});
 picker.addEventListener('change',()=>apply(picker.value));
 hex.addEventListener('change',()=>{if(!/^#[0-9a-f]{6}$/i.test(hex.value.trim())){hex.value=normalizedHex(o[key]);return}apply(hex.value.trim())});
 controls.append(picker,hex);root.append(controls);
 const palette=document.createElement('div');palette.className='warlike-color-swatches';
 for(const color of colorsPreset){const btn=document.createElement('button');btn.type='button';btn.className='warlike-color-swatch';btn.style.backgroundColor=color;btn.style.setProperty('--swatch-color',color);btn.title=color;btn.setAttribute('aria-label','Appliquer '+color);btn.disabled=state.playing;btn.onclick=()=>apply(color);palette.append(btn)}
 root.append(palette);parent.append(root);
}
function selectField(parent,o,key,label,opts){const line=document.createElement('div');line.className='property-row';const title=document.createElement('label');title.textContent=label;const select=document.createElement('select');select.id='inspector-select-'+(++inspectorFieldSerial);title.htmlFor=select.id;select.disabled=state.playing;for(const value of opts){const option=document.createElement('option');option.value=typeof value==='object'?value.value:value;option.textContent=typeof value==='object'?value.label:value;select.append(option)}select.value=o[key]||(typeof opts[0]==='object'?opts[0].value:opts[0]);select.onchange=()=>{o[key]=select.value;record('Inspector : '+label);notify()};line.append(title,select);parent.append(line)}
const INSPECTOR_FOLDS_KEY='warlike.inspector.folds.v1';
function readFolds(){try{return JSON.parse(localStorage.getItem(INSPECTOR_FOLDS_KEY)||'{}')||{}}catch{return {}}}
function component(parent,title,build){
 const details=document.createElement('details');details.className='inspector-component';details.dataset.componentTitle=title;
 const folds=readFolds();details.open=folds[title]??title==='Transform';
 const summary=document.createElement('summary');const icon=document.createElement('span');icon.className='unity-component-icon';icon.textContent=title==='Transform'?'✥':title.includes('Collider')?'◇':title.includes('Animator')?'▷':title.includes('Renderer')?'▧':title.includes('Audio')?'♫':'▣';summary.append(icon,document.createTextNode(title));
 const body=document.createElement('div');body.className='component-content';
 details.append(summary,body);build(body);parent.append(details);
 details.addEventListener('toggle',()=>{const saved=readFolds();saved[title]=details.open;try{localStorage.setItem(INSPECTOR_FOLDS_KEY,JSON.stringify(saved))}catch{}});
}
const nativeComponentCatalog={
 'Gameplay / Combat':{Weapon:{damage:25,fireRate:8,magazineSize:30},Damageable:{armor:0,invulnerable:false},Health:{regen:0},Projectile:{speed:30,damage:20,lifetime:5},Rigidbody:{gravity:9.81,restitution:0,friction:.5}},
 'Gameplay / Deathmatch':{Team:{teamId:0,friendlyFire:false},Score:{},Respawn:{delay:5},DeathmatchRules:{matchDuration:600,scoreLimit:25,countdown:3},SpawnPoint:{teamId:-1,radius:1},AmmoPickup:{amount:30},HealthPickup:{healAmount:35},KillZone:{damage:10000},ObjectiveZone:{teamId:-1,captureTime:10}},
 'Movement / AI':{AutoRotate:{speed:90},LinearMotion:{vx:0,vy:0,vz:0},FollowActor:{targetId:1,speed:3,stopDistance:1}},
 'Vehicles / C#':{VehicleController:{maxSpeed:310,acceleration:225,brakeForce:310,turnRate:145,drag:1.15,reverseRatio:.45}},
 'Genres / C#':{Roleplay:{money:50,reputation:0},RacingRules:{},SimulationEconomy:{money:100,materials:5},RpgProgression:{gold:100},FourXEmpire:{}}
 };

function renderNativeComponents(root,o){
 const definitions=Array.isArray(o.csharpComponents)?o.csharpComponents:[];
 const labels={damage:'Dégâts',fireRate:'Tirs / seconde',magazineSize:'Taille du chargeur',armor:'Armure',invulnerable:'Invulnérable',regen:'Régénération / s',speed:'Vitesse',lifetime:'Durée de vie',gravity:'Gravité',restitution:'Rebond',friction:'Friction',teamId:'Équipe ID',friendlyFire:'Tirs alliés',delay:'Délai (s)',matchDuration:'Durée du match (s)',scoreLimit:'Limite de kills',countdown:'Compte à rebours',radius:'Rayon',amount:'Quantité',healAmount:'Soin',captureTime:'Temps de capture',vx:'Vitesse X',vy:'Vitesse Y',vz:'Vitesse Z',targetId:'ID de la cible',stopDistance:'Distance d’arrêt',maxSpeed:'Vitesse max',acceleration:'Accélération',brakeForce:'Freinage',turnRate:'Direction (°/s)',drag:'Résistance',reverseRatio:'Rapport marche arrière',money:'Crédits',reputation:'Réputation',materials:'Matériaux',gold:'Or'};
 const defaults=Object.assign({},...Object.values(nativeComponentCatalog));
 definitions.forEach((definition,index)=>{
 const card=document.createElement('details');card.className='inspector-component warlike-component-card';card.dataset.componentTitle=definition.kind;card.dataset.runtime=webDataComponentKinds.has(definition.kind)?'web':'dotnet';card.open=true;
 const heading=document.createElement('summary');heading.textContent=definition.kind||'Composant';const badge=document.createElement('small');badge.className='component-runtime-badge';badge.textContent=webDataComponentKinds.has(definition.kind)?'Web':'C# local';heading.append(badge);card.append(heading);
 const fields=document.createElement('div');fields.className='warlike-component-fields';
 const keys=Object.keys(defaults[definition.kind]||{});for(const key of Object.keys(definition)){if(!['kind','enabled'].includes(key)&&!keys.includes(key))keys.push(key)}
 for(const key of keys){const row=document.createElement('label');row.className='warlike-component-field';
 const label=document.createElement('span');label.textContent=labels[key]||key;row.append(label);
 const value=definition[key]??defaults[definition.kind]?.[key];
 const input=document.createElement('input');input.disabled=state.playing;
 if(typeof value==='boolean'){input.type='checkbox';input.checked=value;input.onchange=()=>{definition[key]=input.checked;record('Composant '+definition.kind+' : '+key);notify()}}
 else if(typeof value==='number'){input.type='number';input.step='any';input.value=String(value);input.onchange=()=>{if(!input.value.trim()||!Number.isFinite(Number(input.value))){input.value=String(definition[key]??value);return}definition[key]=Number(input.value);record('Composant '+definition.kind+' : '+key);notify()}}
 else {input.type='text';input.value=String(value??'');input.onchange=()=>{definition[key]=input.value;record('Composant '+definition.kind+' : '+key);notify()}}
 row.append(input);fields.append(row);
 }
 if(!keys.length){const empty=document.createElement('small');empty.textContent='Composant sans propriété configurable.';fields.append(empty)}
 const actions=document.createElement('div');actions.className='warlike-component-actions';
 const duplicate=document.createElement('button');duplicate.textContent='Dupliquer';duplicate.disabled=state.playing;duplicate.onclick=()=>{definitions.splice(index+1,0,structuredClone(definition));record('Dupliquer '+definition.kind);notify()};
 const reset=document.createElement('button');reset.textContent='Réinitialiser';reset.disabled=state.playing;reset.onclick=()=>{definitions[index]={kind:definition.kind,...structuredClone(defaults[definition.kind]||{})};record('Réinitialiser '+definition.kind);notify()};
 const remove=document.createElement('button');remove.textContent='Supprimer';remove.disabled=state.playing;remove.onclick=()=>{definitions.splice(index,1);record('Supprimer '+definition.kind);notify()};
 actions.append(duplicate,reset,remove);card.append(fields,actions);root.append(card);
 })
}
function openCSharpEditor(){
 document.getElementById('openCsharpRuntime')?.click();
 const editor=document.querySelector('#csharpRuntimePanel .csharp-script-editor');
 if(editor)editor.open=true;
 document.getElementById('csharpScriptLoad')?.click();
 document.getElementById('csharpScriptSource')?.focus();
}
function finishInspector(root,o,templates){renderHeroForgeInspector(root,o,{component,field,selectField,colorPalette});finishComponentInspector(root,o,templates,nativeComponentCatalog,renderNativeComponents,openCSharpEditor)}
function renderObjectBehaviors(root,owner){
 const entries=[...(owner.sequence?[{index:-1,sequence:owner.sequence}]:[]),...(owner.sequences||[]).map((sequence,index)=>({index,sequence}))];
 for(const entry of entries){
  renderSequenceEditor(root,owner,{sequence:entry.sequence,expanded:false,onChange:(sequence,label)=>{
   if(entry.index<0){if(sequence)owner.sequence=sequence;else delete owner.sequence}
   else if(sequence)owner.sequences[entry.index]=sequence;else owner.sequences.splice(entry.index,1);
   record('Blueprint : '+label);notify();
  }});
  const card=root.lastElementChild;card.dataset.componentTitle='Déclencheur · '+(entry.sequence.name||entry.sequence.event);card.dataset.componentKey='sequence';
  const summary=card.querySelector('summary');summary.textContent=card.dataset.componentTitle;
  const overview=document.createElement('p');overview.className='inspector-behavior-flow';overview.textContent='Événement → Conditions → Instructions';
  const open=document.createElement('button');open.type='button';open.textContent='Ouvrir ce comportement dans Blueprint';open.onclick=()=>document.dispatchEvent(new CustomEvent('warlike:open-behavior',{detail:{ownerId:owner.id,sequenceKey:entry.index<0?owner.id:owner.id+':extra:'+entry.index}}));
  card.querySelector('.component-content').prepend(overview,open);
 }
}
export function renderHierarchy(){renderSceneHierarchy()}
export function renderInspector(){const root=document.querySelector('#properties');root.replaceChildren();const o=active();if(!o){root.textContent='Sélectionne un objet dans la scène';return}

const header=document.createElement('div');header.className='inspector-object';
const identity=document.createElement('div');identity.className='unity-object-identity';
const icon=document.createElement('span');icon.className='unity-object-icon';icon.textContent=workspace.mode==='3d'?'◇':'▧';
const visible=document.createElement('input');visible.type='checkbox';visible.checked=o.visible!==false;visible.disabled=state.playing;visible.title='Afficher le rendu de cet objet en Play';visible.setAttribute('aria-label','Afficher le rendu en Play');visible.onchange=()=>{o.visible=visible.checked;record('Rendu en jeu : '+o.name);notify()};
const name=document.createElement('input');name.className='inspector-object-name';name.value=o.name;name.disabled=state.playing;name.title='Nom du GameObject';name.setAttribute('aria-label','Nom du GameObject');name.onchange=()=>{o.name=name.value.trim()||o.name;record('Renommer GameObject');notify()};identity.append(icon,visible,name);
const meta=document.createElement('small');meta.className='unity-object-meta';meta.textContent=o.type+' · #'+o.id;
const labels=document.createElement('div');labels.className='unity-object-labels';
for(const [key,label,value] of [['tags','Tag',o.tags?.[0]||''],['hierarchyGroup','Groupe',o.hierarchyGroup||'']]){const field=document.createElement('label');field.append(document.createTextNode(label));const input=document.createElement('input');input.type='text';input.value=value;input.placeholder=key==='tags'?'Untagged':'Aucun';input.disabled=state.playing;input.setAttribute('aria-label',label+' du GameObject');input.onchange=()=>{const v=input.value.trim().slice(0,80);if(key==='tags')o.tags=[...(v?[v]:[]),...(o.tags||[]).slice(1)];else if(v)o.hierarchyGroup=v;else delete o.hierarchyGroup;record(label+' du GameObject');notify()};field.append(input);labels.append(field)}
header.append(identity,labels,meta);root.append(header);
component(root,'Transform',body=>{
 const vector=(title,axes)=>{
  const row=document.createElement('div');row.className='inspector-vector-row';
  const label=document.createElement('strong');label.textContent=title;row.append(label);
  const group=document.createElement('div');group.className='inspector-vector-fields';
  for(const [axis,key] of axes){
   const item=document.createElement('label');item.className='inspector-axis';
   const tag=document.createElement('span');tag.textContent=axis;tag.dataset.axis=axis;
   const input=document.createElement('input');input.type='number';input.step='any';const divisor=workspace.mode==='3d'&&key!=='elevation3d'?64:1;input.value=String(Number(((o[key]??(key==='depth3d'?o.w:0))/divisor).toFixed(3)));input.disabled=state.playing;input.setAttribute('aria-label',title+' '+axis);input.title=workspace.mode==='3d'?'Mètres':'Unités de scène';
   input.onchange=()=>{const value=Number(input.value)*divisor;if(!Number.isFinite(value)||(title==='Dimensions'&&value<=0)){input.value=String(o[key]??0);return}o[key]=value;record('Transform '+title+' '+axis);notify()};
   item.append(tag,input);group.append(item);
  }
  row.append(group);body.append(row);
 };
 vector('Position',workspace.mode==='3d'?[['X','x'],['Y','elevation3d'],['Z','y']]:[['X','x'],['Y','y']]);
 field(body,o,'rotation','Rotation (°)');
 vector('Dimensions',workspace.mode==='3d'?[['X','w'],['Y','h'],['Z','depth3d']]:[['X','w'],['Y','h']]);
});
// Unity-style Inspector: component properties first, optional gameplay templates in one closed drawer.
const advancedTools=document.createElement('details');
advancedTools.className='inspector-advanced-tools';
const advancedSummary=document.createElement('summary');
advancedSummary.textContent='Modèles de gameplay';
advancedSummary.title='Modèles de gameplay, IA et systèmes optionnels';
const advancedContent=document.createElement('div');
advancedContent.className='inspector-advanced-content';
advancedTools.append(advancedSummary,advancedContent);
component(advancedContent,'Quick Start • Gameplay Recipes',body=>{
 const intro=document.createElement('p');intro.textContent='Appliquer un comportement réutilisable à cet objet. Les composants existants concernés peuvent être remplacés.';body.append(intro);
 const picker=document.createElement('select');picker.disabled=state.playing;
 const recipeGroups=new Map();
 for(const recipe of [...recipes,...communityRecipes(workspace.mode)]){
  const id=recipe.id;
  const category=recipe.category|| (id.startsWith('fps')||id.startsWith('tps')?'FPS / TPS':id.startsWith('rts')?'RTS':id.startsWith('race')?'Course automobile':id.startsWith('action')||id.startsWith('adventure')?'Action / Aventure':'Gameplay général');
  if(!recipeGroups.has(category)){const group=document.createElement('optgroup');group.label=category;recipeGroups.set(category,group);picker.append(group)}
  const option=document.createElement('option');option.value=id;option.textContent=recipe.name;option.title=recipe.description;
  recipeGroups.get(category).append(option);
 }
 body.append(picker);
 const apply=document.createElement('button');apply.textContent='＋ Appliquer le modèle';apply.disabled=state.playing;apply.onclick=()=>{if(!confirm('Appliquer ce modèle à '+o.name+' ? Les composants concernés seront remplacés.'))return;if((picker.value.startsWith('community:')?applyCommunityRecipe(o,picker.value,workspace.mode):applyRecipe(o,picker.value))){record('Gameplay Recipe : '+picker.value);notify()}};body.append(apply);
});
if(workspace.mode==='3d'&&o.rigidbody3d)component(root,'Physics 3D • Rigidbody',body=>{
 if(!o.rigidbody3d){const add=document.createElement('button');add.textContent='＋ Add Rigidbody 3D';add.disabled=state.playing;add.onclick=()=>{o.rigidbody3d=defaultRigidbody3d();record('Add Rigidbody 3D');notify()};body.append(add);return}
 const rb=o.rigidbody3d;
 for(const [key,label] of [['mass','Mass'],['gravity','Gravity'],['restitution','Bounciness (0-1)'],['friction','Friction (0-1)'],['vx','Velocity X'],['vy','Velocity Y'],['vz','Velocity Z']])field(body,rb,key,label);
 for(const [key,label] of [['enabled','Enabled'],['kinematic','Kinematic (no physics)']]){
  const row=document.createElement('label');row.className='logic-flag';const input=document.createElement('input');input.type='checkbox';input.checked=rb[key]===true;input.disabled=state.playing;input.onchange=()=>{rb[key]=input.checked;record('Rigidbody '+key);notify()};row.append(input,document.createTextNode(label));body.append(row);
 }
 const info=document.createElement('p');info.textContent='Prototype physique 3D : gravité, rebond au sol et collisions AABB simples. Le joueur et les agents IA utilisent leur propre contrôleur.';body.append(info);

});
if(['horrorAiConfig','horrorHideConfig','horrorFearConfig'].some(key=>o[key]))component(root,'Survival Horror',body=>{
 const configs=[
  ['Horror AI','horrorAiConfig',{enabled:true,visionRange:230,hearingRange:220,chaseSpeed:75,searchSpeed:33,memorySeconds:5},[['visionRange','Vision (distance)'],['hearingRange','Audition (distance)'],['chaseSpeed','Vitesse poursuite'],['searchSpeed','Vitesse recherche'],['memorySeconds','Durée recherche']]],
  ['Cachette','horrorHideConfig',{enabled:true,radius:90},[['radius','Rayon cachette']]],
  ['Zone de peur','horrorFearConfig',{enabled:true,radius:170,strength:12},[['radius','Rayon de peur'],['strength','Intensité']]],
 ];
 for(const [label,key,defaults,properties] of configs){if(!o[key])continue;
  const sub=document.createElement('details');sub.className='inspector-component';
  const heading=document.createElement('summary');heading.textContent=label;sub.append(heading);
  if(!o[key]){const add=document.createElement('button');add.type='button';add.textContent='＋ Ajouter '+label;add.disabled=state.playing;add.onclick=()=>{o[key]={...defaults};record('Game Creator : '+label);notify()};sub.append(add)}
  else{
   const config=o[key];
   const enabled=document.createElement('label');const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=config.enabled!==false;checkbox.disabled=state.playing;
   checkbox.onchange=()=>{config.enabled=checkbox.checked;record('Game Creator : '+label);notify()};enabled.append(checkbox,document.createTextNode(' Actif'));sub.append(enabled);
   for(const [property,title] of properties)field(sub,config,property,title);
   const remove=document.createElement('button');remove.type='button';remove.textContent='Supprimer '+label;remove.disabled=state.playing;remove.onclick=()=>{delete o[key];record('Supprimer '+label);notify()};sub.append(remove);
  }
  body.append(sub);
 }
 const help=document.createElement('p');help.textContent='Ces composants sont enregistrés avec le GameObject et utilisés en mode Survival Horror 2D/3D.';body.append(help);
});
if(['worldPoliceConfig','worldInfectedConfig'].some(key=>o[key]))component(root,'Monde ouvert / Survie',body=>{
 const configs=[
 ['Police · Recherche','worldPoliceConfig',{enabled:true,range:450,speed:75},[['range','Distance de poursuite'],['speed','Vitesse patrouille']]],
 ['Infecté · Horde','worldInfectedConfig',{enabled:true,range:300,speed:53},[['range','Distance de détection'],['speed','Vitesse infecté']]],
 ];
 for(const [label,key,defaults,properties] of configs){if(!o[key])continue;
  const section=document.createElement('details');section.className='inspector-component';
  const summary=document.createElement('summary');summary.textContent=label;section.append(summary);
  const cfg=o[key];
  if(!cfg){const add=document.createElement('button');add.type='button';add.textContent='＋ Ajouter '+label;add.disabled=state.playing;add.onclick=()=>{o[key]={...defaults};record('Ajouter '+label);notify()};section.append(add)}
  else{
   const enabled=document.createElement('label');const check=document.createElement('input');check.type='checkbox';check.disabled=state.playing;check.checked=cfg.enabled!==false;check.onchange=()=>{cfg.enabled=check.checked;record('Configurer '+label);notify()};enabled.append(check,document.createTextNode(' Actif'));section.append(enabled);
   for(const [fieldName,title] of properties)field(section,cfg,fieldName,title);
   const remove=document.createElement('button');remove.type='button';remove.textContent='Supprimer '+label;remove.disabled=state.playing;remove.onclick=()=>{delete o[key];record('Supprimer '+label);notify()};section.append(remove);
  }
  body.append(section);
 }
 const hint=document.createElement('small');hint.textContent='Police : suit le joueur si wantedLevel > 0. Infecté : suit le joueur à proximité. Les modèles Western, commerces, missions et campements se trouvent dans la bibliothèque Blueprint.';body.append(hint);
});
renderObjectBehaviors(root,o);
 if(o.stats)component(root,'Stats · Santé et endurance',body=>{
  const s=o.stats;for(const [key,label] of [['maxHealth','Vie maximale'],['health','Vie actuelle'],['maxStamina','Endurance maximale'],['stamina','Endurance'],['staminaRegen','Régénération']])field(body,s,key,label);

 });
 if(o.inventory)component(root,'Inventaire',body=>{
  const inv=o.inventory;field(body,inv,'capacity','Emplacements');const row=document.createElement('div');row.className='property-row';
  const item=document.createElement('input');item.placeholder='ID objet (ex: sword)';item.disabled=state.playing;const add=document.createElement('button');add.textContent='＋ Objet';add.disabled=state.playing;add.onclick=()=>{if(inventoryAdd(o,item.value.trim())){record('Inventaire : ajouter');notify()}};row.append(item,add);body.append(row);
  for(const entry of inv.items){const line=document.createElement('div');line.className='property-row';const label=document.createElement('span');label.textContent=entry.id+' ×'+entry.count;line.append(label);
   for(const [slot,title] of [['weapon','Arme'],['armor','Armure']]){const btn=document.createElement('button');btn.textContent=title;btn.disabled=state.playing;btn.onclick=()=>{if(equipItem(o,entry.id,slot)){record('Équiper '+slot);notify()}};line.append(btn)}
   const remove=document.createElement('button');remove.textContent='−';remove.disabled=state.playing;remove.onclick=()=>{inventoryRemove(o,entry.id,1);record('Inventaire : retirer');notify()};line.append(remove);body.append(line)}
  const equipped=document.createElement('small');equipped.textContent='Équipé : '+JSON.stringify(inv.equipment||{});body.append(equipped);
 });
 if(o.ai&&o.ai.enabled!==false){
  component(root,'Enemy Intelligence · identité / factions',body=>{
   o.threatIntel??={faction:'bandit',relation:'hostile',className:'Ennemi',level:1,weakness:'Non identifiée'};
   const intel=o.threatIntel;
   const editable=(key,label,kind='text')=>field(body,intel,key,label,kind);
   editable('className','Classe','text');
   selectField(body,intel,'faction','Faction',threatFactions);
   selectField(body,intel,'relation','Relation',threatRelations);
   editable('level','Niveau de danger');
   editable('weakness','Point faible','text');
   const p=state.entities.find(e=>e!==o&&(e.type==='player'||e.playable3d===true));
   const profile=threatProfile(o,p);
   const live=document.createElement('small');
   live.textContent=profile?'État IA : '+profile.state+' · vision : '+(profile.visible?'visible':'non confirmé')+' · détection : '+(profile.detected?'oui':'non')+' · danger : '+profile.severity+'/100':'Fiche NPC enregistrée dans la scène';
   body.append(live);
  });
 }
 if(o.ai)component(root,'IA · Perception et navigation',body=>{
  const ai=o.ai;ai.fieldOfView??=360;ai.memoryDuration??=4;ai.searchDuration??=2;
  selectField(body,ai,'state','État IA',['idle','patrol','chase','attack','investigate','search','return','dead']);
  field(body,o,'aiFaction','Faction personnalisée (optionnel)','text');
  for(const [key,label] of [['detection','Rayon détection'],['fieldOfView','Champ de vision (°)'],['memoryDuration','Mémoire cible (s)'],['searchDuration','Recherche sur place (s)'],['attackRange','Portée attaque'],['attackDamage','Dégâts'],['attackCooldown','Cooldown'],['speed','Vitesse'],['patrolRadius','Rayon patrouille'],['pathCellSize','Taille cellule A*'],['repathInterval','Recalcul chemin (s)']])field(body,ai,key,label);
  const flag=document.createElement('label');const cb=document.createElement('input');cb.type='checkbox';cb.checked=ai.enabled!==false;cb.disabled=state.playing;cb.onchange=()=>{ai.enabled=cb.checked;record('IA activée');notify()};flag.append(cb,document.createTextNode(' IA activée'));body.append(flag);
  const sightLabel=document.createElement('label');const sightCb=document.createElement('input');sightCb.type='checkbox';sightCb.checked=ai.requireLineOfSight===true;sightCb.disabled=state.playing;sightCb.onchange=()=>{ai.requireLineOfSight=sightCb.checked;record('IA : détection masquée par obstacles');notify()};sightLabel.append(sightCb,document.createTextNode(' Vision bloquée par les obstacles'));body.append(sightLabel);
  const pathLabel=document.createElement('label');const pathCb=document.createElement('input');pathCb.type='checkbox';pathCb.checked=ai.pathfinding!==false;pathCb.disabled=state.playing;pathCb.onchange=()=>{ai.pathfinding=pathCb.checked;record('Navigation A*');notify()};pathLabel.append(pathCb,document.createTextNode(' Navigation A*'));body.append(pathLabel);
 });
 if(workspace.mode==='3d'&&o.controller3d)component(root,'Contrôleur de personnage 3D',body=>{
  for(const [key,label] of [['walkSpeed','Marche'],['sprintSpeed','Sprint'],['jumpForce','Saut'],['gravity','Gravité'],['stepHeight','Hauteur de marche (m)'],['coyoteTime','Tolérance après rebord (s)'],['jumpBuffer','Mémorisation du saut (s)'],['dodgeDistance','Distance esquive (m)'],['dodgeCooldown','Recharge esquive (s)'],['staminaCost','Coût endurance']])field(body,o.controller3d,key,label);
 });
if(o.playable3d||o.type==='player'||o.type==='character'||getAsset(o.assetId)?.category==='Characters'||o.cameraRig){
 component(root,'Caméra de jeu',body=>{
  const cfg=o.cameraRig||{mode:o.fpsController?'firstPerson':'thirdPerson',distance:4.8,height:.72,followSharpness:10,sensitivity:.0026,collision:true};
  const note=document.createElement('p');note.textContent='Caméra utilisée en Play. La vue de travail est restaurée à l’arrêt.';body.append(note);
  const store=()=>{o.cameraRig=cfg;record('Caméra de jeu');notify()};
  if(workspace.mode==='3d'){
   const collision=document.createElement('label'),check=document.createElement('input');collision.className='logic-flag';check.type='checkbox';check.checked=cfg.collision!==false;check.disabled=state.playing;check.onchange=()=>{cfg.collision=check.checked;store()};collision.append(check,document.createTextNode('Éviter les obstacles'));body.append(collision);
   const mode=document.createElement('select');mode.setAttribute('aria-label','Mode de caméra');
   for(const [value,label] of [['thirdPerson','Troisième personne'],['firstPerson','Première personne'],['orbit','Vue orbitale']]){const option=document.createElement('option');option.value=value;option.textContent=label;mode.append(option)}mode.value=cfg.mode;mode.disabled=state.playing;mode.onchange=()=>{cfg.mode=mode.value;if(mode.value!=='firstPerson')delete o.fpsController;store()};body.append(mode);
   for(const [key,label] of [['distance','Distance (m)'],['height','Hauteur de visée (× taille)'],['sensitivity','Sensibilité souris']]){const row=document.createElement('label');row.textContent=label;const input=document.createElement('input');input.type='number';input.step='any';input.value=cfg[key];input.disabled=state.playing;input.onchange=()=>{const value=Number(input.value);if(Number.isFinite(value)&&value>0){cfg[key]=value;store()}};row.append(input);body.append(row)}
  }
  const row=document.createElement('label');row.textContent='Réactivité du suivi';const input=document.createElement('input');input.type='number';input.min='1';input.max='30';input.value=cfg.followSharpness;input.disabled=state.playing;input.onchange=()=>{cfg.followSharpness=Math.max(1,Math.min(30,Number(input.value)||10));store()};row.append(input);body.append(row);
 });
}
if(o.audioEnabled!==undefined||o.audioClip)component(root,'Audio Source',body=>{
 const flag=document.createElement('label');flag.className='logic-flag';const cb=document.createElement('input');
 cb.type='checkbox';cb.checked=o.audioEnabled===true;cb.disabled=state.playing;
 cb.onchange=()=>{o.audioEnabled=cb.checked;record('Audio Enabled');notify()};
 flag.append(cb,document.createTextNode(' Active'));body.append(flag);
 if(o.audioClip===undefined)o.audioClip='none';
 selectField(body,o,'audioClip','Clip',['none',...soundChoices.map(value=>({value,label:(freeAudioAssets.find(a=>a.id===value)?freeAudioAssets.find(a=>a.id===value).name+' · Kenney':value)})),'imported']);const sound=freeAudioAssets.find(a=>a.id===o.audioClip);if(sound)body.append(assetCredits(sound));
 if(o.audioGain===undefined)o.audioGain=.6;
 if(o.audioRange===undefined)o.audioRange=18;
 if(o.audioInterval===undefined)o.audioInterval=3;
 field(body,o,'audioGain','Volume 0–1');
 field(body,o,'audioRange','Range (meters)');
 field(body,o,'audioInterval','Repeat seconds');
 const flags=document.createElement('div');flags.className='logic-flags';
 for(const [key,label,def] of [['audioLoop','Loop',true],['audioSpatial','Spatial Stereo',true]]){
  if(o[key]===undefined)o[key]=def;
  const row=document.createElement('label');row.className='logic-flag';
  const box=document.createElement('input');box.type='checkbox';box.checked=o[key]!==false;box.disabled=state.playing;
  box.onchange=()=>{o[key]=box.checked;record('Audio '+label);notify()};
  row.append(box,document.createTextNode(' '+label));flags.append(row);
 }body.append(flags);
 const upload=document.createElement('input');upload.type='file';upload.accept='.wav,.mp3,.ogg,audio/*';upload.disabled=state.playing;
 upload.onchange=async()=>{try{await importSoundFile(upload.files?.[0],o);record('Importer Audio Source');notify()}catch(e){alert(e.message)}};
 body.append(upload);
 const text=document.createElement('p');text.textContent=o.audioFileName?'Audio local : '+o.audioFileName+(audioClips.has(o.id)?' (chargé)':' (réimporter après rechargement)'):'Importer un WAV/MP3/OGG pour cette session (fichier non incorporé dans JSON).';body.append(text);
 const preview=document.createElement('button');preview.textContent='▶ Écouter';preview.onclick=()=>previewSound(o);body.append(preview);
});
if(workspace.mode==='3d'){
if(o.lightType&&o.lightType!=='none')component(root,'Lighting 3D',body=>{
 selectField(body,o,'lightType','Type',['none','point','spot']);
 if(o.lightType!=='none'&&o.lightType){
  const flag=document.createElement('label');flag.className='logic-flag';
  const cb=document.createElement('input');cb.type='checkbox';cb.checked=o.lightEnabled!==false;cb.disabled=state.playing;
  cb.onchange=()=>{o.lightEnabled=cb.checked;record('Light On/Off');notify()};
  flag.append(cb,document.createTextNode(' Enabled'));body.append(flag);
  if(o.lightColor===undefined)o.lightColor='#ffd48b';
  colorPalette(body,o,'lightColor','Couleur de la lumière');
  for(const [key,label,type] of [['lightIntensity','Intensity','number'],['lightRange','Range (meters)','number'],['lightAngle','Spot Angle','number']]){if(key==='lightAngle'&&o.lightType!=='spot')continue;field(body,o,key,label,type)}
 }
 const tip=document.createElement('p');tip.textContent='Les lumières modifient les volumes dans la vue 3D. 8 lumières proches rendues simultanément.';body.append(tip);
});
if(workspace.mode==='3d'&&o.type==='mesh3d'&&(get3dAsset(o.assetId||o.model3dId)?.category==='Vehicles'||o.tags?.includes('race-vehicle'))){
 component(root,'Vehicle Controller 3D',body=>{
  const defaults={maxSpeed:310,acceleration:210,brakeForce:330,turnRate:130,drag:1.35,reverseRatio:.45};
  for(const [key,label] of [['maxSpeed','Vitesse max (unités/s)'],['acceleration','Accélération'],['brakeForce','Freinage'],['turnRate','Direction (°/s)'],['drag','Résistance'],['reverseRatio','Ratio marche arrière']]){
   if(!Number.isFinite(Number(o[key]))||Number(o[key])<=0)o[key]=defaults[key];
   field(body,o,key,label);
  }
  const help=document.createElement('p');help.textContent='Play : E entrer/sortir · ZQSD/WASD conduire · Espace frein à main · Maj non nécessaire. Collisions 3D simplifiées.';body.append(help);
 });
}
if(o.assetId||!o.audioEnabled&&!o.lightType)component(root,'Box Collider 3D',body=>{
 const label=document.createElement('label'),input=document.createElement('input');label.className='logic-flag';input.type='checkbox';input.checked=o.collision3d!==false;input.disabled=state.playing;input.onchange=()=>{o.collision3d=input.checked;record('Collider 3D');notify()};label.append(input,document.createTextNode('Collisions actives'));body.append(label);
 const note=document.createElement('small');note.textContent='Volume de collision AABB, calculé à partir des dimensions de l’objet.';body.append(note);
});
if(o.model3dId||get3dAsset(o.assetId)?.shape==='glb')renderAnimator3d(root,o);
if(o.assetId||!o.audioEnabled&&!o.lightType)component(root,'Mesh Renderer · Matériau',body=>{const isGlb=!!o.model3dId||get3dAsset(o.assetId)?.shape==='glb';if(isGlb){const label=document.createElement('label'),check=document.createElement('input');label.className='logic-flag';check.type='checkbox';check.checked=o.colorCustomized===true;check.disabled=state.playing;check.onchange=()=>{o.colorCustomized=check.checked;o.color??='#ffffff';record('Teinte personnalisée');notify()};label.append(check,document.createTextNode('Teinte personnalisée'));body.append(label)}if(!isGlb||o.colorCustomized)colorPalette(body,o,'color','Couleur du matériau');field(body,o,'materialRoughness','Rugosité 0–1');field(body,o,'materialMetallic','Métal 0–1');const hint=document.createElement('p');hint.textContent='Les GLB conservent leurs textures et couleurs. Une couleur personnalisée teinte le matériau.';body.append(hint);const asset=get3dAsset(o.model3dId||o.assetId);if(asset?.author)body.append(assetCredits(asset));for(const [i,key] of ['materialRoughness','materialMetallic'].entries()){const input=body.querySelectorAll('.property-row input')[i];if(o[key]===undefined){input.value='';input.placeholder='Matériau du GLB'}input.addEventListener('change',()=>{if(!input.value.trim()){delete o[key];record('Matériau d’origine');notify()}})}});
const del3d=document.createElement('button');del3d.className='delete-object';del3d.textContent='Supprimer objet 3D';del3d.disabled=state.playing;del3d.onclick=deleteSelected;root.append(del3d);finishInspector(root,o,advancedTools);
return;
}
if(o.assetId||!o.audioEnabled&&!o.lightType)component(root,'Sprite Renderer',body=>{if(!getAsset(o.assetId)?.spriteUrl)colorPalette(body,o,'color','Couleur de l’objet');if(o.type==='prefab'){const label=document.createElement('p');label.textContent='Source : '+(getAsset(o.assetId)?.name||o.assetId);body.append(label);const asset=getAsset(o.assetId);if(asset?.author)body.append(assetCredits(asset))}if(o.type==='character')selectField(body,o,'skin','Character',['scout','soldier'])});
if(o.type==='character'||o.type==='prefab')component(root,'Animator 2D',body=>{const kind=o.type==='character'?'actor':getAsset(o.assetId)?.kind||'prop';selectField(body,o,'animation','Clip',getAsset(o.assetId)?.sourceType==='png'?['idle',...Object.keys(getAsset(o.assetId).frames||{}).filter(key=>key!=='idle')]:availableClips(kind,o.assetId));if(o.animationSpeed===undefined)o.animationSpeed=1;field(body,o,'animationSpeed','Playback Speed');const line=document.createElement('label');line.className='logic-flag';const check=document.createElement('input');check.type='checkbox';check.checked=!!o.animationPreview;check.disabled=state.playing;check.onchange=()=>{o.animationPreview=check.checked;record('Prévisualisation animation');notify()};line.append(check,document.createTextNode('Preview animation in Scene'));body.append(line)});
if(o.type==='prefab'&&getAsset(o.assetId)?.category==='Weapons')component(root,'Weapon Configuration',body=>{
 const asset=getAsset(o.assetId);for(const [k,label] of [['weaponDamage','Damage'],['weaponInterval','Seconds between attacks'],['weaponRange','Projectile range']]){if(o[k]===undefined)o[k]=asset[k]??({weaponDamage:34,weaponInterval:.16,weaponRange:650})[k];field(body,o,k,label)}
 const note=document.createElement('p');note.textContent='Play : approche une arme et appuie sur G pour équiper, puis clic gauche/F pour tirer. Armes de mêlée : attaque à courte portée.';body.append(note);
});
if(o.type==='prefab'&&getAsset(o.assetId)?.category==='Vehicles'){component(root,'Vehicle Controller 2D',body=>{for(const [key,label] of [['hp','Vehicle HP'],['maxSpeed','Max Speed'],['acceleration','Acceleration'],['brakeForce','Brake Force'],['turnRate','Turn Rate °/s'],['drag','Drag'],['reverseRatio','Reverse Ratio'],['collisionRadius','Collision Radius']]){if(o[key]===undefined)o[key]=({maxSpeed:250,acceleration:210,brakeForce:310,turnRate:140,drag:1.4,reverseRatio:.45,collisionRadius:25})[key];field(body,o,key,label)}const note=document.createElement('p');note.textContent='Play : E monter/sortir • ZQSD conduite • Espace frein à main';body.append(note)})}
if(o.type==='prefab'&&getAsset(o.assetId)?.category==='Buildings')component(root,'Building Controller',body=>{
 const d=buildingDefaults(getAsset(o.assetId));for(const [k,v] of Object.entries(d))if(o[k]===undefined)o[k]=v;
 const note=document.createElement('p');note.textContent='Genre : '+(getBuilding(o.assetId)?.[2]||'Buildings')+' · Bâtiment 2D / RTS';body.append(note);
 selectField(body,o,'buildState','State',['idle','construction','damaged','destroyed','powered_off','burning']);
 for(const [k,label] of [['constructionProgress','Construction %'],['buildHp','Building HP'],['buildMaxHp','Maximum HP'],['buildLevel','Upgrade Level'],['buildTeam','Faction / Team'],['buildGrid','Grid Size'],['buildQueue','Production Queue'],['buildTime','Seconds Per Unit']])field(body,o,k,label);
 selectField(body,o,'buildProduction','Produce Unit',['none','soldier','scout','medic','jeep','tank','buggy']);
 const row=document.createElement('label');row.className='logic-flag';const check=document.createElement('input');check.type='checkbox';check.checked=!!o.buildCollision;check.disabled=state.playing;check.onchange=()=>{o.buildCollision=check.checked;record('Building Collision');notify()};row.append(check,document.createTextNode('Solid collider'));body.append(row);
 const power=document.createElement('label');power.className='logic-flag';const powered=document.createElement('input');powered.type='checkbox';powered.checked=!!o.buildPowered;powered.disabled=state.playing;powered.onchange=()=>{o.buildPowered=powered.checked;o.buildState=powered.checked?'idle':'powered_off';record('Building Power');notify()};power.append(powered,document.createTextNode('Powered'));body.append(power);
 const snap=document.createElement('button');snap.textContent='⌗ Snap to building grid';snap.disabled=state.playing;snap.onclick=()=>{const size=Math.max(8,Number(o.buildGrid)||32);o.x=Math.round(o.x/size)*size;o.y=Math.round(o.y/size)*size;record('Snap building to grid');notify()};body.append(snap)
});
if(isHome(o))component(root,'House / Interior',body=>{
 const note=document.createElement('p');note.textContent='Play : E entrer / sortir • ZQSD marcher • L lumière. Porte animée.';body.append(note);
 for(const [key,label] of [['houseDoorProgress','Door Open 0–1']]){if(o[key]===undefined)o[key]=0;field(body,o,key,label)}
 for(const [key,label] of [['houseDoorOpen','Door Open'],['houseLightsOn','Lights On']]){
  if(o[key]===undefined)o[key]=key==='houseLightsOn';
  const row=document.createElement('label');row.className='logic-flag',input=document.createElement('input');input.type='checkbox';input.disabled=state.playing;input.checked=!!o[key];input.onchange=()=>{o[key]=input.checked;if(key==='houseDoorOpen')o.houseDoorProgress=input.checked?1:0;record('House : '+label);notify()};row.append(input,document.createTextNode(label));body.append(row)
 }
});
if(isElement(o))component(root,'Game Element',body=>{
 const d=elementDefaults();for(const [k,v] of Object.entries(d))if(o[k]===undefined)o[k]=v;
 const note=document.createElement('p');note.textContent='Gameplay : ramassage au contact ou interaction E. Configurer ici la portée, les dégâts ou la destination.';body.append(note);
 for(const [k,label] of [['elementValue','Value / Amount'],['elementDamage','Damage'],['elementRadius','Interaction Radius'],['elementTargetX','Destination X'],['elementTargetY','Destination Y']])field(body,o,k,label);
 field(body,o,'elementKey','Key Item Name','text');
 const row=document.createElement('label');row.className='logic-flag';const check=document.createElement('input');check.type='checkbox';check.disabled=state.playing;check.checked=o.elementEnabled!==false;check.onchange=()=>{o.elementEnabled=check.checked;record('Element enabled');notify()};row.append(check,document.createTextNode('Enabled'));body.append(row)
});
if(o.type==='prefab'){if(!o.stats&&(!getAsset(o.assetId)?.spriteUrl||getAsset(o.assetId)?.kind==='actor'))component(root,'Health',body=>field(body,o,'hp','Hit Points'));if(getAsset(o.assetId)?.category==='Monsters')component(root,'AI Controller',body=>{selectField(body,o,'behavior','Behaviour',['none','patrol','chase','guard','wander','flee','follow']);if(o.aiSpeed===undefined)o.aiSpeed=65;if(o.detectionRadius===undefined)o.detectionRadius=650;field(body,o,'aiSpeed','Move speed');field(body,o,'detectionRadius','Detection range')})}
if(o.gameMode)component(root,'Game Mode Rules',body=>{
 const m=o.gameMode;for(const [key,value] of Object.entries(modeDefaults()))if(m[key]===undefined)m[key]=value;
 selectField(body,m,'kind','Mode',Object.keys(modeNames));
 const help=document.createElement('p');help.textContent=modeNames[m.kind]+' — simulation locale, sans serveur multijoueur.';body.append(help);
 if(m.kind==='roleplay'){selectField(body,m,'role','Starting Role',roleNames);for(const [k,l] of [['startingMoney','Starting Money'],['roleSalary','Paycheck'],['rolePayInterval','Pay Interval']])field(body,m,k,l)}
 else{for(const [k,l] of [['scoreLimit','Victory Score'],['timeLimit','Match Seconds'],['respawnSeconds','Respawn Seconds']])field(body,m,k,l)}
 if(m.kind==='battleRoyale')for(const [k,l] of [['zoneX','Storm Center X'],['zoneY','Storm Center Y'],['zoneRadius','Start Radius'],['zoneMinRadius','Final Radius'],['zoneShrinkSeconds','Shrink Seconds'],['zoneDamage','Storm DPS']])field(body,m,k,l);
 if(m.kind==='frontline')for(const [k,l] of [['captureX','Capture X'],['captureY','Capture Y'],['captureRadius','Capture Radius'],['captureSeconds','Capture Seconds'],['scorePerCapture','Score Per Tick']])field(body,m,k,l);
 const rm=document.createElement('button');rm.textContent='Remove Game Mode';rm.disabled=state.playing;rm.onclick=()=>{delete o.gameMode;record('Remove Game Mode');notify()};body.append(rm)
});
if(o.type==='character'||o.type==='player'||o.type==='prefab'&&getAsset(o.assetId)?.kind==='actor')component(root,'Game Role / Team',body=>{
 if(o.team===undefined)o.team=1;field(body,o,'team','Team (1 / 2)');
 if(o.gameMode)body.append(document.createTextNode('Le Game Mode définit les règles de la partie.'));
});

if(o.logic){
const logicSection=document.createElement('details');logicSection.className='inspector-component';logicSection.open=true;const title=document.createElement('summary');title.textContent='⚡ Visual Logic • Triggers / Conditions / Actions';const inner=document.createElement('div');inner.className='component-content logic-editor';logicSection.append(title,inner);root.append(logicSection);
const saveLogic=msg=>{record(msg);notify()};
if(!o.logic){const add=document.createElement('button');add.textContent='+ Add Visual Logic';add.disabled=state.playing;add.onclick=()=>{o.logic=defaultLogic();saveLogic('Add Visual Logic')};inner.append(add)}
else{
const l=o.logic;selectField(inner,l,'event','Trigger',eventTypes);field(inner,l,'radius','Range');field(inner,l,'prompt','Prompt','text');
const flag=document.createElement('label');flag.className='logic-flag';const check=document.createElement('input');check.type='checkbox';check.checked=!!l.once;check.disabled=state.playing;check.onchange=()=>{l.once=check.checked;saveLogic('Trigger once')};flag.append(check,document.createTextNode('Run only once'));inner.append(flag);
for(const [type,arr,options] of [['Condition','conditions',conditionTypes],['Action','actions',actionTypes]]){
const head=document.createElement('div');head.className='logic-heading';head.textContent=type+'s';inner.append(head);
for(const [i,item] of (l[arr]||[]).entries()){
const group=document.createElement('div');group.className='logic-step';selectField(group,item,'type',type,options);
field(group,item,'key','Variable / Item','text');
field(group,item,'value','Value','text');
if(type==='Action'&&item.type==='teleport'){field(group,item,'x','Target X');field(group,item,'y','Target Y')}if(type==='Action'&&item.type==='startQuest'){field(group,item,'goal','Target Count');field(group,item,'description','Description','text')}
const remove=document.createElement('button');remove.textContent='Remove '+type;remove.disabled=state.playing;remove.onclick=()=>{l[arr].splice(i,1);saveLogic('Remove '+type)};group.append(remove);inner.append(group)
}
const add=document.createElement('button');add.textContent='+ Add '+type;add.disabled=state.playing;add.onclick=()=>{l[arr]??=[];l[arr].push(type==='Action'?{type:'message',key:'',value:'Action !'}:{type:'always',key:'',value:''});saveLogic('Add '+type)};inner.append(add)
}
component(inner,'Dialogue Tree',body=>{const help=document.createElement('p');help.textContent='Choix et ramifications. Ajoute une action startDialogue au trigger.';body.append(help);if(!o.dialogue){const btn=document.createElement('button');btn.textContent='+ Create Dialogue';btn.disabled=state.playing;btn.onclick=()=>{o.dialogue={title:o.name,nodes:[{text:'Bonjour, aventurier !',choices:[{text:'Continuer',next:-1}]}]};saveLogic('Créer dialogue')};body.append(btn);return}
field(body,o.dialogue,'title','Speaker','text');
for(const [idx,node] of o.dialogue.nodes.entries()){const group=document.createElement('div');group.className='logic-step';const heading=document.createElement('strong');heading.textContent='Node '+idx;group.append(heading);field(group,node,'text','Speech','text');for(const [j,choice] of (node.choices||[]).entries()){const line=document.createElement('div');line.className='logic-step';field(line,choice,'text','Answer','text');field(line,choice,'next','Go to node');field(line,choice,'item','Give item','text');field(line,choice,'quest','Start quest','text');const rm=document.createElement('button');rm.textContent='− Choice';rm.onclick=()=>{node.choices.splice(j,1);saveLogic('Remove dialogue choice')};line.append(rm);group.append(line)}const addChoice=document.createElement('button');addChoice.textContent='+ Choice';addChoice.onclick=()=>{node.choices??=[];node.choices.push({text:'Choisir',next:-1});saveLogic('Add dialogue choice')};group.append(addChoice);body.append(group)}
const addNode=document.createElement('button');addNode.textContent='+ Dialogue Node';addNode.onclick=()=>{o.dialogue.nodes.push({text:'Nouvelle réplique',choices:[{text:'Terminer',next:-1}]});saveLogic('Add dialogue node')};body.append(addNode);
});
const removeLogic=document.createElement('button');removeLogic.textContent='Remove Visual Logic component';removeLogic.disabled=state.playing;removeLogic.onclick=()=>{delete o.logic;saveLogic('Remove Visual Logic')};inner.append(removeLogic)
}
}
root.append(advancedTools);
renderPhysics2d(root,o,{component,field,selectField});
const del=document.createElement('button');del.className='delete-object';del.textContent='Supprimer GameObject';del.disabled=state.playing;del.onclick=deleteSelected;root.append(del);finishInspector(root,o,advancedTools)}
export function renderUI(){renderHierarchy();renderInspector()}
document.addEventListener('warlike:change',renderUI);
