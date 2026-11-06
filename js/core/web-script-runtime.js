import {ScriptLifecycle} from './script-lifecycle.js';
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
const hooks={Awake:['Awake','awake'],Start:['Start','start'],OnEnable:['OnEnable','onEnable'],OnDisable:['OnDisable','onDisable'],FixedUpdate:['FixedUpdate','fixedUpdate'],Update:['Update','update'],LateUpdate:['LateUpdate','lateUpdate'],OnDestroy:['OnDestroy','onDestroy']};
export class WebScriptRuntime {
 constructor({load=loadModule}={}){this.load=load;this.instances=[];this.generation=0;this.elapsed=0;this.fixed=0;this.context=null;this.errors=[]}
 report(entry,error){entry.failed=true;entry.component.runtime.error=(entry.component.name||'JS/TS')+' · '+error.message;this.errors.push(entry.component.runtime.error);entry.context.log?.(entry.component.runtime.error,'error',entry.entity)}
 async prepare(ctx){this.stop();const generation=this.generation;this.context=ctx;const modules=new Map(),entries=[];
  for(const entity of ctx.entities)for(const component of entity.webScripts||[]){
   component.runtime??={started:false,fields:{},error:''};component.runtime.error='';
   let module,fields;
   try{
    const code=webScriptCode(webScriptRecord(component,ctx.project));let pending=modules.get(code);if(!pending){pending=this.load(code);modules.set(code,pending)}
    module=await pending;if(generation!==this.generation)return;
    if(!Object.values(hooks).flat().some(name=>typeof module[name]==='function'))throw Error('Exporte au moins une méthode Start, Update ou un autre callback du cycle de vie.');
    for(const names of Object.values(hooks))for(const name of names)if(module[name]!=null&&(typeof module[name]!=='function'||module[name].constructor.name==='AsyncFunction'))throw Error(name+' doit être une fonction synchrone.');
    fields=serializable(structuredClone(component.runtime.started||component.runtime.awakened?component.runtime.fields:{...(module.fields||{}),...(component.values||{})}));
   }catch(error){
    if(generation!==this.generation)return;if(component.enabled!==false)throw error;
    // A broken disabled component must not prevent the scene from opening.
    module={Awake(){throw error}};fields={};
   }
   const clock={delta:0,elapsed:0},context={...ctx},api=createScriptApi(entity,context,clock,component);
   const binding={entity,entities:ctx.entities,fields,Time:{get deltaTime(){return clock.delta},get time(){return clock.elapsed},fixedDeltaTime:.02},Input:{GetKey:key=>api.call('Input.GetKey',[key]),GetKeyDown:key=>api.call('Input.GetKeyDown',[key])},
    Move:(...args)=>api.call('Move',args),Rotate:(...args)=>api.call('Rotate',args),Log:value=>api.call('Log',[value]),Get:key=>api.call('Get',[key]),Set:(key,value)=>api.call('Set',[key,value]),Signal:key=>api.call('Signal',[key]),GetComponent:key=>entity[key],get enabled(){return component.enabled!==false},set enabled(value){api.write('enabled',value)},get isActiveAndEnabled(){return component.enabled!==false&&entity.enabled!==false}};
   binding.Animator=Object.fromEntries(['Play','SetFloat','SetInteger','SetBool','SetTrigger','ResetTrigger'].map(method=>[method,(...args)=>api.call('Animator.'+method,args)]));
   binding.gameObject={get name(){return String(entity.name||'')},get activeSelf(){return entity.enabled!==false},SetActive:value=>api.call('gameObject.SetActive',[value])};
   binding.transform={get position(){return api.read('transform.position')},set position(value){api.write('transform.position',value)},Translate:binding.Move,Rotate:binding.Rotate};
   const entry={entity,component,module,clock,context,binding,failed:false,attached:()=>context.entities.includes(entity)&&entity.webScripts?.includes(component)};entry.lifecycle=new ScriptLifecycle(entry,(hook,cleanup)=>this.invoke(entry,hook,cleanup));entries.push(entry);
  }
  if(generation===this.generation)this.instances=entries;
 }
 invoke(entry,hook,cleanup=false){if(entry.failed&&!cleanup)return;try{const method=hooks[hook].map(key=>entry.module[key]).find(f=>typeof f==='function');if(method){const result=method(entry.binding);if(result?.then)throw Error('Les méthodes de cycle de vie JS/TS doivent être synchrones.');}serializable(entry.binding.fields);entry.component.runtime.fields=structuredClone(entry.binding.fields)}catch(error){this.report(entry,error)}}
 phase(entry,method){try{if(method==='activation')entry.lifecycle.refresh();else if(method)entry.lifecycle.run(method);else entry.lifecycle.start()}catch(error){this.report(entry,error)}}
 update(dt,ctx){const delta=Math.min(.1,Math.max(0,Number(dt)||0));this.elapsed+=delta;this.fixed+=delta;
  this.instances=this.instances.filter(entry=>{Object.assign(entry.context,ctx);entry.binding.entities=ctx.entities;entry.clock.elapsed=this.elapsed;entry.clock.delta=delta;if(!entry.attached()){entry.lifecycle.dispose();return false}return true});
  for(const entry of this.instances)this.phase(entry,'activation');
  for(const entry of this.instances)this.phase(entry);
  while(this.fixed>=.02-1e-8){this.fixed-=.02;for(const entry of this.instances){entry.clock.delta=.02;this.phase(entry,'FixedUpdate')}}
  for(const entry of this.instances){entry.clock.delta=delta;this.phase(entry,'Update')}
 }
 late(){for(const entry of this.instances)this.phase(entry,'LateUpdate')}
 stop(){this.generation++;for(const entry of this.instances)entry.lifecycle.dispose();this.instances=[];this.elapsed=0;this.fixed=0;this.context=null;this.errors=[]}
}
export const webScriptRuntime=new WebScriptRuntime();
