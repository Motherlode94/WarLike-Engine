import test from 'node:test';
import assert from 'node:assert/strict';
import {autoBoneMap} from '../js/core/skeletal-animation.js';
import {viewportPixelSize} from '../js/core/render-quality.js';
import {readFileSync} from 'node:fs';

const rig=names=>({nodes:names.map(name=>({name}))});
test('retarget maps exporter aliases, preserving both sides of a skeleton',()=>{
 const source=rig(['mixamorig:LeftForeArm','mixamorig:RightForeArm','mixamorig:Hips','mixamorig:LeftThigh','mixamorig:RightThigh']);
 const target=rig(['leftLowerArm','rightLowerArm','pelvis','leftUpLeg','rightUpLeg']);
 const map=autoBoneMap(source,target);
 assert.equal(map['mixamorig:LeftForeArm'],'leftLowerArm');
 assert.equal(map['mixamorig:RightForeArm'],'rightLowerArm');
 assert.equal(map['mixamorig:Hips'],'pelvis');
 assert.equal(map['mixamorig:LeftThigh'],'leftUpLeg');
 assert.equal(map['mixamorig:RightThigh'],'rightUpLeg');
 assert.equal(new Set(Object.values(map)).size,Object.keys(map).length);
});
test('retarget avoids ambiguous duplicate bones rather than using an unsafe match',()=>{
 const map=autoBoneMap(rig(['leftArm','leftUpperArm']),rig(['leftArm']));
 assert.equal(map.leftArm,undefined);
 assert.equal(map.leftUpperArm,undefined);
 assert.deepEqual(autoBoneMap(rig(['rightArm']),rig(['rightArm','rightUpperArm'])),{});
});
test('high DPI viewport keeps proportions and caps large drawing buffers',()=>{
 const ordinary=viewportPixelSize(800,600,2);
 assert.deepEqual({width:ordinary.width,height:ordinary.height},{width:1600,height:1200});
 const large=viewportPixelSize(3840,2160,3);
 assert.ok(large.width*large.height<=2560*1440+5000);
 assert.ok(Math.abs(large.width/large.height-3840/2160)<.001);
 assert.deepEqual(viewportPixelSize(0,0,2),{width:1,height:1,scale:1});
 const viewport=readFileSync(new URL('../js/core/viewport-3d.js',import.meta.url),'utf8');
 assert.ok(viewport.includes('viewportPixelSize(host.clientWidth,host.clientHeight'));
});
