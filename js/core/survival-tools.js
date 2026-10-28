// Shared JSON-friendly tool definitions. No renderer, scene or session dependency.
export const survivalTools={
 axe:{name:'Hache',item:'survival-axe',resource:'wood',modelId:'free-survival-kit-tool-axe',repair:{wood:1,stone:1}},
 pickaxe:{name:'Pioche',item:'survival-pickaxe',resource:'stone',modelId:'free-survival-kit-tool-pickaxe',repair:{wood:1,stone:1}}
};
const n=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
export function survivalToolStatus(actor,id){
 if(!Object.hasOwn(survivalTools,id))return null;
 const definition=survivalTools[id],stored=actor?.survivalState?.tools?.[id];
 const items=actor?.inventory?.items;
 const owned=Array.isArray(items)?items.some(item=>item?.id===definition.item&&n(item.count,0)>0):n(items?.[definition.item]??actor?.inventory?.[definition.item],0)>0;
 const maxDurability=Math.max(1,Math.min(1000,Math.floor(n(stored?.maxDurability,n(actor?.survival?.toolDurability,20)))));
 const durability=owned?Math.max(0,Math.min(maxDurability,Math.floor(n(stored?.durability,maxDurability)))):0;
 return {...definition,id,owned,durability,maxDurability,usable:owned&&durability>0,bonus:Math.max(0,Math.min(10,Math.floor(n(actor?.survival?.toolHarvestBonus,2))))};
}
export function wearSurvivalTool(actor,id){
 const tool=survivalToolStatus(actor,id);if(!tool?.usable)return null;
 actor.survivalState??={};actor.survivalState.tools??={};
 actor.survivalState.tools[id]={durability:tool.durability-1,maxDurability:tool.maxDurability};
 return survivalToolStatus(actor,id);
}
