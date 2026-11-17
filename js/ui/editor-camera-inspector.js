import {nativeCameraFrustumSettings} from '../core/editor-camera-frustum-3d.js';
import {sceneCameraTargets3d} from '../core/camera-transition-3d.js';
import {state,notify} from '../core/state.js';
import {record} from '../core/history.js';
// Unity-like dedicated Inspector for the actual scene Camera used in Game/Play.
// The viewport frustum is editor-only, but lens changes affect runtime WebGL.
export function renderEditorCameraInspector(parent,object){
 if(!object?.sceneCamera3d)return;
 const camera=object.sceneCamera3d,config=nativeCameraFrustumSettings(camera);
 const card=document.createElement('details');card.className='inspector-component editor-camera-inspector';card.open=true;
 card.dataset.componentTitle='Main Camera 3D';card.dataset.componentKey='sceneCamera3d';
 const title=document.createElement('summary');title.textContent='▣ Camera 3D · Scene / Game';
 const fields=document.createElement('div');fields.className='component-content editor-camera-fields';
 const hint=document.createElement('p');hint.className='editor-camera-hint';hint.textContent='Caméra de jeu active en Play et dans l’export Web. Le volume (frustum) n’est visible que dans la Scene View.';fields.append(hint);
 const commit=(key,value)=>{object.sceneCamera3d={...object.sceneCamera3d,[key]:value};record('Camera 3D : '+key);notify()};
 const field=(key,label,min,max,step)=>{
  const row=document.createElement('label');row.className='editor-camera-property';
  const caption=document.createElement('span');caption.textContent=label;
  const input=document.createElement('input');input.type='number';input.step=String(step);input.min=String(min);input.max=String(max);
  input.value=String(camera[key]??(key==='nearClip'?config.near:key==='farClip'?config.far:0));
  input.disabled=state.playing;input.setAttribute('aria-label','Camera · '+label);
  input.onchange=()=>{
   const value=Number(input.value);
   if(!input.value.trim()||!Number.isFinite(value)||value<min||value>max||(key==='farClip'&&value<=Number(object.sceneCamera3d.nearClip??.1))||(key==='nearClip'&&value>=Number(object.sceneCamera3d.farClip??1000))){
    input.setCustomValidity('Valeur invalide. Vérifie les limites et Near < Far.');input.reportValidity();return;
   }
   input.setCustomValidity('');commit(key,value);
  };
  input.oninput=()=>input.setCustomValidity('');
  row.append(caption,input);fields.append(row);
 };
 const choice=(key,label,options)=>{
  const row=document.createElement('label');row.className='editor-camera-property';
  const caption=document.createElement('span');caption.textContent=label;
  const select=document.createElement('select');select.disabled=state.playing;select.setAttribute('aria-label','Camera · '+label);
  for(const [value,text] of options){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option)}
  select.value=camera[key]==='follow'?'thirdPerson':camera[key]||options[0][0];
  select.onchange=()=>commit(key,select.value);row.append(caption,select);fields.append(row);
 };
 const toggle=(key,label,defaultValue=true)=>{
  const row=document.createElement('label');row.className='editor-camera-flag';
  const box=document.createElement('input');box.type='checkbox';box.checked=camera[key]===undefined?defaultValue:camera[key]!==false;box.disabled=state.playing;
  box.onchange=()=>commit(key,box.checked);row.append(box,document.createTextNode(label));fields.append(row);
 };
 choice('mode','Mode',[['fixed','Fixed'],['thirdPerson','Third Person · souris'],['firstPerson','First Person · souris']]);
 field('priority','Priorité',-100,100,1);
 const targets=sceneCameraTargets3d(state.entities,object);
 const targetRow=document.createElement('label');targetRow.className='editor-camera-property';
 const targetLabel=document.createElement('span');targetLabel.textContent='Cible suivie';
 const targetSelect=document.createElement('select');targetSelect.disabled=state.playing;targetSelect.setAttribute('aria-label','Camera · Cible suivie');
 for(const item of targets){const option=document.createElement('option');option.value=String(item.id);option.textContent=item.id===0?item.name:item.name+' · #'+item.id+' ('+item.type+')';targetSelect.append(option)}
 const saved=Number(camera.targetId)||0;
 if(saved!==0&&!targets.some(t=>t.id===saved)){const opt=document.createElement('option');opt.value=String(saved);opt.textContent='Cible introuvable · #'+saved;opt.disabled=true;targetSelect.append(opt)}
 targetSelect.value=String(saved);
 targetSelect.onchange=()=>commit('targetId',Number(targetSelect.value));
 targetRow.append(targetLabel,targetSelect);fields.append(targetRow);

 field('transitionDuration','Transition caméra (s)',0,5,.1);
 field('fieldOfView','Field of View (°)',20,120,1);
 field('nearClip','Clipping Near (m)',.01,10,.01);
 field('farClip','Clipping Far (m)',20,10000,1);
 if(['thirdPerson','follow'].includes(camera.mode)){
  field('distance','Distance (m)',.3,40,.1);field('height','Hauteur (m)',-5,12,.1);
  field('shoulderOffset','Épaule (m)',-3,3,.1);
 }
 toggle('enabled','Camera active');
 toggle('showFrustum','Afficher le frustum dans Scene');
 toggle('showPreview','Afficher l’aperçu du cadrage dans Scene');
 card.append(title,fields);parent.append(card);
}
