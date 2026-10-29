import {element} from './blueprint-controls.js';
let selectedId=null,query='',scope='all';
export function enhanceInspectorDetails(root,owner){
 if(selectedId!==owner.id){selectedId=owner.id;query='';scope='all'}
 const header=root.querySelector('.inspector-object');if(!header)return;
 const tools=element('div','inspector-details-tools'),search=element('input'),tabs=element('div','inspector-details-tabs'),cards=[...root.querySelectorAll(':scope>.inspector-component')];search.type='search';search.placeholder='Rechercher dans les détails…';search.setAttribute('aria-label','Rechercher dans les détails de l’objet');search.value=query;tools.append(search,tabs);
 const apply=()=>{for(const card of cards){const blueprint=card.dataset.componentTitle?.includes('Blueprint')||card.dataset.componentKey==='sequence',matches=(scope==='all'||blueprint)&&card.textContent.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr'));card.hidden=!matches;if(matches&&query)card.open=true}tabs.querySelectorAll('[data-details-scope]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.detailsScope===scope)))};
 search.oninput=()=>{query=search.value;apply()};
 for(const [id,label] of [['all','Tous les détails'],['blueprint','Blueprint']]){const b=element('button','',label);b.type='button';b.dataset.detailsScope=id;b.onclick=()=>{scope=id;apply()};tabs.append(b)}
 for(const [label,open] of [['Tout déplier',true],['Tout replier',false]]){const b=element('button','',label);b.type='button';b.onclick=()=>{for(const card of cards)if(!card.hidden)card.open=open};tabs.append(b)}header.append(tools);apply();
}
