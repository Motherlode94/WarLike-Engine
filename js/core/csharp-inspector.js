// Typed bridge values and scene persistence; no C# code is executed in JavaScript.
export function parseCsharpValue(type, values) {
 if(type==='string'){if(typeof values!=='string'||values.length>4096)throw Error('Texte limité à 4096 caractères.');return values;}
 if(type==='bool')return values===true;
 const number=value=>{
  if(String(value).trim()===''||!Number.isFinite(Number(value)))throw Error('Saisis un nombre fini.');
  return Number(value);
 };
 if(type==='vector3')return {x:number(values.x),y:number(values.y),z:number(values.z)};
 const value=number(values);
 if(type==='int'&&!Number.isSafeInteger(value))throw Error('Saisis un nombre entier.');
 if(!['float','int'].includes(type))throw Error('Type C# non pris en charge.');
 return value;
}
export function parseSquadMembers(text) {
 if(!String(text).trim())return [];
 const ids=String(text).trim().split(/[\s,;]+/).map(Number);
 if(ids.length>64||ids.some(id=>!Number.isSafeInteger(id)||id<=0)||new Set(ids).size!==ids.length)
  throw Error('Saisis au maximum 64 ID positifs, distincts, séparés par des virgules.');
 return ids;
}
export function persistCsharpProperty(entities,actorId,component,property) {
 const actor=entities.find(entity=>entity.id===actorId);
 if(!actor||!Number.isInteger(component.sourceIndex))return false;
 if(component.sourceIndex===-1){if(!actor.csharpScript||actor.csharpScript.name.split('.').at(-1)!==component.type)return false;const name=property.name||property.sceneKeys?.[0];if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)||['constructor','prototype','__proto__'].includes(name))return false;let value;try{value=parseCsharpValue(property.type,property.value)}catch{return false}if(name==='Enabled')actor.csharpScript.enabled=value;else{actor.csharpScript.values??={};actor.csharpScript.values[name]=value}return true;}
 if(component.sourceIndex<0)return false;
 const definition=actor.csharpComponents?.[component.sourceIndex];
 if(!definition||definition.kind!==component.type.replace(/(?:Component|Behaviour)$/,''))return false;
 const keys=property.sceneKeys;
 if(!Array.isArray(keys)||!keys.length||keys.some(key=>!/^[a-z][a-zA-Z0-9]*$/.test(key)||['constructor','prototype'].includes(key)))return false;
 const values=property.type==='vector3'?[property.value?.x,property.value?.y,property.value?.z]:[property.value];
 if(keys.length!==values.length||values.some(value=>typeof value!=='boolean'&&!Number.isFinite(value)))return false;
 keys.forEach((key,index)=>{definition[key]=values[index]});
 return true;
}
