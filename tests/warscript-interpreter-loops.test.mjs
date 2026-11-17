import test from 'node:test';
import assert from 'node:assert/strict';
import {compileWarScript,createWarScriptInstance} from '../script-editor/warscript.js';
import {convertWarScriptToCSharp} from '../script-editor/warscript-to-csharp.js';

const compile=source=>{const program=compileWarScript(source);assert.equal(program.ok,true,JSON.stringify(program.diagnostics));return program};
test('while loops execute deterministic bounded iterations and preserve local values',()=>{
 const program=compile('public class Steps : MonoBehaviour { public int steps=0; void Update(){ while(steps < 7){ steps++; } } }');
 const instance=createWarScriptInstance(program,{});
 instance.run('Update');assert.equal(instance.fields.steps,7);
 instance.run('Update');assert.equal(instance.fields.steps,7);
});
test('while loops are bounded even when body is empty and return an exact source location',()=>{
 const instance=createWarScriptInstance(compile('Update(){ while(true){} }'),{});
 assert.throws(()=>instance.run('Update'),e=>/Budget d.exécution dépassé/.test(e.message)&&e.line===1&&e.column>0);
});
test('while loops can return without continuing and local declarations are scoped',()=>{
 const program=compile('public int number=0; Update(){ while(number < 10){ number++; if(number == 3){ return; } } }');
 const instance=createWarScriptInstance(program,{});
 instance.run('Update');assert.equal(instance.fields.number,3);
});
test('undefined fields and non-boolean condition diagnostics are not silently accepted',()=>{
 const program=compileWarScript('Update(){ while(neverDeclared < 5){} }');
 assert.equal(program.ok,false);assert.match(program.diagnostics[0].message,/inconnue/);
});
test('WarScript loops convert to native C# with a finite iteration guard',()=>{
 const result=convertWarScriptToCSharp('public int steps=0; Update(){ while(steps < 5){ steps++; } }');
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 assert.match(result.source,/int __warLikeLoopBudget = 4096;/);
 assert.match(result.source,/while \(\(steps < 5\)\)/);
 assert.match(result.source,/if \(--__warLikeLoopBudget < 0\) throw new InvalidOperationException/);
});
test('nested loops in conditional blocks carry the same safety budget in C#',()=>{
 const result=convertWarScriptToCSharp('public int steps=0; Update(){ if(steps<5){ while(steps < 5){ steps++; } } }');
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 assert.equal((result.source.match(/int __warLikeLoopBudget = 4096;/g)||[]).length,1);
});
