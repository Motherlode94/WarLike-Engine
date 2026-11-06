import test from 'node:test';
import assert from 'node:assert/strict';
import {canonicalScene,runtimeEntities,bridgeScene} from '../js/core/scene-contract.js';
import {createScene,createGameObject,addGameObject,duplicateGameObject} from '../js/core/scene-graph-v2.js';
import {prepareGameDefinition} from '../js/core/game-build.js';
import {freshGameProject} from '../js/core/game-project.js';
import {inspectRuntimeCompatibility,initializeWebComponents,captureWebComponents,nativePlayEntities} from '../js/core/runtime-capabilities.js';
const actor=(extra={})=>({id:7,name:'Hero',type:'player',x:128,y:192,w:32,h:64,elevation3d:2,rotation:90,color:'#abcdef',...extra});
test('legacy, V2 and native exports share axes, units, IDs and gameplay data',()=>{
 const e=actor({stats:{health:73,maxHealth:100},sequence:{event:'start',instructions:[]},csharpComponents:[{kind:'AutoRotate',speed:45}],blueprintVariables:[{name:'target',type:'object',value:{entityId:7}}],customData:{quest:'intro'}});
 const scene=canonicalScene([e]);assert.deepEqual(scene.objects[0].components[0].position,[2,2,3]);
 const restored=runtimeEntities(JSON.parse(JSON.stringify(scene)))[0];for(const key of Object.keys(e))assert.deepEqual(restored[key],e[key],key);
 const bridge=bridgeScene([e]);assert.equal(bridge.objects[0].sourceEntityId,bridge.entities[0].id);
 scene.objects[0].components[0].position=[4,5,6];scene.objects[0].components.find(c=>c.type==='stats').data.health=20;
 const edited=runtimeEntities(scene)[0];assert.equal(edited.x,256);assert.equal(edited.y,384);assert.equal(edited.elevation3d,5);assert.equal(edited.stats.health,20);
});
test('native V2 objects gain stable numeric IDs without collisions and preserve components',()=>{
 const scene=createScene('V2');const one=createGameObject('One','one');one.components.push({type:'Rigidbody',bodyType:'dynamic',mass:2,gravityScale:1});addGameObject(scene,one);addGameObject(scene,createGameObject('Two','two'),'one');
 const entities=runtimeEntities(scene);assert.equal(entities[1].parentId,entities[0].id);assert.equal(entities[0].rigidbody3d.mass,2);assert.deepEqual(runtimeEntities(canonicalScene(entities)).map(e=>e.id),entities.map(e=>e.id));
 const converted=canonicalScene([actor()]);duplicateGameObject(converted,converted.objects[0].id);assert.equal(new Set(runtimeEntities(converted).map(e=>e.id)).size,2);
});
test('invalid or duplicated canonical actor IDs are rejected before conversion',()=>{
 assert.throws(()=>canonicalScene([actor(),actor()]),/dupliqué/);const scene=canonicalScene([actor(),actor({id:8})]);scene.objects[1].sourceEntityId=7;assert.throws(()=>runtimeEntities(scene),/dupliqué/);
 scene.objects[1].sourceEntityId=8;scene.objects[0].components[0].position=[Infinity,0,0];assert.throws(()=>runtimeEntities(scene),/position/);
});
test('Web export blocks native-only and free C# code in every scene, while Web components remain supported',()=>{
 const project={...freshGameProject(),startupSceneId:'main'};const e=actor({csharpComponents:[{kind:'Health',regen:2}]});assert.equal(prepareGameDefinition({entities:[e],project}).runtime.backend,'web');
 const native=actor({csharpComponents:[{kind:'LinearMotion',vx:2}]});assert.throws(()=>prepareGameDefinition({entities:[native],project}),/LinearMotion/);
 project.scenes=[{id:'hidden',name:'Other scene',entities:[native]}];assert.throws(()=>prepareGameDefinition({entities:[e],project}),/Other scene/);
 assert.equal(inspectRuntimeCompatibility([native],{target:'native',backend:'native'}).length,0);
 assert.ok(inspectRuntimeCompatibility([actor({csharpScript:{name:'Custom',source:'class Custom {}'}})]).some(i=>/compilé/.test(i.message)));
});

test('portable genre and vehicle components share Blueprint globals without executing twice in .NET',()=>{
 const e=actor({csharpComponents:[{kind:'Roleplay',runtime:'web',money:50,reputation:2},{kind:'VehicleController',runtime:'web',maxSpeed:220},{kind:'AutoRotate',speed:50}]}),globals={};initializeWebComponents([e],globals);assert.equal(globals.money,50);assert.equal(e.maxSpeed,220);globals.money=75;captureWebComponents([e],globals);assert.equal(e.csharpComponents[0].money,75);assert.deepEqual(nativePlayEntities([e])[0].csharpComponents.map(c=>c.kind),['AutoRotate']);assert.equal(inspectRuntimeCompatibility([e],{target:'web'}).length,1);
});
