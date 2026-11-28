import {inventoryCount,inventoryRemove,inventoryAdd} from './gameplay-components.js';
export const questParty=entities=>entities.flatMap(o=>[o,...(Array.isArray(o.survivalCompanions)?o.survivalCompanions:[])]).filter(o=>o&&typeof o==='object'&&o.adventure);
export const questItemCount=(entities,key)=>questParty(entities).reduce((sum,o)=>sum+inventoryCount(o,key),0);
export function consumeQuestItem(entities,key,count=1){
 count=Math.max(1,Math.floor(Number(count)||1));if(questItemCount(entities,key)<count)return false;
 for(const actor of questParty(entities)){const take=Math.min(count,inventoryCount(actor,key));if(take)inventoryRemove(actor,key,take);count-=take;if(!count)break}return true;
}

export function transferInventoryItem(source,target,id,count=1){
 if(!source||!target||source===target||typeof id!=='string'||!id||!Number.isSafeInteger(count)||count<=0||inventoryCount(source,id)<count)return false;
 if(!inventoryAdd(target,id,count))return false;
 if(inventoryRemove(source,id,count))return true;
 inventoryRemove(target,id,count);return false;
}
