import test from 'node:test';
import assert from 'node:assert/strict';
import {createGrabSession3d,discardGrabSession3d,defaultGrab3d,canGrab3d,tickGrab3d,releaseGrab3d} from '../js/core/grab-physics-3d.js';
import {stepPhysics3d} from '../js/core/physics-3d.js';
const actor=()=>({id:1,type:'player',playable3d:true,x:0,y:0,w:32,h:96,depth3d:32,elevation3d:0,collision3d:true});
const crate=()=>({id:2,type:'object',x:-16,y:-100,w:32,h:32,depth3d:32,elevation3d:.5,collision3d:true,solid3d:true,
 collider3d:{enabled:true,shape:'box'},rigidbody3d:{enabled:true,kinematic:false,mass:2,gravity:15,vx:0,vy:0,vz:0},
 grab3d:defaultGrab3d()});
const options=(player,entities,keys=[],overrides={})=>({
 actor:player,entities,origin:[0,.75,0],direction:[0,0,-1],pressedKeys:new Set(keys),dt:1/60,...overrides
});
test('discarding a held Play object never resets restored editor velocities',()=>{
 const authored=crate();authored.rigidbody3d.vx=12;authored.rigidbody3d.vy=3;
 const expected=structuredClone(authored),runtime=structuredClone(authored),player=actor(),session=createGrabSession3d();
 tickGrab3d(session,options(player,[player,runtime],['g']));assert.equal(session.heldId,authored.id);
 discardGrabSession3d(session);assert.equal(session.heldId,null);assert.equal(session.previousKinematic,null);
 assert.deepEqual(authored,expected);assert.equal(runtime.rigidbody3d.kinematic,true);
});
test('Grab3D accepts only a visible enabled dynamic physics body with component',()=>{
 const b=crate();assert.equal(canGrab3d(b),true);
 b.grab3d.enabled=false;assert.equal(canGrab3d(b),false);
 b.grab3d.enabled=true;b.rigidbody3d.kinematic=true;assert.equal(canGrab3d(b),false);
 b.rigidbody3d.kinematic=false;b.collision3d=false;assert.equal(canGrab3d(b),false);
});
test('G grabs a Rigidbody3D, keeps it suspended and drops as a dynamic body',()=>{
 const p=actor(),o=crate(),entities=[p,o],session=createGrabSession3d(),events=[];
 const t=(keys=[])=>tickGrab3d(session,{...options(p,entities,keys),onEvent:(type,target)=>events.push([type,target.id])});
 assert.equal(t(['g']),o);assert.equal(session.heldId,2);
 assert.equal(o.rigidbody3d.kinematic,true);
 for(let i=0;i<45;i++)t();
 assert.ok(o.y< -60,'held object stays in front of player');
 const y=o.elevation3d;
 assert.equal(t(['g']),null);assert.equal(session.heldId,null);
 assert.equal(o.rigidbody3d.kinematic,false);
 for(let i=0;i<20;i++)stepPhysics3d(entities,1/60);
 assert.ok(o.elevation3d<y,'released body resumes gravity');
 assert.deepEqual(events,[['grab',2],['drop',2]]);
});
test('T throws using Rigidbody impulse and original mass',()=>{
 const p=actor(),o=crate(),entities=[p,o],session=createGrabSession3d();
 tickGrab3d(session,options(p,entities,['g']));
 tickGrab3d(session,options(p,entities,['t']));
 assert.equal(session.heldId,null);
 assert.equal(o.rigidbody3d.kinematic,false);
 assert.ok(o.rigidbody3d.vz< -400,'throw must create actual forward physics velocity');
 assert.equal(o.rigidbody3d.vx,0);
});
test('walls block pickup and maxDistance cannot be bypassed',()=>{
 const p=actor(),o=crate(),s=createGrabSession3d(),wall={id:3,type:'object',x:-60,y:-45,w:120,h:100,depth3d:8,elevation3d:0,solid3d:true,collision3d:true};
 assert.equal(tickGrab3d(s,options(p,[p,o,wall],['g'])),null);
 assert.equal(s.heldId,null);
 o.grab3d.maxDistance=.1;
 assert.equal(tickGrab3d(s,options(p,[p,o],['g'])),null);
 assert.equal(s.heldId,null);
});
test('blocking gameplay or disabling held object safely restores rigidbody dynamics',()=>{
 const p=actor(),o=crate(),e=[p,o],session=createGrabSession3d();
 tickGrab3d(session,options(p,e,['g']));
 assert.equal(o.rigidbody3d.kinematic,true);
 tickGrab3d(session,options(p,e,[],{blocked:true}));
 assert.equal(session.heldId,null);
 assert.equal(o.rigidbody3d.kinematic,false);
 tickGrab3d(session,options(p,e,['g']));
 o.grab3d.enabled=false;
 tickGrab3d(session,options(p,e));
 assert.equal(o.rigidbody3d.kinematic,false);
});
test('no grab if input is blocked or targeting direction is invalid',()=>{
 const p=actor(),o=crate(),session=createGrabSession3d();
 assert.equal(tickGrab3d(session,options(p,[p,o],['g'],{blocked:true})),null);
 assert.equal(tickGrab3d(session,options(p,[p,o],['g'],{direction:[0,0,0]})),null);
 assert.equal(session.heldId,null);
 assert.equal(releaseGrab3d(session,[p,o]),null);
});
