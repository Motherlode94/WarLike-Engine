import {adventureTarget} from './adventure-runtime.js';
import {validGameDialogue} from './game-dialogue.js';
import {reconcileLanSurvivors} from './lan-survivors.js';
import {gameProject} from './game-project.js';
import {resolveGameGenre,genreForMode} from './game-genres.js';
import {sequenceRuntime,queueSequenceInteraction,chooseSequenceDialogue} from './logic-sequences.js';
import {survivalAction} from './survival-runtime.js';
import {lanState,isLanGuest,lanCommands} from './lan-state.js';
import {state,notify} from './state.js';
import {workspace,switchWorkspace} from './workspaces.js';
import {gameSession,gameIsRunning} from './game-session.js';
import {gameplayInputBlocked} from './gameplay-input.js';
import {updateController3d,attack3d} from './gameplay-components.js';
import {walkPlayer,motion} from './player-controller.js';
import {castHeroPower,heroAbilities,heroRuntime} from './superhero-runtime.js';
import {interactSimulationNode} from './simulation-nodes.js';
import {upgradeHeroSkill} from './rpg-progression.js';
import {healthOf,actorDistance} from './ai-perception.js';
import {view3d,playableActor} from './viewport-3d.js';
import {togglePlay} from './scene.js';
import {fxRuntime} from './fx-runtime.js';
import {cameraRigFor} from './play-camera.js';
import {lighting} from './lighting.js';
const networkFields=['_netPeerId','_netRemote','_sequenceDestroyed','_hiddenInVehicle','_hiddenInHouse','_modeEliminated','_animatorAction','_animatorForced'];
const peers=new Map();let beforeMode=null;let token=null,stream=null,busy=false,sequence=0,timer=null,previous=0,snapshot=null,received=0,generation=0;
const changed=()=>globalThis.document?.dispatchEvent(new Event('warlike:lan'));
export const localLanServer=async()=>{try{const r=await fetch('/lan/info',{cache:'no-store'});return r.ok&&(await r.json()).protocol===1}catch{return false}};
async function request(action,data={}){const response=await fetch('/lan/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,token})});const value=await response.json();if(!response.ok){const error=Error(value.error||'Serveur local indisponible.');error.status=response.status;throw error}return value}
function ownActor(){return state.entities.find(o=>o._netPeerId===lanState.peerId)||playableActor(state.entities)}
function roster(players){
 lanState.players=players;if(lanState.role!=='host'){changed();return}
 const host=ownActor();if(!host)return;
 if(host.survival||host.adventure){reconcileLanSurvivors(state.entities,players,host,{hostId:lanState.peerId,allocateId:()=>state.nextId++})}
 else for(const player of players){if(player.id===lanState.peerId||state.entities.some(o=>o._netPeerId===player.id))continue;
  const clone=structuredClone(host);clone.id=state.nextId++;clone.name=player.name;clone._netPeerId=player.id;clone._netRemote=true;clone.playable3d=false;clone.team=host.team??1;clone.x+=80*players.indexOf(player);clone.y+=60;delete clone.sequence;delete clone.sequences;delete clone.ai;delete clone.heroState;delete clone.survivalState;delete clone.survivalWorld;delete clone._support3d;delete clone._animatorFrame;state.entities.push(clone);
 }
 const ids=new Set(players.map(p=>p.id));state.entities=state.entities.filter(o=>o.coopSeat||!o._netRemote||ids.has(o._netPeerId));for(const id of peers.keys())if(!ids.has(id))peers.delete(id);if(gameSession.dialogue?.actorId&&!state.entities.some(o=>o.id===gameSession.dialogue.actorId)){gameSession.dialogue=null;gameSession.revision++}notify();changed();
}
// Data stays JSON-only. Runtime functions, local files and credentials never enter snapshots.
export function makeLanSnapshot(entities=state.entities){
 if(entities.length>256)throw Error('Le multi local accepte 256 objets par scène.');
 const copy=JSON.parse(JSON.stringify(entities,(key,value)=>key.startsWith('_')&&!networkFields.includes(key)?undefined:key==='file'||key==='csharpScript'?undefined:value));
 return {mode:workspace.mode,genre:gameProject.genre,globals:sequenceRuntime.globals,messages:sequenceRuntime.messages.slice(-3),entities:copy,lighting:{hour:lighting.hour,dayNight:lighting.dayNight,speed:lighting.speed},sceneId:gameSession.currentSceneId,phase:gameSession.phase,dialogue:gameSession.dialogue,objectives:gameSession.objectives,timers:gameSession.timers,elapsed:gameSession.elapsed,notice:gameSession.notice,bolts:heroRuntime.bolts.slice(-96),fx:{particles:fxRuntime.particles.slice(-220),rings:fxRuntime.rings.slice(-24),clock:fxRuntime.clock}};
}
function receiveWorld(data){
 const incoming=data.snapshot;if(!incoming||!Array.isArray(incoming.entities)||incoming.entities.length>256||data.sequence<=received)return;
 if(!incoming.entities.every(o=>o&&Number.isSafeInteger(o.id)&&['object','player','character','prefab','mesh3d'].includes(o.type)&&[o.x,o.y,o.w,o.h].every(Number.isFinite)))return;
 lanState.genre=genreForMode(resolveGameGenre(incoming.genre,incoming.entities),incoming.mode);lanState.variables=incoming.globals&&typeof incoming.globals==='object'&&!Array.isArray(incoming.globals)?incoming.globals:{};
 sequenceRuntime.messages=Array.isArray(incoming.messages)?incoming.messages.slice(-3).filter(m=>m&&typeof m.text==='string'&&Number.isFinite(m.ttl)).map(m=>({text:m.text.slice(0,160),ttl:Math.max(0,Math.min(5,m.ttl))})):[];
 received=data.sequence;lanState.lastSnapshot=performance.now();snapshot=incoming;
 const previousActor=lanState.actorId,existing=new Map(state.entities.map(o=>[o.id,o]));state.entities=incoming.entities.map(o=>{const previous=existing.get(o.id);if(!previous)return o;const before={x:previous.x,y:previous.y,elevation3d:previous.elevation3d||0,rotation:previous.rotation||0};for(const key of Object.keys(previous))if(!key.startsWith('_')&&!(key in o)||networkFields.includes(key)&&!(key in o))delete previous[key];Object.assign(previous,o);previous._netFrom=before;previous._netTo={x:o.x,y:o.y,elevation3d:o.elevation3d||0,rotation:o.rotation||0};previous._netAt=performance.now();return previous});
 state.nextId=Math.max(0,...state.entities.map(o=>o.id))+1;lanState.actorId=state.entities.find(o=>o._netPeerId===lanState.peerId)?.id??null;
 const own=ownActor();if(own&&previousActor!==own.id){const rig=cameraRigFor(own);view3d.yaw=Math.PI-(Number(own.rotation)||0)*Math.PI/180;view3d.pitch=rig.mode==='firstPerson'?0:rig.mode==='orbit'?.62:.18;view3d.radius=rig.distance}if(incoming.lighting)Object.assign(lighting,incoming.lighting);
 Object.assign(gameSession,{phase:incoming.phase,dialogue:validGameDialogue(incoming.dialogue)?incoming.dialogue:null,objectives:incoming.objectives||{},timers:incoming.timers||{},elapsed:incoming.elapsed||0,currentSceneId:incoming.sceneId,notice:incoming.notice||''});gameSession.revision++;
 heroRuntime.bolts=incoming.bolts||[];if(incoming.fx){fxRuntime.particles=incoming.fx.particles||[];fxRuntime.rings=incoming.fx.rings||[];fxRuntime.clock=incoming.fx.clock||0}lanState.status='Connecté · '+lanState.players.length+'/4 joueurs';changed();
}
export function interpolateLanWorld(now=performance.now()){
 if(!isLanGuest())return;for(const o of state.entities){if(!o._netFrom||!o._netTo)continue;const t=Math.max(0,Math.min(1,(now-o._netAt)/50));for(const key of ['x','y','elevation3d'])o[key]=o._netFrom[key]+(o._netTo[key]-o._netFrom[key])*t;const delta=((o._netTo.rotation-o._netFrom.rotation+540)%360)-180;o.rotation=o._netFrom.rotation+delta*t}
}
function remoteStep(dt){
 if(!gameIsRunning())return;
 for(const o of state.entities){if(!o._netRemote||o.survivalDormant)continue;const input=peers.get(o._netPeerId),stale=!input||performance.now()-input.at>500,keys=new Set(!stale&&gameIsRunning()&&!gameSession.dialogue?input.keys:[]),pressed=new Set(!stale&&gameIsRunning()&&!gameSession.dialogue?input.pressed:[]);const actions=stale?[]:input.actions||[];if(input){input.pressed=[];input.actions=[];}
  o._netKeys=keys;if(healthOf(o)<=0)continue;const yaw=input?.yaw??0;
  if(workspace.mode==='3d')updateController3d(o,keys,dt,yaw,state.entities,{pressedKeys:pressed});else walkPlayer(o,dt,keys,{pressedKeys:pressed});
  if(!gameIsRunning())continue;
  for(let i=0;i<6;i++)if(pressed.has(String(i+1)))castHeroPower(o,o.superhero?.slots?.[i]||Object.keys(heroAbilities)[i],{mode:workspace.mode,entities:state.entities,yaw});
  for(const action of actions){if(action?.type==='dialogue'){chooseSequenceDialogue(action.index,{id:action.dialogueId,actorId:o.id});continue}if(gameSession.dialogue)continue;if(action?.type==='interact'&&o.adventure){queueSequenceInteraction(o.id,action.targetId);continue}survivalAction(o,action,state.entities,{mode:workspace.mode,allocateId:()=>state.nextId++})}
  if(pressed.has('e')&&o.adventure&&!gameSession.dialogue){const target=adventureTarget(o,state.entities,{mode:workspace.mode});if(target)queueSequenceInteraction(o.id,target.id)}
  if(pressed.has('e')&&o.survival)survivalAction(o,'gather',state.entities,{mode:workspace.mode});
  if(pressed.has('e')&&!o.survival&&!o.adventure){const target=state.entities.filter(e=>e.simulationNode?.enabled).sort((a,b)=>actorDistance(a,o)-actorDistance(b,o))[0];if(target)interactSimulationNode(o,target,{mode:workspace.mode,entities:state.entities})}
  if(pressed.has('u'))upgradeHeroSkill(o,o.rpgProgression?.trainingFocus||'power');
  o._netAttack=Math.max(0,(o._netAttack||0)-dt);if(o.adventure?.combatEnabled!==false&&(pressed.has('f')||keys.has('f'))&&!o._netAttack){attack3d(o,state.entities,{range:120,damageAmount:20});o._netAttack=.45}
 }
 // Existing scripted targets keep precedence; automatic foes can engage either player.
 const heroes=state.entities.filter(o=>o._netPeerId&&healthOf(o)>0);for(const e of state.entities){if(!e.ai?.enabled||e.aiTargetId!=null&&e.aiTargetId!==e._netAutoTarget)continue;const closest=heroes.filter(o=>o.team!==e.team).sort((a,b)=>actorDistance(e,a)-actorDistance(e,b))[0];if(closest){e.aiTargetId=closest.id;e._netAutoTarget=closest.id}}
}
async function pump(){
 if(!lanState.connected||busy)return;if(!state.playing){await disconnectLan();return}busy=true;const current=generation,start=performance.now();
 try{
  if(lanState.role==='host'){
   const actor=ownActor();if(!actor)throw Error('La scène doit contenir un personnage jouable.');
   if(actor._netPeerId!==lanState.peerId||lanState.players.some(p=>!state.entities.some(o=>o._netPeerId===p.id))){actor._netPeerId=lanState.peerId;lanState.actorId=actor.id;roster(lanState.players)}
   await request('snapshot',{snapshot:makeLanSnapshot()});
  }
  else{const blocked=gameplayInputBlocked()||!gameIsRunning(),pressed=[...state.keyPresses],actions=lanCommands.slice(0,4);state.keyPresses.clear();await request('input',{sequence:++sequence,keys:blocked?[]:[...state.keys],pressed:blocked?[]:pressed,actions:blocked?actions.filter(a=>a?.type==='dialogue'&&gameIsRunning()):actions,yaw:view3d.yaw});lanCommands.splice(0,actions.length)}
  if(current!==generation)return;lanState.ping=Math.round(performance.now()-start);lanState.status=(snapshot||lanState.role==='host'?'Connecté':'En attente de la scène de l’hôte')+' · '+lanState.players.length+'/4 joueurs';changed();
 }catch(error){if(current===generation){if(error.status===403)await disconnectLan(error.message);else{lanState.status=error.message;changed()}}}finally{busy=false}
}
export async function connectLan({host=false,key='',code='',name='Joueur'}={}){
 if(lanState.connected)throw Error('Quitter le salon actuel avant de se reconnecter.');if(!await localLanServer())throw Error('Ouvre le moteur servi par votre serveur local pour jouer en réseau.');
 if(state.playing)throw Error('Arrête Play avant de créer ou rejoindre un salon.');
 if(host&&(!playableActor(state.entities)||state.entities.length>253))throw Error('Prévoir un personnage jouable et au plus 253 objets pour accueillir trois invités.');
 const result=await request(host?'create':'join',host?{key,name}:{code,name});token=result.token;generation++;received=0;snapshot=null;sequence=0;peers.clear();
 Object.assign(lanState,{role:host?'host':'guest',peerId:result.peerId,code:result.code,connected:true,players:result.players,status:'Connexion…'});
 try{beforeMode=workspace.mode;if(!host&&result.mode&&result.mode!==workspace.mode){switchWorkspace(result.mode);document.dispatchEvent(new Event('warlike:project'))}togglePlay();const p=playableActor(state.entities);if(p){p._netPeerId=result.peerId;p.team??=1;lanState.actorId=p.id}motion.cameraFollow=true;
  stream=new EventSource('/lan/events?token='+encodeURIComponent(token));stream.onmessage=event=>{try{const data=JSON.parse(event.data);if(data.type==='roster')roster(data.players);if(data.type==='input'&&host){const prior=peers.get(data.peerId);peers.set(data.peerId,{...data,pressed:[...new Set([...(prior?.pressed||[]),...data.pressed])],actions:[...(prior?.actions||[]),...(data.actions||[])].slice(0,8),at:performance.now()})}if(data.type==='snapshot'&&!host)receiveWorld(data);if(data.type==='closed'){disconnectLan(data.reason).catch(()=>{})}}catch(error){lanState.status='Message réseau invalide : '+error.message;changed()}};
  stream.onerror=()=>{lanState.status='Connexion interrompue · reconnexion…';changed()};roster(result.players);timer=setInterval(pump,50);await pump();changed();return result;
 }catch(error){await disconnectLan();throw error}
}
export async function disconnectLan(reason='Hors connexion'){
 generation++;clearInterval(timer);timer=null;stream?.close();stream=null;const old=token;token=null;const wasConnected=lanState.connected;Object.assign(lanState,{connected:false,role:null,peerId:null,actorId:null,genre:null,variables:null,code:'',players:[],status:reason});peers.clear();lanCommands.length=0;snapshot=null;busy=false;
 if(old)try{await fetch('/lan/leave',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:old}),keepalive:true})}catch{}
 if(wasConnected&&state.playing)togglePlay();if(beforeMode&&beforeMode!==workspace.mode)switchWorkspace(beforeMode);beforeMode=null;changed();
}
export function initLanRuntime(){
 function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,Math.max(0,(now-previous)/1000));previous=now;if(!lanState.connected||!state.playing)return;if(lanState.role==='host')remoteStep(dt);else interpolateLanWorld(now)}requestAnimationFrame(frame);
 window.addEventListener('pagehide',()=>{if(token)fetch('/lan/leave',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token}),keepalive:true}).catch(()=>{})});
}
