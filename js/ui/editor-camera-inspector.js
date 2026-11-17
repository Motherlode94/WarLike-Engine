import {editorCameraSettings3d} from '../core/editor-camera-frustum-3d.js';
import {state,notify} from '../core/state.js';
import {record} from '../core/history.js';
// Dedicated camera component inspector, explicitly marked Scene-preview only.
export function renderEditorCameraInspector(parent,object){
 if(!object?.cameraView3d)return;
 const config=editorCameraSettings3d(object.cameraView3d);
 const card=document.createElement('details');card.className='inspector-component editor-camera-inspector';card.open=true;
 card.dataset.componentTitle='Camera 3D · aperçu Scene';card.dataset.componentKey='cameraView3d';
 const title=document.createElement('summary');title.textContent='▣ Camera 3D · aperçu Scene';
 const fields=document.createElement('div');fields.className='component-content editor-camera-fields';
 const hint=document.createElement('p');hint.className='editor-camera-hint';hint.textContent='Visualisation de la caméra sélectionnée dans Scene. Ces valeurs ne pilotent pas encore la caméra du jeu en Play.';fields.append(hint);
 const commit=(key,value)=>{object.cameraView3d={...editorCameraSettings3d(object.cameraView3d),[key]:value};record('Camera Scene : '+key);notify()};
 const field=(key,label,min,max,step)=>{
  const row=document.createElement('label');row.className='editor-camera-property';
  const caption=document.createElement('span');caption.textContent=label;
  const input=document.createElement('input');input.type='number';input.step=String(step);input.min=String(min);input.max=String(max);
  input.value=String(config[key]);input.disabled=state.playing;input.setAttribute('aria-label','Camera · '+label);
  input.onchange=()=>{const value=Number(input.value);if(!Number.isFinite(value)||value<min||value>max||(key==='far'&&value<=Number(object.cameraView3d?.near??config.near))||(key==='near'&&value>=Number(object.cameraView3d?.far??config.far))){input.setCustomValidity('Valeur Camera invalide. Vérifie les limites et near < far.');input.reportValidity();return}input.setCustomValidity('');commit(key,value)};
  input.oninput=()=>input.setCustomValidity('');
  row.append(caption,input);fields.append(row)
 };
 const projection=document.createElement('label');projection.className='editor-camera-property';
 const projectionTitle=document.createElement('span');projectionTitle.textContent='Projection';
 const select=document.createElement('select');
 select.setAttribute('aria-label','Camera · Projection');select.disabled=state.playing;
 for(const [value,text] of [['perspective','Perspective'],['orthographic','Orthographique']]){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option)}
 select.value=config.projection;select.onchange=()=>commit('projection',select.value);
 projection.append(projectionTitle,select);fields.append(projection);
 if(config.projection==='perspective')field('fieldOfView','Field of View (°)',1,179,1);
 else field('orthographicSize','Orthographic Size (m)',.1,100,.1);
 field('near','Clipping Near (m)',.01,100,.01);field('far','Clipping Far (m)',.02,10000,1);
 field('previewDistance','Longueur du repère (m)',.1,100,.5);
 const toggle=document.createElement('label');toggle.className='editor-camera-flag';
 const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=config.showFrustum;checkbox.disabled=state.playing;
 checkbox.onchange=()=>commit('showFrustum',checkbox.checked);
 toggle.append(checkbox,document.createTextNode('Afficher le volume de caméra en Scene'));
 fields.append(toggle);card.append(title,fields);parent.append(card);
}
