import {gameSoundCatalog,filterGameSounds,assignGameSound} from '../core/game-sound-catalog.js';
import {state,notify} from '../core/state.js';
import {unlockAudio,playSound,playRecordedSound} from '../core/audio.js';
// The editor owns record() and addAudioEmitter(); this view must not create an
// alternative scene mutation or a second audio runtime.
export function installGameSoundsBrowser({record,addAudioEmitter}){
 const launcher=document.getElementById('openGameSounds'),dialog=document.getElementById('gameSoundsDialog');
 if(!launcher||!dialog)return;
 const $=id=>dialog.querySelector('#'+id),catalog=gameSoundCatalog();
 const results=$('gameSoundResults'),search=$('gameSoundSearch'),category=$('gameSoundCategory'),
  source=$('gameSoundSource'),count=$('gameSoundCount'),status=$('gameSoundStatus');
 for(const name of [...new Set(catalog.map(s=>s.category))].sort((a,b)=>a.localeCompare(b,'fr'))){
  const option=document.createElement('option');option.value=name;option.textContent=name;category.append(option);
 }
 const selectedSource=()=>state.entities.find(e=>state.selected.includes(e.id)&&e.audioEnabled===true);
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
 const render=()=>{
  const items=filterGameSounds(catalog,{query:search.value,category:category.value,source:source.value});
  count.textContent=items.length+' sons / '+catalog.length;
  results.replaceChildren();
  const selected=selectedSource();
  for(const sound of items){
   const row=el('article','game-sound-item');
   const info=el('div','game-sound-meta'),heading=el('strong',null,sound.name);
   const note=el('small',null,sound.category+' / '+sound.pack+' · '+sound.license);
   info.append(heading,note);
   const actions=el('div','game-sound-actions');
   const preview=el('button',null,'▶ Écouter');preview.type='button';
   preview.setAttribute('aria-label','Écouter '+sound.name);
   preview.onclick=async()=>{
    status.textContent='Écoute : '+sound.name;
    try{
     unlockAudio();
     if(sound.source==='ogg')await playRecordedSound(sound.id,{gain:.7});
     else{const started=playSound(sound.id,{gain:.7,cooldown:0});if(!started)status.textContent='Active les sons du moteur pour écouter.';}
    }catch(error){status.textContent='Erreur audio : '+error.message}
   };
   const apply=el('button',null,'Utiliser');apply.type='button';apply.dataset.gameSoundApply=sound.id;
   apply.setAttribute('aria-label','Attribuer '+sound.name+' à une Audio Source');
   apply.title='Attribuer à la source sélectionnée ou créer une Audio Source';
   apply.onclick=()=>{
    if(state.playing){status.textContent='Arrête Play pour modifier la scène.';return}
    let target=selectedSource();
    if(!target){addAudioEmitter();target=selectedSource();}
    if(!target){status.textContent='Impossible de créer une Audio Source.';return}
    assignGameSound(target,sound);record('Audio Source · '+sound.name);notify();
    status.textContent=sound.name+' attribué à '+target.name+' (Audio Source).';
   };
   actions.append(preview,apply);row.append(info,actions);results.append(row);
  }
  if(!items.length)results.append(el('p','game-sound-empty','Aucun son trouvé.'));
 };
 launcher.onclick=()=>{search.value='';category.value='all';source.value='all';render();if(!dialog.open)dialog.showModal();};
 $('gameSoundClose').onclick=()=>dialog.close();
 search.oninput=render;category.onchange=render;source.onchange=render;
 dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
}
