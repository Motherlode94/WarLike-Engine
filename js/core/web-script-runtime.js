import {createScriptApi} from './war-script-runtime.js';
export function webScriptRecord(component,project){return project?.scripts?.find(s=>s.id===component.scriptId&&['javascript','typescript'].includes(s.language))||component}
export function webScriptCode(record){
 if(record.language==='typescript'){
  if(typeof record.compiledSource!=='string'||record.compiledFrom!==record.source)throw Error('TypeScript modifié : ouvre ce .ts dans Script Studio puis compile et enregistre avant Play ou l’export.');
  return record.compiledSource;
 }
 if(record.language!=='javascript'||typeof record.source!=='string')throw Error('Script JavaScript/TypeScript invalide.');return record.source;
}
function serializable(value){
 const seen=new Set();function visit(v,depth){if(depth>8)throw Error('État de script trop imbriqué.');if(v===null||typeof v==='boolean'||typeof v==='string'&&v.length<=4096||typeof v==='number'&&Number.isFinite(v))return;
  if(!v||typeof v!=='object'||seen.has(v)||Object.keys(v).length>128)throw Error('Les champs de script doivent contenir des données JSON finies.');seen.add(v);for(const [k,item] of Object.entries(v)){if(['__proto__','prototype','constructor'].includes(k))throw Error('Champ de script réservé.');visit(item,depth+1)}seen.delete(v)}visit(value,0);if(JSON.stringify(value).length>16384)throw Error('État de script limité à 16 Ko.');return value;
}
export function inspectWebScripts(entities,project){const issues=[];let count=0;
 for(const entity of entities||[]){if(entity.webScripts!=null&&!Array.isArray(entity.webScripts)){issues.push({severity:'error',entityId:entity.id,message:'Liste JS/TS invalide.'});continue}const ids=new Set();
  for(const component of entity.webScripts||[]){if(component?.enabled===false)continue;count++;try{if(!component||typeof component.scriptId!=='string'||ids.has(component.scriptId))throw Error('Script absent ou dupliqué.');ids.add(component.scriptId);const code=webScriptCode(webScriptRecord(component,project));if(code.length>1024*1024)throw Error('Script limité à 1 Mo.');serializable(component.values||{});}catch(error){issues.push({severity:'error',entityId:entity.id,message:(entity.name||'#'+entity.id)+' · '+(component?.name||'JS/TS')+' : '+error.message})}}
 }if(count>64)issues.push({severity:'error',message:'64 composants JS/TS actifs maximum par scène.'});return issues;
}
const loadModule=async source=>{const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));try{return await import(/* @vite-ignore */ url)}finally{URL.revokeObjectURL(url)}};
const hooks={Awake:['Awake','awake'],Start:['Start','start'],FixedUpdate:['FixedUpdate','fixedUpdate'],Update:['Update','update'],LateUpdate:['LateUpdate','lateUpdate'],OnDestroy:['OnDestroy','onDestroy']};
export class WebScriptRuntime {
 constructor({load=loadModule}={}){this.load=load;this.instances=[];this.generation=0;this.elapsed=0;this.fixed=0;this.context=null;this.errors=[]}
 report(entry,error){entry.failed=true;entry.component.runtime.error=(entry.component.name||'JS/TS')+' · '+error.message;this.errors.push(entry.component.runtime.error);entry.context.log?.(entry.component.runtime.error,'error',entry.entity)}
 async prepare(ctx){this.stop();const generation=this.generation;this.context=ctx;const modules=new Map(),entries=[];
  for(const entity of ctx.entities)for(const component of entity.webScripts||[]){if(component.enabled===false)continue;const record=webScriptRecord(component,ctx.project),code=webScriptCode(record);let pending=modules.get(code);if(!pending){pending=this.load(code);modules.set(code,pending)}
   const module=await pending;if(generation!==this.generation)return;if(!Object.values(hooks).flat().some(name=>typeof module[name]==='function'))throw Error('Exporte au moins une méthode Start, Update ou un autre callback du cycle de vie.');
   for(const names of Object.values(hooks))for(const name of names)if(module[name]!=null&&(typeof module[name]!=='function'||module[name].constructor.name==='AsyncFunction'))throw Error(name+' doit être une fonction synchrone.');
   component.runtime??={started:false,fields:{},error:''};component.runtime.error='';
   const fields=serializable(structuredClone(component.runtime.started?component.runtime.fields:{...(module.fields||{}),...(component.values||{})}));
   const clock={delta:0,elapsed:0},context={...ctx},api=createScriptApi(entity,context,clock);
   const binding={entity,entities:ctx.entities,fields,Time:{get deltaTime(){return clock.delta},get time(){return clock.elapsed},fixedDeltaTime:.02},Input:{GetKey:key=>api.call('Input.GetKey',[key]),GetKeyDown:key=>api.call('Input.GetKeyDown',[key])},
    Move:(...args)=>api.call('Move',args),Rotate:(...args)=>api.call('Rotate',args),Log:value=>api.call('Log',[value]),Get:key=>api.call('Get',[key]),Set:(key,value)=>api.call('Set',[key,value]),Signal:key=>api.call('Signal',[key]),GetComponent:key=>entity[key]};
   binding.transform={get position(){return api.read('transform.position')},set position(value){api.write('transform.position',value)},Translate:binding.Move,Rotate:binding.Rotate};
   entries.push({entity,component,module,clock,context,binding,failed:false});
  }
  if(generation===this.generation)this.instances=entries;
 }
 invoke(entry,hook){if(entry.failed)return;try{const method=hooks[hook].map(key=>entry.module[key]).find(f=>typeof f==='function');if(method){const result=method(entry.binding);if(result?.then)throw Error('Les méthodes de cycle de vie JS/TS doivent être synchrones.');}serializable(entry.binding.fields);entry.component.runtime.fields=structuredClone(entry.binding.fields)}catch(error){this.report(entry,error)}}
 update(dt,ctx){const delta=Math.min(.1,Math.max(0,Number(dt)||0));this.elapsed+=delta;this.fixed+=delta;
  const active=entry=>entry.entity.enabled!==false&&entry.component.enabled!==false&&!entry.failed;
  for(const entry of this.instances){Object.assign(entry.context,ctx);entry.binding.entities=ctx.entities;entry.clock.elapsed=this.elapsed;entry.clock.delta=delta;if(active(entry)&&!entry.component.runtime.started){this.invoke(entry,'Awake');this.invoke(entry,'Start');entry.component.runtime.started=!entry.failed}}
  while(this.fixed>=.02-1e-8){this.fixed-=.02;for(const entry of this.instances)if(active(entry)){entry.clock.delta=.02;this.invoke(entry,'FixedUpdate')}}
  for(const entry of this.instances)if(active(entry)){entry.clock.delta=delta;this.invoke(entry,'Update')}
 }
 late(){for(const entry of this.instances)if(entry.entity.enabled!==false&&entry.component.enabled!==false)this.invoke(entry,'LateUpdate')}
 stop(){this.generation++;for(const entry of this.instances)if(entry.component.runtime.started)this.invoke(entry,'OnDestroy');this.instances=[];this.elapsed=0;this.fixed=0;this.context=null;this.errors=[]}
}
export const webScriptRuntime=new WebScriptRuntime();
