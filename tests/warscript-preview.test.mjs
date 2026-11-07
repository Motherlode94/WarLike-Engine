import test from 'node:test';
import assert from 'node:assert/strict';
import {runWarScriptPreview} from '../script-editor/warscript.js';

test('executes real WarScript callbacks in a bounded isolated preview',()=>{
 const source='public float speed = 60;\nStart() { Log("ready"); }\nUpdate() { Rotate(speed * Time.deltaTime); }';
 const result=runWarScriptPreview(source,{frames:60,fps:60});
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 assert.equal(result.simulated,true);
 assert.equal(result.frames,60);
 assert.equal(result.fields.speed,60);
 assert.ok(Math.abs(result.state.rotation.y-60)<1e-6);
 assert.ok(result.logs.some(l=>l.method==='Log'&&l.args[0]==='ready'));
});
test('bad WarScript reports diagnostics without executing',()=>{
 const result=runWarScriptPreview('Start() { UndefinedFunction(); }');
 assert.equal(result.ok,false);
 assert.ok(result.diagnostics.length);
 assert.equal(result.state,null);
});
test('direct WarScript preview enforces a bounded number of simulation frames',()=>{
 assert.throws(()=>runWarScriptPreview('Start() { Log("ok"); }',{frames:100000}),/frames invalide/);
});
test('unsupported world calls do not silently affect the real Engine scene',()=>{
 const result=runWarScriptPreview('Start() { Set("score", 10); }',{frames:0});
 assert.equal(result.ok,true);
 assert.ok(result.logs.some(l=>l.method==='simulated:Set'));
});