import test from 'node:test';
import assert from 'node:assert/strict';
import {oceanDefaults,oceanSettings,oceanSample,waterBuoyancy2d,waterBuoyancy3d} from '../js/core/ocean-system.js';
import {waterHeight,waterSurface3d,waterSettings} from '../js/core/stylized-water.js';

test('ocean samples are deterministic and normals stay normalized',()=>{
 const a=oceanSample(3,4,1.5),b=oceanSample(3,4,1.5);
 assert.deepEqual(a,b);
 assert.ok(Math.abs(Math.hypot(...a.normal)-1)<1e-9);
 assert.ok(Math.abs(a.height-oceanDefaults.level)<=oceanDefaults.amplitude+1e-8);
});
test('2D ocean style uses the same sampler as the 3D ocean system',()=>{
 const options={style:'ocean',amplitude:.42,speed:1.25,wavelength:6};
 assert.equal(waterHeight(4,0,2,options),oceanSample(4,0,2,{...oceanSettings(options),...waterSettings(options),amplitude:.42,speed:1.25}).height);
 const mesh=waterSurface3d(8,8,2,{...options,segments:8});
 assert.ok(mesh.length>0&&mesh.length%18===0);
 for(let i=0;i<mesh.length;i++)assert.ok(Number.isFinite(mesh[i]));
});
test('buoyancy is zero when fully above surface and positive when submerged',()=>{
 const water={amplitude:0,level:0,density:1000};
 for(const calc of [waterBuoyancy2d,waterBuoyancy3d]){
  const geom=calc===waterBuoyancy2d?{area:2}:{volume:2};
  const above=calc({x:0,z:0,y:5,height:1,density:500,...geom},water,0);
  const below=calc({x:0,z:0,y:-5,height:1,density:500,...geom},water,0);
  assert.equal(above.submerged,0);assert.equal(above.forceY,0);
  assert.equal(below.submerged,1);assert.ok(below.netForceY>0);
 }
});
test('ocean options clamp unsafe inputs and avoid NaN from a zero direction',()=>{
 const w=oceanSettings({amplitude:-5,secondaryWaves:500,directionX:0,directionZ:0,steepness:4});
 assert.equal(w.amplitude,0);assert.equal(w.secondaryWaves,6);assert.equal(w.directionX,1);assert.equal(w.directionZ,0);
 assert.equal(w.steepness,.85);
 assert.deepEqual(oceanSample(0,0,0,{enabled:false}),{x:0,z:0,height:0,normal:[0,1,0],offsetX:0,offsetZ:0});
});
