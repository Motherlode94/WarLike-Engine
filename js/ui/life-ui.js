import {state} from '../core/state.js';
import {workspace} from '../core/workspaces.js';
import {getAsset} from '../assets/catalog.js';
import {gameSession,gameIsRunning,saveGameSlot,queueLoadGame,hasGameSlot} from '../core/game-session.js';
import {sequenceRuntime} from '../core/logic-sequences.js';
import {isLanGuest} from '../core/lan-state.js';
import {gameplayInputBlocked} from '../core/gameplay-input.js';
import {isTypingTarget} from '../core/editor-clipboard.js';
import {lifeActor,ensureLifeState,lifeNeeds,lifeTopics,lifeActions,lifeActivities,lifeMood,lifeTime,relationship,lifeRelationshipLabel,lifeNpcPlace,lifeNpcAvailable,requestLifeActivity,requestLifeSocial,walkLifeTo,cancelLifeTask} from '../core/life-simulation.js';

const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!=null)node.textContent=text;return node};
const button=(label,fn,cls='')=>{const b=el('button',cls,label);b.type='button';b.onclick=()=>{fn();state.keys.clear();state.keyPresses.clear();b.blur()};return b};
export function initLifeUi(){
 const host=document.getElementById('viewport');if(!host||document.getElementById('lifeHud'))return;
 const hud=el('section','life-hud');hud.id='lifeHud';hud.hidden=true;hud.setAttribute('aria-label','Liens de vie · simulation');host.append(hud);
 const top=el('header','life-top'),brand=el('div','life-brand');brand.append(el('span','life-kicker','WARLIKE · SIMULATION DE VIE'),el('strong','','Les Tilleuls'),el('small','','Des journées à toi. Des liens à créer.'));
 const clock=el('div','life-clock'),time=el('strong'),day=el('small');clock.append(time,day);
 const controls=el('div','life-controls'),pause=button('Ⅱ Pause',()=>{const s=ensureLifeState(actor());s.paused=!s.paused});
 const speeds=el('div','life-speeds'),speedButtons=[1,2,4].map(rate=>{const b=button('×'+rate,()=>{ensureLifeState(actor()).speed=rate});b.setAttribute('aria-label','Vitesse ×'+rate);speeds.append(b);return b});
 const context=()=>({entities:state.entities,globals:sequenceRuntime.globals,fired:sequenceRuntime.fired});
 const save=button('Sauvegarder',()=>{try{saveGameSlot(context(),'life');ensureLifeState(actor()).notice='Ta journée et tes relations sont sauvegardées.'}catch(error){ensureLifeState(actor()).notice=error.message}});
 const load=button('Reprendre',()=>{try{queueLoadGame(context(),'life')}catch(error){ensureLifeState(actor()).notice=error.message}});load.setAttribute('aria-label','Charger ma partie Liens de vie');
 controls.append(pause,speeds,save,load);top.append(brand,clock,controls);hud.append(top);
 const status=el('div','life-status');status.setAttribute('role','status');hud.append(status);
 const pins=el('div','life-pins');hud.append(pins);
 const aside=el('aside','life-side'),tabs=el('nav','life-tabs'),content=el('div','life-side-content');aside.setAttribute('aria-label','Carnet de vie');
 let tab='people',selectedNpc=null,signature='',lastActor=null,lastRender=0;const pinMap=new Map();
 const tabButtons=[['people','Relations'],['places','Activités'],['journal','Journal'],['profile','Moi']].map(([id,label])=>{const b=button(label,()=>{tab=id;signature='';hud.classList.add('life-panel-open')});tabs.append(b);return {id,b}});
 const collapse=button('Réduire le carnet',()=>hud.classList.remove('life-panel-open'),'life-close-panel');aside.append(tabs,content,collapse);hud.append(aside);
 const bottom=el('footer','life-bottom'),identity=el('div','life-identity'),portrait=el('img'),name=el('strong'),mood=el('small'),money=el('b');portrait.alt='Ton personnage';const identityText=el('div');identityText.append(name,mood,money);identity.append(portrait,identityText);
 const needs=el('div','life-needs'),needRows={};for(const [id,label] of Object.entries(lifeNeeds)){const row=el('div','life-need'),head=el('span','',label),number=el('b'),track=el('div','life-track'),fill=el('i');track.append(fill);row.append(head,number,track);needs.append(row);needRows[id]={number,fill,row};}
 const taskBox=el('div','life-task'),taskText=el('span'),progress=el('progress');progress.max=1;progress.setAttribute('aria-label','Progression de l’action');const cancel=button('Annuler',()=>cancelLifeTask(actor()));taskBox.append(taskText,progress,cancel);
 bottom.append(identity,needs,taskBox);hud.append(bottom);
 const mobile=button('Ouvrir le carnet',()=>hud.classList.toggle('life-panel-open'),'life-open-panel');hud.append(mobile);
 const hint=el('small','life-walk-hint','Clic au sol : marcher · ZQSD / flèches : déplacer · Maj : courir · P : pause');hud.append(hint);
 const actor=()=>lifeActor(state.entities);
 const canAct=()=>state.playing&&workspace.mode==='2d'&&actor()&&gameIsRunning()&&!gameplayInputBlocked()&&!isLanGuest();
 const chooseNpc=id=>{selectedNpc=id;tab='people';signature='';hud.classList.add('life-panel-open')};
 const sprite=node=>{const image=el('img','life-avatar');image.src=getAsset(node.assetId)?.spriteUrl||'';image.alt=node.name;return image};
 function detail(p,s){
  content.replaceChildren();
  if(tab==='people'){
   const npc=state.entities.find(o=>o.id===selectedNpc&&o.lifeNpc);
   if(npc){
    content.append(button('← Tous les habitants',()=>{selectedNpc=null;signature=''},'life-back'));
    const head=el('div','life-person-heading');head.append(sprite(npc),el('h2','',npc.name),el('p','',npc.lifeNpc.bio));content.append(head);
    const r=relationship(p,npc),summary=el('p','life-relation-summary',lifeRelationshipLabel(r)+' · '+lifeNpcPlace(npc,s));content.append(summary);
    for(const [key,label] of [['friendship','Lien'],['trust','Confiance'],['affection','Affection']]){const line=el('div','life-relation-line');line.append(el('span','',label),el('b','',Math.round(r[key])+' / 100'));content.append(line)}
    const speech=s.speech?.npcId===npc.id?s.speech.text:npc.lifeNpc.news;content.append(el('blockquote','life-speech',speech));
    const topicLabel=el('label','','Sujet de conversation'),topic=el('select');topic.id='lifeTopic';topic.setAttribute('aria-label','Sujet de conversation');
    for(const [id,label] of Object.entries(lifeTopics)){const option=el('option','',label);option.value=id;topic.append(option)}topic.value=npc.lifeNpc.likes;topicLabel.append(topic);content.append(topicLabel);
    const actions=el('div','life-social-actions');for(const [id,cfg] of Object.entries(lifeActions)){const b=button(cfg.label,()=>{if(canAct())requestLifeSocial(actor(),state.entities,npc.id,id,{topic:topic.value})});b.disabled=!!s.task||!lifeNpcAvailable(npc,s)||id==='gift'&&s.money<12;actions.append(b)}content.append(actions);
    content.append(el('small','life-fine','Les goûts, la confiance et les échanges récents changent les réponses. Une attirance peut être refusée.'));
   }else{
    content.append(el('span','life-kicker','TON QUARTIER'),el('h2','','Chaque rencontre compte.'),el('p','life-fine','Choisis un habitant. Alex le rejoint avant de commencer la conversation.'));
    for(const npc of state.entities.filter(o=>o.lifeNpc)){
     const r=relationship(p,npc),card=button('',()=>chooseNpc(npc.id),'life-person-card'),words=el('span');words.append(el('strong','',npc.name),el('small','',npc.lifeNpc.bio),el('small','',lifeRelationshipLabel(r)+' · '+Math.round(r.friendship)+'/100'));card.append(sprite(npc),words,el('b','','↗'));content.append(card);
    }
   }
  }else if(tab==='places'){
   content.append(el('span','life-kicker','PRENDRE SON TEMPS'),el('h2','','Une journée à composer.'));
   for(const [id,cfg] of Object.entries(lifeActivities)){const place=state.entities.find(o=>o.lifePlace?.kind===cfg.place),b=button('',()=>{if(canAct())requestLifeActivity(actor(),state.entities,id)},'life-activity-card');b.append(el('strong','',cfg.label),el('small','',place.lifePlace.label+' · '+(cfg.cost?cfg.cost+' ¤':id==='work'?'+35 ¤ minimum':'Gratuit')));b.disabled=!!s.task;content.append(b)}
   content.append(el('p','life-fine','Atelier : 08:00–18:00 · 3 missions par jour. Café : 07:00–22:00. Le temps avance pendant tes déplacements et tes activités.'));
  }else if(tab==='journal'){
   content.append(el('span','life-kicker','PETITS BONHEURS'),el('h2','','Trouver sa place.'));
   for(const [id,label] of [['meet','Rencontrer deux habitants'],['work','Gagner 70 ¤ en travaillant'],['friend','Construire une amitié'],['balance','Garder tous ses besoins à 55+']])content.append(el('p','life-goal'+(s.completed.includes(id)?' done':''),(s.completed.includes(id)?'✓ ':'○ ')+label));
   content.append(el('h3','','Souvenirs de la journée'));if(!s.journal.length)content.append(el('p','life-fine','Ton histoire commence maintenant.'));
   for(const entry of s.journal){const item=el('p','life-memory');item.append(el('small','','J'+entry.day+' · '+entry.time),el('span','',entry.text));content.append(item)}
  }else{
   content.append(el('span','life-kicker','TON PERSONNAGE'),el('h2','','Comment t’appelles-tu ?'));
   const label=el('label','','Prénom'),input=el('input');input.value=p.name;input.maxLength=28;input.setAttribute('aria-label','Prénom du personnage');label.append(input);content.append(label);
   const appearance=el('select');appearance.setAttribute('aria-label','Apparence du personnage');for(const [id,label] of [['0098','Villageois'],['0099','Aventurière'],['0088','Éclaireur']]){const opt=el('option','',label);opt.value='free-tiny-dungeon-tile-'+id;appearance.append(opt)}appearance.value=p.assetId;
   content.append(appearance,button('Appliquer au personnage',()=>{p.name=input.value.trim().slice(0,28)||'Alex';p.assetId=appearance.value;s.notice='Ton personnage est prêt. Sauvegarde pour garder ces choix.';signature=''}));
   content.append(el('p','life-fine','Une simulation solo sans combat. Chaque voisin a ses goûts et ses limites. Tes relations, ton argent, tes besoins et ta position sont inclus dans la sauvegarde.'));
   const credit=el('a','life-credit','Sprites : Kenney · Tiny Town / Tiny Dungeon · CC0');credit.href='https://kenney.nl/assets/tiny-town';credit.target='_blank';credit.rel='noopener noreferrer';content.append(credit);
  }
 }
 host.addEventListener('pointerdown',event=>{
  if(!canAct()||event.button!==0||event.target!==document.getElementById('canvas'))return;
  const rect=host.getBoundingClientRect(),x=(event.clientX-rect.left-state.camera.x)/state.camera.zoom,y=(event.clientY-rect.top-state.camera.y)/state.camera.zoom;
  event.preventDefault();event.stopImmediatePropagation();const npc=state.entities.find(o=>o.lifeNpc&&x>=o.x-10&&x<=o.x+o.w+10&&y>=o.y-10&&y<=o.y+o.h+10);
  if(npc)chooseNpc(npc.id);else walkLifeTo(actor(),{x,y});
 },{capture:true});
 window.addEventListener('keydown',event=>{if(!canAct()||event.repeat||isTypingTarget(event.target))return;if(event.key.toLowerCase()==='p'){event.preventDefault();pause.click()}if(event.key.toLowerCase()==='e'){const p=actor(),near=state.entities.filter(o=>o.lifeNpc).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];if(near&&Math.hypot(near.x-p.x,near.y-p.y)<120){event.preventDefault();chooseNpc(near.id)}}});
 function frame(now){
  requestAnimationFrame(frame);if(now-lastRender<150)return;lastRender=now;
  const p=actor();hud.hidden=!state.playing||workspace.mode!=='2d'||!p||isLanGuest();host.classList.toggle('life-playing',!hud.hidden);if(hud.hidden){lastActor=null;return}
  const s=ensureLifeState(p);if(lastActor!==p){lastActor=p;signature='';selectedNpc=null;tab='people';pinMap.clear();pins.replaceChildren();hud.classList.toggle('life-panel-open',host.clientWidth>=700);}
  time.textContent=lifeTime(s);day.textContent='JOUR '+s.day+' · '+(s.minutes<12*60?'Matin':s.minutes<18*60?'Après-midi':s.minutes<22*60?'Soir':'Nuit');
  pause.textContent=s.paused?'▶ Continuer':'Ⅱ Pause';pause.setAttribute('aria-pressed',String(s.paused));speedButtons.forEach((b,i)=>b.setAttribute('aria-pressed',String(s.speed===[1,2,4][i])));load.disabled=!hasGameSlot(context(),'life');
  name.textContent=p.name;portrait.src=getAsset(p.assetId)?.spriteUrl||'';mood.textContent=lifeMood(s);money.textContent=Math.floor(s.money)+' ¤';
  for(const [key,view] of Object.entries(needRows)){const value=Math.round(s.needs[key]);view.number.textContent=value;view.fill.style.width=value+'%';view.row.classList.toggle('low',value<30);}
  const task=s.task;taskText.textContent=task?task.phase==='walking'?'En chemin'+(state.entities.find(o=>o.id===task.targetId)?.name?' · '+state.entities.find(o=>o.id===task.targetId).name:'…'):task.kind==='social'?lifeActions[task.action].label:lifeActivities[task.key].label:'Choisis ta prochaine envie.';progress.hidden=!task||task.phase==='walking';progress.value=task?.total?1-task.remaining/task.total:0;cancel.hidden=!task;
  status.textContent=s.paused?'LE TEMPS EST EN PAUSE · prépare ta prochaine action.':s.notice;
  tabButtons.forEach(({id,b})=>b.setAttribute('aria-pressed',String(id===tab)));
  const next=JSON.stringify([p.id,tab,selectedNpc,!!s.task,Math.floor(s.minutes/60),Math.floor(s.money),s.relationships,s.speech,s.notice,s.journal.length,s.completed]);if(next!==signature&&!content.contains(document.activeElement)){signature=next;detail(p,s)}
  for(const node of state.entities.filter(o=>o.lifePlace||o.lifeNpc)){
   const place=node.lifePlace,at=place?.entry||{x:node.x+node.w/2,y:node.y},x=at.x*state.camera.zoom+state.camera.x,y=at.y*state.camera.zoom+state.camera.y;
   if(!pinMap.has(node.id)){const pin=button(place?place.label:node.name,()=>{if(place){tab='places';signature='';hud.classList.add('life-panel-open')}else chooseNpc(node.id)},'life-person-pin'+(place?' life-place-pin':''));pins.append(pin);pinMap.set(node.id,pin)}
   const pin=pinMap.get(node.id);pin.hidden=x<5||x>host.clientWidth-5||y<85||y>host.clientHeight-160;pin.style.left=x+'px';pin.style.top=y+'px';
  }
 }
 requestAnimationFrame(frame);
}
