import test from 'node:test';
import assert from 'node:assert/strict';
import {gaiaWorldPreviewMesh} from '../js/core/gaia-world-preview-3d.js';
import {GAIA_TERRAIN_SCHEMA} from '../js/core/gaia-terrain-physics.js';
const tile=(offsetX=0)=>({tileX:Math.round(offsetX/20),tileZ:0,collision:{
 schema:GAIA_TERRAIN_SCHEMA,resolution:3,size:20,height:10,offsetX,offsetZ:0,
 heights:[0,0,0,0,.8,0,0,0,0]}});
test('Gaia dialog preview samples real heightfields without scene insertion',()=>{
 const world={schema:'warlike.gaia.world.v1',tiles:[tile()]},before=structuredClone(world);
 const m=gaiaWorldPreviewMesh(world,{cellsPerTile:4});
 assert.equal(m.tiles,1);
 assert(m.faces.length>0);
 assert(m.bounds.maxY>0);
 assert.deepEqual(world,before);
});
test('Gaia dialog 3D preview handles adjacent world tiles',()=>{
 const m=gaiaWorldPreviewMesh({schema:'warlike.gaia.world.v1',tiles:[tile(),tile(20)]});
 assert.equal(m.tiles,2);assert.equal(m.bounds.minX,-10);assert.equal(m.bounds.maxX,30);
});
test('Gaia preview rejects malformed worlds and invalid mesh density',()=>{
 assert.throws(()=>gaiaWorldPreviewMesh({tiles:[]}),/Monde Gaia invalide/);
 assert.throws(()=>gaiaWorldPreviewMesh({schema:'warlike.gaia.world.v1',tiles:[tile()]},{cellsPerTile:0}),/Résolution/);
});
