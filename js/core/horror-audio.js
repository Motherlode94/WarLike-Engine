// Original procedural horror sound cues: no external copyrighted samples.
// Web Audio starts only after a real user gesture; failures are non-fatal.
export const horrorAudio={enabled:true,volume:.32,ambient:true,steps:true,stalker:true,environment:'abandoned',details:true,heartbeat:true};
export const horrorAmbiences={abandoned:'Bâtiment abandonné',forest:'Forêt nocturne',basement:'Sous-sol / grotte',rain:'Pluie et orage',industrial:'Complexe industriel',graveyard:'Cimetière / extérieur',silence:'Silence oppressant'};
const runtime={context:null,lastStep:0,lastAmbient:0,lastChase:0,lastState:'patrol',lastPlayerX:null,lastPlayerY:null,lastDetail:0,lastHeartbeat:0};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
export function resetHorrorAudio(){runtime.lastStep=0;runtime.lastAmbient=0;runtime.lastChase=0;runtime.lastState='patrol';runtime.lastPlayerX=null;runtime.lastPlayerY=null;runtime.lastDetail=0;runtime.lastHeartbeat=0}
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
export function setHorrorAmbience(name){
 if(!Object.hasOwn(horrorAmbiences,name))return false;
 horrorAudio.environment=name;runtime.lastAmbient=0;runtime.lastDetail=0;return true;
}
function ambienceSound(preset){
 if(preset==='silence')return;
 if(preset==='forest'){tone(85,2,{type:'sine',volume:.036,endFrequency:60});tone(630,.22,{type:'sine',volume:.035,endFrequency:480});}
 else if(preset==='basement'){tone(42,2.2,{volume:.085,endFrequency:38});tone(320,.36,{type:'triangle',volume:.035,endFrequency:180});}
 else if(preset==='rain'){tone(78,2.2,{type:'triangle',volume:.055,endFrequency:62});tone(240,.13,{volume:.028,endFrequency:140});}
 else if(preset==='industrial'){tone(55,2,{type:'sawtooth',volume:.036,endFrequency:57});tone(270,.15,{type:'square',volume:.022,endFrequency:110});}
 else if(preset==='graveyard'){tone(65,2,{volume:.048,endFrequency:55});tone(760,.28,{volume:.025,endFrequency:540});}
 else{tone(49,1.7,{volume:.06,endFrequency:44});tone(72,1.1,{type:'triangle',volume:.027,endFrequency:66})}
}
export function playHorrorCue(name){
 if(!horrorAudio.enabled)return false;
 if(!runtime.context||runtime.context.state!=='running')return false;
 if(name==='step'){tone(90,.075,{type:'triangle',volume:.09,endFrequency:45});return true}
 if(name==='ambient'){ambienceSound(horrorAudio.environment);return true}
 if(name==='alert'){tone(260,.45,{volume:.15,type:'sawtooth',endFrequency:82});return true}
 if(name==='chase'){tone(64,.25,{volume:.13,type:'triangle',endFrequency:39});return true}
 if(name==='wind'){tone(110,1.2,{type:'triangle',volume:.045,endFrequency:60});return true}
 if(name==='creak'){tone(240,.8,{type:'sawtooth',volume:.09,endFrequency:70});return true}
 if(name==='drip'){tone(680,.18,{volume:.085,endFrequency:310});return true}
 if(name==='distant'){tone(165,.7,{type:'triangle',volume:.07,endFrequency:48});return true}
 if(name==='thunder'){tone(78,1.9,{type:'sawtooth',volume:.11,endFrequency:26});return true}
 if(name==='heartbeat'){tone(66,.15,{volume:.15,endFrequency:42});return true}
 if(name==='door'){tone(310,.55,{type:'sawtooth',volume:.1,endFrequency:95});return true}
 if(name==='jumpscare'){tone(390,.55,{volume:.28,type:'sawtooth',endFrequency:36});return true}
 return false
}
export function updateHorrorAudio(dt,player,entities,keys,horrorState){
 if(!horrorState?.enabled||!horrorAudio.enabled||!player||!runtime.context||runtime.context.state!=='running')return;
 const ctx=runtime.context,time=ctx.currentTime;
 const moving=runtime.lastPlayerX!==null&&Math.hypot(player.x-runtime.lastPlayerX,player.y-runtime.lastPlayerY)>1;
 runtime.lastPlayerX=player.x;runtime.lastPlayerY=player.y;
 if(horrorAudio.ambient&&time-runtime.lastAmbient>5){playHorrorCue('ambient');runtime.lastAmbient=time}
 if(horrorAudio.steps&&moving&&time-runtime.lastStep>(keys.has('shift')?.28:.48)){playHorrorCue('step');runtime.lastStep=time}
 if(horrorAudio.details&&time-runtime.lastDetail>7){
  const options={abandoned:['creak','wind','distant'],forest:['wind','distant'],basement:['drip','creak'],rain:['drip','thunder'],industrial:['creak','distant'],graveyard:['wind','distant'],silence:[]}[horrorAudio.environment]||[];
  if(options.length)playHorrorCue(options[Math.floor(time/7)%options.length]);
  runtime.lastDetail=time;
 }
 if(horrorAudio.heartbeat&&horrorState.fear>55&&time-runtime.lastHeartbeat>(horrorState.fear>80?.5:.95)){playHorrorCue('heartbeat');runtime.lastHeartbeat=time}
 const state=entities.some(e=>e.horrorAI?.state==='chase')?'chase':entities.some(e=>e.horrorAI?.state==='search')?'search':'patrol';
 if(horrorAudio.stalker&&state==='chase'&&runtime.lastState!=='chase')playHorrorCue('alert');
 if(horrorAudio.stalker&&state==='chase'&&time-runtime.lastChase>.95){playHorrorCue('chase');runtime.lastChase=time}
 runtime.lastState=state;
}
