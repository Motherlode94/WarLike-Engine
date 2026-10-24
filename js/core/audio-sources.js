// WarLike Audio Source Beta: attached emitter, listener distance and optional local WAV/MP3.
import {audio,initAudio,unlockAudio,playSound} from './audio.js';
import {state} from './state.js';
import {getAsset} from '../assets/catalog.js';
export const audioClips=new Map(); // Runtime only: blobs are intentionally not serialized in JSON.
const active=new Map();
const last=new Map();
export const soundChoices=['vehicle','shot','laser','door','step','pickup','heal','checkpoint','teleport','switch','explosion','victory'];
export const distanceGain=(d,range)=>Math.pow(Math.max(0,1-d/Math.max(.1,range)),2);
export async function importSoundFile(file,o){
 if(!file||!o||!file.type.startsWith('audio/')&&!/\.(wav|mp3|ogg)$/i.test(file.name))throw Error('Choisis un fichier WAV, MP3 ou OGG.');
 if(file.size>18*1024*1024)throw Error('Fichier audio supérieur à 18 Mo.');
 unlockAudio();if(!initAudio())throw Error('Web Audio non pris en charge.');
 const data=await file.arrayBuffer();
 const buffer=await audio.context.decodeAudioData(data.slice(0));
 audioClips.set(o.id,{buffer,name:file.name});
 o.audioFileName=file.name;o.audioClip='imported';o.audioEnabled=true;
 return file.name;
}
export const listenerPoint=()=>{
 const player=state.entities.find(e=>e.type==='player'||e.type==='character'||e.type==='prefab'&&getAsset(e.assetId)?.category==='Characters');
 return player?[player.x+player.w/2,player.y+player.h/2]:[0,0];
};
export function stopSources(){for(const [id,a] of active){try{a.source.stop()}catch{}try{a.source.disconnect();a.gain.disconnect();a.panner?.disconnect()}catch{}}active.clear();last.clear()}
export function updateAudioSources(now=performance.now()/1000){
 if(!state.playing||!audio.enabled||!audio.context||audio.context.state!=='running'){if(active.size)stopSources();return}
 const listener=listenerPoint(),liveIds=new Set();
 for(const o of state.entities){
  if(!o.audioEnabled||o.audioClip==='none')continue;
  liveIds.add(o.id);
  const x=o.x+o.w/2,y=o.y+o.h/2,dist=Math.hypot(x-listener[0],y-listener[1])/64;
  const radius=Math.max(1,Number(o.audioRange)||18),level=Math.min(1,Math.max(0,Number(o.audioGain)??.7));
  const spatial=o.audioSpatial!==false;
  const factor=spatial?distanceGain(dist,radius):1;
  const existing=active.get(o.id),clip=audioClips.get(o.id);
  if(existing){
   existing.gain.gain.setTargetAtTime(level*factor,audio.context.currentTime,.035);
   if(existing.panner)existing.panner.pan.setTargetAtTime(Math.max(-1,Math.min(1,(x-listener[0])/(radius*64))),audio.context.currentTime,.04);
   continue;
  }
  if(o.audioClip==='imported'&&clip){
   if(!o.audioLoop&&last.has(o.id))continue;
   const source=audio.context.createBufferSource(),gain=audio.context.createGain();
   source.buffer=clip.buffer;source.loop=o.audioLoop!==false;gain.gain.value=level*factor;
   let panner=null;
   if(spatial&&audio.context.createStereoPanner){panner=audio.context.createStereoPanner();panner.pan.value=Math.max(-1,Math.min(1,(x-listener[0])/(radius*64)))}
   source.connect(gain);if(panner){gain.connect(panner);panner.connect(audio.master)}else gain.connect(audio.master);
   active.set(o.id,{source,gain,panner});last.set(o.id,now);
   source.onended=()=>{if(active.get(o.id)?.source===source)active.delete(o.id);source.disconnect();gain.disconnect();panner?.disconnect()};
   source.start();
  }else if(o.audioClip!=='imported'&&factor>.03){
   const interval=o.audioLoop===false?Infinity:Math.max(.8,Number(o.audioInterval)||3);
   if(!last.has(o.id)||now-last.get(o.id)>=interval){playSound(o.audioClip||'vehicle',{gain:level*factor,cooldown:0});last.set(o.id,now)}
  }
 }
 for(const [id,a] of active){if(!liveIds.has(id)){try{a.source.stop()}catch{}active.delete(id)}}
}
export function previewSound(o){unlockAudio();if(o?.audioClip==='imported'){const clip=audioClips.get(o.id);if(!clip)return false;
 const s=audio.context.createBufferSource();s.buffer=clip.buffer;s.connect(audio.master);s.start();return true}
 return playSound(o?.audioClip||'click',{cooldown:0});
}
