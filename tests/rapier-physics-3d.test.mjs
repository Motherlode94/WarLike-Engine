import test from 'node:test';
import assert from 'node:assert/strict';
import {createRapierScene,synchronizeRapierScene,stepRapierScene,disposeRapierScene} from '../js/core/rapier-physics-3d.js';
const worlds=[];
class Body {
 constructor(desc){this.p=desc.p;this.v=desc.v||{x:0,y:0,z:0};this.writes=0;}
 translation(){return this.p}
 linvel(){return this.v}
 setTranslation(p){this.p=p;this.writes++}
 setLinvel(v){this.v=v;this.writes++}
}
const RAPIER={
 RigidBodyDesc:{
  dynamic:()=>({p:null,v:null,setTranslation(x,y,z){this.p={x,y,z};return this},setLinvel(x,y,z){this.v={x,y,z};return this}}),
  fixed:()=>({p:null,setTranslation(x,y,z){this.p={x,y,z};return this}})
 },
 ColliderDesc:{cuboid:()=>({setRestitution(){return this},setFriction(){return this}})},
 World:class {constructor(){this.bodies=[];this.timestep=0;this.released=false;worlds.push(this)}createRigidBody(d){const b=new Body(d);this.bodies.push(b);return b}createCollider(){}step(){}free(){this.released=true}}
};
const dynamic=(id=1)=>({id,type:'mesh3d',x:0,y:0,w:64,h:64,depth3d:64,elevation3d:1,collision3d:true,rigidbody3d:{enabled:true,vx:64,vy:2,vz:0,restitution:.2,friction:.8}});
test('Rapier scene initializes velocity with scene pixels-to-meters conversion',()=>{
 const entity=dynamic();const scene=createRapierScene(RAPIER,[entity]);
 assert.equal(scene.actors.get(1).body.linvel().x,1);
 assert.equal(scene.actors.get(1).body.linvel().y,2);
 disposeRapierScene(scene);assert.equal(scene.world.released,true);
});
test('external gameplay impulses change native velocity and remain stable afterward',()=>{
 const entity=dynamic();const scene=createRapierScene(RAPIER,[entity]);
 entity.rigidbody3d.vx=128;
 assert.equal(synchronizeRapierScene(scene,[entity]),true);
 assert.equal(scene.actors.get(1).body.linvel().x,2);
 stepRapierScene(scene,1/60);
 const writes=scene.actors.get(1).body.writes;
 assert.equal(synchronizeRapierScene(scene,[entity]),true);
 assert.equal(scene.actors.get(1).body.writes,writes);
 disposeRapierScene(scene);
});
test('fixed colliders follow scripted position and changing geometry requires rebuild',()=>{
 const ground={id:7,type:'mesh3d',x:0,y:0,w:64,h:64,depth3d:64,elevation3d:0};
 const scene=createRapierScene(RAPIER,[ground]);
 ground.x=128;
 assert.equal(synchronizeRapierScene(scene,[ground]),true);
 assert.equal(scene.actors.get(7).body.translation().x,2.5);
 ground.w=128;
 assert.equal(synchronizeRapierScene(scene,[ground]),false);
 assert.equal(synchronizeRapierScene(scene,[]),false);
 disposeRapierScene(scene);
});
