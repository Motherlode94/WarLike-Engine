// Inspector operations use stable IDs and serializable values, never cached entity references.
export class InspectorSelection {
 constructor(){this.locked=false;this.ids=[];this.context=null}
 resolve(entities,selected,context){
  if(this.context!==context){this.locked=false;this.ids=[];this.context=context}
  if(!this.locked)this.ids=[...new Set(selected)];
  const objects=this.ids.map(id=>entities.find(object=>object.id===id)).filter(Boolean);
  if(this.locked&&!objects.length){this.locked=false;this.ids=[...new Set(selected)];return this.resolve(entities,selected,context)}
  return objects;
 }
 toggle(){this.locked=!this.locked;return this.locked}
}
const forbidden=new Set(['__proto__','prototype','constructor']);
export const safeInspectorPath=path=>Array.isArray(path)&&path.length>0&&path.every(key=>typeof key==='string'&&!forbidden.has(key));
export const inspectValue=(object,path)=>safeInspectorPath(path)?path.reduce((value,key)=>value?.[key],object):undefined;
export function mixedInspectorValue(objects,path){
 const values=objects.map(object=>inspectValue(object,path));
 return {value:values[0],mixed:values.some(value=>JSON.stringify(value)!==JSON.stringify(values[0]))};
}
export function setInspectorValue(objects,path,value){
 if(!objects.length||!safeInspectorPath(path)||!['string','number','boolean'].includes(typeof value)||typeof value==='number'&&!Number.isFinite(value))return false;
 const parents=objects.map(object=>path.slice(0,-1).reduce((parent,key)=>parent?.[key],object)),key=path.at(-1);
 if(parents.some(parent=>!parent||typeof parent!=='object'||!Object.hasOwn(parent,key)||typeof parent[key]!==typeof value))return false;
 for(const parent of parents)parent[key]=value;
 return true;
}
export function commonInspectorFields(objects,path=[],depth=0){
 const values=objects.map(object=>path.length?inspectValue(object,path):object);
 if(!values.length||values.some(value=>!value||typeof value!=='object'||Array.isArray(value))||depth>5)return [];
 const fields=[];
 for(const key of Object.keys(values[0])){
  if(forbidden.has(key)||key.startsWith('_')||values.some(value=>!Object.hasOwn(value,key)||typeof value[key]!==typeof values[0][key]))continue;
  const value=values[0][key],next=[...path,key];
  if(['string','number','boolean'].includes(typeof value))fields.push(next);
  else if(value&&typeof value==='object'&&!Array.isArray(value))fields.push(...commonInspectorFields(objects,next,depth+1));
 }
 return fields.slice(0,128);
}
export function copyInspectorComponent(owner,keys){
 const values={};for(const key of keys)if(!forbidden.has(key)&&Object.hasOwn(owner,key))values[key]=structuredClone(owner[key]);
 return values;
}
export function pasteInspectorComponent(owner,keys,values){
 if(!values||typeof values!=='object'||!keys.length||Object.keys(values).some(key=>!keys.includes(key)||forbidden.has(key)))return false;
 for(const key of keys){if(Object.hasOwn(values,key))owner[key]=structuredClone(values[key]);else delete owner[key]}
 return true;
}
export function inspectorMetadata(entity){
 const result={};
 for(const key of ['visible','editorHidden'])if(typeof entity[key]==='boolean')result[key]=entity[key];
 for(const key of ['hierarchyGroup','prefabSourceId'])if(typeof entity[key]==='string')result[key]=entity[key].slice(0,100);
 for(const key of ['inspectorOrder','prefabOverrides'])if(Array.isArray(entity[key]))result[key]=entity[key].filter(value=>typeof value==='string'&&!forbidden.has(value)).slice(0,128).map(value=>value.slice(0,120));
 return result;
}
// Small arithmetic grammar: no eval, function calls, variables or JavaScript execution.
export function inspectorNumber(expression){
 const source=String(expression).trim();if(!source||source.length>160)throw Error('Saisis un nombre ou une expression arithmétique.');
 const tokens=source.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|[()+\-*/%^]/gi)||[];
 if(tokens.join('')!==source.replace(/\s/g,''))throw Error('Expression numérique invalide.');
 let cursor=0;
 const primary=()=>{const token=tokens[cursor++];if(token==='+')return primary();if(token==='-')return -primary();if(token==='('){const value=sum();if(tokens[cursor++]!==')')throw Error('Parenthèse manquante.');return value}if(!token||!/^\d|^\.\d/.test(token))throw Error('Nombre attendu.');return Number(token)};
 const power=()=>{const value=primary();return tokens[cursor]==='^'?(cursor++,value**power()):value};
 const product=()=>{let value=power();while(['*','/','%'].includes(tokens[cursor])){const operator=tokens[cursor++],right=power();value=operator==='*'?value*right:operator==='/'?value/right:value%right}return value};
 const sum=()=>{let value=product();while(['+','-'].includes(tokens[cursor])){const operator=tokens[cursor++],right=product();value=operator==='+'?value+right:value-right}return value};
 const value=sum();if(cursor!==tokens.length||!Number.isFinite(value))throw Error('Le résultat doit être un nombre fini.');return value;
}
