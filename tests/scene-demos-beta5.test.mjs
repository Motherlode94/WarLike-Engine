import test from 'node:test';
import assert from 'node:assert/strict';
import {state} from '../js/core/state.js';
import {workspace} from '../js/core/workspaces.js';
import {getAsset} from '../js/assets/catalog.js';
import {get3dAsset} from '../js/assets/catalog-3d.js';
globalThis.document={
 dispatchEvent:()=>true,
 querySelector:()=>({textContent:'',disabled:false,replaceChildren(){},append(){}}),
 createElement:()=>({textContent:'',classList:{toggle(){}},onclick:null})
};
const scene=await import('../js/core/scene.js');
const check=(name)=>{
 const all=state.entities;assert.ok(all.length>0,name+' must create objects');
 assert.equal(new Set(all.map(e=>e.id)).size,all.length,name+' must have unique IDs');
 assert.equal(state.nextId,Math.max(...all.map(e=>e.id))+1,name+' nextId');
 for(const o of all){
  if(o.type==='prefab')assert.ok(getAsset(o.assetId),'unknown 2D asset '+o.assetId+' in '+name);
  if(o.type==='mesh3d')assert.ok(get3dAsset(o.assetId),'unknown 3D asset '+o.assetId+' in '+name);
 }
};
test('all 2D demos create a complete scene with playable character and known prefabs',()=>{
 state.playing=false;workspace.mode='2d';
 for(const name of ['loadCombatDemo','loadDrivingDemo','loadLogicDemo','loadRpgDemo','loadNinjaZombieDemo','loadBuildingDemo','loadElementsDemo']){
  scene[name]();check(name);
  assert.ok(state.entities.some(e=>e.type==='player'||e.type==='character'||e.type==='prefab'&&getAsset(e.assetId)?.category==='Characters'),name+' missing playable character');
 }
 for(const mode of ['deathmatch','teamDeathmatch','battleRoyale','roleplay','frontline']){
  scene.loadGameModeDemo(mode);check(mode);
  assert.equal(state.entities.find(e=>e.gameMode)?.gameMode.kind,mode);
 }
});
test('3D Town, Nature and Garage demos use native mesh prefabs and one playable hero',()=>{
 state.playing=false;workspace.mode='3d';
 for(const kind of ['town','nature','garage']){
  scene.load3dBetaDemo(kind);check(kind);
  assert.equal(state.entities.filter(e=>e.playable3d).length,1);
  assert.ok(state.entities.some(e=>e.type==='mesh3d'));
  assert.ok(state.entities.some(e=>e.sequence),'demo must provide real gameplay behaviours');
  assert.ok(state.entities.some(e=>e.adventure||e.survival),'demo must provide a guided activity');
 }
});
test('3D demo loader cannot overwrite 2D project',()=>{
 workspace.mode='2d';
 const previous=JSON.stringify(state.entities);
 scene.load3dBetaDemo('town');
 assert.equal(JSON.stringify(state.entities),previous);
});

test('genre demo catalog filters project modes and restores complete scene sets through the normal loader',async()=>{
 const {starterDemosForMode}=await import('../js/core/demo-catalog.js');const {gameProject}=await import('../js/core/game-project.js');
 for(const mode of ['2d','3d']){
  workspace.mode=mode;state.playing=false;
  const entries=starterDemosForMode(mode);assert.ok(entries.length>=10);
  assert.equal(entries.some(e=>e.genre==='lifesim'),mode==='2d');assert.equal(entries.some(e=>e.genre==='company'),mode==='3d');
  for(const entry of entries){assert.equal(scene.loadAuthoredDemo(entry.id),true);check(entry.name);assert.equal(gameProject.genre,entry.genre);assert.ok(state.entities.some(o=>o.id===state.selected[0]));if(entry.genre==='adventure')assert.ok(gameProject.scenes.some(s=>s.id==='echo-valley'));}
 }
});
