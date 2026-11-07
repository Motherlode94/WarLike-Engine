// Exercise the unpacked archive's runtime, rather than importing editor sources.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const output=path.resolve(process.argv[2]||'.validation-tools/exported-game/dist'),base=pathToFileURL(output+'/');
globalThis.document={dispatchEvent(){}};
globalThis.CustomEvent??=class extends Event{constructor(name,options){super(name);this.detail=options?.detail}};
const load=name=>import(new URL('js/core/'+name+'.js',base));
const {state}=await load('state'),{workspace}=await load('workspaces'),{restoreGameProject}=await load('game-project');
const {webScriptRuntime}=await load('web-script-runtime'),{startRuntimeSession,runRuntimeFrame,runtimeSession,stopRuntimeSession}=await load('runtime-session');
const {cacheAnimationGeometry,sampleEntityRigPose}=await load('skeletal-animation');
const {parseGlb}=await import(new URL('js/assets/real-models-3d.js',base));
const {animatorPoseOptions}=await load('animator-graph'),{deformGlbParts}=await load('gltf-animation');
const {saveGameSlot,queueLoadGame,applySessionChange,resetGameSession}=await load('game-session');
const {sequenceRuntime}=await load('logic-sequences');
const data=JSON.parse(await readFile(path.join(output,'game.json'),'utf8'));restoreGameProject(data.project);resetGameSession();workspace.mode=data.mode;state.entities=structuredClone(data.project.scenes[0].entities);
const actor=state.entities[0],id=actor.model3dId,bytes=await readFile(path.join(output,'assets/imported/'+id+'.glb')),geometry=parseGlb(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));cacheAnimationGeometry(id,geometry);
webScriptRuntime.load=source=>import('data:text/javascript,'+encodeURIComponent(source));
state.playing=true;startRuntimeSession();runRuntimeFrame(.02,{canRun:()=>true});await runtimeSession.completion;assert.equal(runtimeSession.phase,'ready',runtimeSession.error);
const frames=[];
for(let i=0;i<200;i++){
 runRuntimeFrame(.02,{canRun:()=>true});
 if(i===9||i===19){const options=animatorPoseOptions(actor._animatorFrame,geometry.rig.animations);frames.push(deformGlbParts(geometry,sampleEntityRigPose(actor,geometry,options,state.entities)).map(p=>p.slice()));}
}
assert.equal(runtimeSession.phase,'ready',runtimeSession.error);assert.equal(actor.webScripts[0].runtime.fields.frames,200);assert.ok(Math.abs(actor.x-96)<.001,'the scripted actor must stop against the wall');assert.ok(Math.abs(state.entities[3].rotation-180)<.001,'WarScript must rotate the second object');assert.ok(frames[0].some((part,i)=>part.some((v,k)=>Math.abs(v-frames[1][i][k])>.001)),'the actual GLB vertices must animate');
const memory=new Map(),ctx={entities:state.entities,globals:sequenceRuntime.globals,fired:new Set(),storage:{setItem:(k,v)=>memory.set(k,v),getItem:k=>memory.get(k)}};
saveGameSlot(ctx);actor.x=-200;actor.webScripts[0].runtime.fields.frames=-1;ctx.globals.validationFrames=-1;
queueLoadGame(ctx);applySessionChange(ctx);assert.ok(Math.abs(ctx.entities[0].x-96)<.001);assert.equal(ctx.entities[0].webScripts[0].runtime.fields.frames,200);assert.equal(ctx.globals.validationFrames,200);
stopRuntimeSession();state.playing=false;
console.log(JSON.stringify({archive:output,frames:200,animations:'passed',collisionX:ctx.entities[0].x,javascript:'passed',warScript:'passed',saveRestore:'passed'}));
