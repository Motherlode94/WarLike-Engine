import {blueprintDebugger} from '../core/blueprint-debugger.js';
import {lanState,lanCommands,isLanGuest} from '../core/lan-state.js';
import {playSound,unlockAudio} from '../core/audio.js';
import {state} from '../core/state.js';
import {gameProject} from '../core/game-project.js';
import {gameSession,gameIsRunning,setGamePhase,saveGameSlot,queueLoadGame,hasGameSlot} from '../core/game-session.js';
import {sequenceRuntime,chooseSequenceDialogue} from '../core/logic-sequences.js';
import {togglePlay} from '../core/scene.js';
import {element} from './blueprint-controls.js';
const context=()=>({entities:state.entities,globals:sequenceRuntime.globals,fired:sequenceRuntime.fired});
export function initGameFlowUi(){
 const root=element('div','game-flow-ui');root.id='gameFlowUi';document.body.append(root);let signature='',last=0,objectiveHud=null,pendingDialogue=null,lastDialogueId=null;
 const action=(parent,label,fn,className='')=>{const b=element('button',className,label);b.type='button';b.onclick=()=>{unlockAudio();playSound('click');try{fn();signature=''}catch(error){gameSession.notice=error.message;signature=''}};parent.append(b);return b};
 const ownId=()=>state.entities.find(o=>o._netPeerId===lanState.peerId)?.id;
 const canAnswer=d=>!lanState.connected||d.actorId==null||d.actorId===ownId();
 const answer=(index,d=gameSession.dialogue)=>{if(!d||!gameIsRunning()||!canAnswer(d))return;state.keys.clear();state.keyPresses?.clear();if(isLanGuest()){if(pendingDialogue===d.id||lanCommands.length>=8)return;lanCommands.push({type:'dialogue',dialogueId:d.id,index});pendingDialogue=d.id}else chooseSequenceDialogue(index,{id:d.id,actorId:lanState.connected?ownId():null});signature=''};
 const start=()=>{if(isLanGuest())return;if(state.playing)togglePlay();togglePlay();state.keys.clear()};
 function draw(){
  const build=globalThis.__WARLIKE_BUILD__===true,active=state.playing,isLife=state.entities.some(o=>o.lifeSim?.enabled);root.dataset.uiSkin=gameProject.uiSkin||'classic';
  root.hidden=!active&&!build;root.replaceChildren();objectiveHud?.remove();objectiveHud=null;if(root.hidden)return;
  const hud=element('section','game-objective-hud');
  for(const objective of Object.values(gameSession.objectives)){
   const row=element('div','game-objective-row');row.append(element('span','game-objective-check',objective.status==='complete'?'✓':'◇'),element('span','',objective.label),element('strong','',objective.current+' / '+objective.total));hud.append(row);
  }
  for(const [id,timer] of Object.entries(gameSession.timers)){const row=element('div','game-timer-row');row.append(element('span','',id),element('strong','',Math.floor(Math.ceil(timer.remaining)/60)+':'+String(Math.ceil(timer.remaining)%60).padStart(2,'0')));hud.append(row)}
  if(active&&hud.childNodes.length){objectiveHud=hud;(document.getElementById('viewport')||root).append(hud);}
  if(active&&gameSession.dialogue){
   const d=gameSession.dialogue,box=element('section','game-dialogue');box.dataset.dialogueId=d.id;box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label','Dialogue · '+d.speaker);box.append(element('strong','',d.speaker),element('p','',d.text));
   if(pendingDialogue!==d.id)pendingDialogue=null;
   const choices=d.choices?.length?d.choices:[{label:'Continuer →'}],controls=element('div','game-dialogue-choices');
   choices.forEach((choice,index)=>{const b=action(controls,(d.choices?.length?(index+1)+'. ':'')+choice.label,()=>answer(index,d),'bp-primary');b.dataset.dialogueChoice=index;b.disabled=!canAnswer(d)||pendingDialogue===d.id});box.append(controls);
   if(d.choices?.length){const b=action(box,'Fermer · Échap',()=>answer(-1,d),'bp-text-button');b.disabled=!canAnswer(d)||pendingDialogue===d.id}
   if(!canAnswer(d))box.append(element('small','',''+(state.entities.find(o=>o.id===d.actorId)?.name||'Un coéquipier')+' choisit la réponse.'));
   if(pendingDialogue===d.id)box.append(element('small','','Réponse envoyée à l’hôte…'));
   root.append(box);if(lastDialogueId!==d.id&&canAnswer(d)){controls.querySelector('button')?.focus();lastDialogueId=d.id}
  }else lastDialogueId=null;
  if(gameSession.notice&&active)root.append(element('div','game-session-notice',gameSession.notice));
  if(!active||gameSession.phase!=='playing'){
   const veil=element('div','game-menu-veil'),menu=element('section','game-menu-card');menu.setAttribute('role','dialog');menu.setAttribute('aria-label','Menu de la partie');
   const phase=!active?'menu':gameSession.phase;menu.append(element('span','bp-eyebrow',phase==='menu'?'WARLIKE GAME':phase==='paused'?'PRENDS UNE PAUSE':'FIN DE LA PARTIE'),element('h1','',phase==='menu'?gameProject.title:phase==='paused'?'Partie en pause':phase==='won'?'Mission accomplie':'Partie terminée'));
   menu.append(element('p','',phase==='menu'?'Ton aventure commence ici.':gameSession.notice||'Ton aventure t’attend.'));
   if(isLanGuest()){menu.append(element('p','','La pause et la fin de partie sont gérées par l’hôte.'));action(menu,'Quitter le salon',()=>document.dispatchEvent(new Event('warlike:lan-leave')),'bp-primary')}
   else if(phase==='paused'){action(menu,'Reprendre la partie',()=>setGamePhase('playing'),'bp-primary');action(menu,'Sauvegarder',()=>saveGameSlot(context()),'bp-secondary')}
   else action(menu,phase==='menu'?'Jouer':'Recommencer',start,'bp-primary');
   if(!isLanGuest()){const load=action(menu,'Continuer la sauvegarde',()=>{if(!state.playing)start();queueLoadGame(context());setGamePhase('playing')},'bp-secondary');load.disabled=!hasGameSlot(context());}
   if(!active&&build&&!isLife)action(menu,'Coop locale · Héberger / Rejoindre',()=>document.dispatchEvent(new Event('warlike:lan-open')),'bp-secondary');
   if(active&&!isLanGuest())action(menu,build?'Retour au menu':'Retour à l’éditeur',()=>togglePlay(),'bp-text-button');
   if(gameSession.notice&&phase==='menu')menu.append(element('small','',gameSession.notice));const credits=element('a','game-asset-credit',isLife?'Sprites : Kenney · Tiny Town / Tiny Dungeon · CC0':'Ressources : Kenney · CC0');credits.href=isLife?'https://kenney.nl/assets/tiny-town':'https://kenney.nl/assets';credits.target='_blank';credits.rel='noopener noreferrer';menu.append(credits);const quaternius=element('a','game-asset-credit','Modèles et animations : Quaternius · CC0');quaternius.href='https://quaternius.com/';quaternius.target='_blank';quaternius.rel='noopener noreferrer';if(!isLife)menu.append(quaternius);veil.append(menu);root.append(veil);
  }
 }
 window.addEventListener('keydown',event=>{
  const d=gameSession.dialogue;if(!state.playing||!d||!gameIsRunning()||event.repeat||['INPUT','TEXTAREA','SELECT'].includes(event.target?.tagName))return;
  const choices=[...root.querySelectorAll('[data-dialogue-choice]')];
  if(!['Escape','Enter','ArrowDown','ArrowUp','1','2','3','4','5','6'].includes(event.key))return;
  event.preventDefault();event.stopImmediatePropagation();state.keys.clear();state.keyPresses?.clear();
  if(event.key==='ArrowDown'||event.key==='ArrowUp'){const current=choices.indexOf(document.activeElement),delta=event.key==='ArrowDown'?1:-1;choices[(current+delta+choices.length)%choices.length]?.focus();return}
  if(event.key==='Escape')answer(-1,d);else if(event.key==='Enter')answer(Number(document.activeElement?.dataset.dialogueChoice)||0,d);else answer(Number(event.key)-1,d);
 },{capture:true});
 window.addEventListener('keydown',event=>{
  if(event.target?.closest?.('#blueprintDialog')||blueprintDebugger.paused)return;
  if(event.repeat||!state.playing||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
  if(['F5','F9'].includes(event.key)){event.preventDefault();if(!isLanGuest()&&state.entities.some(o=>o.survivalWorld?.enabled||o.adventure||o.lifeSim?.enabled)){try{if(event.key==='F5')saveGameSlot(context());else{queueLoadGame(context());setGamePhase('playing')}}catch(error){gameSession.notice=error.message}signature=''}return}
  if(event.key==='Escape'&&!isLanGuest()&&['playing','paused'].includes(gameSession.phase)){event.preventDefault();document.exitPointerLock?.();setGamePhase(gameSession.phase==='paused'?'playing':'paused');state.keys.clear();signature=''}
 });
 const frame=now=>{requestAnimationFrame(frame);if(now-last<100)return;last=now;
  const next=JSON.stringify([state.playing,gameSession.phase,pendingDialogue,lanState.peerId,gameSession.notice,gameSession.dialogue,gameSession.objectives,Object.entries(gameSession.timers).map(([id,t])=>[id,Math.ceil(t.remaining)]),gameProject.title,gameProject.uiSkin]);if(next!==signature){signature=next;draw()}
 };
 requestAnimationFrame(frame);
}
