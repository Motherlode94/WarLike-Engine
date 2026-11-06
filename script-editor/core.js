// Standalone data model. No engine, DOM, network or executable script evaluation.
export const MAX_SOURCE=1024*1024;
export const languages={js:'javascript',mjs:'javascript',ts:'typescript',tsx:'typescript',jsx:'javascript',cs:'csharp',py:'python',cpp:'cpp',cc:'cpp',c:'c',h:'cpp',hpp:'cpp',json:'json',html:'html',css:'css',md:'markdown',txt:'plaintext'};
export const languageFor=name=>languages[String(name).split('.').at(-1).toLowerCase()]||'plaintext';
export const newId=()=>globalThis.crypto?.randomUUID?.()||'script-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
export function validateScript(value){
 if(!value||typeof value.id!=='string'||!value.id||value.id.length>100)throw Error('Identifiant de script invalide.');
 if(typeof value.name!=='string'||!value.name.trim()||value.name.length>100||/[\\/\x00-\x1f]/.test(value.name))throw Error('Nom de fichier invalide.');
 if(typeof value.source!=='string'||value.source.length>MAX_SOURCE)throw Error('Script limité à 1 Mo de texte.');
 if(!Number.isSafeInteger(value.revision)||value.revision<0)throw Error('Révision de script invalide.');
 return {id:value.id,name:value.name,language:languageFor(value.name),source:value.source,revision:value.revision,updatedAt:Number.isFinite(value.updatedAt)?value.updatedAt:0};
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
 record(){return validateScript({id:this.id,name:this.name,source:this.source,revision:this.revision,updatedAt:this.updatedAt})}
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
function attachScript(entity,saved){if(!entity)return;entity.scripts=[...new Set([...(entity.scripts||[]),saved.id])];if(saved.language==='csharp')entity.csharpScript={name:saved.name.replace(/\.cs$/i,''),source:saved.source,scriptId:saved.id}}
export function applyScriptSave(project,payload,entity=null){
 const incoming=validateScript({...payload.script,revision:payload.baseRevision});
 project.scripts??=[];const existing=project.scripts.find(s=>s.id===incoming.id);
 if(existing&&existing.source===incoming.source&&existing.name===incoming.name){attachScript(entity,existing);return {ok:true,script:structuredClone(existing)}};
 if((existing?.revision||0)!==payload.baseRevision)return {ok:false,conflict:true,script:structuredClone(existing)};
 if(!existing&&project.scripts.length>=64)throw Error('64 scripts maximum par projet.');
 const saved={...incoming,revision:payload.baseRevision+1,updatedAt:Date.now()};
 if(existing)Object.assign(existing,saved);else project.scripts.push(saved);
 attachScript(entity,saved);
 return {ok:true,script:structuredClone(saved)};
}
export const templates={
 javascript:'// Script JavaScript — enregistré comme fichier source.\nexport function update(entity, deltaTime) {\n    // Écrire votre logique ici.\n}\n',
 typescript:'// Script TypeScript\nexport function update(entity: { x: number }, deltaTime: number): void {\n    // Écrire votre logique ici.\n}\n',
 csharp:'using WarLike.Runtime;\nusing System.Numerics;\n\npublic sealed class MyBehaviour : WarLikeBehaviour\n{\n    public float Speed { get; set; } = 2.5f;\n\n    public override void Update(float deltaTime)\n    {\n        Actor.Position += new Vector3(Speed * deltaTime, 0, 0);\n    }\n}\n',
 python:'# Script Python\ndef update(delta_time):\n    pass\n',cpp:'// Script C++\nvoid update(float deltaTime) {\n    // Écrire votre logique ici.\n}\n',plaintext:''
};
