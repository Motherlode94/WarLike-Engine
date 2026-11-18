import test from 'node:test';
import assert from 'node:assert/strict';
import {environmentProbeUniforms3d,defaultEnvironmentProbe3d} from '../js/core/environment-probes-3d.js';
import {canonicalScene} from '../js/core/scene-contract.js';

test('local HDRI influence volumes use world position and color with safe limits',()=>{
 const probes=[
  {id:1,x:64,y:128,w:128,h:64,depth3d:256,elevation3d:1,environmentProbe3d:{...defaultEnvironmentProbe3d(),tint:'#ff8040',radius:12,strength:1.2}},
  {id:2,x:0,y:0,w:64,h:64,depth3d:64,elevation3d:0,environmentProbe3d:{...defaultEnvironmentProbe3d(),enabled:false}},
  {id:3,x:0,y:0,w:64,h:64,depth3d:64,elevation3d:0,environmentProbe3d:{...defaultEnvironmentProbe3d(),strength:99}},
 ];
 const data=environmentProbeUniforms3d(probes);
 assert.equal(data.count,2);
 assert.deepEqual(Array.from(data.positions.slice(0,3)),[2,1.5,4]);
 assert.ok(Math.abs(data.tints[0]-1)<1e-7);
 assert.ok(Math.abs(data.tints[1]-128/255)<1e-7);
 assert.equal(data.radius[0],12);
 assert.equal(data.strength[1],4);
});
test('no invalid or disabled probes become active and scene V2 stores component',()=>{
 assert.equal(environmentProbeUniforms3d([]).count,0);
 const o={id:4,name:'Local HDR zone',x:0,y:0,w:64,h:64,depth3d:64,elevation3d:0,environmentProbe3d:defaultEnvironmentProbe3d()};
 const scene=canonicalScene([o]);
 assert.ok(scene.objects[0].components.some(c=>c.type==='environmentProbe3d'));
});
