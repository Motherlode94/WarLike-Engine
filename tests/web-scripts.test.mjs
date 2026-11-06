import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {WebScriptRuntime,inspectWebScripts,webScriptCode} from '../js/core/web-script-runtime.js';
import {ScriptDocument,applyScriptSave,validateScript,templates} from '../script-editor/core.js';
import {freshGameProject} from '../js/core/game-project.js';
import {prepareGameDefinition} from '../js/core/game-build.js';
const load=source=>import('data:text/javascript,'+encodeURIComponent(source)+'#'+Math.random());
const entity=(source=templates.javascript,language='javascript')=>({id:1,name:'Scripted',type:'object',color:'#ffffff',x:0,y:0,w:32,h:32,rotation:0,webScripts:[{scriptId:'js',name:language==='typescript'?'Script.ts':'Script.js',language,source,enabled:true,values:{}}]});
const context=entities=>({entities,mode:'2d',project:{scripts:[]},keys:new Set(),pressedKeys:new Set(),globals:{},log(){},signal(){}});

test('JavaScript modules execute real lifecycle functions against the shared entity and globals',async()=>{
 const e=entity('export const fields={count:0}; export function Start(ctx){ctx.fields.count++;} export function FixedUpdate(ctx){ctx.Set("fixed",ctx.Get("fixed")+1);} export function Update(ctx){ctx.entity.x+=2;ctx.Rotate(3);ctx.fields.count++;} export function LateUpdate(ctx){ctx.Set("late",ctx.entity.rotation);} export function OnDestroy(ctx){ctx.Set("destroyed",1);}');
 const ctx=context([e]),runtime=new WebScriptRuntime({load});await runtime.prepare(ctx);runtime.update(.04,ctx);runtime.late();assert.equal(e.x,2);assert.equal(e.rotation,3);assert.equal(ctx.globals.fixed,2);assert.equal(ctx.globals.late,3);assert.equal(e.webScripts[0].runtime.fields.count,2);runtime.stop();assert.equal(ctx.globals.destroyed,1);
});
test('JavaScript fields are per-object while module code may be shared',async()=>{
 const a=entity('export const fields={count:0}; export function Update(ctx){ctx.fields.count++;}'),b=structuredClone(a);b.id=2;b.webScripts[0].values.count=8;const ctx=context([a,b]),runtime=new WebScriptRuntime({load});await runtime.prepare(ctx);runtime.update(.02,ctx);assert.equal(a.webScripts[0].runtime.fields.count,1);assert.equal(b.webScripts[0].runtime.fields.count,9);
});
test('JS/TS callback errors isolate a component and async lifecycle methods are rejected',async()=>{
 const a=entity('export function Update(){throw Error("bad component")}'),b=entity();b.id=2;const ctx=context([a,b]),runtime=new WebScriptRuntime({load});await runtime.prepare(ctx);runtime.update(.1,ctx);assert.match(a.webScripts[0].runtime.error,/bad component/);assert.equal(b.rotation,4.5);runtime.stop();await assert.rejects(runtime.prepare(context([entity('export async function Update(){}')])),/synchrone/);
});
test('stopping during module load never starts or installs a stale component',async()=>{
 let resolve;const e=entity(),runtime=new WebScriptRuntime({load:()=>new Promise(r=>resolve=r)}),pending=runtime.prepare(context([e]));runtime.stop();resolve({Start(){throw Error('Stale Start')}});await pending;assert.equal(runtime.instances.length,0);assert.notEqual(e.webScripts[0].runtime?.started,true);
});
test('real TypeScript emit is retained with its exact source and runs in the Web runtime',async()=>{
 const source=templates.typescript,emitted=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 const record=validateScript({id:'ts',name:'Script.ts',source,revision:1,compiledFrom:source,compiledSource:emitted});assert.equal(record.language,'typescript');assert.doesNotMatch(record.compiledSource,/type ScriptContext/);
 const project={scripts:[]},e=entity(source,'typescript');e.webScripts=[];applyScriptSave(project,{baseRevision:0,script:record},e);const doc=new ScriptDocument(project.scripts[0]);assert.equal(doc.record().compiledSource,emitted);
 const ctx={...context([e]),project},runtime=new WebScriptRuntime({load});await runtime.prepare(ctx);runtime.update(.1,ctx);assert.equal(e.rotation,4.5);
 const changed={...record,source:source+'\n// saved outside'};assert.equal(validateScript(changed).compiledSource,undefined);assert.throws(()=>webScriptCode(validateScript(changed)),/TypeScript modifié/);
});
test('export includes executable JS and compiled TS; stale TypeScript blocks before publication',()=>{
 const e=entity(templates.typescript,'typescript'),project=freshGameProject();e.type='player';assert.ok(inspectWebScripts([e],project).length);assert.throws(()=>prepareGameDefinition({entities:[e],project,mode:'2d'}),/TypeScript modifié/);
 Object.assign(e.webScripts[0],{compiledFrom:e.webScripts[0].source,compiledSource:'export function Update(ctx){ctx.Rotate(1)}'});assert.deepEqual(inspectWebScripts([e],project),[]);const built=prepareGameDefinition({entities:[e],project,mode:'2d'});assert.equal(built.project.scenes[0].entities[0].webScripts[0].compiledSource,e.webScripts[0].compiledSource);
});
test('external source saves invalidate TypeScript artifacts until the next compilation',()=>{
 const source='export const x: number = 1;',d=new ScriptDocument({id:'ts',name:'Script.ts',source,revision:1,compiledSource:'export const x=1;',compiledFrom:source});d.externalSave(source+'\n// changed');assert.equal(d.record().compiledSource,undefined);
});
