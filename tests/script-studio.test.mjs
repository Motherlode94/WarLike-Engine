import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ScriptDocument,readLinkedFile,saveLinkedFile,applyScriptSave,validateScript,languageFor,MAX_SOURCE} from '../script-editor/core.js';
import {restoreGameProject,gameProject} from '../js/core/game-project.js';
const doc=(text='before')=>new ScriptDocument({id:'one',name:'movement.cs',source:text,revision:0});
function linked(document,text){
 const disk={text,writes:0};document.handle={name:document.name,async getFile(){return {size:disk.text.length,async text(){return disk.text}}},async createWritable(){return {async write(value){disk.writes++;disk.text=value},async close(){},async abort(){}}}};return disk;
}
test('a linked external save refreshes a clean document and its saved baseline',async()=>{
 const d=doc(),disk=linked(d,'before');disk.text='saved by VS Code';assert.equal(await readLinkedFile(d),'reloaded');assert.equal(d.text,disk.text);assert.equal(d.dirty,false);assert.equal(await readLinkedFile(d),'unchanged');
});
test('external edits preserve dirty buffers and offer explicit reload or keep-local resolutions',async()=>{
 for(const choice of ['reload','keep']){const d=doc();linked(d,'external');d.edit('my work');assert.equal(await readLinkedFile(d),'conflict');assert.equal(d.text,'my work');assert.equal(d.external,'external');d.resolve(choice);assert.equal(d.text,choice==='reload'?'external':'my work');assert.equal(d.dirty,choice==='keep');assert.equal(d.external,null)}
});
test('save checks the disk first and never overwrites unresolved external changes',async()=>{
 const d=doc(),disk=linked(d,'outside');d.edit('inside');await assert.rejects(saveLinkedFile(d),/changé ailleurs/);assert.equal(disk.writes,0);assert.equal(d.text,'inside');assert.equal(d.saving,false);d.resolve('keep');await saveLinkedFile(d);assert.equal(disk.text,'inside');assert.equal(d.dirty,false);
});
test('a denied write retains the unsaved source and releases the save lock',async()=>{
 const d=doc();linked(d,'before');d.edit('new code');d.handle.createWritable=async()=>{throw Error('Permission denied')};await assert.rejects(saveLinkedFile(d),/Permission denied/);assert.equal(d.dirty,true);assert.equal(d.baseText,'before');assert.equal(d.saving,false);
});
test('text typed during a file write remains dirty after the previous snapshot was saved',async()=>{
 const d=doc();linked(d,'before');d.edit('snapshot');let release,started;
 const ready=new Promise(resolve=>started=resolve);d.handle.createWritable=async()=>({async write(){started();await new Promise(resolve=>release=resolve)},async close(){}});
 const saving=saveLinkedFile(d);await ready;d.edit('newer typing');release();assert.equal(await saving,'snapshot');assert.equal(d.baseText,'snapshot');assert.equal(d.text,'newer typing');assert.equal(d.dirty,true);
});
test('lost file access cannot clear a buffer or pretend the file was saved',async()=>{
 const d=doc();d.edit('precious');d.handle={async getFile(){throw Error('File removed')}};await assert.rejects(readLinkedFile(d),/removed/);await assert.rejects(saveLinkedFile(d),/removed/);assert.equal(d.text,'precious');assert.equal(d.dirty,true);
});
test('project saves use revisions, reject stale changes and deduplicate retransmitted messages',()=>{
 const project={scripts:[]},entity={id:1};const payload={baseRevision:0,script:{id:'one',name:'movement.cs',source:'first'}};
 const first=applyScriptSave(project,payload,entity);assert.equal(first.script.revision,1);assert.equal(entity.csharpScript.source,'first');assert.deepEqual(entity.scripts,['one']);
 assert.equal(applyScriptSave(project,payload,entity).script.revision,1);
 const stale=applyScriptSave(project,{...payload,script:{...payload.script,source:'stale'}});assert.equal(stale.ok,false);assert.equal(project.scripts[0].source,'first');
 const second=applyScriptSave(project,{baseRevision:1,script:{...payload.script,source:'new version'}},entity);assert.equal(second.script.revision,2);assert.equal(entity.csharpScript.source,'new version');
});
test('attaching an already-saved script still links the selected GameObject',()=>{
 const project={scripts:[]},payload={baseRevision:0,script:{id:'one',name:'movement.cs',source:'first'}};applyScriptSave(project,payload);const entity={id:2};applyScriptSave(project,payload,entity);assert.equal(entity.csharpScript.scriptId,'one');
});
test('script libraries survive project export/restore without aliasing source records',()=>{
 const source={scripts:[{id:'one',name:'main.ts',source:'let score = 1;',revision:3,updatedAt:1}]};restoreGameProject(JSON.parse(JSON.stringify(source)));assert.equal(gameProject.scripts[0].source,source.scripts[0].source);assert.equal(gameProject.scripts[0].revision,3);gameProject.scripts[0].source='changed';assert.equal(source.scripts[0].source,'let score = 1;');restoreGameProject({});
});
test('unsafe filenames, oversized sources and invalid revision numbers are rejected',()=>{
 for(const name of ['../outside.cs','dir/file.js','C:\\script.cs','\0bad'])assert.throws(()=>validateScript({id:'one',name,source:'',revision:0}),/Nom/);
 assert.throws(()=>validateScript({id:'one',name:'a.js',source:'a'.repeat(MAX_SOURCE+1),revision:0}),/limité/);assert.throws(()=>validateScript({id:'one',name:'a.js',source:'',revision:-1}),/Révision/);assert.equal(languageFor('Player.cs'),'csharp');assert.equal(languageFor('main.ts'),'typescript');
});
test('standalone entry and editor modules are included in the playable export manifest',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../runtime-files.json',import.meta.url),'utf8')).files;
 for(const name of ['script-editor/index.html','script-editor/app.js','script-editor/core.js','script-editor/style.css','js/ui/script-studio.js'])assert.ok(manifest.includes(name),name);
 const app=readFileSync(new URL('../script-editor/app.js',import.meta.url),'utf8');assert.doesNotMatch(app,/\beval\s*\(|new Function\s*\(/);
});
