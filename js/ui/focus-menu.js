// Priority-first menus: reparent existing controls so their handlers and IDs survive.
const KEY='warlike.engine.focus-menu.v1';
export function initFocusMenu(){
 const bar=document.getElementById('studioMenus');
 if(!bar||document.getElementById('studioMoreMenus'))return;
 const more=document.createElement('details');more.id='studioMoreMenus';
 const summary=document.createElement('summary');summary.textContent='Outils';
 summary.setAttribute('aria-label','Outils et réglages avancés');
 const contents=document.createElement('div');contents.className='studio-more-popover';
 more.append(summary,contents);
 const auxiliary=['GameObject','Assets','Component','Window','Aide'];
 const sections=[...bar.children].filter(el=>el.tagName==='DETAILS'&&auxiliary.includes(el.querySelector(':scope > summary')?.textContent.trim()));
 for(const entry of sections)contents.append(entry);
 const animator=document.getElementById('openAnimationStudio');
 if(animator)contents.append(animator);
 bar.append(more);
 const setCompact=()=>{
  document.body.classList.add('warlike-focus-menu');
  try{
   const current=localStorage.getItem('warlike.toolbar.expanded.v1');
   if(current===null){
    localStorage.setItem('warlike.toolbar.expanded.v1','false');
    document.body.classList.remove('warlike-toolbar-expanded');
    document.getElementById('studioToolbarToggle')?.setAttribute('aria-expanded','false');
   }
  }catch{}
 };
 setCompact();
 more.addEventListener('toggle',()=>{
  if(!more.open)for(const section of contents.querySelectorAll('details'))section.open=false;
 });
 contents.addEventListener('click',event=>{
  const target=event.target.closest('button,a');
  if(!target)return;
  if(target.id==='openAnimationStudio'||target.closest('.studio-dropdown')){
   more.open=false;
  }
 });
 document.addEventListener('pointerdown',event=>{
  if(more.open&&!more.contains(event.target))more.open=false;
 });
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&more.open){more.open=false;summary.focus();}
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initFocusMenu,{once:true});
else initFocusMenu();
