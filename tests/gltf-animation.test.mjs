import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {parseGlb} from '../js/assets/real-models-3d.js';
import {quaterniusModels3d} from '../js/assets/quaternius-game-assets.js';
import {sampleChannel,slerpQuaternion,sampleRigPose,deformGlbParts,resolveAnimationClip,animationClipForState} from '../js/core/gltf-animation.js';
const load=path=>{const b=readFileSync(new URL('../'+path.replace(/^\.\//,''),import.meta.url));return parseGlb(b.buffer.slice(b.byteOffset,b.byteOffset+b.length))};
const near=(a,b,tolerance=1e-5)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);
test('glTF channel interpolation respects STEP, linear, quaternion shortest path and cubic tangents',()=>{
 const base={times:[0,1],values:[0,10],components:1,path:'translation'};near(sampleChannel({...base,interpolation:'LINEAR'},.25)[0],2.5);near(sampleChannel({...base,interpolation:'STEP'},.9)[0],0);near(sampleChannel({...base,interpolation:'LINEAR'},2)[0],10);
 const spline={times:[0,1],values:[0,0,0,0,10,0],components:1,path:'translation',interpolation:'CUBICSPLINE'};near(sampleChannel(spline,.5)[0],5);
 const q=slerpQuaternion([0,0,0,1],[0,0,0,-1],.5);near(Math.hypot(...q),1);near(Math.abs(q[3]),1);
});
test('Kenney skinning preserves the bind pose and plays the actual walk cycle',()=>{
 const g=load('assets/free/kenney/mini-characters/character-male-a.glb');assert.equal(g.rig.animations.length,32);const rest=deformGlbParts(g,sampleRigPose(g.rig,null,0));for(let p=0;p<rest.length;p++)for(let i=0;i<rest[p].length;i++)near(rest[p][i],g.parts[p].vertices[i]);
 const walk=resolveAnimationClip(g.rig.animations,'walk'),a=deformGlbParts(g,sampleRigPose(g.rig,walk,0)),b=deformGlbParts(g,sampleRigPose(g.rig,walk,.3));assert.ok(a.some((p,i)=>p.some((v,k)=>Math.abs(v-b[i][k])>.005)),'joint poses must change vertex geometry');
});
test('the free Universal Animation Library includes 43 distinct clips with a compatible skinned mannequin',()=>{
 const g=load('assets/free/quaternius/universal-animation-library/ual1-standard.glb');assert.equal(g.rig.animations.length,43);for(const state of ['idle','walk','run','jump','attack','death'])assert.ok(resolveAnimationClip(g.rig.animations,state),state);
 const clip=resolveAnimationClip(g.rig.animations,'walk'),a=deformGlbParts(g,sampleRigPose(g.rig,clip,0)),b=deformGlbParts(g,sampleRigPose(g.rig,clip,.25));assert.ok(a.some((p,i)=>p.some((v,k)=>Math.abs(v-b[i][k])>.01)));assert.ok(b.every(p=>p.every(Number.isFinite)));
});
test('all 50 Ultimate Monsters retain their original animation channels and textures',()=>{
 const monsters=quaterniusModels3d.filter(a=>a.pack==='ultimate-monsters');assert.equal(monsters.length,50);let channels=0;
 for(const asset of monsters){const g=load(asset.url);assert.deepEqual(g.rig.animations.map(a=>a.name),asset.animationClips);assert.ok(g.parts.some(p=>p.texture),asset.id);assert.ok(resolveAnimationClip(g.rig.animations,'idle'),asset.id);channels+=g.rig.animations.length;const posed=deformGlbParts(g,sampleRigPose(g.rig,g.rig.animations[0],.2));assert.ok(posed.every(p=>p.every(Number.isFinite)),asset.id)}assert.equal(channels,506);
});
test('crossfades interpolate real poses without modifying source geometry',()=>{
 const g=load('assets/free/kenney/mini-characters/character-male-a.glb'),idle=resolveAnimationClip(g.rig.animations,'idle'),walk=resolveAnimationClip(g.rig.animations,'walk'),before=g.parts[0].vertices.slice();const pose=sampleRigPose(g.rig,walk,.2,{previous:{clip:idle,time:.3},blend:.5});const output=deformGlbParts(g,pose);assert.ok(output.every(p=>p.every(Number.isFinite)));assert.deepEqual(g.parts[0].vertices,before);
});

test('animation clocks wrap loops and clamp one-shot clips at their final pose',()=>{
 const g=load('assets/free/kenney/mini-characters/character-male-a.glb'),clip=resolveAnimationClip(g.rig.animations,'walk');const a=sampleRigPose(g.rig,clip,.2),b=sampleRigPose(g.rig,clip,clip.duration+.2);for(let i=0;i<a.world.length;i++)for(let k=0;k<16;k++)near(a.world[i][k],b.world[i][k]);const end=sampleRigPose(g.rig,clip,clip.duration,{loop:false}),late=sampleRigPose(g.rig,clip,100,{loop:false});for(let i=0;i<end.world.length;i++)assert.deepEqual(end.world[i],late.world[i]);
});

test('a one-frame attack signal finishes its real clip, while death and manual playback remain responsive',()=>{
 const idle={name:'idle',duration:1},attack={name:'attack',duration:.8},death={name:'death',duration:2},clips=[idle,attack,death],track={clip:attack,time:.2,oneShot:true};
 assert.equal(animationClipForState(clips,'idle',{},track),attack);assert.equal(animationClipForState(clips,'death',{},track),death);assert.equal(animationClipForState(clips,'idle',{},track,{automatic:false}),idle);assert.equal(animationClipForState(clips,'idle',{}, {...track,time:1}),idle);
});
