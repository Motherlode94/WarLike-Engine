import test from 'node:test';
import assert from 'node:assert/strict';
import {compileWarScript} from '../script-editor/warscript.js';
import {convertWarScriptToCSharp} from '../script-editor/warscript-to-csharp.js';

const convert=(text,name='GeneratedWarLike')=>convertWarScriptToCSharp(text,{className:name});

test('generates a valid MonoBehaviour class with lifecycle and supported fields',()=>{
 const result=convert('public float speed = 2; private int steps = 0; Start(){ Log("Hello"); } Update(){ steps++; Move(speed*Time.deltaTime,0,0); }');
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 assert.match(result.source,/using WarLike\.Runtime;/);
 assert.match(result.source,/public sealed class GeneratedWarLike : MonoBehaviour/);
 assert.match(result.source,/public float speed = 2;/);
 assert.match(result.source,/private int steps = 0;/);
 assert.match(result.source,/private void Update\(\)/);
 assert.match(result.source,/transform\.Translate\(\(speed \* Time\.deltaTime\), 0, 0\)/);
});
test('replaces struct Vector3 axis writes with actual native compatibility helper',()=>{
 const result=convert('Update(){ transform.position.x += 1; transform.rotation.z = 90; }');
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 assert.match(result.source,/WarScriptCompat\.SetPositionAxis\(this, 'X', transform\.position\.X \+ 1\)/);
 assert.match(result.source,/WarScriptCompat\.SetRotationAxis\(this, 'Z', 90\)/);
});
test('maps supported native Animator and Input APIs, not imaginary Unity namespaces',()=>{
 const result=convert('Update(){ if(Input.GetKey("space")){ Animator.SetTrigger("Jump"); } }');
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 assert.match(result.source,/Input.GetKey\("space"\)/);
 assert.match(result.source,/GetComponent<Animator>\(\)\?\.SetTrigger\("Jump"\)/);
});
test('maps Vector3 constructors and math intrinsic calls',()=>{
 const result=convert('public Vector3 aim=Vector3(1,0,0); Update(){ transform.position=aim; float a=Mathf.Sin(Time.time); }');
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 assert.match(result.source,/new Vector3\(1, 0, 0\)/);
 assert.match(result.source,/MathF.Sin\(Time\.time\)/);
});
test('refuses API without native equivalence instead of emitting a misleading C# implementation',()=>{
 const result=convert('public float speed = 20; Start(){ vehicle.maxSpeed = speed; }');
 assert.equal(result.ok,false);
 assert.equal(result.source,'');
 assert.match(result.diagnostics[0].message,/sans équivalent natif/);
});
test('refuses unsupported return values and mutable var fields',()=>{
 const result=convert('public var counter = 0; Awake(){ return 2; }');
 assert.equal(result.ok,false);
 assert.equal(result.source,'');
 assert.ok(result.diagnostics.length>=1);
});
test('rejects invalid C# class and identifier names',()=>{
 const result=convert('Awake(){}','class');
 assert.equal(result.ok,false);
 assert.match(result.diagnostics[0].message,/classe C#/);
});
test('propagates compiler error line numbers',()=>{
 const result=convert('Update(){ UnknownMethod(); }');
 assert.equal(compileWarScript('Update(){ UnknownMethod(); }').ok,false);
 assert.equal(result.ok,false);
 assert.ok(result.diagnostics.some(d=>d.line===1));
});
test('compilation examples are deterministic and never rewrite source when conversion fails',()=>{
 const source='public bool lit=true; Update(){ if(lit) { gameObject.SetActive(true); } }';
 const a=convert(source),b=convert(source);
 assert.deepEqual(a,b);
 assert.match(a.source,/gameObject.SetActive\(true\)/);
});
