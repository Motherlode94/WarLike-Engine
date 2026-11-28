// Native game UI overlay: UI components are Engine scene data, not Editor windows.
// No HTML markup from projects is interpreted, and buttons emit signals only.
import {uiLayoutTree} from './ui-canvas-layout.js';

const color=(v,fallback)=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)?v:fallback;
const safeSignal=/^[a-zA-Z][a-zA-Z0-9_.:-]{0,95}$/;
export function gameUiSignal(node){
 const value=String(node?.element?.eventName||'').trim();
 return safeSignal.test(value)?value:'ui:click:'+String(node?.id??'unknown').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,48);
}
export function gameUiElements(entities,width,height){
 return uiLayoutTree(entities,width,height)
  .filter(node=>['panel','text','button'].includes(node.element?.kind)&&node.rect.width>0&&node.rect.height>0);
}
export function createGameUiOverlay(host,{onSignal=()=>{}}={}){
 if(!host?.append||!globalThis.document)throw Error('Viewport DOM nécessaire pour Game UI');
 const root=document.createElement('div');
 root.className='warlike-game-ui-overlay';
 root.setAttribute('aria-label','Interface du jeu WarLike');
 root.style.cssText='position:absolute;inset:0;z-index:18;pointer-events:none;overflow:hidden';
 root.hidden=true;host.append(root);
 const elements=new Map();
 let lastOrder='';
 const ensure=(item)=>{
  let entry=elements.get(item.id),kind=item.element.kind;
  if(entry?.kind!==kind){
   entry?.element.remove();
   const element=document.createElement(kind==='button'?'button':'div');
   element.dataset.gameUiId=String(item.id);
   element.style.cssText='position:absolute;box-sizing:border-box;overflow:hidden;display:flex;align-items:center;justify-content:center;text-align:center;font:600 15px system-ui,sans-serif;white-space:pre-wrap;overflow-wrap:anywhere';
   if(kind==='button'){
    element.type='button';element.style.cursor='pointer';element.style.pointerEvents='auto';
    element.addEventListener('click',event=>{
     event.preventDefault();event.stopPropagation();
     if(root.hidden||element.disabled)return;
     const current=elements.get(item.id)?.item;
     if(current)onSignal(gameUiSignal(current),current.id);
    });
    element.addEventListener('pointerdown',event=>event.stopPropagation());
    element.addEventListener('keydown',event=>event.stopPropagation());
   }
   elements.set(item.id,entry={element,kind,item});
  }
  entry.item=item;
  return entry;
 };
 const update=(entities,{playing=false,width=host.clientWidth,height=host.clientHeight}={})=>{
  if(!playing||!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0){
   root.hidden=true;return [];
  }
  let items;
  try{items=gameUiElements(entities,width,height)}catch(error){console.warn('[WarLike UI] Invalid Canvas:',error);root.hidden=true;return [];}
  root.hidden=items.length===0;
  const active=new Set(items.map(x=>x.id));
  for(const [id,entry] of elements)if(!active.has(id)){entry.element.remove();elements.delete(id);}
  for(const item of items){
   const {element}=ensure(item),{rect}=item,e=item.element;
   element.style.left=rect.x+'px';element.style.top=rect.y+'px';
   element.style.width=rect.width+'px';element.style.height=rect.height+'px';
   element.style.transform=rect.rotation?'rotate('+rect.rotation+'deg)':'';
   element.style.background= item.element.kind==='text'?'transparent':color(e.color,'#283e50');
   element.style.color=color(e.textColor,'#ffffff');
   const content=String(e.text||'').slice(0,1024);
   if(element.textContent!==content)element.textContent=content;
   if(item.element.kind==='button'){
    element.disabled=e.interactable===false;
    element.style.opacity=e.interactable===false?'.55':'1';
    element.setAttribute('aria-label',content||'Bouton');
   }
   if(item.element.kind==='panel')element.style.pointerEvents='none';
  }
  const next=items.map(x=>String(x.id)).join('|');
  if(next!==lastOrder){for(const item of items)root.append(elements.get(item.id).element);lastOrder=next;}
  return items;
 };
 return {root,update,destroy(){root.remove();elements.clear()},elements};
}

export function gameUiHealthText(actor){
 const health=actor?.stats?.health,max=actor?.stats?.maxHealth;
 if(!Number.isFinite(health)||!Number.isFinite(max)||max<=0)return '';
 return Math.round(Math.max(0,Math.min(health,max)))+' / '+Math.round(max);
}
