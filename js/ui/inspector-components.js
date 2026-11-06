import {componentChoices,addObjectComponent,resetObjectComponent,removeObjectComponent} from '../core/component-definitions.js';
import {copyInspectorComponent,pasteInspectorComponent} from '../core/inspector-model.js';
import {solidCollider2d,actor2d} from '../core/physics-2d.js';
import {state,notify} from '../core/state.js';
import {workspace} from '../core/workspaces.js';
import {record} from '../core/history.js';
import {inspectorContext} from './inspector-context.js';
let clipboard=null;
const make=(tag,cls,text)=>{const node=document.createElement(tag);node.className=cls;if(text)node.textContent=text;return node};
const flatComponents={
 Transform:['x','y','elevation3d','rotation','rotationX3d','rotationZ3d','w','h','depth3d'],
 'Sprite Renderer':['color','colorCustomized','skin'],
 'Animator 2D':['animation','animationSpeed','animationPreview']
};
function binding(card,owner){
 const title=card.dataset.componentTitle,key=card.dataset.componentKey;
 if(card.dataset.webScriptIndex!==undefined){const index=Number(card.dataset.webScriptIndex),get=()=>owner.webScripts?.[index];return {id:'webscript:'+index,family:'webscript',get,set:v=>{delete v.runtime;owner.webScripts[index]=v},remove:()=>{owner.webScripts.splice(index,1);if(!owner.webScripts.length)delete owner.webScripts},reset:()=>{get().values={};delete get().runtime}}}
 if(card.dataset.warScriptIndex!==undefined){const index=Number(card.dataset.warScriptIndex),get=()=>owner.warScripts?.[index];return {id:'warscript:'+index,family:'warscript',get,set:v=>{delete v.runtime;owner.warScripts[index]=v},remove:()=>{owner.warScripts.splice(index,1);if(!owner.warScripts.length)delete owner.warScripts},reset:()=>{get().values={};delete get().runtime}}}
 if(card.dataset.nativeIndex!==undefined){const index=Number(card.dataset.nativeIndex),value=owner.csharpComponents?.[index];if(!value)return null;return {id:'native:'+index,keys:null,get:()=>value,set:v=>owner.csharpComponents[index]=v,family:'native:'+value.kind,remove:()=>owner.csharpComponents.splice(index,1),reset:card._resetNative}}
 if(key==='sequence'){
  const index=Number(card.dataset.sequenceIndex??-1),get=()=>index<0?owner.sequence:owner.sequences?.[index];
  return {id:'sequence:'+index,family:'sequence',get,set:value=>{if(index<0)owner.sequence=value;else owner.sequences[index]=value},remove:()=>{if(index<0)delete owner.sequence;else owner.sequences.splice(index,1)}};
 }
 const definition=componentChoices(workspace.mode).find(d=>d.id===key||d.name===title);
 if(definition){card.dataset.componentKey=definition.id;const value=owner[definition.id]??definition.create();if(definition.id==='collider2d'&&!owner.collider2d)value.enabled=solidCollider2d(owner)||actor2d(owner)&&owner.collision3d!==false;return {id:definition.id,family:definition.id,keys:[definition.id],get:()=>value,snapshot:()=>({[definition.id]:structuredClone(value)}),attach:()=>{owner[definition.id]=value},reset:()=>{if(owner[definition.id]==null)addObjectComponent(owner,definition.id,workspace.mode);resetObjectComponent(owner,definition.id)},remove:owner[definition.id]!=null?()=>removeObjectComponent(owner,definition.id):null}}
 if(flatComponents[title])return {id:title,family:title+':'+workspace.mode,keys:flatComponents[title],reset:title==='Transform'?()=>Object.assign(owner,{x:0,y:0,elevation3d:0,rotation:0,rotationX3d:0,rotationZ3d:0}):null};
 return null;
}
export function decorateInspectorComponents(root,owner){
 let folds={};const storageKey='warlike.inspector.folds.v2';try{folds=JSON.parse(localStorage.getItem(storageKey)||'{}')}catch{}
 const cards=[...root.querySelectorAll(':scope>.inspector-component')],context=inspectorContext()+':'+owner.id+':';
 const keyFor=card=>card.dataset.inspectorKey;
 cards.forEach((card,index)=>{
  const descriptor=binding(card,owner),title=card.dataset.componentTitle;
  card.dataset.inspectorKey=descriptor?.id||title+':'+index;
  const summary=card.querySelector(':scope>summary');if(!summary)return;
  const foldKey=context+keyFor(card);card.open=folds[foldKey]??(title==='Transform');
  card.addEventListener('toggle',()=>{if(card.dataset.searchExpanded==='true')return;folds[foldKey]=card.open;try{localStorage.setItem(storageKey,JSON.stringify(folds))}catch{}});
  summary.querySelectorAll('.component-menu-toggle').forEach(node=>node.remove());
  card.querySelectorAll('.unity-component-menu').forEach(node=>node.remove());
  const value=descriptor?.get?.();
  if(value&&typeof value.enabled==='boolean'){
   const scriptToggle=descriptor.family==='warscript'||descriptor.family==='webscript';
   const enabled=make('input','inspector-component-enabled');enabled.type='checkbox';enabled.checked=value.enabled;enabled.disabled=state.playing&&!scriptToggle;enabled.setAttribute('aria-label','Activer '+title);enabled.onclick=event=>event.stopPropagation();enabled.onchange=()=>{if(state.playing&&!scriptToggle)return;descriptor.attach?.();value.enabled=enabled.checked;if(!state.playing)record('Activer '+title);notify()};summary.prepend(enabled);
  }
  const menu=make('div','unity-component-menu inspector-component-actions');menu.hidden=true;
  const action=(label,run,disabled=false)=>{const button=make('button','',label);button.type='button';button.disabled=disabled;button.onclick=()=>{run();menu.hidden=true};menu.append(button);return button};
  if(descriptor){
   action('Copier le composant',()=>{clipboard={family:descriptor.family,value:descriptor.snapshot?descriptor.snapshot():descriptor.keys?copyInspectorComponent(owner,descriptor.keys):structuredClone(descriptor.get())};notify()});
   action('Coller les valeurs',()=>{if(descriptor.keys)pasteInspectorComponent(owner,descriptor.keys,clipboard.value);else descriptor.set(structuredClone(clipboard.value));record('Coller '+title);notify()},state.playing||clipboard?.family!==descriptor.family);
   if(descriptor.reset)action(title==='Transform'?'Réinitialiser position et rotation':'Réinitialiser',()=>{descriptor.reset();record('Réinitialiser '+title);notify()},state.playing);
   if(descriptor.remove)action('Supprimer le composant',()=>{descriptor.remove();record('Supprimer '+title);notify()},state.playing);
  }
  const move=direction=>{const ordered=[...root.querySelectorAll(':scope>.inspector-component')],from=ordered.indexOf(card),to=from+direction;if(to<1||to>=ordered.length)return;[ordered[from],ordered[to]]=[ordered[to],ordered[from]];owner.inspectorOrder=ordered.map(keyFor);record('Ordre Inspector : '+title);notify()};
  if(title!=='Transform'){action('Monter',()=>move(-1)).dataset.move='-1';action('Descendre',()=>move(1)).dataset.move='1'}
  const toggle=make('button','component-menu-toggle','⋮');toggle.type='button';toggle.title='Actions du composant';toggle.setAttribute('aria-label','Actions : '+title);toggle.setAttribute('aria-expanded','false');
  toggle.onclick=event=>{event.preventDefault();event.stopPropagation();const opening=menu.hidden;const ordered=[...root.querySelectorAll(':scope>.inspector-component')],position=ordered.indexOf(card);menu.querySelectorAll('[data-move]').forEach(button=>button.disabled=state.playing||position+Number(button.dataset.move)<1||position+Number(button.dataset.move)>=ordered.length);root.querySelectorAll('.inspector-component-actions').forEach(node=>{node.hidden=true});root.querySelectorAll('.component-menu-toggle').forEach(node=>node.setAttribute('aria-expanded','false'));menu.hidden=!opening;toggle.setAttribute('aria-expanded',String(opening));if(opening)menu.querySelector('button:not(:disabled)')?.focus()};
  menu.onkeydown=event=>{const buttons=[...menu.querySelectorAll('button:not(:disabled)')],current=buttons.indexOf(document.activeElement);if(event.key==='Escape'){event.preventDefault();event.stopPropagation();menu.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.focus()}else if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();buttons[(current+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus()}};
  menu.onclick=event=>{event.preventDefault();event.stopPropagation()};summary.append(toggle,menu);
 });
 const order=owner.inspectorOrder||[];
 if(order.length){const sorted=cards.slice().sort((a,b)=>{if(a.dataset.componentTitle==='Transform')return -1;if(b.dataset.componentTitle==='Transform')return 1;const rank=card=>order.includes(keyFor(card))?order.indexOf(keyFor(card)):1e5;return rank(a)-rank(b)});const end=root.querySelector(':scope>.inspector-add-component');for(const card of sorted)root.insertBefore(card,end)}
 root.onpointerdown=event=>{if(!event.target.closest('.component-menu-toggle,.inspector-component-actions')){root.querySelectorAll('.inspector-component-actions').forEach(menu=>menu.hidden=true);root.querySelectorAll('.component-menu-toggle').forEach(button=>button.setAttribute('aria-expanded','false'))}};
}
