// WarLike Animation Studio: keyframe authoring on the selected scene entity.
// Clips live on entities and therefore travel with existing scene/project saves.
import {state,active,notify} from './state.js';
const finite=(n,f=0)=>Number.isFinite(Number(n))?Number(n):f;
export function sampleClip(clip,time){
 const keys=[...(clip?.keys||[])].filter(k=>Number.isFinite(k.time)).sort((a,b)=>a.time-b.time);
 if(!keys.length)return null;
 const t=Math.max(0,finite(time)),right=keys.find(k=>k.time>=t)||keys.at(-1),left=[...keys].reverse().find(k=>k.time<=t)||keys[0];
 if(left===right)return {...left};
 const u=Math.max(0,Math.min(1,(t-left.time)/(right.time-left.time||1)));
 return Object.fromEntries(['x','y','rotation','elevation3d'].map(k=>[k,finite(left[k])+(finite(right[k])-finite(left[k]))*u]));
}
export function createClip(name='New Clip',duration=2){return {name:String(name).slice(0,60),duration:Math.max(.1,finite(duration,2)),keys:[],events:[],transitions:[]}}
export function openAnimationStudio(){
 let panel=document.getElementById('warlikeAnimationStudio');
 if(!panel){
  panel=document.createElement('section');panel.id='warlikeAnimationStudio';panel.className='warlike-animation-studio';
  panel.innerHTML='<header><strong>◈ Animation Studio</strong><button data-a="close">✕</button></header><div class="anim-controls"><label>Clip <select id="animClip"></select></label><button data-a="new">＋ Clip</button><button data-a="key">◆ Keyframe</button><button data-a="event">＋ Event</button><button data-a="play">▶ Preview</button><button data-a="stop">■ Stop</button></div><label>Timeline <output id="animTimeLabel">0.00 s</output><input id="animTime" type="range" min="0" max="2" step=".01" value="0"></label><div id="animKeys"></div><p id="animHint">Sélectionne un objet pour animer sa position et sa rotation.</p>';
  document.body.append(panel);
 }
 let original=null,previewId=null,raf=0,playing=false,start=0;
 const selectedClip=()=>{const entity=active();return entity?.animationStudio?.clips?.[Number(panel.querySelector('#animClip').value)||0]};
 const stop=()=>{playing=false;cancelAnimationFrame(raf);if(original){const entity=state.entities.find(e=>e.id===previewId);if(entity)Object.assign(entity,original);notify()}original=null;previewId=null};
 const render=()=>{const entity=active(),clips=entity?.animationStudio?.clips||[],select=panel.querySelector('#animClip'),old=Number(select.value)||0;select.replaceChildren(...clips.map((c,i)=>{const o=document.createElement('option');o.value=i;o.textContent=c.name;return o}));select.value=String(Math.min(old,clips.length-1));const clip=selectedClip(),slider=panel.querySelector('#animTime');slider.max=String(clip?.duration||2);panel.querySelector('#animKeys').textContent=clip?'Keys: '+clip.keys.map(k=>k.time.toFixed(2)+'s').join(' ◆ ')+' | Events: '+clip.events.map(e=>e.name+'@'+e.time.toFixed(2)).join(', '):'Aucun clip';panel.querySelector('#animHint').textContent=entity?'Objet : '+entity.name+' · '+(clip?.keys.length||0)+' keyframes':'Sélectionne un objet dans la hiérarchie.'};
 const seek=t=>{const clip=selectedClip(),entity=active();if(!clip||!entity)return;const pose=sampleClip(clip,t);if(pose){if(!original){original=Object.fromEntries(['x','y','rotation','elevation3d'].map(k=>[k,entity[k]]));previewId=entity.id}Object.assign(entity,pose);notify()}panel.querySelector('#animTimeLabel').textContent=Number(t).toFixed(2)+' s'};
 panel.onclick=e=>{const action=e.target.closest('[data-a]')?.dataset.a;if(!action)return;
  if(action==='close'){stop();panel.hidden=true;return}
  if(action==='stop'){stop();render();return}
  if(action==='new'){stop();const entity=active();if(!entity)return;entity.animationStudio??={clips:[]};entity.animationStudio.clips.push(createClip('Clip '+(entity.animationStudio.clips.length+1)));notify();render();panel.querySelector('#animClip').value=String(entity.animationStudio.clips.length-1);render();return}
  const clip=selectedClip();if(!clip)return;
  if(action==='key'){stop();const entity=active(),time=finite(panel.querySelector('#animTime').value);clip.keys=clip.keys.filter(k=>Math.abs(k.time-time)>.005);clip.keys.push({time,...Object.fromEntries(['x','y','rotation','elevation3d'].map(k=>[k,finite(entity[k])]))});clip.keys.sort((a,b)=>a.time-b.time);notify();render()}
  if(action==='event'){const name=prompt('Nom de l’événement animation');if(name?.trim()){clip.events.push({time:finite(panel.querySelector('#animTime').value),name:name.trim().slice(0,80)});notify();render()}}
  if(action==='play'){stop();playing=true;start=performance.now()-finite(panel.querySelector('#animTime').value)*1000;const tick=now=>{if(!playing)return;const t=(now-start)/1000;if(t>clip.duration){stop();return}panel.querySelector('#animTime').value=String(t);seek(t);raf=requestAnimationFrame(tick)};raf=requestAnimationFrame(tick)}
 };
 panel.querySelector('#animClip').onchange=()=>{stop();render()};
 panel.querySelector('#animTime').oninput=e=>{stop();seek(e.target.value)};
 panel.hidden=false;render();
}
