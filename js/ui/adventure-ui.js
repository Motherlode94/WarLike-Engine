import {state} from '../core/state.js';
import {workspace} from '../core/workspaces.js';
import {playableActor} from '../core/viewport-3d.js';
import {adventureView,adventureTarget} from '../core/adventure-runtime.js';
import {questItemCount} from '../core/quest-inventory.js';
import {gameSession,gameIsRunning} from '../core/game-session.js';
import {sequenceRuntime,queueSequenceInteraction} from '../core/logic-sequences.js';
import {isLanGuest,lanCommands,lanState} from '../core/lan-state.js';
import {loadAdventureCampaign} from '../core/adventure-campaign.js';
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n};
export function initAdventureUi(){
 const host=document.getElementById('viewport'),hud=el('section','adventure-hud'),title=el('strong'),hint=el('p'),controls=el('div'),interact=el('button','','Interagir · E'),journalButton=el('button','','Journal · J');hud.id='adventureHud';hud.hidden=true;interact.type=journalButton.type='button';controls.append(interact,journalButton);const hudHeader=el('header'),toggleHint=el('button','','−'),hudBody=el('div','adventure-hud-body');toggleHint.type='button';toggleHint.setAttribute('aria-label','Réduire ou développer l’aide aventure');toggleHint.onclick=()=>hud.classList.toggle(hud.classList.contains('compact')?'expanded':'minimized');hudHeader.append(title,toggleHint);hudBody.append(hint,controls);hud.append(hudHeader,hudBody);host.append(hud);
 const chapter=el('small','adventure-chapter'),nextGoal=el('p','adventure-next-goal');hudBody.prepend(chapter,nextGoal);
 const journal=el('section','adventure-journal'),header=el('header'),heading=el('strong','','JOURNAL D’AVENTURE'),close=el('button','','Fermer · Échap'),body=el('div','adventure-journal-body');journal.id='adventureJournal';journal.hidden=true;close.type='button';header.append(heading,close);journal.append(header,body);journal.setAttribute('role','dialog');journal.setAttribute('aria-label','Journal d’aventure');host.append(journal);
 const toggle=()=>{if(!state.playing||!gameIsRunning()||gameSession.dialogue)return;adventureView.journalOpen=!adventureView.journalOpen;state.keys.clear();state.keyPresses?.clear();document.exitPointerLock?.();document.activeElement?.blur()};
 journalButton.onclick=toggle;close.onclick=()=>{adventureView.journalOpen=false;state.keys.clear();state.keyPresses?.clear()};
 interact.onclick=()=>{const actor=playableActor(state.entities),target=adventureTarget(actor,state.entities,{mode:workspace.mode});if(!gameIsRunning()||gameSession.dialogue||adventureView.journalOpen||!target)return;state.keys.clear();state.keyPresses?.clear();if(isLanGuest()){if(lanCommands.length<8)lanCommands.push({type:'interact',targetId:target.id})}else queueSequenceInteraction(actor.id,target.id);document.activeElement?.blur()};
 window.addEventListener('keydown',event=>{
  if(!state.playing||!playableActor(state.entities)?.adventure||event.repeat||/INPUT|TEXTAREA|SELECT/.test(event.target?.tagName)||event.target?.isContentEditable)return;
  if(['j','i'].includes(event.key.toLowerCase())){event.preventDefault();event.stopImmediatePropagation();toggle()}
  else if(event.key==='Escape'&&adventureView.journalOpen){event.preventDefault();event.stopImmediatePropagation();close.click()}
 },{capture:true});
 document.addEventListener('warlike:project',()=>adventureView.journalOpen=false);
 if(!globalThis.__WARLIKE_BUILD__){const menu=[...document.querySelectorAll('#studioMenus>details')].find(d=>d.querySelector('summary')?.textContent.trim()==='Game')?.querySelector('.studio-dropdown');if(menu){const b=el('button','','Aventure · Le phare et la vallée');b.id='loadAdventureScene';b.type='button';b.onclick=()=>{b.closest('details').open=false;loadAdventureCampaign()};menu.append(b)}}
 let previous=0,signature='';
 const frame=now=>{
  requestAnimationFrame(frame);if(now-previous<100)return;previous=now;
  const actor=playableActor(state.entities);hud.hidden=!state.playing||!actor?.adventure;document.body.classList.toggle('adventure-playing',!hud.hidden);
  if(hud.hidden||!gameIsRunning()){adventureView.journalOpen=false;journal.hidden=true;if(hud.hidden)return}
  const cfg=actor.adventure,globals=isLanGuest()?lanState.variables||{}:sequenceRuntime.globals,target=adventureTarget(actor,state.entities,{mode:workspace.mode});
  hud.classList.toggle('compact',host.clientHeight<300);const expanded=!(hud.classList.contains('minimized')||hud.classList.contains('compact')&&!hud.classList.contains('expanded'));toggleHint.textContent=expanded?'−':'＋';toggleHint.setAttribute('aria-expanded',String(expanded));
  title.textContent=cfg.title||'AVENTURE';hint.textContent=gameSession.dialogue?'Conversation en cours…':target?target.adventureInteractable.label||target.name:'Explore les lieux · parle aux habitants et lis les indices.';
  chapter.hidden=!cfg.chapter;chapter.textContent=cfg.chapter?'CHAPITRE '+cfg.chapter.index+' / '+cfg.chapter.total:'';
  const goals=Object.values(gameSession.objectives),activeGoals=goals.filter(o=>o.status==='active'),finishedGoals=goals.filter(o=>o.status==='complete');nextGoal.textContent=activeGoals[0]?'◇ '+activeGoals[0].label:'';nextGoal.hidden=!activeGoals.length;
  interact.disabled=!target||!gameIsRunning()||!!gameSession.dialogue||adventureView.journalOpen;journalButton.disabled=!gameIsRunning()||!!gameSession.dialogue;journalButton.setAttribute('aria-expanded',String(adventureView.journalOpen));journal.hidden=!adventureView.journalOpen;
  const items=(Array.isArray(cfg.items)?cfg.items:[]).slice(0,32).filter(item=>item&&typeof item.id==='string').map(item=>({name:String(item.name||item.id),count:questItemCount(state.entities,item.id)})),notes=(Array.isArray(cfg.notes)?cfg.notes:[]).slice(0,32).filter(note=>note&&typeof note==='object'&&globals[note.key]);
  const next=JSON.stringify([cfg.title,cfg.chapter,items,notes,gameSession.objectives]);if(next===signature)return;signature=next;const completedOpen=body.querySelector('details')?.open;body.replaceChildren();heading.textContent=cfg.title||'JOURNAL D’AVENTURE';
  if(cfg.chapter)body.append(el('p','adventure-chapter','Chapitre '+cfg.chapter.index+' / '+cfg.chapter.total+' · '+cfg.chapter.name));
  body.append(el('h3','','Objectifs en cours'));for(const goal of activeGoals)body.append(el('p','','◇ '+goal.label+' · '+goal.current+'/'+goal.total));if(!activeGoals.length)body.append(el('p','','Tous les objectifs de ce chapitre sont terminés.'));
  if(finishedGoals.length){const completed=el('details','adventure-completed');completed.open=!!completedOpen;completed.append(el('summary','','✓ Objectifs terminés · '+finishedGoals.length));for(const goal of finishedGoals)completed.append(el('p','complete','✓ '+goal.label+' · '+goal.current+'/'+goal.total));body.append(completed)}
  body.append(el('h3','','Objets de quête · équipe'));const owned=items.filter(item=>item.count>0);if(!owned.length)body.append(el('p','','Aucun objet de quête en réserve.'));for(const item of owned)body.append(el('p','',item.name+' × '+item.count));
  body.append(el('h3','','Indices et notes'));if(!notes.length)body.append(el('p','','Lis les documents et parle aux habitants pour compléter le journal.'));for(const note of notes){const card=el('article');card.append(el('strong','',note.title||'Note'),el('p','',note.text||''));body.append(card)}
  body.append(el('small','','E : interagir · 1–6 ou souris : répondre · F5 / F9 : sauvegarder / charger. En coop, les objets de quête et les objectifs sont communs.'));
 };
 requestAnimationFrame(frame);
}
