import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeEditableTerrain} from '../js/core/gaia-terrain-sculpt.js';
import {gaiaPreviewFrame} from '../js/core/gaia-preview-camera.js';

function tile(id,x=0,z=0,size=20){
 const entity={id,name:'Gaia '+id,type:'terrain3d',x:x*64,y:z*64,w:size*64,depth3d:size*64,enabled:true};
 initializeEditableTerrain(entity,{resolution:5,maxHeight:10});
 entity.terrainHeightfield.heights[12]=.8;
 return entity;
}
test('Gaia 3D preview frames real heightfield bounds in metres',()=>{
 const t=tile(1);
 const frame=gaiaPreviewFrame([t]);
 assert.deepEqual(frame.target,[10,4,10]);
 assert.deepEqual(frame.dimensions,[20,8,20]);
 assert.equal(frame.tiles,1);
 assert(frame.radius>20);
});
test('3D preview frames adjacent Gaia tiles as one world',()=>{
 const a=tile(1),b=tile(2,20,0);
 const frame=gaiaPreviewFrame([a,b]);
 assert.deepEqual(frame.target,[20,4,10]);
 assert.deepEqual(frame.dimensions,[40,8,20]);
 assert.equal(frame.tiles,2);
});
test('preview orbit and zoom can change without altering Gaia data',()=>{
 const t=tile(1),before=structuredClone(t);
 const initial=gaiaPreviewFrame([t]);
 const edited=gaiaPreviewFrame([t],{yaw:1.2,pitch:1.1,zoom:.5});
 assert.equal(edited.yaw,1.2);assert.equal(edited.pitch,1.1);
 assert(edited.radius<initial.radius);
 assert.deepEqual(t,before);
});
test('preview ignores disabled or invalid heightfields',()=>{
 const disabled=tile(1);disabled.enabled=false;
 assert.equal(gaiaPreviewFrame([disabled]),null);
 assert.equal(gaiaPreviewFrame([{id:1,terrainHeightfield:{}}]),null);
});
test('preview clamps unsafe camera inputs',()=>{
 const frame=gaiaPreviewFrame([tile(1)],{pitch:9,zoom:-1});
 assert.equal(frame.pitch,1.4);
 assert(frame.radius>0);
 assert(Number.isFinite(frame.radius));
});
