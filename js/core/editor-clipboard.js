const maxBytes=4*1024*1024;
const unsafe=new Set(['__proto__','constructor','prototype']);
const refs=new Set(['targetId','entityId','actorId','ownerId','sourceId','parentId','weaponOwner','vehicleId','followTargetId','aiTargetId','linkedEntityId']);
export const isTypingTarget=target=>!!target&&(target.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(target.tagName)||!!target.closest?.('[contenteditable="true"],[role="textbox"]'));
const cleanClone=value=>JSON.parse(JSON.stringify(value,(key,item)=>unsafe.has(key)||key.startsWith('_')?undefined:item));
export function copyEntitiesPayload(entities,ids,mode){
 const picked=entities.filter(o=>ids.includes(o.id));if(!picked.length)throw Error('Sélectionne un objet à copier.');if(picked.length>1000)throw Error('Copie limitée à 1 000 objets.');
 const text=JSON.stringify({format:'warlike.entities.v1',mode:mode==='3d'?'3d':'2d',entities:cleanClone(picked)});if(text.length>maxBytes)throw Error('La sélection dépasse 4 Mo.');return text;
}
export function readEntitiesPayload(text){
 if(typeof text!=='string'||text.length>maxBytes)return null;let data;try{data=JSON.parse(text)}catch{return null}
 if(data?.format!=='warlike.entities.v1'||!['2d','3d'].includes(data.mode)||!Array.isArray(data.entities)||!data.entities.length||data.entities.length>1000)return null;
 const ids=new Set();for(const o of data.entities)if(!o||!Number.isSafeInteger(o.id)||ids.has(o.id)||!ids.add(o.id)||!['x','y','w','h'].every(k=>Number.isFinite(o[k]))||o.w<=0||o.h<=0)return null;
 return cleanClone(data);
}
export function pasteEntitiesPayload(text,{entities,mode,nextId=1,offset=24}){
 const data=readEntitiesPayload(text);if(!data)throw Error('Le presse-papiers ne contient pas d’objets WarLike.');if(data.mode!==mode)throw Error('Ces objets sont en '+data.mode.toUpperCase()+'. Ouvre un projet de ce type pour les coller.');
 let serial=Math.max(nextId,...entities.map(o=>o.id+1));const map=new Map(data.entities.map(o=>[o.id,serial++]));
 const remap=value=>{if(Array.isArray(value))return value.map(remap);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,refs.has(key)&&map.has(item)?map.get(item):remap(item)]));return value};
 const added=data.entities.map(source=>{const o=remap(source);o.id=map.get(source.id);o.name=String(source.name||'GameObject')+' (copie)';o.x+=offset;o.y+=offset;if(Number.isFinite(o.ai?.homeX))o.ai.homeX+=offset;if(Number.isFinite(o.ai?.homeY))o.ai.homeY+=offset;return o});
 return {entities:[...entities,...added],selected:added.map(o=>o.id),nextId:serial};
}
