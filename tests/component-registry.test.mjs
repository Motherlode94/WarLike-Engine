import test from 'node:test';
import assert from 'node:assert/strict';
import {registerWarLikeComponent,componentChoices,addObjectComponent,resetObjectComponent,removeObjectComponent,componentRemovalBlockers} from '../js/core/component-definitions.js';
import {getRegisteredComponentManifest,unregisterComponentManifest,validateComponentManifest} from '../js/core/component-registry.js';
import {inspectRuntimeCompatibility} from '../js/core/runtime-capabilities.js';

const spec=id=>({id,name:'Experimental Sensor',category:'Sensors',description:'Editable data only',supportedModes:['3d'],defaults:{enabled:true,range:12},properties:{enabled:{type:'boolean'},range:{type:'number',min:0,max:100}}});

test('P0/P4: extension remains a component, not a prefab, and round-trips editable data',()=>{
 const id='sensorExtensionV1';
 const manifest=registerWarLikeComponent(spec(id));
 try{
  assert.equal(manifest,id);
  assert.ok(componentChoices('3d').some(c=>c.id===id&&c.runtime==='unverified'));
  assert.equal(componentChoices('2d').some(c=>c.id===id),false);
  const object={id:27,name:'Probe',assetId:'model-existing',x:9,y:3};
  assert.equal(addObjectComponent(object,id,'3d'),true);
  assert.deepEqual(object[id],{enabled:true,range:12});
  object[id].range=52;
  const saved=JSON.parse(JSON.stringify(object));
  assert.equal(saved[id].range,52);
  assert.equal(saved.assetId,'model-existing');
  assert.equal(resetObjectComponent(object,id),true);
  assert.equal(object[id].range,12);
  assert.equal(removeObjectComponent(object,id),true);
  assert.equal(object.assetId,'model-existing');
  assert.equal(Object.hasOwn(object,id),false);
  assert.deepEqual(saved[id],{enabled:true,range:52});
 }finally{unregisterComponentManifest(id)}
});
test('P0: prevent duplicate registration and collisions with built-in Component IDs',()=>{
 const id='sensorExtensionV2';
 assert.throws(()=>registerWarLikeComponent(spec('collider3d')),/belongs to the engine/);
 registerWarLikeComponent(spec(id));
 try{assert.throws(()=>registerWarLikeComponent(spec(id)),/already registered/)}
 finally{unregisterComponentManifest(id)}
});
test('P0: reject malformed, unsafe or non-serializable extension manifests',()=>{
 for(const id of ['__proto__','bad id','x'])assert.throws(()=>validateComponentManifest(spec(id)));
 assert.throws(()=>validateComponentManifest({...spec('sensorInvalid'),defaults:{enabled:true,range:-10}}),/Invalid number default/);
 assert.throws(()=>validateComponentManifest({...spec('sensorBroken'),defaults:{enabled:true,range:12,callback:()=>{}}}),/serializable/);
 assert.throws(()=>validateComponentManifest({...spec('sensorOther'),supportedModes:['4d']}),/modes/);
});
test('P0: unknown extension runtime explicitly blocks export instead of pretending to work',()=>{
 const id='sensorExtensionV3';
 registerWarLikeComponent(spec(id));
 try{
  const actor={id:2,name:'Test', [id]:{enabled:true,range:10}};
  const issues=inspectRuntimeCompatibility([actor],{target:'web',backend:'web'});
  assert.ok(issues.some(i=>i.entityId===2&&i.message.includes('sans runtime vérifié')));
 }finally{unregisterComponentManifest(id)}
});
test('P1: 2D joints and effectors block removal of their Collider, without changing 3D flags',()=>{
 const o={collider2d:{enabled:true},joint2d:{enabled:true},collision3d:true};
 assert.deepEqual(componentRemovalBlockers(o,'collider2d'),['joint2d']);
 assert.equal(removeObjectComponent(o,'collider2d'),false);
 delete o.joint2d;
 assert.equal(removeObjectComponent(o,'collider2d'),true);
 assert.equal(o.collision3d,true);
});
