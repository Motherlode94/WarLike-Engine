import {inventoryCount,inventoryRemove} from './gameplay-components.js';
export const questParty=entities=>entities.flatMap(o=>[o,...(Array.isArray(o.survivalCompanions)?o.survivalCompanions:[])]).filter(o=>o&&typeof o==='object'&&o.adventure);
export const questItemCount=(entities,key)=>questParty(entities).reduce((sum,o)=>sum+inventoryCount(o,key),0);
export function consumeQuestItem(entities,key,count=1){
 count=Math.max(1,Math.floor(Number(count)||1));if(questItemCount(entities,key)<count)return false;
 for(const actor of questParty(entities)){const take=Math.min(count,inventoryCount(actor,key));if(take)inventoryRemove(actor,key,take);count-=take;if(!count)break}return true;
}
