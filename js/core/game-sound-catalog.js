import {freeAudioAssets} from '../assets/free-game-assets.js';
// Sound files are the existing Kenney CC0 OGG library. The fallback tones are
// synthesized by the WarLike runtime; no empty placeholder assets are added.
export const PROCEDURAL_GAME_SOUNDS=Object.freeze([
 ['shot','Arme · Tir','Armes et combat'],['laser','Arme · Laser','Armes et combat'],
 ['impact','Impact','Armes et combat'],['hurt','Blessure','Personnages'],
 ['explosion','Explosion','Armes et combat'],
 ['vehicle','Moteur','Véhicules'],['brake','Freinage','Véhicules'],
 ['step','Pas','Personnages'],['door','Porte','Environnement'],
 ['switch','Interrupteur','Interface'],['click','Clic','Interface'],
 ['pickup','Ramassage','Interactions'],['heal','Soin','Interactions'],
 ['checkpoint','Checkpoint','Interface'],['teleport','Téléportation','Science-fiction'],
 ['victory','Victoire','Interface']
]);
const categoryFor=asset=>{
 const n=(asset.name||'').toLowerCase(),pack=asset.pack||'';
 if(pack==='interface-sounds')return 'Interface';
 if(/footstep/.test(n))return 'Personnages';
 if(/knife|chop/.test(n))return 'Armes et combat';
 if(/door|book/.test(n))return 'Environnement';
 if(/coin|metal/.test(n))return 'Interactions';
 return 'Interactions';
};
export function gameSoundCatalog(recorded=freeAudioAssets){
 const list=[...recorded.map(a=>({
  id:a.id,name:a.name.replace(/[_-]/g,' ').replace(/([a-z])([A-Z])/g,'$1 $2'),
  category:categoryFor(a),source:'ogg',author:a.author||'Kenney',
  license:a.license||'CC0-1.0',pack:a.packName||a.pack||'',url:a.url
 })),...PROCEDURAL_GAME_SOUNDS.map(([id,name,category])=>({
  id,name,category,source:'synth',author:'WarLike',license:'Son généré par le moteur',pack:'WarLike / Synthèse'
 }))];
 const ids=new Set();return list.filter(s=>!ids.has(s.id)&&ids.add(s.id));
}
const normalize=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
export function filterGameSounds(sounds,{query='',category='all',source='all'}={}){
 const terms=normalize(query).trim().split(/\s+/).filter(Boolean);
 return sounds.filter(s=>(category==='all'||s.category===category)&&(source==='all'||s.source===source)
  &&terms.every(t=>normalize([s.name,s.id,s.category,s.pack,s.author].join(' ')).includes(t)));
}
export function assignGameSound(entity,sound){
 if(!entity||!sound?.id)throw Error('Sélectionne une Audio Source et un son.');
 entity.audioClip=sound.id;entity.audioEnabled=true;entity.audioLoop=false;
 // Allow a future explicit loop toggle in Inspector; never overwrite position,
 // dimensions, gain, range or 2D/3D spatial setting.
 return entity;
}
