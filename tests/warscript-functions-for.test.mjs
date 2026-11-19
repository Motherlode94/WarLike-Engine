import test from 'node:test';
import assert from 'node:assert/strict';
import {compileWarScript,createWarScriptInstance} from '../script-editor/warscript.js';
import {convertWarScriptToCSharp} from '../script-editor/warscript-to-csharp.js';
const instance=source=>{const p=compileWarScript(source);assert.equal(p.ok,true,JSON.stringify(p.diagnostics));return createWarScriptInstance(p,{})};
test('typed methods receive isolated parameters, return values and recurse within a shared budget',()=>{
 const i=instance('public int result=0; int Sum(int count){ if(count<=0){return 0;} return count+Sum(count-1); } void Update(){ result=Sum(5); }');
 i.run('Update');assert.equal(i.fields.result,15);
});
test('for continue executes update, break exits nearest loop and locals do not leak',()=>{
 const i=instance('public int total=0; Update(){ for(int n=0;n<8;n++){if(n==2){continue;} if(n==6){break;} total+=n;} }');i.run('Update');assert.equal(i.fields.total,13);
 const bad=compileWarScript('Update(){ for(int n=0;n<1;n++){} Log(n); }');assert.equal(bad.ok,false);
});
test('nested loop controls preserve enclosing loop and method returns',()=>{
 const i=instance('public int total=0; int Work(int count){for(int i=0;i<count;i++){for(int j=0;j<4;j++){if(j==1){break;} total++;} if(i==2){return total;}} return total;} Update(){total=Work(4);}');i.run('Update');assert.equal(i.fields.total,3);
});
test('empty for and recursion have hard execution bounds',()=>{
 assert.throws(()=>instance('Update(){for(;;){continue;}}').run('Update'),/Budget/);
 assert.throws(()=>instance('int Recur(int a){return Recur(a);} Update(){Recur(1);}').run('Update'),/Profondeur/);
});
test('method types, arity, lifecycle signatures and loop control are diagnosed',()=>{
 for(const src of ['int Twice(int n){return n*2;} Update(){Twice();}','Update(){break;}','Update(){continue;}','void Update(int n){}','int Missing(int n){if(n>0){return n;}}','int F(int n){return;}'])assert.equal(compileWarScript(src).ok,false,src);
 assert.throws(()=>instance('int F(int n){return n;} Update(){F("bad");}').run('Update'),/int/);
});
test('native converter preserves typed calls, for, break and continue',()=>{
 const result=convertWarScriptToCSharp('public int total=0; int Twice(int n){return n*2;} Update(){ for(int i=0;i<4;i++){if(i==1){continue;} total+=Twice(i);} }');
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));assert.match(result.source,/public int Twice\(int n\)/);assert.match(result.source,/for \(int i = 0; \(i < 4\); i \+= 1\)/);assert.match(result.source,/continue;/);assert.match(result.source,/total \+= Twice\(i\)/);
});
test('committed native smoke is exactly generated from the typed WarScript source',async()=>{
 const {readFile}=await import('node:fs/promises');const source='public int total=0; int Twice(int n){return n*2;} void Update(){for(int i=0;i<5;i++){if(i==1){continue;} if(i==4){break;} total+=Twice(i);}}';const generated=convertWarScriptToCSharp(source,{className:'GeneratedTypedWarScriptSmoke'});assert.equal(await readFile(new URL('../csharp/WarLike.Tests/GeneratedTypedWarScriptSmoke.cs',import.meta.url),'utf8'),generated.source+'\n');
});
