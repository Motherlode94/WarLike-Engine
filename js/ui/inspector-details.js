import {inspectorContext} from './inspector-context.js';
import {element} from './blueprint-controls.js';
let selectedId=null,query='',scope='all';
export function enhanceInspectorDetails(root,owner){
 const selection=inspectorContext()+':'+owner.id;if(selectedId!==selection){selectedId=selection;query='';scope='all'}
 const header=root.querySelector('.inspector-object');if(!header)return;
 const tools=element('div','inspector-details-tools'),search=element('input'),tabs=element('div','inspector-details-tabs'),cards=[...root.querySelectorAll(':scope>.inspector-component')];search.type='search';search.placeholder='Rechercher un composant ou une propriété…';search.setAttribute('aria-label','Rechercher dans les détails de l’objet');search.value=query;tools.append(search,tabs);
 const filter=element('select');filter.setAttribute('aria-label','Filtrer les composants');
 for(const [id,label] of [['all','Tous les composants'],['blueprint','Comportements Blueprint']]){const option=element('option','',label);option.value=id;filter.append(option)}filter.value=scope;
 const folds=element('select');folds.setAttribute('aria-label','Déplier ou replier les composants');
 for(const [id,label] of [['','Affichage…'],['open','Tout déplier'],['close','Tout replier']]){const option=element('option','',label);option.value=id;folds.append(option)}
 const empty=element('p','inspector-search-empty','Aucun composant ne correspond à cette recherche.');empty.hidden=true;
 const apply=()=>{let count=0;for(const card of cards){const blueprint=card.dataset.componentTitle?.includes('Blueprint')||card.dataset.componentKey==='sequence',matches=(scope==='all'||blueprint)&&card.textContent.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr'));card.hidden=!matches;if(matches)count++;if(matches&&query){if(card.dataset.searchExpanded!=='true')card.dataset.beforeSearchOpen=String(card.open);card.dataset.searchExpanded='true';card.open=true}else if(card.dataset.searchExpanded==='true'){card.open=card.dataset.beforeSearchOpen==='true';delete card.dataset.searchExpanded}}empty.hidden=count>0};
 search.oninput=()=>{query=search.value;apply()};
 filter.onchange=()=>{scope=filter.value;apply()};folds.onchange=()=>{if(!folds.value)return;for(const card of cards)if(!card.hidden){delete card.dataset.searchExpanded;card.open=folds.value==='open'}folds.value=''};
 tabs.append(filter,folds);header.append(tools);header.after(empty);apply();
}
