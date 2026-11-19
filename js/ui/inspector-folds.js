const storageKey='warlike.inspector.folds.v2';
function read(storage){
 try{const value=JSON.parse(storage?.getItem(storageKey)||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{}}catch{return {}}
}
export function bindInspectorFold(card,summary,key,fallback,storage=globalThis.localStorage){
 const saved=read(storage)[key];card.open=typeof saved==='boolean'?saved:fallback;
 const remember=open=>{
  const folds=read(storage);folds[key]=open;
  try{storage?.setItem(storageKey,JSON.stringify(folds))}catch{}
 };
 // Native details.toggle is queued. Remember the user's choice before a field
 // edit can synchronously rebuild the Inspector and discard that event.
 summary.addEventListener('click',event=>{
  if(event.defaultPrevented||event.target?.closest?.('button,input,select,a'))return;
  remember(!card.open);
 });
 card.addEventListener('toggle',()=>{
  if(card.isConnected===false||card.dataset.searchExpanded==='true')return;
  remember(card.open);
 });
}
