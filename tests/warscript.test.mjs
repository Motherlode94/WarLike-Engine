import test from 'node:test';
import assert from 'node:assert/strict';
import {compileWarScript,createWarScriptInstance,warScriptBuiltin} from '../script-editor/warscript.js';
import {WarScriptRuntime,inspectWarScripts} from '../js/core/war-script-runtime.js';
import {applyScriptSave,languageFor} from '../script-editor/core.js';
import {createTownDemo,createGarageDemo,createNatureDemo} from '../js/core/authored-demo-scenes.js';
import {createBundledPhysicsScene2d} from '../js/core/bundled-physics-scene.js';
import {prepareGameDefinition} from '../js/core/game-build.js';
import {freshGameProject} from '../js/core/game-project.js';
const object=source=>({id:1,name:'Test',x:0,y:0,w:32,h:64,rotation:0,color:'#ffffff',type:'object',collision3d:true,warScripts:[{scriptId:'test',name:'Test.wls',source,enabled:true,values:{}}]});
const context=entities=>({entities,project:{scripts:[]},mode:'2d',globals:{},keys:new Set(),pressedKeys:new Set(),log(){},signal(){}});
const code=source=>{const c=compileWarScript(source);assert.deepEqual(c.diagnostics,[]);return c};
test('WarScript parses optional classes, access modifiers, types and newline terminators',()=>{
 const p=code('class Counter { public int count = 0; private bool ready = false; void Start() { ready = true; } Update() { if (ready && count < 3) { count++; } else { count = 0; } } }');
 const instance=createWarScriptInstance(p,{});instance.run('Start');instance.run('Update');assert.equal(instance.fields.count,1);assert.equal(p.fields[1].public,false);
 assert.equal(code('float speed = 2\nUpdate() {\nspeed += 1\n}\n').fields.length,1);
});
test('compile diagnostics identify unsupported methods, properties, loops and invalid field values',()=>{
 for(const source of ['Start(){ fetch("secret"); }','Update(){ transform.constructor = 1; }','Update(){ while(true){} }','float count = "bad";','float x = Vector3(Log("bad"),0,0);','Update(){ Missing = 1; }']){const p=compileWarScript(source);assert.equal(p.ok,false,source);assert.ok(p.diagnostics[0].line>0)}
 const p=compileWarScript('float ok = 1;\nUpdate() {\n Unknown();\n}');assert.equal(p.diagnostics[0].line,3);
});
test('operators preserve precedence, short circuit, local scope and typed assignments',()=>{
 const p=code('public float value=0; bool flag=false; Update(){ float local=2+3*4; if (false && Fail()) { value=99; } if (local==14) { value=local; } } Fail(){ return 1 / 0; }');const i=createWarScriptInstance(p,{});i.run('Update');assert.equal(i.fields.value,14);assert.throws(()=>i.run('Fail'),/zéro/);
});
test('recursive scripts terminate within their execution budget and isolate errors',()=>{
 const e=object('Again(){ Again(); } Update(){ Again(); }'),other=object('Update(){ Rotate(1); }');other.id=2;other.warScripts[0].scriptId='other';const ctx=context([e,other]),runtime=new WarScriptRuntime();runtime.update(.02,ctx);assert.match(e.warScripts[0].runtime.error,/Profondeur|Budget/);assert.equal(other.rotation,1);runtime.update(.02,ctx);assert.equal(runtime.errors.length,1);assert.equal(other.rotation,2);
});
test('Awake, Start, FixedUpdate, Update, LateUpdate and OnDestroy run in one shared state',()=>{
 const e=object('int count=0; Awake(){ Set("awake",1); } Start(){ count++; } FixedUpdate(){ Set("fixed",Get("fixed")+1); } Update(){ Move(Time.deltaTime,0,0); Set("updated",count); } LateUpdate(){ Set("late",1); } OnDestroy(){ Set("destroyed",1); }');const ctx=context([e]),runtime=new WarScriptRuntime();runtime.update(.04,ctx);runtime.late();assert.equal(e.x,2.56);assert.equal(ctx.globals.fixed,2);assert.equal(ctx.globals.updated,1);assert.equal(ctx.globals.late,1);runtime.update(.02,ctx);assert.equal(e.warScripts[0].runtime.fields.count,1);runtime.stop();assert.equal(ctx.globals.destroyed,1);runtime.stop();
});
test('input and globals are refreshed each frame, scripts respect disable and saved state',()=>{
 const e=object('int count=0; Start(){ count++; } Update(){ if(Input.GetKeyDown("e")){ count++; Set("count",count); Signal("changed"); } }'),runtime=new WarScriptRuntime(),ctx=context([e]);let emitted=0;ctx.signal=()=>emitted++;runtime.update(.02,ctx);runtime.update(.02,{...ctx,pressedKeys:new Set(['e'])});assert.equal(emitted,1);assert.equal(ctx.globals.count,2);
 e.warScripts[0].enabled=false;runtime.update(.02,ctx);assert.equal(e.warScripts[0].runtime.fields.count,2);e.warScripts[0].enabled=true;const cloned=structuredClone(e),next={...ctx,entities:[cloned],globals:{}};runtime.update(.02,next);assert.equal(cloned.warScripts[0].runtime.fields.count,2);runtime.update(.02,{...next,pressedKeys:new Set(['e'])});assert.equal(next.globals.count,3);
});
test('movement observes 2D collision and maps canonical metre coordinates in 3D',()=>{
 const e=object('Update(){ Move(1,0,0); }'),wall={id:2,x:64,y:0,w:20,h:64,type:'object',collision3d:true};new WarScriptRuntime().update(.02,context([e,wall]));assert.equal(e.x,32);
 const other=object('Start(){ transform.position = new Vector3(2,3,4); Rotate(0,90,0); }');new WarScriptRuntime().update(.02,{...context([other]),mode:'3d'});assert.equal(other.x,128);assert.equal(other.y,256);assert.equal(other.elevation3d,3);assert.equal(other.rotation,90);
});
test('public overrides are per object and enforce the declared types',()=>{
 const p=code('public float speed=2; private int count=3; Update(){ speed+=1; }');const first=createWarScriptInstance(p,{},{values:{speed:9,count:99}}),second=createWarScriptInstance(p,{});first.run('Update');assert.equal(first.fields.speed,10);assert.equal(second.fields.speed,2);assert.equal(first.fields.count,3);assert.throws(()=>createWarScriptInstance(p,{},{values:{speed:'bad'}}),/incompatible/);
});
test('saving .wls attaches executable components, preserves overrides and supports language changes',()=>{
 const entity={id:1},project={scripts:[]};let save=applyScriptSave(project,{baseRevision:0,script:{id:'source',name:'Mine.wls',source:'public float speed=2;'}},entity);assert.equal(languageFor('Mine.wls'),'warscript');entity.warScripts[0].values.speed=7;
 save=applyScriptSave(project,{baseRevision:save.script.revision,script:{...save.script,source:'public float speed=4;'}},entity);assert.equal(entity.warScripts.length,1);assert.equal(entity.warScripts[0].values.speed,7);assert.equal(entity.warScripts[0].source,save.script.source);
 applyScriptSave(project,{baseRevision:save.script.revision,script:{...save.script,name:'Mine.cs'}},entity);assert.equal(entity.warScripts.length,0);assert.equal(entity.csharpScript.scriptId,'source');
});
test('demo scripts affect the relay, car, survival clock and platformer controller and export',()=>{
 for(const mode of ['2d','3d'])for(const factory of [createTownDemo,createGarageDemo,createNatureDemo]){
  const scene=factory(mode),ctx={...context(scene.entities),mode},runtime=new WarScriptRuntime();assert.deepEqual(inspectWarScripts(scene.entities,ctx.project),[]);ctx.globals.demoPowered=1;runtime.update(.1,ctx);
  if(factory===createTownDemo)assert.notEqual(scene.entities.find(e=>e.name==='Tableau du relais').lightIntensity,2);
  if(factory===createGarageDemo)assert.equal(scene.entities.find(e=>e.tags?.includes('race-vehicle')).maxSpeed,270);
  if(factory===createNatureDemo)assert.equal(scene.entities.find(e=>e.survival).survivalWorld.timeScale,240);
  const data=prepareGameDefinition({...scene,mode,project:{...freshGameProject(),genre:scene.genre}});assert.equal(data.runtime.warScript,1);assert.ok(data.project.scenes[0].entities.some(e=>e.warScripts?.length));
 }
 const scene=createBundledPhysicsScene2d(),player=scene.entities.find(e=>e.controller2d);player.warScripts[0].values.jump=560;new WarScriptRuntime().update(.02,context(scene.entities));assert.equal(player.controller2d.jumpSpeed,560);
});
test('invalid attached WarScript blocks Play and export while other source files remain inert',()=>{
 const e=object('Update(){ DoesNotExist(); }');assert.ok(inspectWarScripts([e],{}).length);assert.throws(()=>prepareGameDefinition({entities:[e],mode:'2d',project:freshGameProject()}),/DoesNotExist/);
 const i=createWarScriptInstance(code('Vector3 pos = Vector3(1,2,3);'),{call:warScriptBuiltin});assert.deepEqual(i.fields.pos,{x:1,y:2,z:3});
});

test('attachment limits reject a save without partially changing project or entity',()=>{
 const entity={id:1,warScripts:Array.from({length:8},(_,i)=>({scriptId:'s'+i}))},project={scripts:[]},before=JSON.stringify({entity,project});
 assert.throws(()=>applyScriptSave(project,{baseRevision:0,script:{id:'extra',name:'Extra.wls',source:'Update(){}'}},entity),/8 WarScripts/);assert.equal(JSON.stringify({entity,project}),before);
});

test('Vector3 arithmetic can update positions using C# style compound assignment',()=>{
 const e=object('Vector3 speed = Vector3(1,2,0); Update(){ transform.position += speed * Time.deltaTime; }');const runtime=new WarScriptRuntime();runtime.update(.1,context([e]));assert.equal(e.x,6.4);assert.equal(e.y,12.8);
});
