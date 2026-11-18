import test from 'node:test';
import assert from 'node:assert/strict';
import {ContactEvents2d} from '../js/core/physics-contact-events-2d.js';
import {compileWarScript,createWarScriptInstance} from '../script-editor/warscript.js';
import {resetSequences,updateSequences,emitSequenceSignal,sequenceRuntime} from '../js/core/logic-sequences.js';
import {createGraph,applyGraph} from '../js/core/blueprint-graph.js';

const sensor={id:1,name:'Sensor',type:'object',x:0,y:0,w:48,h:48,collider2d:{enabled:true,isTrigger:true}};
const actor={id:2,name:'Hero',type:'player',x:100,y:0,w:24,h:24,collider2d:{enabled:true,isTrigger:false}};
const stages=events=>events.filter(e=>e.ownerId===1).map(e=>e.kind+':'+e.stage);
test('Trigger2D reports enter once, stay per frame, exit once, then resets',()=>{
 const contacts=new ContactEvents2d(),a=structuredClone(sensor),b=structuredClone(actor);
 assert.deepEqual(contacts.update([a,b]),[]);
 b.x=30;assert.deepEqual(stages(contacts.update([a,b])),['trigger:enter']);
 assert.deepEqual(stages(contacts.update([a,b])),['trigger:stay']);
 b.x=80;assert.deepEqual(stages(contacts.update([a,b])),['trigger:exit']);
 assert.deepEqual(contacts.update([a,b]),[]);
 contacts.reset();b.x=30;
 assert.deepEqual(stages(contacts.update([a,b])),['trigger:enter']);
});
test('Collision2D includes touching solid boxes and excludes disabled colliders',()=>{
 const contacts=new ContactEvents2d();
 const wall={id:3,type:'object',x:48,y:0,w:32,h:32,collider2d:{enabled:true}};
 const hero={id:2,type:'player',x:24,y:0,w:24,h:32,collider2d:{enabled:true}};
 const events=contacts.update([hero,wall]);
 assert.deepEqual(events.map(e=>e.stage),['enter','enter']);
 assert.equal(events[0].kind,'collision');
 wall.collider2d.enabled=false;
 assert.equal(contacts.update([hero,wall])[0].stage,'exit');
});
test('Tilemap solid cells produce collision events but no fake per-tile GameObjects',()=>{
 const contacts=new ContactEvents2d(),player={id:2,type:'player',x:8,y:0,w:24,h:32,collider2d:{enabled:true}};
 const tilemap={id:4,type:'tilemap',x:32,y:0,tilemap2d:{tileSize:32,columns:2,rows:1,cells:{'0,0':'wall'}}};
 assert.equal(contacts.update([player,tilemap])[0].otherId,4);
 tilemap.tilemap2d.cells={};
 assert.equal(contacts.update([player,tilemap])[0].stage,'exit');
});
test('WarScript contact callbacks compile and can inspect read-only otherId',()=>{
 const source='public int count = 0; OnTriggerEnter2D() { count++; Log(trigger.otherId); } OnCollisionExit2D() { Log(collision.otherName); }';
 const program=compileWarScript(source);assert.equal(program.ok,true,JSON.stringify(program.diagnostics));
 const log=[],instance=createWarScriptInstance(program,{read:n=>n==='trigger.otherId'?2:n==='collision.otherName'?'Wall':0,call:(name,args)=>{if(name==='Log')log.push(args[0]);return null},write:()=>{}});
 instance.run('OnTriggerEnter2D');
 assert.equal(instance.fields.count,1);assert.deepEqual(log,[2]);
 instance.run('OnCollisionExit2D');
 assert.deepEqual(log,[2,'Wall']);
 assert.equal(compileWarScript('Update(){ trigger.otherId = 3; }').ok,false);
});

test('WarNode triggerEnter2d event targets the Collider owner and runs connected action',()=>{
 resetSequences();
 const sequence={enabled:true,event:'triggerEnter2d',once:false,instructions:[{type:'setVariable',key:'enteredZone',value:1}]};
 sequence.graph=createGraph(sequence);applyGraph(sequence);
 const sensor={id:41,type:'object',x:0,y:0,w:48,h:48,sequence};
 const hero={id:42,type:'player',x:8,y:8,w:24,h:24};
 emitSequenceSignal('physics2d:trigger:enter:41',42);
 updateSequences(.016,{playing:true,entities:[sensor,hero],player:hero,keys:new Set()});
 assert.equal(sequenceRuntime.globals.enteredZone,1);
});

test('Contact2D stages remain stable when entity order changes during a contact',()=>{
 const contacts=new ContactEvents2d(),a=structuredClone(sensor),b=structuredClone(actor);
 b.x=30;
 assert.deepEqual(stages(contacts.update([a,b])),['trigger:enter']);
 assert.deepEqual(stages(contacts.update([b,a])),['trigger:stay']);
 b.x=100;
 assert.deepEqual(stages(contacts.update([b,a])),['trigger:exit']);
 assert.deepEqual(stages(contacts.update([a,b])),[]);
});
test('Contact2D emits an exit when a trigger is disabled, never a phantom stay',()=>{
 const contacts=new ContactEvents2d(),a=structuredClone(sensor),b=structuredClone(actor);
 b.x=30;
 assert.deepEqual(stages(contacts.update([a,b])),['trigger:enter']);
 a.collider2d.enabled=false;
 assert.deepEqual(stages(contacts.update([a,b])),['trigger:exit']);
 assert.deepEqual(stages(contacts.update([a,b])),[]);
 a.collider2d.enabled=true;
 assert.deepEqual(stages(contacts.update([a,b])),['trigger:enter']);
});
