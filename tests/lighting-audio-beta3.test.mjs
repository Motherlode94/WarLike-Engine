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
test('disabled and destroyed light GameObjects do not consume a light slot',()=>{
 const base={x:0,y:0,w:32,h:32,lightType:'point',lightIntensity:2,lightRange:10};
 for(const flags of [{enabled:false},{sequenceEnabled:false},{_sequenceDestroyed:true},{lightEnabled:false}])assert.equal(lightFromEntity({...base,...flags}),null);
 const lights=Array.from({length:8},()=>({...base,enabled:false}));lights.push({...base,x:500});assert.equal(visibleLights(lights,[0,0,0]).length,1);
});
test('spot pitch and roll rotate its beam while legacy yaw-only lights keep their direction',()=>{
 const base={x:0,y:0,w:32,h:32,lightType:'spot',lightIntensity:2,lightRange:10,rotation:0};
 assert.deepEqual(lightFromEntity(base).direction,[0,-.45,1]);
 const pitched=lightFromEntity({...base,rotationX3d:90}).direction;
 assert.ok(Math.abs(pitched[1]+1)<1e-9);assert.ok(Math.abs(pitched[2]+.45)<1e-9);
 const rolled=lightFromEntity({...base,rotationZ3d:90}).direction;assert.ok(Math.abs(rolled[0]-.45)<1e-9);
});
test('directional Transform mode uses authored rotation/color and disabled scene lights do not restore a global sun',()=>{
 const light={lightType:'directional',lightEnabled:true,lightIntensity:2,lightDirectionMode:'transform',rotationX3d:90,lightColor:'#ff0000'};
 const frame=sunAt(0,[light]);assert.equal(frame.intensity,2);assert.deepEqual(frame.color,[1,0,0]);assert.ok(Math.abs(frame.direction[1]-1)<1e-9);
 assert.notDeepEqual(frame.direction,sunAt(0,[{...light,rotationX3d:0}]).direction);
 assert.equal(sunAt(12,[{...light,enabled:false}]).intensity,0);assert.equal(sunAt(12,[{...light,sequenceEnabled:false}]).intensity,0);
 const legacy={...light};delete legacy.lightDirectionMode;
 assert.deepEqual(sunAt(12,[legacy]).direction,sunAt(12).direction);assert.deepEqual(sunAt(12,[legacy]).color,sunAt(12).color);
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

test('point and spot lights use ground depth3d instead of object height for world Z',()=>{
 for(const lightType of ['point','spot']){
  const base={x:64,y:128,w:64,h:192,depth3d:32,elevation3d:1,lightType,lightIntensity:2,lightRange:10};
  const light=lightFromEntity(base);
  assert.deepEqual(light.position,[1.5,4,2.25]);
  const resized=lightFromEntity({...base,depth3d:192});
  assert.deepEqual(resized.position,[1.5,4,3.5]);
  assert.equal(lightFromEntity({...base,depth3d:undefined}).position[2],3.5,'old scenes keep height fallback');
 }
});
