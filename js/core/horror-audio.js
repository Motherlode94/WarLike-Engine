// Original procedural horror sound cues: no external copyrighted samples.
// Web Audio starts only after a real user gesture; failures are non-fatal.
export const horrorAudio={enabled:true,volume:.32,ambient:true,steps:true,stalker:true};
const runtime={context:null,lastStep:0,lastAmbient:0,lastChase:0,lastState:'patrol',lastPlayerX:null,lastPlayerY:null};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
export function resetHorrorAudio(){runtime.lastStep=0;runtime.lastAmbient=0;runtime.lastChase=0;runtime.lastState='patrol';runtime.lastPlayerX=null;runtime.lastPlayerY=null}
export function unlockHorrorAudio(){
 if(!horrorAudio.enabled)return false;
 try{const C=globalThis.AudioContext||globalThis.webkitAudioContext;if(!C)return false;
 runtime.context??=new C();if(runtime.context.state==='suspended')runtime.context.resume().catch(()=>{});
 return true}catch{return false}
}
function tone(frequency,duration,{type='sine',volume=.12,endFrequency=frequency}={}){
 const ctx=runtime.context;if(!ctx||ctx.state!=='running'||!horrorAudio.enabled)return;
 const now=ctx.currentTime,osc=ctx.createOscillator(),gain=ctx.createGain();
 osc.type=type;osc.frequency.setValueAtTime(Math.max(15,frequency),now);
 osc.frequency.exponentialRampToValueAtTime(Math.max(15,endFrequency),now+duration);
 const level=clamp(volume*horrorAudio.volume,0,.35);
 gain.gain.setValueAtTime(.0001,now);gain.gain.linearRampToValueAtTime(level,now+.012);
 gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
 osc.connect(gain);gain.connect(ctx.destination);osc.start(now);osc.stop(now+duration+.015);
 osc.onended=()=>{osc.disconnect();gain.disconnect()};
}
export function playHorrorCue(name){
 if(!horrorAudio.enabled)return false;
 if(!runtime.context||runtime.context.state!=='running')return false;
 if(name==='step'){tone(90,.075,{type:'triangle',volume:.09,endFrequency:45});return true}
 if(name==='ambient'){tone(49,1.7,{volume:.06,type:'sine',endFrequency:44});tone(72,1.1,{volume:.027,type:'triangle',endFrequency:66});return true}
 if(name==='alert'){tone(260,.45,{volume:.15,type:'sawtooth',endFrequency:82});return true}
 if(name==='chase'){tone(64,.25,{volume:.13,type:'triangle',endFrequency:39});return true}
 if(name==='jumpscare'){tone(390,.55,{volume:.28,type:'sawtooth',endFrequency:36});return true}
 return false
}
export function updateHorrorAudio(dt,player,entities,keys,horrorState){
 if(!horrorState?.enabled||!horrorAudio.enabled||!player||!runtime.context||runtime.context.state!=='running')return;
 const ctx=runtime.context,time=ctx.currentTime;
 const moving=runtime.lastPlayerX!==null&&Math.hypot(player.x-runtime.lastPlayerX,player.y-runtime.lastPlayerY)>1;
 runtime.lastPlayerX=player.x;runtime.lastPlayerY=player.y;
 if(horrorAudio.ambient&&time-runtime.lastAmbient>8){playHorrorCue('ambient');runtime.lastAmbient=time}
 if(horrorAudio.steps&&moving&&time-runtime.lastStep>(keys.has('shift')?.28:.48)){playHorrorCue('step');runtime.lastStep=time}
 const state=entities.some(e=>e.horrorAI?.state==='chase')?'chase':entities.some(e=>e.horrorAI?.state==='search')?'search':'patrol';
 if(horrorAudio.stalker&&state==='chase'&&runtime.lastState!=='chase')playHorrorCue('alert');
 if(horrorAudio.stalker&&state==='chase'&&time-runtime.lastChase>.95){playHorrorCue('chase');runtime.lastChase=time}
 runtime.lastState=state;
}
