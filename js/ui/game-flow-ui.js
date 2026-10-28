import {playSound,unlockAudio} from '../core/audio.js';
import {state} from '../core/state.js';
import {gameProject} from '../core/game-project.js';
import {gameSession,gameIsRunning,setGamePhase,saveGameSlot,queueLoadGame,hasGameSlot} from '../core/game-session.js';
import {sequenceRuntime,emitSequenceSignal} from '../core/logic-sequences.js';
import {togglePlay} from '../core/scene.js';
import {element} from './blueprint-controls.js';
const context=()=>({entities:state.entities,globals:sequenceRuntime.globals,fired:sequenceRuntime.fired});
export function initGameFlowUi(){
 const root=element('div','game-flow-ui');root.id='gameFlowUi';document.body.append(root);let signature='',last=0;
 const action=(parent,label,fn,className='')=>{const b=element('button',className,label);b.type='button';b.onclick=()=>{unlockAudio();playSound('click');try{fn();signature=''}catch(error){gameSession.notice=error.message;signature=''}};parent.append(b);return b};
 const start=()=>{if(state.playing)togglePlay();togglePlay();state.keys.clear()};
 function draw(){
  const build=globalThis.__WARLIKE_BUILD__===true,active=state.playing;root.dataset.uiSkin=gameProject.uiSkin||'classic';
  root.hidden=!active&&!build;root.replaceChildren();if(root.hidden)return;
  const hud=element('section','game-objective-hud');
  for(const objective of Object.values(gameSession.objectives)){
   const row=element('div','game-objective-row');row.append(element('span','game-objective-check',objective.status==='complete'?'✓':'◇'),element('span','',objective.label),element('strong','',objective.current+' / '+objective.total));hud.append(row);
  }
  for(const [id,timer] of Object.entries(gameSession.timers)){const row=element('div','game-timer-row');row.append(element('span','',id),element('strong','',Math.floor(Math.ceil(timer.remaining)/60)+':'+String(Math.ceil(timer.remaining)%60).padStart(2,'0')));hud.append(row)}
  if(active&&hud.childNodes.length)root.append(hud);
  if(active&&gameSession.dialogue){const d=gameSession.dialogue,box=element('section','game-dialogue');box.append(element('strong','',d.speaker),element('p','',d.text));action(box,'Continuer →',()=>{gameSession.dialogue=null;gameSession.revision++;emitSequenceSignal(d.signal||'dialogue:closed')},'bp-primary');root.append(box)}
  if(gameSession.notice&&active)root.append(element('div','game-session-notice',gameSession.notice));
  if(!active||!gameIsRunning()){
   const veil=element('div','game-menu-veil'),menu=element('section','game-menu-card');menu.setAttribute('role','dialog');menu.setAttribute('aria-label','Menu de la partie');
   const phase=!active?'menu':gameSession.phase;menu.append(element('span','bp-eyebrow',phase==='menu'?'WARLIKE GAME':phase==='paused'?'PRENDS UNE PAUSE':'FIN DE LA PARTIE'),element('h1','',phase==='menu'?gameProject.title:phase==='paused'?'Partie en pause':phase==='won'?'Mission accomplie':'Partie terminée'));
   menu.append(element('p','',phase==='menu'?'Ton aventure commence ici.':gameSession.notice||'Ton aventure t’attend.'));
   if(phase==='paused'){action(menu,'Reprendre la partie',()=>setGamePhase('playing'),'bp-primary');action(menu,'Sauvegarder',()=>saveGameSlot(context()),'bp-secondary')}
   else action(menu,phase==='menu'?'Jouer':'Recommencer',start,'bp-primary');
   const load=action(menu,'Continuer la sauvegarde',()=>{if(!state.playing)start();queueLoadGame(context());setGamePhase('playing')},'bp-secondary');load.disabled=!hasGameSlot(context());
   if(active)action(menu,build?'Retour au menu':'Retour à l’éditeur',()=>togglePlay(),'bp-text-button');
   if(gameSession.notice&&phase==='menu')menu.append(element('small','',gameSession.notice));const credits=element('a','game-asset-credit','Ressources : Kenney · CC0');credits.href='https://kenney.nl/assets';credits.target='_blank';credits.rel='noopener noreferrer';menu.append(credits);const quaternius=element('a','game-asset-credit','Modèles et animations : Quaternius · CC0');quaternius.href='https://quaternius.com/';quaternius.target='_blank';quaternius.rel='noopener noreferrer';menu.append(quaternius);veil.append(menu);root.append(veil);
  }
 }
 window.addEventListener('keydown',event=>{
  if(event.repeat||!state.playing||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
  if(['F5','F9'].includes(event.key)){event.preventDefault();return}
  if(event.key==='Escape'&&['playing','paused'].includes(gameSession.phase)){event.preventDefault();document.exitPointerLock?.();setGamePhase(gameSession.phase==='paused'?'playing':'paused');state.keys.clear();signature=''}
 });
 const frame=now=>{requestAnimationFrame(frame);if(now-last<100)return;last=now;
  const next=JSON.stringify([state.playing,gameSession.phase,gameSession.revision,gameSession.notice,gameSession.dialogue,gameSession.objectives,Object.entries(gameSession.timers).map(([id,t])=>[id,Math.ceil(t.remaining)]),gameProject.title,gameProject.uiSkin]);if(next!==signature){signature=next;draw()}
 };
 requestAnimationFrame(frame);
}
