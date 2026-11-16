import {scriptWorkerMain} from './web-script-worker.js';
import {authorizeScripts} from './script-trust.js';
import {createScriptApi} from './war-script-runtime.js';

const scalars=['x','y','elevation3d','rotation','rotationX3d','rotationY3d','rotationZ3d','hp','lightIntensity','enabled','visible','lightEnabled'];
const forbidden=new Set(['__proto__','constructor','prototype']);
export function boundedScriptData(value,limit=65536){
 let count=0;const seen=new Set();
 function visit(v,depth){if(++count>8192||depth>10)throw Error('Données JS/TS trop complexes.');if(v===null||typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=1e8||typeof v==='string'&&v.length<=4096)return;if(!v||typeof v!=='object'||seen.has(v)||Object.keys(v).length>2048)throw Error('Données JS/TS invalides.');seen.add(v);for(const [k,item] of Object.entries(v)){if(forbidden.has(k))throw Error('Champ JS/TS réservé.');visit(item,depth+1)}seen.delete(v)}
 visit(value,0);if(JSON.stringify(value).length>limit)throw Error('Données JS/TS trop volumineuses.');return value;
}
// Deliberately excludes asset blobs, project settings, credentials and source records.
function entitySnapshot(e){const value={id:e.id,name:String(e.name||'').slice(0,200),type:String(e.type||'').slice(0,80)};for(const k of scalars)if(e[k]!==undefined)value[k]=e[k];for(const k of ['w','h','stats','controller2d','rigidbody3d'])if(e[k]!==undefined)try{value[k]=structuredClone(boundedScriptData(e[k],8192))}catch{}return value}
export function validateScriptReply(reply,entries){
 if(!reply||!Array.isArray(reply.commands)||reply.commands.length>1024||!Array.isArray(reply.states)||reply.states.length>entries.length)throw Error('Réponse du sandbox invalide.');
 boundedScriptData(reply,256*1024);const seen=new Set();
 for(const s of reply.states){if(!Number.isInteger(s.index)||!entries[s.index]||seen.has(s.index)||typeof s.error!=='string'||typeof s.started!=='boolean'||typeof s.awakened!=='boolean')throw Error('État du sandbox invalide.');seen.add(s.index);boundedScriptData(s.fields,16384)}
 const calls=new Set(['Move','Rotate','Log','Get','Set','Signal','gameObject.SetActive','Animator.Play','Animator.SetFloat','Animator.SetInteger','Animator.SetBool','Animator.SetTrigger','Animator.ResetTrigger']);
 for(const c of reply.commands){if(!Number.isInteger(c.index)||!entries[c.index]||!Array.isArray(c.args)||c.args.length>3)throw Error('Commande JS/TS invalide.');if(c.op==='entity'){if(!scalars.includes(c.name)||c.args.length!==1)throw Error('Propriété JS/TS interdite : '+c.name);const value=c.args[0];if(['enabled','visible','lightEnabled'].includes(c.name)?typeof value!=='boolean':typeof value!=='number'||!Number.isFinite(value)||Math.abs(value)>1e8)throw Error('Valeur JS/TS invalide.');}else if(c.op==='write'){if(!['enabled','transform.position'].includes(c.name)||c.args.length!==1)throw Error('Écriture JS/TS interdite.');}else if(c.op!=='call'||!calls.has(c.name))throw Error('Capacité JS/TS interdite.');}
 return reply;
}
// The iframe has an opaque origin (NO allow-same-origin). Its Worker inherits a
// deny-by-default CSP. Only the private MessagePort reaches the editor.
function sandboxDocumentMain(){
 addEventListener('message',event=>{
  if(event.source!==parent||!event.ports[0])return;
  const port=event.ports[0],worker=new Worker(URL.createObjectURL(new Blob([event.data],{type:'text/javascript'})));let expected=null,ready=false;
  const fail=()=>{worker.terminate();port.postMessage({fatal:'Message du Worker hors limites.'})};
  worker.onmessage=event=>{
   const data=event.data;if(data?.ready===true&&!ready){ready=true;port.postMessage({ready:true});return}
   if(expected===null||data?.id!==expected)return;
   // Bound the data BEFORE forwarding it across the editor boundary. Walk
   // incrementally; do not stringify an unbounded user-generated object.
   let count=0,total=0;
   function valid(value,depth=0){
    if(++count>8192||depth>10)return false;
    if(typeof value==='string'){total+=value.length+2;return value.length<=4096&&total<=262144}
    if(value===null||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value)){total+=24;return total<=262144}
    if(!value||typeof value!=='object'||Array.isArray(value)&&value.length>2048||!Array.isArray(value)&&Object.getPrototypeOf(value)!==Object.prototype)return false;
    const keys=Object.keys(value);if(keys.length>2048)return false;
    for(const key of keys){total+=key.length+4;if(total>262144||['__proto__','constructor','prototype'].includes(key)||!valid(value[key],depth+1))return false}return true;
   }
   if(!valid(data)||JSON.stringify(data).length>262144){fail();return}
   expected=null;port.postMessage(data);
  };
  worker.onerror=fail;
  port.onmessage=event=>{if(event.data.terminate){worker.terminate();port.close()}else{expected=event.data.id;worker.postMessage(event.data)}};port.start();
 },{once:true});
}
const bootstrap='('+sandboxDocumentMain.toString()+')()';

export class IsolatedWebScripts{
 constructor(){this.entries=[];this.sequence=0;this.pending=null;this.generation=0;this.errors=[];this.active=false}
 async prepare(ctx,records){
  this.stop();const generation=this.generation;this.ctx=ctx;
  const entries=[];
  for(const [entityIndex,e] of ctx.entities.entries())for(const c of e.webScripts||[])if(c.enabled!==false&&e.enabled!==false){entries.push({entity:e,component:c,entityIndex,source:records(c,ctx.project)})}
  if(!entries.length)return;
  for(const e of entries)if(typeof e.source!=='string'||e.source.length>1024*1024)throw Error('Script limité à 1 Mo.');
  if(entries.length>64)throw Error('64 composants JS/TS actifs maximum.');
  await authorizeScripts(entries.map(e=>({project:ctx.project?.id||'',id:e.component.scriptId,source:e.source})));
  if(generation!==this.generation)return;
  this.entries=entries;this.iframe=document.createElement('iframe');this.iframe.hidden=true;this.iframe.sandbox='allow-scripts';this.iframe.title='Scripts du jeu isolés';
  this.iframe.srcdoc=`<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' blob:; worker-src blob:; connect-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'"><script>${bootstrap}<\/script>`;
  const channel=new MessageChannel();this.port=channel.port1;
  const ready=new Promise((resolve,reject)=>{
   this.readyReject=reject;this.readyTimer=setTimeout(()=>reject(Error('Initialisation du sandbox expirée.')),5000);
   this.port.onmessage=event=>{const data=event.data;if(data?.ready){clearTimeout(this.readyTimer);this.readyReject=null;resolve();return}if(data?.fatal){this.fail(Error(data.fatal));return}const p=this.pending;if(!p||data?.id!==p.id)return;this.pending=null;clearTimeout(p.timer);if(data.ok!==true)p.reject(Error(String(data.error||'Script isolé interrompu.')));else p.resolve(data)};
  });
  this.iframe.onload=()=>this.iframe?.contentWindow.postMessage('('+scriptWorkerMain.toString()+')()','*',[channel.port2]);document.body.append(this.iframe);
  try{await ready;if(generation!==this.generation)return;const payload=this.snapshot();payload.scripts=entries.map((e,index)=>({index,entityIndex:e.entityIndex,source:e.source,enabled:e.component.enabled!==false,values:e.component.values||{},fields:e.component.runtime?.fields||{},started:e.component.runtime?.started===true,awakened:e.component.runtime?.awakened===true}));const result=await this.request('prepare',payload,5000);if(generation===this.generation){this.apply(result);this.active=true}}catch(error){this.stop();throw error}
 }
 snapshot(dt=0){return {mode:this.ctx.mode,dt,entities:this.ctx.entities.map(entitySnapshot),globals:structuredClone(boundedScriptData(this.ctx.globals||{},16384)),keys:[...(this.ctx.keys||[])],pressedKeys:[...(this.ctx.pressedKeys||[])],enabled:this.entries.map(e=>this.ctx.entities.includes(e.entity)&&e.entity.webScripts?.includes(e.component)?{enabled:e.component.enabled!==false}:null)}}
 request(type,payload,timeout=2000){if(this.pending)return Promise.reject(Error('Une image JS/TS est déjà en cours.'));return new Promise((resolve,reject)=>{const id=++this.sequence,timer=setTimeout(()=>{this.pending=null;reject(Error('Délai JS/TS dépassé : Worker arrêté.'))},timeout);this.pending={id,resolve,reject,timer};this.port.postMessage({id,type,payload})})}
 apply(reply){
  validateScriptReply(reply,this.entries);
  for(const c of reply.commands){const e=this.entries[c.index];if((!this.ctx.entities.includes(e.entity)||!e.entity.webScripts?.includes(e.component))&&!(c.op==='call'&&['Set','Signal','Log'].includes(c.name)))continue;const api=createScriptApi(e.entity,this.ctx,{delta:this.dt||0,elapsed:0},e.component);if(c.op==='entity')e.entity[c.name]=c.args[0];else if(c.op==='write')api.write(c.name,c.args[0]);else api.call(c.name,c.args)}
  for(const s of reply.states){const c=this.entries[s.index].component;c.runtime={...c.runtime,fields:s.fields,started:s.started,awakened:s.awakened,error:s.error};if(s.error){if(this.errors.at(-1)!==s.error){this.errors.push(s.error);if(this.errors.length>64)this.errors.shift();this.ctx.log?.(s.error,'error',this.entries[s.index].entity)}}}
 }
 async phase(type,dt,ctx,{canApply=()=>true}={}){
  if(!this.active)return null;this.ctx=ctx;
  if(this.held){if(!canApply())return null;const ready=this.held;this.held=null;this.dt=ready.dt;this.apply(ready.reply);if(ready.type===type)return {dt:ready.dt,reused:true}}
  this.dt=Math.min(.1,Math.max(0,Number(dt)||0));const generation=this.generation;
  try{const reply=await this.request(type,this.snapshot(this.dt));if(generation!==this.generation)return null;validateScriptReply(reply,this.entries);if(!canApply()){this.held={type,dt:this.dt,reply};return null}this.apply(reply);return {dt:this.dt,reused:false}}
  catch(error){if(generation===this.generation){this.fail(error);throw error}if(this.failure)throw this.failure;return null}
 }

 fail(error){this.failure=error;this.errors.push(error.message);for(const e of this.entries){e.component.runtime??={};e.component.runtime.error=error.message}this.stop()}
 stop(){this.generation++;this.active=false;this.held=null;clearTimeout(this.readyTimer);this.readyReject?.(Error('Initialisation JS/TS annulée.'));this.readyReject=null;if(this.pending){clearTimeout(this.pending.timer);this.pending.reject(Error('Image JS/TS annulée.'));this.pending=null}this.port?.postMessage({terminate:true});this.port?.close();this.iframe?.remove();this.port=null;this.iframe=null;this.entries=[];}
}
