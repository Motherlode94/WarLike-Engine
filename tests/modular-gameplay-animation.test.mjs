import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultInputActions,resolveInputKeys,inspectInputActions} from '../js/core/input-actions.js';
import {defaultAnimalController,stepAnimalControllers,inspectAnimalController} from '../js/core/animal-controller.js';
import {defaultNavigationAgent,stepNavigationAgents,inspectNavigationAgent} from '../js/core/navigation-agent.js';
import {componentChoices,addObjectComponent,removeObjectComponent,resetObjectComponent} from '../js/core/component-definitions.js';
import {canonicalScene,runtimeEntities} from '../js/core/scene-contract.js';
import {inspectRuntimeCompatibility} from '../js/core/runtime-capabilities.js';

const actor=(id,x=0,y=0)=>({id,name:'Actor'+id,type:'mesh3d',x,y,w:32,h:64,depth3d:32,elevation3d:0,collision3d:true});
test('P2 Input Actions: additional and replacement bindings affect only the controlled object',()=>{
 const a=actor(1);a.inputActions={...defaultInputActions(),forward:'i',jump:'j',replaceDefaults:true};
 const physical=new Set(['i','j']);
 const mapped=resolveInputKeys(a,physical);
 assert.equal(mapped.has('w'),true);
 assert.equal(mapped.has('space'),true);
 assert.deepEqual([...physical],['i','j'],'physical input must remain unchanged');
 assert.equal(resolveInputKeys(a,new Set(['w'])).has('w'),false,'replacement disables legacy forward for this actor');
 const b=actor(2);
 assert.equal(resolveInputKeys(b,new Set(['w'])).has('w'),true,'no mapping leaves controls untouched');
 assert.deepEqual(inspectInputActions(a.inputActions),[]);
 assert.ok(inspectInputActions({...a.inputActions,forward:';'}).length);
});
test('P2: player, animal, navigation are data components, not prefabs, in both scene modes',()=>{
 for(const id of ['inputActions','animalController','navigationAgent']){
  for(const mode of ['2d','3d'])assert.ok(componentChoices(mode).some(d=>d.id===id));
 }
 const a=actor(3);
 for(const id of ['inputActions','animalController','navigationAgent'])assert.equal(addObjectComponent(a,id,'3d'),true);
 assert.equal(a.type,'mesh3d');
 a.inputActions.forward='i';
 a.navigationAgent.waypoints=[{x:150,y:20}];
 const snapshot=structuredClone(a);
 const restored=runtimeEntities(canonicalScene([a]))[0];
 for(const id of ['inputActions','animalController','navigationAgent'])assert.deepEqual(restored[id],a[id]);
 assert.deepEqual(a,snapshot,'serialization cannot modify authored entity');
 assert.equal(resetObjectComponent(a,'inputActions'),true);
 assert.equal(a.inputActions.forward,'w,z,arrowup');
 assert.equal(removeObjectComponent(a,'animalController'),true);
});
test('P2: standalone wildlife wanders and flees without creating prefabs or changing AI objects',()=>{
 const animal=actor(10);animal.animalController={...defaultAnimalController(),behavior:'wander',roamRadius:3};
 const ai=actor(11);ai.ai={enabled:true};
 const aiBefore={x:ai.x,y:ai.y};
 const walked=stepAnimalControllers([animal,ai],.1,{mode:'3d'});
 assert.equal(walked,1);
 assert.ok(Math.hypot(animal.x,animal.y)>0);
 assert.ok(animal.animatorParameters.animalSpeed>0);
 assert.deepEqual({x:ai.x,y:ai.y},aiBefore);
 const threat=actor(12,animal.x+16,animal.y);
 animal.animalController.behavior='flee';animal.animalController.targetId=12;
 const beforeX=animal.x;
 stepAnimalControllers([animal,threat],.1,{mode:'3d'});
 assert.ok(animal.x<beforeX,'flee moves away from nearby threat');
 assert.equal(animal.animatorParameters.animalFleeing,true);
 assert.deepEqual(inspectAnimalController(animal.animalController),[]);
});
test('P3: Navigation Agent moves to authored waypoint and reports Animator movement',()=>{
 const a=actor(21);a.navigationAgent={...defaultNavigationAgent(),waypoints:[{x:128,y:0}],loop:false};
 const moved=stepNavigationAgents([a],.1,{mode:'3d'});
 assert.equal(moved,1);assert.ok(a.x>0);
 assert.ok(a.animatorParameters.navigationSpeed>0);
 assert.equal(a._navigationState.status,'moving');
 assert.deepEqual(inspectNavigationAgent(a.navigationAgent),[]);
});
test('P2/P3: invalid component configurations block export explicitly',()=>{
 const a=actor(31);a.inputActions={...defaultInputActions(),right:'not-a-key'};
 a.animalController={...defaultAnimalController(),runSpeed:-1};
 a.navigationAgent={...defaultNavigationAgent(),waypoints:[{x:NaN,y:0}]};
 const errors=inspectRuntimeCompatibility([a],{target:'web',backend:'web'});
 assert.ok(errors.some(e=>e.message.includes('Input Actions')));
 assert.ok(errors.some(e=>e.message.includes('Animal Controller')));
 assert.ok(errors.some(e=>e.message.includes('Navigation Agent')));
});
