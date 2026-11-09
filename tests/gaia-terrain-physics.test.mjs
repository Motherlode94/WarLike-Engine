import test from 'node:test';
import assert from 'node:assert/strict';
import {gaiaWorldToEntities,heightfieldAt3d,terrainFloorAt3d,validTerrainHeightfield} from '../js/core/gaia-terrain-physics.js';
import {moveBody3d,supportBody3d,solidBody3d} from '../js/core/collision-3d.js';
import {stepPhysics3d,defaultRigidbody3d} from '../js/core/physics-3d.js';
const flat=(offsetX=0)=>({schema:'warlike.terrain.heightfield.v1',resolution:3,size:4,height:2,offsetX,offsetZ:0,heights:Array(9).fill(.5),collision:true});
test('Gaia rejects malformed heightfields and samples physical ground in metres',()=>{
 const terrain=flat();assert.ok(validTerrainHeightfield(terrain));assert.equal(heightfieldAt3d(terrain,0,0),1);
 assert.equal(heightfieldAt3d(terrain,20,0),null);
 assert.equal(validTerrainHeightfield({...terrain,heights:[1]}),false);
 const world={schema:'warlike.gaia.world.v1',tiles:[{tileX:0,tileZ:0,collision:terrain}]};
 const entities=gaiaWorldToEntities(world,{firstId:40});
 assert.equal(entities[0].id,40);assert.equal(entities[0].type,'terrain3d');assert.equal(entities[0].visible,false);
 assert.equal(entities[0].x,-128);assert.equal(entities[0].w,256);
 assert.ok(solidBody3d(entities[0]));
 assert.throws(()=>gaiaWorldToEntities({schema:'unknown',tiles:[]}));
});
test('3D character lands on imported Gaia terrain rather than falling through',()=>{
 const terrain=gaiaWorldToEntities({schema:'warlike.gaia.world.v1',tiles:[{tileX:0,tileZ:0,collision:flat()}]})[0];
 const body={id:100,type:'player',x:-16,y:-16,w:32,h:64,depth3d:32,elevation3d:2,collision3d:true};
 const result=moveBody3d(body,0,0,-128,[terrain]);
 assert.equal(body.elevation3d,1);
 assert.equal(result.grounded,true);assert.equal(result.blockedZ,true);
 assert.equal(supportBody3d(body,[terrain],.1),terrain);
 assert.equal(terrainFloorAt3d(body,[terrain]).height,1);
});
test('Rigidbody integrates gravity and rests on Gaia heightfield',()=>{
 const terrain=gaiaWorldToEntities({schema:'warlike.gaia.world.v1',tiles:[{tileX:0,tileZ:0,collision:flat()}]})[0];
 const body={id:101,type:'object',x:-16,y:-16,w:32,h:32,depth3d:32,elevation3d:1.5,collision3d:true,rigidbody3d:{...defaultRigidbody3d(),restitution:0}};
 for(let i=0;i<80;i++)stepPhysics3d([body,terrain],1/60);
 assert.ok(Math.abs(body.elevation3d-1)<.003,'body should rest at the heightfield elevation');
 assert.equal(body.grounded3d,true);
});
test('3D terrain importer is exposed from Engine toolbar',async()=>{
 const {readFile}=await import('node:fs/promises');
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 const editor=await readFile(new URL('../js/editor.js',import.meta.url),'utf8');
 assert.match(html,/id="gaiaLoad"/);assert.match(html,/id="gaiaFile"/);assert.match(editor,/gaiaWorldToEntities/);
});
