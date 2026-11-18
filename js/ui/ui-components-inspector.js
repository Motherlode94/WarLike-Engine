import {defaultUiCanvas,defaultUiRect,defaultUiElement,validateUiCanvas,validateUiRect} from '../core/ui-canvas-layout.js';
import {state,notify} from '../core/state.js';
import {record} from '../core/history.js';
// Native UI authoring inspector. Stores component data on GameObjects rather
// than a separate HTML UI builder. No event/script execution in editor.
const panel=(root,title)=>{
 const node=document.createElement('details');node.className='inspector-component';node.dataset.componentTitle=title;node.open=false;
 const heading=document.createElement('summary');heading.textContent=title;
 const content=document.createElement('div');content.className='component-content';
 node.append(heading,content);root.append(node);return content;
};
export function renderUiComponentsInspector(root,entity){
 const save=(component,key,value)=>{entity[component][key]=value;record('UI '+component+' '+key);notify()};
 const number=(body,component,key,label,min,max,step=1)=>{
  const row=document.createElement('label');row.className='property-row';const span=document.createElement('span');span.textContent=label;
  const input=document.createElement('input');input.type='number';input.inputMode='decimal';input.step=String(step);input.min=String(min);input.max=String(max);input.value=String(entity[component][key]);input.disabled=state.playing;
  input.setAttribute('aria-label',label);
  input.onchange=()=>{const v=Number(input.value);if(!Number.isFinite(v)||v<min||v>max){input.setCustomValidity('Valeur hors limites.');input.reportValidity();return}input.setCustomValidity('');save(component,key,v)};
  input.oninput=()=>input.setCustomValidity('');row.append(span,input);body.append(row);
 };
 const flag=(body,component,key,label)=>{
  const row=document.createElement('label');row.className='logic-flag';
  const input=document.createElement('input');input.type='checkbox';input.checked=entity[component][key]!==false;input.disabled=state.playing;
  input.onchange=()=>save(component,key,input.checked);row.append(input,document.createTextNode(label));body.append(row);
 };
 const options=(body,component,key,label,choices)=>{
  const row=document.createElement('label');row.className='property-row';const caption=document.createElement('span');caption.textContent=label;
  const select=document.createElement('select');select.disabled=state.playing;select.setAttribute('aria-label',label);
  for(const [value,text] of choices){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option)}
  select.value=entity[component][key];select.onchange=()=>save(component,key,select.value);
  row.append(caption,select);body.append(row);
 };
 const pair=(body,component,key,label,low,high,step=1)=>{
  const row=document.createElement('div');row.className='property-row';const caption=document.createElement('span');caption.textContent=label;row.append(caption);
  const values=entity[component][key];
  for(let i=0;i<2;i++){
   const input=document.createElement('input');input.type='number';input.step=String(step);input.value=String(values[i]);input.disabled=state.playing;
   input.title=(i===0?'X / width':'Y / height')+' : '+label;input.setAttribute('aria-label',label+(i===0?' X':' Y'));
   input.onchange=()=>{const next=entity[component][key].slice(),v=Number(input.value);next[i]=v;
    if(!Number.isFinite(v)||v<low||v>high||component==='uiRect'&&['anchorMin','anchorMax'].includes(key)&&next.some((n,index)=>key==='anchorMin'?n>entity.uiRect.anchorMax[index]:n<entity.uiRect.anchorMin[index])){input.setCustomValidity('Ancrages ou dimensions invalides.');input.reportValidity();return}
    input.setCustomValidity('');save(component,key,next);
   };
   input.oninput=()=>input.setCustomValidity('');row.append(input);
  }body.append(row);
 };
 if(entity.uiCanvas){
  entity.uiCanvas=validateUiCanvas(entity.uiCanvas);
  const body=panel(root,'UI Canvas · Overlay');
  options(body,'uiCanvas','scaleMode','Canvas Scaler',[['scaleWithScreenSize','Scale With Screen Size'],['constantPixelSize','Constant Pixel Size']]);
  pair(body,'uiCanvas','referenceResolution','Résolution de référence',64,16384);
  number(body,'uiCanvas','matchWidthOrHeight','Match Width / Height',0,1,.05);
  number(body,'uiCanvas','sortOrder','Sort Order',-100,100,1);
  flag(body,'uiCanvas','enabled','Canvas activé');
 }
 if(entity.uiRect){
  entity.uiRect=validateUiRect(entity.uiRect);
  const body=panel(root,'UI RectTransform');
  pair(body,'uiRect','anchorMin','Anchor Min',0,1,.05);pair(body,'uiRect','anchorMax','Anchor Max',0,1,.05);
  pair(body,'uiRect','pivot','Pivot',0,1,.05);pair(body,'uiRect','anchoredPosition','Position ancrée',-100000,100000);
  pair(body,'uiRect','sizeDelta','Size Delta',-100000,100000);
  number(body,'uiRect','rotation','Rotation (°)',-360,360);
  flag(body,'uiRect','enabled','RectTransform activé');
 }
 if(entity.uiElement){
  entity.uiElement={...defaultUiElement(),...entity.uiElement};
  const body=panel(root,'UI Element');
  options(body,'uiElement','kind','Type',[['panel','Panel'],['text','Text'],['button','Button'],['image','Image · futur runtime']]);
  for(const [key,label] of [['text','Texte'],['color','Fond'],['textColor','Couleur du texte'],['eventName','Signal WarNode au clic']]){
   const row=document.createElement('label');row.className='property-row';
   const caption=document.createElement('span');caption.textContent=label;
   const input=document.createElement('input');input.type='text';input.value=String(entity.uiElement[key]||'');input.maxLength=256;input.disabled=state.playing;input.setAttribute('aria-label',label);
   input.onchange=()=>{const value=input.value.trim();if(['color','textColor'].includes(key)&&!/^#[0-9a-f]{6}$/i.test(value)){input.setCustomValidity('Couleur hexadécimale requise.');input.reportValidity();return}input.setCustomValidity('');save('uiElement',key,value)};
   row.append(caption,input);body.append(row);
  }
  flag(body,'uiElement','interactable','Interactable (Play) ');
 }
}
