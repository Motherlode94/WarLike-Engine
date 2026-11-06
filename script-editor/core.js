import {warScriptTemplate} from './warscript.js';
// Standalone data model. No engine, DOM, network or executable script evaluation.
export const MAX_SOURCE=1024*1024;
export const languages={wls:'warscript',js:'javascript',mjs:'javascript',ts:'typescript',tsx:'typescript',jsx:'javascript',cs:'csharp',py:'python',cpp:'cpp',cc:'cpp',c:'c',h:'cpp',hpp:'cpp',json:'json',html:'html',css:'css',md:'markdown',txt:'plaintext'};
export const languageFor=name=>languages[String(name).split('.').at(-1).toLowerCase()]||'plaintext';
export const newId=()=>globalThis.crypto?.randomUUID?.()||'script-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
export function validateScript(value){
 if(!value||typeof value.id!=='string'||!value.id||value.id.length>100)throw Error('Identifiant de script invalide.');
 if(typeof value.name!=='string'||!value.name.trim()||value.name.length>100||/[\\/\x00-\x1f]/.test(value.name))throw Error('Nom de fichier invalide.');
 if(typeof value.source!=='string'||value.source.length>MAX_SOURCE)throw Error('Script limité à 1 Mo de texte.');
 if(!Number.isSafeInteger(value.revision)||value.revision<0)throw Error('Révision de script invalide.');
 return {id:value.id,name:value.name,language:languageFor(value.name),source:value.source,...(value.compiledFrom===value.source&&typeof value.compiledSource==='string'&&value.compiledSource.length<=MAX_SOURCE?{compiledFrom:value.compiledFrom,compiledSource:value.compiledSource}:{}),revision:value.revision,updatedAt:Number.isFinite(value.updatedAt)?value.updatedAt:0};
}
export class ScriptDocument {
 constructor(record){const r=validateScript(record);Object.assign(this,r);this.text=r.source;this.baseText=r.source;this.external=null;this.handle=null;this.saving=false}
 get dirty(){return this.text!==this.baseText}
 edit(text){if(typeof text!=='string'||text.length>MAX_SOURCE)throw Error('Script limité à 1 Mo.');this.text=text}
 externalSave(text){
  if(typeof text!=='string'||text.length>MAX_SOURCE)throw Error('Fichier externe trop volumineux.');
  if(text===this.baseText){this.external=null;return 'unchanged'}
  if(this.dirty&&text!==this.text){this.external=text;return 'conflict'}
  this.text=text;this.baseText=text;this.source=text;this.external=null;return 'reloaded';
 }
 resolve(choice){if(this.external===null)return;const text=this.external;this.external=null;this.baseText=text;this.source=text;if(choice==='reload')this.text=text;else if(choice!=='keep')throw Error('Résolution inconnue.')}
 committed(text){this.source=text;this.baseText=text;this.external=null;this.updatedAt=Date.now()}
 record(){return validateScript({id:this.id,name:this.name,source:this.source,compiledFrom:this.compiledFrom,compiledSource:this.compiledSource,revision:this.revision,updatedAt:this.updatedAt})}
}
export async function readLinkedFile(doc){
 if(!doc.handle)return 'unlinked';const file=await doc.handle.getFile();
 if(file.size>MAX_SOURCE*4)throw Error('Fichier externe trop volumineux.');
 return doc.externalSave(await file.text());
}
export async function saveLinkedFile(doc){
 if(doc.saving)throw Error('Une sauvegarde est déjà en cours.');
 if(doc.external!==null)throw Error('Résous le conflit avant de sauvegarder.');
 doc.saving=true;let stream=null;
 try{
  if(doc.handle){const status=await readLinkedFile(doc);if(status==='conflict')throw Error('Le fichier a changé ailleurs. Choisis quelle version conserver.');}
  const text=doc.text;
  if(doc.handle){stream=await doc.handle.createWritable({mode:'exclusive'});await stream.write(text);await stream.close();stream=null}
  doc.committed(text);return text;
 }catch(error){if(stream)try{await stream.abort()}catch{}throw error}
 finally{doc.saving=false}
}
function canAttachScript(entity,saved){if(['javascript','typescript'].includes(saved.language)&&entity&&!(entity.webScripts||[]).some(c=>c.scriptId===saved.id)&&(entity.webScripts?.length||0)>=8)throw Error('8 scripts JS/TS maximum par objet.');if(saved.language==='warscript'&&entity&&!(entity.warScripts||[]).some(c=>c.scriptId===saved.id)&&(entity.warScripts?.length||0)>=8)throw Error('8 WarScripts maximum par objet.');}
function attachScript(entity,saved){if(!entity)return;canAttachScript(entity,saved);if(!['javascript','typescript'].includes(saved.language)&&entity.webScripts)entity.webScripts=entity.webScripts.filter(c=>c.scriptId!==saved.id);if(saved.language!=='csharp'&&entity.csharpScript?.scriptId===saved.id)delete entity.csharpScript;if(saved.language!=='warscript'&&entity.warScripts)entity.warScripts=entity.warScripts.filter(c=>c.scriptId!==saved.id);entity.scripts=[...new Set([...(entity.scripts||[]),saved.id])];if(['javascript','typescript'].includes(saved.language)){entity.webScripts??=[];let component=entity.webScripts.find(c=>c.scriptId===saved.id);if(!component){component={scriptId:saved.id,enabled:true,values:{}};entity.webScripts.push(component)}Object.assign(component,{name:saved.name,source:saved.source,language:saved.language,compiledSource:saved.compiledSource,compiledFrom:saved.compiledFrom});delete component.runtime;}if(saved.language==='warscript'){entity.warScripts??=[];let component=entity.warScripts.find(c=>c.scriptId===saved.id);if(!component){if(entity.warScripts.length>=8)throw Error('8 WarScripts maximum par objet.');component={scriptId:saved.id,enabled:true,values:{}};entity.warScripts.push(component)}Object.assign(component,{name:saved.name,source:saved.source});delete component.runtime;}if(saved.language==='csharp')entity.csharpScript={...entity.csharpScript,name:saved.name.replace(/\.cs$/i,''),source:saved.source,scriptId:saved.id}}
export function applyScriptSave(project,payload,entity=null){
 const incoming=validateScript({...payload.script,revision:payload.baseRevision});
 canAttachScript(entity,incoming);project.scripts??=[];const existing=project.scripts.find(s=>s.id===incoming.id);
 if(existing&&existing.source===incoming.source&&existing.name===incoming.name&&existing.compiledSource===incoming.compiledSource){attachScript(entity,existing);return {ok:true,script:structuredClone(existing)}};
 if((existing?.revision||0)!==payload.baseRevision)return {ok:false,conflict:true,script:structuredClone(existing)};
 if(!existing&&project.scripts.length>=64)throw Error('64 scripts maximum par projet.');
 const saved={...incoming,revision:payload.baseRevision+1,updatedAt:Date.now()};
 if(existing)Object.assign(existing,saved);else project.scripts.push(saved);
 attachScript(entity,saved);
 return {ok:true,script:structuredClone(saved)};
}
export const templates={warscript:warScriptTemplate,
 javascript:'// JavaScript natif · champs propres à chaque objet\nexport const fields = { speed: 45 };\n\nexport function Start(ctx) { ctx.Log("JavaScript prêt"); }\n\nexport function Update(ctx) {\n    ctx.Rotate(ctx.fields.speed * ctx.Time.deltaTime);\n}\n',
 typescript:'// TypeScript · compilé en JavaScript avant Play/export\ntype ScriptContext = { fields: { speed: number }; Time: { deltaTime: number }; Rotate(angle: number): void; Log(value: unknown): void; };\nexport const fields = { speed: 45 };\nexport function Start(ctx: ScriptContext) { ctx.Log("TypeScript prêt"); }\nexport function Update(ctx: ScriptContext) {\n    ctx.Rotate(ctx.fields.speed * ctx.Time.deltaTime);\n}\n',
 csharp:'using WarLike.Runtime;\nusing System.Numerics;\n\npublic sealed class MyBehaviour : MonoBehaviour\n{\n    public float Speed = 45f;\n\n    void Start()\n    {\n        Debug.Log("MonoBehaviour C# natif prêt.");\n    }\n\n    void Update()\n    {\n        transform.Rotate(0, Speed * Time.deltaTime, 0);\n    }\n}\n',
 python:'# Script Python\ndef update(delta_time):\n    pass\n',cpp:'// Script C++\nvoid update(float deltaTime) {\n    // Écrire votre logique ici.\n}\n',plaintext:''
};

export function templateFor(name){
 const language=languageFor(name);let source=templates[language]||'';
 if(language==='csharp'){
  const parts=name.replace(/\.cs$/i,'').split('.');
  if(parts.some(part=>!/^[A-Za-z_][A-Za-z0-9_]*$/.test(part)))throw Error('Utilise un nom de classe C# valide, par exemple Player.cs.');
  source=source.replace(/\bMyBehaviour\b/g,parts.at(-1));
  if(parts.length>1)source=source.replace('public sealed class','namespace '+parts.slice(0,-1).join('.')+';\n\npublic sealed class');
 }
 return source;
}
