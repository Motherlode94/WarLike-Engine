// WarLike Audio Beta — lightweight synthesized sounds, no external assets.
// Browsers require a user gesture before AudioContext can play.
export const audio={enabled:true,volume:.48,ready:false,context:null,master:null,last:new Map()};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function audioSettings(){return {enabled:audio.enabled,volume:audio.volume}}
export function setAudioEnabled(value){audio.enabled=!!value;return audio.enabled}
export function setAudioVolume(value){audio.volume=clamp(Number(value)||0,0,1);if(audio.master)audio.master.gain.value=audio.volume;return audio.volume}
export function initAudio(){
 if(audio.context)return audio.ready;
 const Constructor=globalThis.AudioContext||globalThis.webkitAudioContext;
 if(!Constructor)return false;
 try{const ctx=new Constructor();audio.context=ctx;audio.master=ctx.createGain();audio.master.gain.value=audio.volume;audio.master.connect(ctx.destination);audio.ready=true;return true}
 catch{return false}
}
export function unlockAudio(){
 if(!initAudio())return;
 const p=audio.context.resume();
 if(p?.catch)p.catch(()=>{});
}
const tones={
 shot:[145,53,.105,'sawtooth',.20],laser:[800,220,.18,'sine',.20],
 impact:[92,42,.14,'triangle',.16],hurt:[180,68,.25,'sawtooth',.16],
 pickup:[550,940,.19,'sine',.15],heal:[380,810,.34,'sine',.16],
 door:[175,90,.23,'triangle',.19],switch:[620,390,.08,'square',.07],
 vehicle:[110,165,.37,'sawtooth',.12],brake:[125,44,.18,'triangle',.12],
 step:[78,56,.055,'triangle',.04],checkpoint:[360,720,.30,'sine',.17],
 teleport:[240,1200,.48,'sine',.15],explosion:[95,28,.42,'sawtooth',.22],
 victory:[440,880,.48,'sine',.16],click:[650,420,.055,'sine',.06]
};
export function playSound(name,options={}){
 if(!audio.enabled||!audio.ready||!audio.context||audio.context.state!=='running')return false;
 const preset=tones[name]||tones.click,now=audio.context.currentTime,limit=options.cooldown??(name==='step'?.16:.04);
 if(now-(audio.last.get(name)??-100)<limit)return false;
 audio.last.set(name,now);
 try{
  const [start,end,duration,type,amp]=preset;
  const osc=audio.context.createOscillator(),gain=audio.context.createGain();
  osc.type=type;osc.frequency.setValueAtTime(start,now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20,end),now+duration);
  gain.gain.setValueAtTime(Math.max(.0001,amp*(options.gain??1)),now);
  gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
  osc.connect(gain);gain.connect(audio.master);
  osc.start(now);osc.stop(now+duration+.01);
  osc.onended=()=>{osc.disconnect();gain.disconnect()};
  return true;
 }catch{return false}
}
export function bindAudioControls(toggle,volume){
 try{const saved=JSON.parse(localStorage.getItem('warlike.audio.v1')||'{}');if(typeof saved.enabled==='boolean')audio.enabled=saved.enabled;if(Number.isFinite(saved.volume))audio.volume=clamp(saved.volume,0,1)}catch{}
 const save=()=>{try{localStorage.setItem('warlike.audio.v1',JSON.stringify(audioSettings()))}catch{}};
 const update=()=>{toggle.textContent=audio.enabled?'🔊 Son':'🔇 Muet';toggle.setAttribute('aria-pressed',String(audio.enabled));volume.value=String(Math.round(audio.volume*100));toggle.title=audio.enabled?'Couper les sons':'Activer les sons'};
 update();
 toggle.addEventListener('click',()=>{setAudioEnabled(!audio.enabled);unlockAudio();update();save();if(audio.enabled)playSound('click')});
 volume.addEventListener('input',()=>{setAudioVolume(Number(volume.value)/100);update();save()});
 document.addEventListener('pointerdown',unlockAudio,{once:true});
 document.addEventListener('keydown',unlockAudio,{once:true});
}
