import {getModelGeometry} from '../assets/real-models-3d.js';
import {resolveAnimationClip} from '../core/gltf-animation.js';
import {state,notify} from '../core/state.js';
import {record} from '../core/history.js';
const el=(tag,text)=>{const node=document.createElement(tag);if(text)node.textContent=text;return node};
export function renderAnimator3d(root,owner){
 const id=owner.model3dId||owner.assetId;if(!id)return;
 const card=el('details');card.className='inspector-component';card.dataset.componentTitle='Animator 3D';card.open=false;
 card.append(el('summary','Animator 3D · clips du modèle'));const body=el('div');body.className='component-content';body.append(el('small','Lecture des animations du fichier…'));card.append(body);root.append(card);
 getModelGeometry(id).then(geometry=>{
  if(!card.isConnected)return;const clips=geometry.rig?.animations||[];body.replaceChildren();
  if(!clips.length){body.append(el('p','Ce modèle ne contient pas d’animation. Les modèles animés sont identifiés dans les packs Kenney et Quaternius.'));return}
  const save=label=>{record('Animator 3D : '+label);notify()};
  body.append(el('p',clips.length+' clips originaux · squelette et poids du fichier GLB.'));
  const flag=(title,key,fallback)=>{const label=el('label'),input=el('input');label.className='logic-flag';input.type='checkbox';input.checked=owner[key]??fallback;input.disabled=state.playing;input.onchange=()=>{owner[key]=input.checked;save(title)};label.append(input,document.createTextNode(title));body.append(label)};
  flag('Transitions automatiques selon le gameplay','animationAuto',true);flag('Prévisualiser dans la scène','animationPreview',false);flag('Lecture en boucle','animationLoop',true);
  const label=el('label','Clip à prévisualiser'),select=el('select');select.setAttribute('aria-label','Animation 3D');select.disabled=state.playing;
  for(const clip of clips){const option=el('option',clip.name+' · '+clip.duration.toFixed(2)+' s');option.value=clip.name;select.append(option)}select.value=owner.animation3dClip||resolveAnimationClip(clips,'idle')?.name||clips[0].name;
  select.onchange=()=>{owner.animation3dClip=select.value;owner.animationAuto=false;owner.animationPreview=true;save('Choisir le clip')};label.append(select);body.append(label);
  const speedLabel=el('label','Vitesse de lecture'),speed=el('input');speed.type='number';speed.min='.1';speed.max='4';speed.step='.1';speed.value=owner.animationSpeed||1;speed.disabled=state.playing;speed.onchange=()=>{owner.animationSpeed=Math.max(.1,Math.min(4,Number(speed.value)||1));save('Vitesse')};speedLabel.append(speed);body.append(speedLabel);
  const bindings=el('details');bindings.append(el('summary','Correspondance des états de jeu'));
  for(const [key,name] of [['idle','Repos'],['walk','Marche'],['run','Course'],['jump','Saut'],['fall','Chute'],['attack','Attaque'],['hurt','Impact'],['death','Mort']]){
   const row=el('label',name),choices=el('select');choices.disabled=state.playing;choices.setAttribute('aria-label','Animation '+name);const fallback=resolveAnimationClip(clips,key),automatic=el('option','Automatique'+(fallback?' · '+fallback.name:' · aucune'));automatic.value='';choices.append(automatic);
   for(const clip of clips){const option=el('option',clip.name);option.value=clip.name;choices.append(option)}choices.value=owner.animationMap?.[key]||'';choices.onchange=()=>{owner.animationMap??={};if(choices.value)owner.animationMap[key]=choices.value;else delete owner.animationMap[key];save(name)};row.append(choices);bindings.append(row);
  }
  body.append(bindings);
 }).catch(error=>{if(card.isConnected)body.replaceChildren(el('p','Animations indisponibles : '+error.message))});
}
