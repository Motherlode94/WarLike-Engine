import test from 'node:test';
import assert from 'node:assert/strict';
import {compileWarScript} from '../script-editor/warscript.js';
import {WarScriptRuntime} from '../js/core/war-script-runtime.js';
import {resetSequences,sequenceRuntime} from '../js/core/logic-sequences.js';
import {restoreGameProject} from '../js/core/game-project.js';
test('WarScript camera, vehicle, flight configuration and validated interaction',()=>{
 restoreGameProject({id:'ws-priority',title:'WGC'});resetSequences();
 const source='Start(){camera.sensitivity=0.004;camera.followSharpness=12;camera.collision=false;Vehicle.SetEngine(false);Vehicle.Refuel(20);Vehicle.Repair(10);flight.speed=8;Set("target",Interaction.FindTarget());Set("used",Interaction.Use());}';
 assert.equal(compileWarScript(source).ok,true);
 const actor={id:1,type:'player',x:0,y:0,w:20,h:20,hp:100,adventure:{},cameraRig:{},superhero:{enabled:true},vehicleSystems:{engine:{enabled:true,health:50,maxHealth:100},fuel:{enabled:true,amount:30,capacity:100}},warScripts:[{scriptId:'priority',name:'Priority.wls',source}]};
 const target={id:2,type:'object',x:25,y:0,w:20,h:20,depth3d:20,adventureInteractable:{enabled:true,radius:100}};
 const ctx={mode:'3d',entities:[actor,target],project:{scripts:[]},globals:{},keys:new Set(),pressedKeys:new Set()};
 const rt=new WarScriptRuntime();try{rt.update(.02,ctx);assert.deepEqual(rt.errors,[]);assert.equal(actor.cameraRig.sensitivity,.004);assert.equal(actor.cameraRig.followSharpness,12);assert.equal(actor.cameraRig.collision,false);assert.equal(actor.vehicleSystems.engine.enabled,false);assert.equal(actor.vehicleSystems.engine.health,60);assert.equal(actor.vehicleSystems.fuel.amount,50);assert.equal(actor.superhero.flightSpeed,8);assert.deepEqual(ctx.globals,{target:2,used:true});assert.deepEqual(sequenceRuntime.interactions,[{actorId:1,targetId:2}]);}finally{rt.stop();resetSequences()}
});
