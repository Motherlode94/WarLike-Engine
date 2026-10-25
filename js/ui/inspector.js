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
function field(parent,o,key,label,type='number'){const line=document.createElement('div');line.className='property-row';const name=document.createElement('label');name.textContent=label;const input=document.createElement('input');input.type=type;input.value=o[key]??(type==='number'?0:'');input.disabled=state.playing;input.onchange=()=>{const v=type==='number'?Number(input.value):input.value;if(type==='number'&&!Number.isFinite(v))return;if(['w','h'].includes(key)&&v<=0)return;o[key]=v;record('Inspector : '+label);notify()};line.append(name,input);parent.append(line)}
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
 for(const color of colorsPreset){const btn=document.createElement('button');btn.type='button';btn.className='warlike-color-swatch';btn.style.backgroundColor=color;btn.title=color;btn.setAttribute('aria-label','Appliquer '+color);btn.disabled=state.playing;btn.onclick=()=>apply(color);palette.append(btn)}
 root.append(palette);parent.append(root);
}
function selectField(parent,o,key,label,opts){const line=document.createElement('div');line.className='property-row';const title=document.createElement('label');title.textContent=label;const select=document.createElement('select');select.disabled=state.playing;for(const value of opts){const option=document.createElement('option');option.value=value;option.textContent=value;select.append(option)}select.value=o[key]||opts[0];select.onchange=()=>{o[key]=select.value;record('Inspector : '+label);notify()};line.append(title,select);parent.append(line)}
function component(parent,title,build){const details=document.createElement('details');details.className='inspector-component';details.open=true;const summary=document.createElement('summary');summary.textContent='▣ '+title;const body=document.createElement('div');body.className='component-content';details.append(summary,body);build(body);parent.append(details)}
export function renderHierarchy(){const root=document.querySelector('#objects'),filter=(document.querySelector('#hierarchySearch')?.value||'').toLowerCase();root.replaceChildren();for(const o of state.entities.filter(o=>o.name.toLowerCase().includes(filter))){const b=document.createElement('button');b.textContent=(o.type==='prefab'?'◈ ':o.type==='character'?'♟ ':'▣ ')+o.name;b.classList.toggle('selected',state.selected.includes(o.id));b.onclick=e=>{if(state.playing)return;state.selected=e.shiftKey?(state.selected.includes(o.id)?state.selected.filter(id=>id!==o.id):[...state.selected,o.id]):[o.id];notify()};root.append(b)}}
export function renderInspector(){const root=document.querySelector('#properties');root.replaceChildren();const o=active();if(!o){root.textContent='Sélectionne un objet dans la scène';return}
const header=document.createElement('div');header.className='inspector-object';const name=document.createElement('input');name.value=o.name;name.disabled=state.playing;name.title='Nom du GameObject';name.onchange=()=>{o.name=name.value.trim()||o.name;record('Renommer GameObject');notify()};const meta=document.createElement('small');meta.textContent='GameObject #'+o.id+' • '+o.type;header.append(name,meta);root.append(header);
component(root,'Transform',body=>{field(body,o,'x','Position X');field(body,o,'y',workspace.mode==='3d'?'Position Z':'Position Y');if(workspace.mode==='3d')field(body,o,'elevation3d','Position Y (3D height)');field(body,o,'rotation','Rotation');field(body,o,'w','Size X');field(body,o,'h',workspace.mode==='3d'?'Height':'Size Y')});
component(root,'Quick Start • Gameplay Recipes',body=>{
 const intro=document.createElement('p');intro.textContent='Appliquer un comportement réutilisable à cet objet. Les composants existants concernés peuvent être remplacés.';body.append(intro);
 const picker=document.createElement('select');picker.disabled=state.playing;
 for(const recipe of recipes){const opt=document.createElement('option');opt.value=recipe.id;opt.textContent=recipe.name+' — '+recipe.description;picker.append(opt)}
 body.append(picker);
 const apply=document.createElement('button');apply.textContent='＋ Appliquer le modèle';apply.disabled=state.playing;apply.onclick=()=>{if(!confirm('Appliquer ce modèle à '+o.name+' ? Les composants concernés seront remplacés.'))return;if(applyRecipe(o,picker.value)){record('Gameplay Recipe : '+picker.value);notify()}};body.append(apply);
});
if(workspace.mode==='3d')component(root,'Physics 3D • Rigidbody',body=>{
 if(!o.rigidbody3d){const add=document.createElement('button');add.textContent='＋ Add Rigidbody 3D';add.disabled=state.playing;add.onclick=()=>{o.rigidbody3d=defaultRigidbody3d();record('Add Rigidbody 3D');notify()};body.append(add);return}
 const rb=o.rigidbody3d;
 for(const [key,label] of [['mass','Mass'],['gravity','Gravity'],['restitution','Bounciness (0-1)'],['friction','Friction (0-1)'],['vx','Velocity X'],['vy','Velocity Y'],['vz','Velocity Z']])field(body,rb,key,label);
 for(const [key,label] of [['enabled','Enabled'],['kinematic','Kinematic (no physics)']]){
  const row=document.createElement('label');row.className='logic-flag';const input=document.createElement('input');input.type='checkbox';input.checked=rb[key]===true;input.disabled=state.playing;input.onchange=()=>{rb[key]=input.checked;record('Rigidbody '+key);notify()};row.append(input,document.createTextNode(label));body.append(row);
 }
 const info=document.createElement('p');info.textContent='Prototype physique 3D : gravité, rebond au sol et collisions AABB simples. Le joueur et les agents IA utilisent leur propre contrôleur.';body.append(info);
 const rm=document.createElement('button');rm.textContent='− Remove Rigidbody';rm.disabled=state.playing;rm.onclick=()=>{delete o.rigidbody3d;record('Remove Rigidbody');notify()};body.append(rm);
});
component(root,'Game Creator · Survival Horror',body=>{
 const configs=[
  ['Horror AI','horrorAiConfig',{enabled:true,visionRange:230,hearingRange:220,chaseSpeed:75,searchSpeed:33,memorySeconds:5},[['visionRange','Vision (distance)'],['hearingRange','Audition (distance)'],['chaseSpeed','Vitesse poursuite'],['searchSpeed','Vitesse recherche'],['memorySeconds','Durée recherche']]],
  ['Cachette','horrorHideConfig',{enabled:true,radius:90},[['radius','Rayon cachette']]],
  ['Zone de peur','horrorFearConfig',{enabled:true,radius:170,strength:12},[['radius','Rayon de peur'],['strength','Intensité']]],
 ];
 for(const [label,key,defaults,properties] of configs){
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
renderSequenceEditor(root,o);
component(root,'Gameplay Components',body=>{
 const addComponent=(name,key,factory)=>{if(!o[key]){const b=document.createElement('button');b.textContent='＋ '+name;b.disabled=state.playing;b.onclick=()=>{o[key]=factory();record('Ajouter '+name);notify()};body.append(b);return false}return true};
 if(addComponent('Stats','stats',defaultStats)){
  const s=o.stats;for(const [key,label] of [['maxHealth','Vie maximale'],['health','Vie actuelle'],['maxStamina','Endurance maximale'],['stamina','Endurance'],['staminaRegen','Régénération']])field(body,s,key,label);
  const remove=document.createElement('button');remove.textContent='− Supprimer Stats';remove.disabled=state.playing;remove.onclick=()=>{delete o.stats;record('Retirer Stats');notify()};body.append(remove);
 }
 if(addComponent('Inventaire','inventory',defaultInventory)){
  const inv=o.inventory;field(body,inv,'capacity','Emplacements');const row=document.createElement('div');row.className='property-row';
  const item=document.createElement('input');item.placeholder='ID objet (ex: sword)';item.disabled=state.playing;const add=document.createElement('button');add.textContent='＋ Objet';add.disabled=state.playing;add.onclick=()=>{if(inventoryAdd(o,item.value.trim())){record('Inventaire : ajouter');notify()}};row.append(item,add);body.append(row);
  for(const entry of inv.items){const line=document.createElement('div');line.className='property-row';const label=document.createElement('span');label.textContent=entry.id+' ×'+entry.count;line.append(label);
   for(const [slot,title] of [['weapon','Arme'],['armor','Armure']]){const btn=document.createElement('button');btn.textContent=title;btn.disabled=state.playing;btn.onclick=()=>{if(equipItem(o,entry.id,slot)){record('Équiper '+slot);notify()}};line.append(btn)}
   const remove=document.createElement('button');remove.textContent='−';remove.disabled=state.playing;remove.onclick=()=>{inventoryRemove(o,entry.id,1);record('Inventaire : retirer');notify()};line.append(remove);body.append(line)}
  const equipped=document.createElement('small');equipped.textContent='Équipé : '+JSON.stringify(inv.equipment||{});body.append(equipped);
 }
 if(addComponent('AI State Machine','ai',defaultAi)){
  const ai=o.ai;selectField(body,ai,'state','État initial',['idle','patrol','chase','attack','dead']);
  for(const [key,label] of [['detection','Rayon détection'],['attackRange','Portée attaque'],['attackDamage','Dégâts'],['attackCooldown','Cooldown'],['speed','Vitesse'],['patrolRadius','Rayon patrouille'],['pathCellSize','Taille cellule A*'],['repathInterval','Recalcul chemin (s)']])field(body,ai,key,label);
  const flag=document.createElement('label');const cb=document.createElement('input');cb.type='checkbox';cb.checked=ai.enabled!==false;cb.disabled=state.playing;cb.onchange=()=>{ai.enabled=cb.checked;record('IA activée');notify()};flag.append(cb,document.createTextNode(' IA activée'));body.append(flag);
  const pathLabel=document.createElement('label');const pathCb=document.createElement('input');pathCb.type='checkbox';pathCb.checked=ai.pathfinding!==false;pathCb.disabled=state.playing;pathCb.onchange=()=>{ai.pathfinding=pathCb.checked;record('Navigation A*');notify()};pathLabel.append(pathCb,document.createTextNode(' Navigation A*'));body.append(pathLabel);
 }
 if(addComponent('Character Controller 3D','controller3d',defaultController)){
  for(const [key,label] of [['walkSpeed','Marche'],['sprintSpeed','Sprint'],['jumpForce','Saut'],['gravity','Gravité'],['dodgeDistance','Esquive (préparation)'],['dodgeCooldown','Cooldown esquive (préparation)'],['staminaCost','Coût endurance (préparation)']])field(body,o.controller3d,key,label);
 }
});

if(workspace.mode==='3d'){
component(root,'Lighting 3D Beta',body=>{
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
component(root,'Audio Source Beta',body=>{
 const flag=document.createElement('label');flag.className='logic-flag';const cb=document.createElement('input');
 cb.type='checkbox';cb.checked=o.audioEnabled===true;cb.disabled=state.playing;
 cb.onchange=()=>{o.audioEnabled=cb.checked;record('Audio Enabled');notify()};
 flag.append(cb,document.createTextNode(' Active'));body.append(flag);
 if(o.audioClip===undefined)o.audioClip='none';
 selectField(body,o,'audioClip','Clip',['none',...soundChoices,'imported']);
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
component(root,'Material 3D Beta',body=>{colorPalette(body,o,'color','Couleur du matériau');if(o.materialRoughness===undefined)o.materialRoughness=.7;if(o.materialMetallic===undefined)o.materialMetallic=0;field(body,o,'materialRoughness','Rugosité 0–1');field(body,o,'materialMetallic','Métal 0–1');const hint=document.createElement('p');hint.textContent='Matériaux provisoires : volumes 3D sans textures. Les prefabs utilisent une palette par catégorie.';body.append(hint)});
const del3d=document.createElement('button');del3d.className='delete-object';del3d.textContent='Supprimer objet 3D';del3d.disabled=state.playing;del3d.onclick=deleteSelected;root.append(del3d);
return;
}
component(root,'Sprite Renderer',body=>{colorPalette(body,o,'color','Couleur de l’objet');if(o.type==='prefab'){const label=document.createElement('p');label.textContent='Source : '+(getAsset(o.assetId)?.name||o.assetId);body.append(label)}if(o.type==='character')selectField(body,o,'skin','Character',['scout','soldier'])});
if(o.type==='character'||o.type==='prefab')component(root,'Animator 2D',body=>{const kind=o.type==='character'?'actor':getAsset(o.assetId)?.kind||'prop';selectField(body,o,'animation','Clip',availableClips(kind,o.assetId));if(o.animationSpeed===undefined)o.animationSpeed=1;field(body,o,'animationSpeed','Playback Speed');const line=document.createElement('label');line.className='logic-flag';const check=document.createElement('input');check.type='checkbox';check.checked=!!o.animationPreview;check.disabled=state.playing;check.onchange=()=>{o.animationPreview=check.checked;record('Prévisualisation animation');notify()};line.append(check,document.createTextNode('Preview animation in Scene'));body.append(line)});
if(o.type==='prefab'&&getAsset(o.assetId)?.category==='Weapons')component(root,'Weapon Configuration',body=>{
 const asset=getAsset(o.assetId);for(const [k,label] of [['weaponDamage','Damage'],['weaponInterval','Seconds between attacks'],['weaponRange','Projectile range']]){if(o[k]===undefined)o[k]=asset[k]??({weaponDamage:34,weaponInterval:.16,weaponRange:650})[k];field(body,o,k,label)}
 const note=document.createElement('p');note.textContent='Play : approche une arme et appuie sur G pour équiper, puis clic gauche/F pour tirer. Armes de mêlée : attaque à courte portée.';body.append(note);
});
if(o.type==='prefab'&&getAsset(o.assetId)?.category==='Vehicles'){component(root,'Vehicle Controller 2D',body=>{for(const [key,label] of [['hp','Vehicle HP'],['maxSpeed','Max Speed'],['acceleration','Acceleration'],['brakeForce','Brake Force'],['turnRate','Turn Rate °/s'],['drag','Drag'],['collisionRadius','Collision Radius']]){if(o[key]===undefined)o[key]=({maxSpeed:250,acceleration:210,brakeForce:310,turnRate:140,drag:1.4,collisionRadius:25})[key];field(body,o,key,label)}const note=document.createElement('p');note.textContent='Play : E monter/sortir • ZQSD conduite • Espace frein à main';body.append(note)})}
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
if(o.type==='prefab'){component(root,'Health',body=>field(body,o,'hp','Hit Points'));if(getAsset(o.assetId)?.category==='Monsters')component(root,'AI Controller',body=>{selectField(body,o,'behavior','Behaviour',['none','patrol','chase','guard','wander','flee','follow']);if(o.aiSpeed===undefined)o.aiSpeed=65;if(o.detectionRadius===undefined)o.detectionRadius=650;field(body,o,'aiSpeed','Move speed');field(body,o,'detectionRadius','Detection range')})}
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
component(root,'Box Collider 2D',body=>{const note=document.createElement('p');note.textContent='Collision rectangulaire (AABB), selon le type d’objet.';body.append(note)});
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
const del=document.createElement('button');del.className='delete-object';del.textContent='Supprimer GameObject';del.disabled=state.playing;del.onclick=deleteSelected;root.append(del)}
export function renderUI(){renderHierarchy();renderInspector()}
document.addEventListener('warlike:change',renderUI);
