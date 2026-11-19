import test from 'node:test';import assert from 'node:assert/strict';
import {convertCSharpToWarScript} from '../script-editor/csharp-to-warscript.js';
import {createCSharpWebCopy} from '../js/core/csharp-web-copy.js';
import {WarScriptRuntime} from '../js/core/war-script-runtime.js';
import {prepareGameDefinition} from '../js/core/game-build.js';
import {freshGameProject} from '../js/core/game-project.js';
const source='using System; using WarLike.Runtime; public sealed class Walker : MonoBehaviour { public float speed=2; float Distance(float dt){return speed*dt;} void Update(){for(int i=0;i<2;i++){transform.Translate(Distance(Time.deltaTime),0,0);}}}';
const entity=()=>({id:1,type:'player',name:'Player',x:0,y:0,w:32,h:64,color:'#ffffff',csharpScript:{name:'Walker',source,values:{speed:3},enabled:true}});
test('C# gameplay source creates an explicit Web copy with original preserved and actual exported execution',()=>{
 const before=entity(),project=freshGameProject();project.runtimeBackend='native';const snapshot=structuredClone({before,project});
 const copied=createCSharpWebCopy(before,project);assert.deepEqual({before,project},snapshot);assert.equal(copied.entity.csharpScript.source,source);assert.equal(copied.entity.csharpScript.enabled,false);
 const definition=prepareGameDefinition({entities:[copied.entity],project:copied.project,mode:'2d'});const items=JSON.parse(JSON.stringify(definition.project.scenes[0].entities));
 const runtime=new WarScriptRuntime();runtime.update(.1,{entities:items,project:definition.project,mode:'2d',globals:{},keys:new Set()});assert.equal(runtime.errors.length,0);assert.ok(Math.abs(items[0].x-38.4)<1e-8);runtime.stop();
});
test('conversion rejects unsupported imports, APIs, C# constructs and malformed code without partial writes',()=>{
 for(const src of ['using System.IO; public class A:MonoBehaviour {void Update(){}}','public class A:MonoBehaviour {void Update(){File.Delete("x");}}','public class A:MonoBehaviour {void Update(){Signal("x");}}','public class A:MonoBehaviour {Update(){}}','public class A:MonoBehaviour {void Update(){try{}catch{}}}'])assert.equal(convertCSharpToWarScript(src).ok,false,src);
 const e=entity(),p=freshGameProject();e.csharpScript.source='bad source';const copy=structuredClone({e,p});assert.throws(()=>createCSharpWebCopy(e,p));assert.deepEqual({e,p},copy);
});
test('tokens in strings and comments are never rewritten or evaluated as C# code',()=>{
 const result=convertCSharpToWarScript('using WarLike.Runtime; public class A:MonoBehaviour { void Update(){Debug.Log("using System.IO; MathF.Sin transform.eulerAngles.X"); /* File.Delete */}}');assert.equal(result.ok,true);assert.match(result.source,/"using System.IO; MathF.Sin transform.eulerAngles.X"/);
});
