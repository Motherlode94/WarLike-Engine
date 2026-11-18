/** WarLike palette theme switcher v2. Same source in Engine, Library, Store and Extensions. */
export const WARLIKE_THEMES=Object.freeze(['olive-dark','sand-light','tactical','heritage']);
export const WARLIKE_THEME_KEY='warlike-theme-v1';
export function normalizeWarLikeTheme(v){return WARLIKE_THEMES.includes(v)?v:'olive-dark'}
export function applyWarLikeTheme(v,{persist=true}={}){
 const value=normalizeWarLikeTheme(v);
 document.documentElement.setAttribute('data-wl-theme',value);
 if(persist){try{localStorage.setItem(WARLIKE_THEME_KEY,value)}catch{}}
 document.dispatchEvent(new CustomEvent('warlike:themechange',{detail:{theme:value}}));
 return value;
}
export function initializeWarLikeTheme(){
 let stored='olive-dark';try{stored=localStorage.getItem(WARLIKE_THEME_KEY)}catch{}
 return applyWarLikeTheme(stored,{persist:false});
}
export function mountWarLikeThemeSelector(){
 const old=document.getElementById('warlike-theme-switcher');if(old)return old;
 const wrapper=document.createElement('div');wrapper.id='warlike-theme-switcher';
 const label=document.createElement('label');label.htmlFor='wl-theme-select';label.textContent='Thème WarLike';
 const select=document.createElement('select');select.id='wl-theme-select';select.setAttribute('aria-label','Changer le thème WarLike');
 for(const [value,title] of [['olive-dark','Olive Dark'],['sand-light','Sand Light'],['tactical','Tactical'],['heritage','Heritage']]){
  const opt=document.createElement('option');opt.value=value;opt.textContent=title;select.append(opt);
 }
 select.value=initializeWarLikeTheme();
 select.addEventListener('change',()=>{select.value=applyWarLikeTheme(select.value)});
 addEventListener('storage',event=>{if(event.key===WARLIKE_THEME_KEY){select.value=applyWarLikeTheme(event.newValue,{persist:false})}});
 wrapper.append(label,select);document.body.append(wrapper);return wrapper;
}
if(typeof document!=='undefined'){
 // Apply the saved palette immediately; mount controls only when DOM is ready.
 initializeWarLikeTheme();
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountWarLikeThemeSelector,{once:true});
 else mountWarLikeThemeSelector();
}
