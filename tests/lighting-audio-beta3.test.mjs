import test from 'node:test';
import assert from 'node:assert/strict';
import {lighting,sunAt,lightFromEntity,visibleLights,updateLighting} from '../js/core/lighting.js';
import {distanceGain,soundChoices} from '../js/core/audio-sources.js';

test('sun and sky are brighter at noon than at midnight',()=>{
 const noon=sunAt(12),night=sunAt(0);
 assert.ok(noon.intensity>night.intensity);assert.ok(noon.sky[2]>night.sky[2]);
});
test('point light components map to 3D coordinates and respect disable',()=>{
 const e={x:64,y:128,w:64,h:64,elevation3d:2,lightType:'point',lightIntensity:3,lightRange:15,lightColor:'#ff8040'};
 const l=lightFromEntity(e);
 assert.deepEqual(l.position,[1.5,3,2.5]);assert.ok(l.intensity>0);
 assert.equal(lightFromEntity({...e,lightEnabled:false}),null);
});
test('up to eight nearest lights are used',()=>{
 const e=Array.from({length:12},(_,i)=>({x:i*64,y:0,w:32,h:32,lightType:'point',lightIntensity:1,lightRange:10}));
 assert.equal(visibleLights(e,[0,0,0]).length,8);
});
test('day-night advances only during play',()=>{
 const initial={...lighting};
 try{lighting.dayNight=true;lighting.speed=60;lighting.hour=8;updateLighting(60,false);assert.equal(lighting.hour,8);for(let frame=0;frame<600;frame++)updateLighting(.1,true);assert.ok(Math.abs(lighting.hour-9)<1e-9);updateLighting(60,true);assert.ok(lighting.hour<9.01,'long background frames are clamped')}
 finally{Object.assign(lighting,initial)}
});
test('spatial audio attenuates and includes selectable cues',()=>{
 assert.equal(distanceGain(0,10),1);assert.equal(distanceGain(10,10),0);assert.ok(distanceGain(3,10)>distanceGain(7,10));
 assert.ok(soundChoices.includes('vehicle'));
});
