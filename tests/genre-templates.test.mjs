import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGenreScene,genreTemplates,normalizeGenre} from '../js/core/genre-templates.js';
import {applyRecipe,recipes} from '../js/core/gameplay-recipes.js';
import {createBlueprintPreset} from '../js/core/blueprint-presets.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const genres=['rp','racing','simulation','rpg','fourx'];

test('five genres and sandbox are supported in both WarLike workspaces',()=>{
 assert.deepEqual(Object.keys(genreTemplates),['sandbox',...genres]);
 assert.equal(normalizeGenre('__invalid__'),'sandbox');
 for(const mode of ['2d','3d'])for(const genre of genres){
  const scene=createGenreScene(genre,mode);
  assert.ok(scene.entities.length>=4,genre+' '+mode);
  assert.equal(scene.nextId,scene.entities.length+1);
  assert.deepEqual(scene.entities.map(e=>e.id),scene.entities.map((_,i)=>i+1));
  assert.ok(scene.entities.some(e=>e.type==='player'||e.playable3d===true));
  assert.ok(scene.entities.some(e=>e.sequence?.enabled),'expected Blueprint sequence');
  assert.ok(scene.entities.every(e=>Number.isFinite(e.x)&&Number.isFinite(e.y)));
 }
});
test('Racing templates provide a driveable car and race gates',()=>{
 for(const mode of ['2d','3d']){
  const scene=createGenreScene('racing',mode);
  const car=scene.entities.find(e=>e.tags?.includes('race-vehicle'));
  assert.ok(car);
  assert.equal(car.type,mode==='3d'?'mesh3d':'prefab');
  assert.ok(scene.entities.some(e=>e.name==='Checkpoint 1'&&e.sequence?.event==='enter'));
  assert.ok(scene.entities.some(e=>e.name==='Arrivée'&&e.sequence?.branches?.length));
 }
});
test('4X starter supplies exploration expansion economy and turn signals',()=>{
 const entities=createGenreScene('fourx','3d').entities;
 assert.ok(entities.some(e=>e.tags?.includes('4x-city')));
 for(const step of ['Explorer','Coloniser','Mines','Fin du tour']){
  assert.ok(entities.some(e=>e.name===step&&e.sequence),step);
 }
 const turn=entities.find(e=>e.name==='Fin du tour').sequence;
 assert.ok(turn.instructions.some(i=>i.type==='addVariable'&&i.key==='turn'));
});
test('all added recipes and visual logic presets produce valid sequences',()=>{
 const ids=['rp-citizen','rp-job','sim-machine','sim-contract','rpg-quest','rpg-sanctuary','fourx-explore','fourx-expand','fourx-end-turn'];
 for(const id of ids){
  assert.ok(recipes.some(r=>r.id===id),'recipe '+id);
  const obj={id:1,type:'object',x:0,y:0,w:50,h:50};
  assert.equal(applyRecipe(obj,id),true);
  assert.ok(obj.sequence?.enabled);
 }
 for(const id of ['rp-dialogue','sim-production','rpg-quest','4x-end-turn']){
  assert.ok(createBlueprintPreset(id,'3d').enabled,id);
  assert.ok(createBlueprintPreset(id,'2d').enabled,id);
 }
});
test('Hub stores genre in each project and exposes selector',()=>{
 const hub=read('js/core/project-hub.js'),html=read('index.html');
 assert.ok(html.includes('id="hubProjectGenre"'));
 assert.match(hub,/genre:hub\.genre/);
 assert.match(hub,/genre:normalizeGenre\(data\.genre\|\|meta\.genre\)/);
 assert.match(hub,/createGenreScene\(chosenGenre,'2d'\)/);
 assert.match(hub,/createGenreScene\(chosenGenre,'3d'\)/);
 assert.match(hub,/genreSelect\.value/);
});
