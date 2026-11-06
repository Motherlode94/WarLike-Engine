// Portable values shared by graph ports, variables and serialized projects.
export const variableTypes=['number','boolean','string','vector2','vector3','object','component'];
export const validEntityId=id=>Number.isSafeInteger(id)&&id>0;
export function valueType(value){
 if(Array.isArray(value)&&[2,3].includes(value.length)&&value.every(Number.isFinite))return 'vector'+value.length;
 if(value&&typeof value==='object'&&!Array.isArray(value)&&validEntityId(value.entityId)){
  if(typeof value.kind==='string'&&value.kind.length>0&&!['__proto__','constructor','prototype'].includes(value.kind)&&Object.keys(value).every(k=>['entityId','kind','index'].includes(k))&&(value.index===undefined||Number.isSafeInteger(value.index)&&value.index>=0&&value.index<64))return 'component';
  if(Object.keys(value).every(k=>k==='entityId'))return 'object';
 }
 return typeof value;
}
export function typedValue(type,value,label='Valeur'){
 if(!variableTypes.includes(type)||valueType(value)!==type||type==='number'&&!Number.isFinite(value))throw Error(label+' : '+type+' attendu.');
 return structuredClone(value);
}
export function coerceVariable(type,value){
 const finite=(n,d=0)=>Number.isFinite(Number(n))?Number(n):d;
 if(type==='number')return finite(value);
 if(type==='boolean')return value===true||value==='true'||value===1;
 if(type==='vector2'||type==='vector3')return Array.from({length:Number(type.slice(-1))},(_,i)=>finite(Array.isArray(value)?value[i]:0));
 if(type==='object'||type==='component'){try{return typedValue(type,value)}catch{return null}}
 return String(value??'').slice(0,512);
}
