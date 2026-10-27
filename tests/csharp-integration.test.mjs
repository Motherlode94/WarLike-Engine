import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('WarLike exposes C# connection, scene sync and step controls',()=>{
 const html=read('index.html');
 const ids=['openCsharpRuntime','csharpRuntimePanel','csharpRuntimeConnect','csharpRuntimeSync','csharpRuntimeTick','csharpRuntimeSecond','csharpRuntimeTemplate'];
 for(const id of ids)assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(read('js/editor.js'),/initCSharpBridge\(\)/);
});
test('C# bridge uses loopback and executes scene through JSON API',()=>{
 const ui=read('js/ui/csharp-runtime.js');
 const native=read('csharp/WarLike.Bridge/Program.cs');
 assert.match(ui,/http:\/\/127\.0\.0\.1:8765/);
 assert.match(ui,/request\('\/scene','POST',currentScene\(\)\)/);
 assert.match(ui,/request\('\/tick','POST',\{dt\}\)/);
 assert.match(ui,/second\.addEventListener\('click',\(\)=>simulate\(1\)\)/);
 assert.match(native,/GameWorld\.FromWarLikeJson\(json\)/);
 assert.match(native,/world\.Tick\(dt\)/);
 assert.match(native,/rotation=a\.Rotation/);
});
test('C# scripts never execute through eval or dynamic browser compilation',()=>{
 const ui=read('js/ui/csharp-runtime.js');
 assert.doesNotMatch(ui,/\beval\s*\(/);
 assert.doesNotMatch(ui,/new Function\s*\(/);
 assert.match(ui,/state\.playing\)return/);
});
