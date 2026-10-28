import {externalAssetSources} from '../assets/external-asset-sources.js';
// Optional catalog panel. External links only; never imply that files are installed.
export function initExternalAssetLibrary(){
 const host=document.getElementById('projectContent');
 if(!host||document.getElementById('warlikeExternalAssets'))return;
 const panel=document.createElement('details');panel.id='warlikeExternalAssets';panel.className='unity-asset-library';
 const summary=document.createElement('summary');summary.textContent='↧ Télécharger des assets CC0 · Tous les genres';
 const body=document.createElement('div');body.style.cssText='padding:10px;display:grid;gap:8px';
 const note=document.createElement('small');note.textContent='Catalogue de fournisseurs externes (non installés). Télécharge les packs sur les sites officiels, puis importe les formats compatibles dans ton projet.';
 const tools=document.createElement('div');tools.style.cssText='display:flex;gap:6px;flex-wrap:wrap';
 const genre=document.createElement('select');genre.setAttribute('aria-label','Filtrer par genre');
 const genres=['Tous',...new Set(externalAssetSources.flatMap(a=>a.genres))].sort((a,b)=>a==='Tous'?-1:b==='Tous'?1:a.localeCompare(b));
 for(const g of genres){const opt=document.createElement('option');opt.value=g;opt.textContent=g;genre.append(opt)}
 const mode=document.createElement('select');mode.setAttribute('aria-label','Filtrer 2D ou 3D');
 for(const [id,title] of [['all','2D + 3D'],['2d','2D'],['3d','3D']]){const option=document.createElement('option');option.value=id;option.textContent=title;mode.append(option)}
 const list=document.createElement('div');list.style.cssText='display:grid;gap:8px;max-height:300px;overflow:auto';
 const render=()=>{list.replaceChildren();for(const item of externalAssetSources.filter(a=>(genre.value==='Tous'||a.genres.includes(genre.value))&&(mode.value==='all'||a.modes.includes(mode.value)))){
  const card=document.createElement('div');card.style.cssText='border:1px solid var(--warlike-palette-border,#535a62);border-radius:6px;padding:8px;display:grid;gap:5px';
  const title=document.createElement('strong');title.textContent=item.name+' · '+item.license;
  const info=document.createElement('small');info.textContent=item.kind+' · '+item.modes.join('/').toUpperCase()+' · À télécharger';
  const link=document.createElement('a');link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Voir et télécharger sur le site officiel ↗';
  card.append(title,info,link);list.append(card);
 }};
 genre.addEventListener('change',render);mode.addEventListener('change',render);
 tools.append(genre,mode);body.append(note,tools,list);panel.append(summary,body);host.append(panel);render();
 document.getElementById('warlikeOpenExternalAssets')?.addEventListener('click',()=>{document.getElementById('projectTab')?.click();panel.open=true;panel.scrollIntoView({block:'nearest'});document.querySelectorAll('.studio-menubar details[open]').forEach(el=>el.open=false)});
}
