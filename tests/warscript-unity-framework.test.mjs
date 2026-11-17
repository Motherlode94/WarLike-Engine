import test from 'node:test';
import assert from 'node:assert/strict';
import {compileWarScript,createWarScriptInstance} from '../script-editor/warscript.js';
import {convertWarScriptToCSharp} from '../script-editor/warscript-to-csharp.js';
import {WarScriptRuntime} from '../js/core/war-script-runtime.js';

const source=`public class CharacterController : MonoBehaviour {
  [SerializeField] private float walkSpeed = 3;
  public int updates = 0;
  private bool started = false;
  void Awake() { started = true; }
  void Start() { Log("ready"); }
  void Update() { if(started) { transform.position.x += walkSpeed * Time.deltaTime; updates++; } }
  void LateUpdate() { Log("late"); }
  void OnDestroy() { Log("destroyed"); }
}`;

test('WarScript accepts a single bounded Unity-like MonoBehaviour class',()=>{
 const program=compileWarScript(source);
 assert.equal(program.ok,true,JSON.stringify(program.diagnostics));
 assert.equal(program.className,'CharacterController');
 assert.deepEqual(Object.keys(program.methods),['Awake','Start','Update','LateUpdate','OnDestroy']);
 assert.equal(program.fields.find(f=>f.name==='walkSpeed').serialized,true);
 assert.equal(program.fields.find(f=>f.name==='walkSpeed').public,false);
});

test('private serialized values can be overridden without exposing ordinary private fields',()=>{
 const program=compileWarScript(source);
 const initial={x:0,y:0,z:0};let delta=.1;
 const api={
  read(name){if(name==='transform.position.x')return initial.x;if(name==='Time.deltaTime')return delta;throw Error('Unexpected read '+name);},
  write(name,value){if(name==='transform.position.x')initial.x=value;else throw Error('Unexpected write '+name)},
  call(name){if(name==='Log')return null;throw Error('Unexpected call '+name)}
 };
 const instance=createWarScriptInstance(program,api,{values:{walkSpeed:7,started:true,updates:99}});
 assert.equal(instance.fields.walkSpeed,7);
 assert.equal(instance.fields.started,false);
 assert.equal(instance.fields.updates,99);
 instance.run('Awake');instance.run('Start');instance.run('Update');
 assert.ok(Math.abs(initial.x-.7)<1e-7);
 assert.equal(instance.fields.updates,100);
});

test('conversion emits native MonoBehaviour and preserves serialized private field',()=>{
 const result=convertWarScriptToCSharp(source,{className:'CharacterController'});
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 assert.match(result.source,/class CharacterController : MonoBehaviour/);
 assert.match(result.source,/\[SerializeField\]\s+private float walkSpeed = 3;/);
 assert.match(result.source,/private void Awake\(\)/);
 assert.match(result.source,/private void Update\(\)/);
});

test('invalid superclass and unsupported attributes fail with explicit diagnostics',()=>{
 for(const source of [
  'public class Foo : System.IO.File { Update() {} }',
  'class Foo : EvilBehaviour { Update() {} }',
  'class Foo { [Serializable] private float value=1; }',
  'class Foo { [SerializeField] Start() {} }',
  'class Foo : MonoBehaviour { void Awake() {}',
 ]) {
  const result=compileWarScript(source);
  assert.equal(result.ok,false,source);
  assert.ok(result.diagnostics[0].line>=1,source);
 }
});

test('Unity-style class runs in bounded WarScript gameplay runtime with lifecycle',()=>{
 const events=[];
 const entity={id:1,name:'Hero',type:'object',x:0,y:0,w:32,h:32,
  warScripts:[{scriptId:'unity-like',name:'CharacterController.wls',enabled:true,source,values:{walkSpeed:2}}]};
 const ctx={entities:[entity],mode:'2d',project:{scripts:[]},globals:{},
  keys:new Set(),pressedKeys:new Set(),log:m=>events.push(m),signal(){}};
 const runtime=new WarScriptRuntime();
 runtime.update(.1,ctx);runtime.late();
 assert.ok(Math.abs(entity.x-12.8)<1e-7);
 assert.equal(entity.warScripts[0].runtime.fields.updates,1);
 assert.deepEqual(events,['ready','late']);
 runtime.stop();assert.ok(events.includes('destroyed'));
});
