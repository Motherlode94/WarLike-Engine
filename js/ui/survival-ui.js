import {state} from '../core/state.js';
import {workspace} from '../core/workspaces.js';
import {playableActor,view3d} from '../core/viewport-3d.js';
import {gameIsRunning,setGamePhase} from '../core/game-session.js';
import {gameplayInputBlocked} from '../core/gameplay-input.js';
import {inventoryCount} from '../core/gameplay-components.js';
import {healthOf} from '../core/ai-perception.js';
import {ensureSurvival,survivalAction,survivalRecipes,survivalResources,survivalMilestones} from '../core/survival-runtime.js';
import {survivalPlacement as placement,clearSurvivalPlacement,inspectSurvivalPlacement,survivalCenter} from '../core/survival-building.js';
import {isLanGuest,lanCommands} from '../core/lan-state.js';
import {loadSurvivalScene} from '../core/survival-scene.js';
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n};
const editable=target=>/INPUT|TEXTAREA|SELECT/.test(target?.tagName)||target?.isContentEditable;
export function initSurvivalUi(){
 const host=document.getElementById('viewport'),hud=el('section','survival-hud');hud.id='survivalHud';hud.hidden=true;hud.setAttribute('aria-label','Survie, provisions et fabrication');
 const top=el('header'),title=el('strong','','SURVIE'),toggle=el('button','','−');toggle.type='button';toggle.setAttribute('aria-label','Réduire ou développer le panneau survie');toggle.onclick=()=>hud.classList.toggle(hud.classList.contains('compact')?'expanded':'minimized');top.append(title,toggle);hud.append(top);
 const body=el('div','survival-body'),meters=el('div','survival-meters'),bars={};
 for(const [key,label] of [['food','Satiété'],['water','Hydratation'],['rest','Repos'],['warmth','Chaleur']]){
  const row=el('label'),value=el('span'),meter=el('progress');meter.max=100;meter.setAttribute('aria-label',label);row.append(value,meter);meters.append(row);bars[key]={value,meter,label};
 }
 body.append(meters);const supplies=el('p','survival-supplies'),actions=el('div','survival-actions');body.append(supplies,actions);
 const run=action=>{
  const p=playableActor(state.entities);if(!state.playing||!gameIsRunning()||gameplayInputBlocked()||!p?.survival)return false;
  document.activeElement?.blur();
  if(isLanGuest()){if(lanCommands.length>=8)return false;lanCommands.push(action);return true}
  return survivalAction(p,action,state.entities,{mode:workspace.mode,allocateId:()=>state.nextId++}).ok;
 };
 const buttons={};
 for(const [action,label] of [['gather','Récolter · E'],['drink','Boire'],['eat','Manger des baies'],['rest','Se reposer'],['refuel','Attiser le feu'],['revive','Relever · 2 fibres']]){
  const b=el('button','',label);b.type='button';b.onclick=()=>run(action);actions.append(b);buttons[action]=b;
 }
 const pause=el('button','','Pause / sauvegarde');pause.type='button';pause.onclick=()=>{clearSurvivalPlacement();setGamePhase('paused');state.keys.clear()};actions.append(pause);
 const begin=id=>{
  const p=playableActor(state.entities);if(!p||!gameIsRunning()||gameplayInputBlocked())return;
  document.exitPointerLock?.();document.activeElement?.blur();const c=survivalCenter(p,workspace.mode);
  Object.assign(placement,{active:true,recipe:id,actorId:p.id,point:{x:c.x+150,y:c.y},rotation:0,entity:null,valid:false});
 };
 const craft=el('details','survival-crafting');craft.open=true;craft.append(el('summary','','Fabrication et campement'));const craftButtons={};
 for(const [id,recipe] of Object.entries(survivalRecipes)){
  const b=el('button','survival-recipe');b.type='button';b.dataset.survivalRecipe=id;
  b.append(el('strong','',(recipe.build?'Placer · ':'Fabriquer · ')+recipe.name),el('small','',Object.entries(recipe.cost).map(([item,count])=>count+' '+survivalResources[item]).join(' · ')+(recipe.station?' · près du feu':'')));
  b.onclick=()=>recipe.build?begin(id):run('craft:'+id);craft.append(b);craftButtons[id]=b;
 }
 body.append(craft);
 const mission=el('section','survival-mission'),missionTitle=el('strong','','PREMIÈRE AUBE · objectif commun'),goals={};mission.append(missionTitle);
 for(const [key,label] of [['campfire','Un feu alimenté'],['shelter','Un abri'],['meal','Un repas cuisiné'],['dawn','Une nuit survécue']]){const row=el('div','',label);row.dataset.survivalGoal=key;mission.append(row);goals[key]={row,label}}
 mission.append(el('small','','Après l’aube, rejoignez le feu et l’abri pour terminer l’expédition.'));body.append(mission);
 const party=el('p','survival-party'),message=el('p','survival-notice');message.setAttribute('role','status');body.append(party,message);hud.append(body);host.append(hud);
 const night=el('div','survival-night');night.setAttribute('aria-hidden','true');night.hidden=true;host.append(night);
 const bar=el('section','survival-placement-bar');bar.id='survivalPlacement';bar.hidden=true;bar.setAttribute('aria-label','Placement de construction');
 const buildTitle=el('strong'),buildStatus=el('p'),buildControls=el('div'),rotate=el('button','','Tourner · R'),snapLabel=el('label'),snap=el('input'),confirm=el('button','','Poser'),cancel=el('button','','Annuler · Échap');
 buildStatus.setAttribute('role','status');snap.type='checkbox';snap.checked=placement.snap;snap.onchange=()=>placement.snap=snap.checked;snapLabel.append(snap,document.createTextNode('Grille'));
 rotate.type=confirm.type=cancel.type='button';rotate.onclick=()=>placement.rotation=(placement.rotation+90)%360;cancel.onclick=clearSurvivalPlacement;
 const refresh=()=>{
  const p=playableActor(state.entities),template=p?.survival?.buildTemplates?.[workspace.mode]?.[placement.recipe];
  if(!placement.active)return;
  if(!p||p.id!==placement.actorId||healthOf(p)<=0||!state.playing||!gameIsRunning()||gameplayInputBlocked()){clearSurvivalPlacement();return}
  const check=inspectSurvivalPlacement(p,template,{...placement.point,rotation:placement.rotation},state.entities,{mode:workspace.mode,snap:placement.snap});
  const recipe=survivalRecipes[placement.recipe],missing=Object.entries(recipe.cost).some(([id,count])=>inventoryCount(p,id)<count);
  placement.valid=check.ok&&!missing&&ensureSurvival(p).actionCooldown<=0;
  placement.message=missing?'Matériaux insuffisants.':ensureSurvival(p).actionCooldown>0?'Attends un instant.':check.message;
  placement.entity=check.entity?{...check.entity,id:-1,name:'Aperçu · '+recipe.name,_survivalPreview:true,colorCustomized:true,color:placement.valid?'#81e5bd':'#f48c82',collision3d:false}:null;
  buildTitle.textContent='PLACEMENT · '+recipe.name+' · '+placement.rotation+'°';buildStatus.textContent=placement.message;bar.dataset.valid=String(placement.valid);confirm.disabled=!placement.valid;
 };
 const commit=()=>{
  refresh();if(!placement.active||!placement.valid||!placement.entity)return;
  const c=survivalCenter(placement.entity,workspace.mode);
  if(run({type:'place',recipe:placement.recipe,x:c.x,y:c.y,rotation:placement.rotation}))clearSurvivalPlacement();
 };
 confirm.onclick=commit;buildControls.append(rotate,snapLabel,confirm,cancel);bar.append(buildTitle,buildStatus,buildControls);host.append(bar);
 const aim=event=>{
  if(!placement.active||!event.target?.matches?.('#canvas,#canvas3d'))return;
  if(workspace.mode==='3d')placement.point=view3d.groundAt?.(event.clientX,event.clientY)||null;
  else{const canvas=event.target,r=canvas.getBoundingClientRect(),c=state.camera;placement.point={x:((event.clientX-r.left)*canvas.clientWidth/r.width-c.x)/c.zoom,y:((event.clientY-r.top)*canvas.clientHeight/r.height-c.y)/c.zoom}}
  refresh();
 };
 host.addEventListener('pointermove',aim,{capture:true});
 host.addEventListener('pointerdown',event=>{if(!placement.active||event.button!==0||!event.target?.matches?.('#canvas,#canvas3d'))return;event.preventDefault();event.stopPropagation();aim(event);commit()},{capture:true});
 window.addEventListener('keydown',event=>{
  if(!placement.active||editable(event.target)||event.repeat)return;
  if(!['Escape','r','R','Enter'].includes(event.key))return;
  event.preventDefault();event.stopImmediatePropagation();
  if(event.key==='Escape')clearSurvivalPlacement();else if(event.key==='Enter')commit();else placement.rotation=(placement.rotation+90)%360;
 },{capture:true});
 if(!globalThis.__WARLIKE_BUILD__){const menu=[...document.querySelectorAll('#studioMenus>details')].find(d=>d.querySelector('summary')?.textContent.trim()==='Game')?.querySelector('.studio-dropdown');if(menu){const b=el('button','','Survival · Scène de survie');b.id='loadSurvivalScene';b.type='button';b.onclick=()=>{b.closest('details').open=false;loadSurvivalScene()};menu.append(b)}}
 window.addEventListener('keydown',event=>{if(event.key.toLowerCase()!=='e'||event.repeat||isLanGuest()||!state.playing||placement.active||editable(event.target))return;run('gather')});
 let previous=0;
 const frame=now=>{
  requestAnimationFrame(frame);if(now-previous<80)return;previous=now;
  const p=playableActor(state.entities);hud.hidden=!state.playing||!p?.survival||p.survival.enabled===false;night.hidden=hud.hidden||workspace.mode!=='2d';
  if(placement.active)refresh();bar.hidden=!placement.active;
  if(hud.hidden){clearSurvivalPlacement();bar.hidden=true;return}
  const s=ensureSurvival(p),world=state.entities.find(o=>o.survivalWorld?.enabled)?.survivalWorld,hour=world?.hour??14;
  title.textContent='SURVIE · J'+(world?.day||1)+' · '+String(Math.floor(hour)).padStart(2,'0')+':'+String(Math.floor(hour%1*60)).padStart(2,'0')+' · PV '+Math.ceil(healthOf(p));
  hud.classList.toggle('compact',host.clientHeight<340);hud.classList.toggle('hybrid',!!p.superhero);
  const expanded=!(hud.classList.contains('compact')&&!hud.classList.contains('expanded')||hud.classList.contains('minimized'));toggle.textContent=expanded?'−':'＋';toggle.setAttribute('aria-expanded',String(expanded));night.style.opacity=s.night?'.2':'.02';
  for(const [key,b] of Object.entries(bars)){b.value.textContent=b.label+' '+Math.ceil(s[key])+' %';b.meter.value=s[key];b.meter.classList.toggle('low',s[key]<20)}
  supplies.textContent=Object.entries(survivalResources).map(([id,name])=>name+' '+inventoryCount(p,id)).join(' · ');
  const disabled=!gameIsRunning()||gameplayInputBlocked()||healthOf(p)<=0||s.actionCooldown>0;
  for(const b of Object.values(buttons))b.disabled=disabled;
  buttons.drink.disabled||=inventoryCount(p,'water')<=0;buttons.eat.disabled||=inventoryCount(p,'berries')<=0;buttons.refuel.disabled||=inventoryCount(p,'wood')<=0;buttons.rest.disabled||=s.restCooldown>0;buttons.revive.disabled||=inventoryCount(p,'fiber')<2;
  pause.hidden=isLanGuest();pause.disabled=!gameIsRunning();
  for(const [id,b] of Object.entries(craftButtons))b.disabled=disabled||Object.entries(survivalRecipes[id].cost).some(([item,count])=>inventoryCount(p,item)<count);
  const progress=survivalMilestones(state.entities,{mode:workspace.mode});
  for(const [key,{row,label}] of Object.entries(goals)){row.textContent=(progress[key]?'✓ ':'◇ ')+label;row.classList.toggle('complete',progress[key])}
  party.textContent=state.entities.filter(o=>o.survival&&!o.survivalDormant).map(o=>(o===p?'Toi':o.name)+' · '+(healthOf(o)>0?Math.ceil(healthOf(o))+' PV':'À TERRE')).join(' / ');
  message.textContent=healthOf(p)<=0?'À terre · un coéquipier peut te relever avec 2 fibres.':s.noticeTime>0?s.notice:s.night?'Nuit · reste près du feu et surveille les rôdeurs.':s.sheltered?'Abri à portée · tu peux te reposer.':'E : récolter · place le feu et l’abri près l’un de l’autre.';
 };
 requestAnimationFrame(frame);
}
