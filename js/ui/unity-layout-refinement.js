// Move rarely used toolbar controls into the existing expandable toolbar.
// Actual nodes are moved: their listeners, IDs and editor integrations survive.
export function refineWorkspaceChrome(){
 const primary=document.getElementById('studioPrimaryActions');
 const secondary=document.getElementById('studioSecondaryToolbar');
 if(!primary||!secondary||document.getElementById('warlikeSecondaryActions'))return;
 const overflow=document.createElement('div');
 overflow.id='warlikeSecondaryActions';
 overflow.className='toolbar-group';
 overflow.setAttribute('aria-label','Commandes secondaires');
 // Keep Play, Blueprint and object creation on the main row.
 const moved=['warlikeToolLibrary','undo','redo'];
 for(const id of moved){
  const el=primary.querySelector('#'+id);
  if(el)overflow.append(el);
 }
 if(overflow.childElementCount)secondary.prepend(overflow);
 // The scene and inspector remain real dockable panels; users can still drag splitters.
}
if(document.readyState==='loading'){
 document.addEventListener('DOMContentLoaded',refineWorkspaceChrome,{once:true});
}else refineWorkspaceChrome();
