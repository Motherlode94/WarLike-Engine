// Serializable typed Blueprint values. No eval or executable expressions in projects.
import {variableTypes} from './blueprint-graph.js';
const safe=name=>typeof name==='string'&&name.length>0&&name.length<=80&&!['__proto__','prototype','constructor'].includes(name);
export const valueType=value=>Array.isArray(value)&&[2,3].includes(value.length)&&value.every(Number.isFinite)?'vector'+value.length:typeof value;
export function typedValue(type,value,label='Valeur'){
 if(!variableTypes.includes(type)||valueType(value)!==type||type==='number'&&!Number.isFinite(value))throw Error(label+' : '+type+' attendu.');
 return structuredClone(value);
}
export function resolveBlueprintValue(value,{globals={},locals={},parameters={}}={},depth=0){
 if(depth>12)throw Error('Expression Blueprint trop profonde.');
 if(!value||typeof value!=='object'||Array.isArray(value))return structuredClone(value);
 if(!value.$ref)return structuredClone(value);
 const stores={global:globals,local:locals,parameter:parameters},store=stores[value.$ref];
 if(!store||!safe(value.name)||!Object.hasOwn(store,value.name))throw Error('Donnée introuvable : '+String(value.name));
 const result=store[value.name];return value.type?typedValue(value.type,result,value.name):structuredClone(result);
}
export function resolveBlueprintAction(action,scope){
 const result={...action};
 // Branch bodies and function arguments are resolved only when entered.
 for(const [key,value] of Object.entries(result))if(!['thenInstructions','elseInstructions','conditions','arguments'].includes(key)&&value&&typeof value==='object'&&value.$ref)result[key]=resolveBlueprintValue(value,scope);
 return result;
}
export function validateFunctionDefinitions(functions){
 const errors=[],names=new Set();
 if(!Array.isArray(functions))return ['Bibliothèque de fonctions invalide.'];
 if(functions.length>64)errors.push('64 fonctions maximum.');
 for(const f of functions.slice(0,64)){
  if(!f||!safe(f.id)||names.has(f.id)){errors.push('Identifiant de fonction invalide ou dupliqué.');continue}names.add(f.id);
  if(!['void',...variableTypes].includes(f.returnType||'void'))errors.push(f.id+' : type de retour invalide.');
  const params=new Set();if(!Array.isArray(f.parameters)||f.parameters.length>16){errors.push(f.id+' : 16 paramètres maximum.');continue}
  for(const p of f.parameters){if(!p||!safe(p.name)||params.has(p.name)||!variableTypes.includes(p.type)){errors.push(f.id+' : paramètre invalide ou dupliqué.');continue}params.add(p.name);if(Object.hasOwn(p,'value'))try{typedValue(p.type,p.value,p.name)}catch(e){errors.push(e.message)}}
 }
 return errors;
}
