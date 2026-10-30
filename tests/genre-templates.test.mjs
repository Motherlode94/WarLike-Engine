import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGenreScene,genreTemplates,normalizeGenre} from '../js/core/genre-templates.js';
import {applyRecipe,recipes} from '../js/core/gameplay-recipes.js';
import {createBlueprintPreset} from '../js/core/blueprint-presets.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const genres=['rp','racing','simulation','rpg','fourx'];

test('five genres and sandbox are supported in both WarLike workspaces',()=>{
 for(const genre of ['sandbox','fieldlab','tactical','openworld','survival','rts','horror',...genres])assert.ok(genreTemplates[genre],genre);
 for(const [id,template] of Object.entries(genreTemplates))assert.deepEqual(template.modes,id==='platformer'?['2d']:['battlefield','company'].includes(id)?['3d']:['2d','3d']);
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
 for(const step of ['Explorer','Coloniser','Mines','Fin du tour','Camp ennemi']){
  assert.ok(entities.some(e=>e.name===step&&e.sequence),step);
 }
 const turn=entities.find(e=>e.name==='Fin du tour').sequence;
 assert.ok(turn.instructions.some(i=>i.type==='addVariable'&&i.key==='turn'));
});
test('all added recipes and visual logic presets produce valid sequences',()=>{
 const ids=['rp-citizen','rp-job','sim-machine','sim-contract','rpg-quest','rpg-sanctuary','fourx-explore','fourx-expand','fourx-end-turn','fourx-conquer'];
 for(const id of ids){
  assert.ok(recipes.some(r=>r.id===id),'recipe '+id);
  const obj={id:1,type:'object',x:0,y:0,w:50,h:50};
  assert.equal(applyRecipe(obj,id),true);
  assert.ok(obj.sequence?.enabled);
 }
 for(const id of ['rp-dialogue','sim-production','rpg-quest','4x-end-turn','4x-conquer']){
  assert.ok(createBlueprintPreset(id,'3d').enabled,id);
  assert.ok(createBlueprintPreset(id,'2d').enabled,id);
 }
});
test('Hub exposes the project type selector and keeps genre metadata in saves',()=>{
 const hub=read('js/core/project-hub.js'),html=read('index.html');assert.ok(html.includes('id="hubProjectGenre"'));assert.match(hub,/genre:hub\.genre/);
});
test('five starter genres attach supported .NET C# components to scene objects',()=>{
 const mapping={rp:'Roleplay',racing:'RacingRules',simulation:'SimulationEconomy',rpg:'RpgProgression',fourx:'FourXEmpire'};
 const engine=read('csharp/WarLike.Runtime/Engine.cs');
 for(const [genre,kind] of Object.entries(mapping)){
  const scene=createGenreScene(genre,'3d');
  assert.ok(scene.entities.some(o=>o.csharpComponents?.some(c=>c.kind===kind)),'missing '+kind);
  assert.ok(engine.includes('case "'+kind+'":'),'native loader missing '+kind);
 }
});
test('native genre actions are wired from C# runtime panel to local bridge',()=>{
 const bridge=read('csharp/WarLike.Bridge/Program.cs'),ui=read('js/ui/csharp-runtime.js'),html=read('index.html');
 const kinds=read('csharp/WarLike.Runtime/GenreComponents.cs');
 for(const action of ['rp-work','race-start','sim-produce','rpg-complete','4x-next-turn']){
  assert.ok(bridge.includes('case "'+action+'"'),'bridge action '+action);
  assert.ok(ui.includes("'"+action+"'"),'ui action '+action);
  assert.ok(html.includes('value="'+action+'"'),'select action '+action);
 }
 for(const name of ['RoleplayComponent','RacingRulesComponent','SimulationEconomyComponent','RpgProgressionComponent','FourXEmpireComponent'])
  assert.ok(kinds.includes('class '+name),'C# behaviour '+name);
 assert.ok(html.includes('id="csharpGenreExecute"'));
});

test('Field Lab is a reversible diagnostics course in both workspaces',()=>{
 for(const mode of ['2d','3d']){
  const scene=createGenreScene('fieldlab',mode);
  const names=scene.entities.map(o=>o.name);
  for(const name of ['01 · Test marche','02 · Console interactive','03 · Véhicule test','04 · Test conduite','05 · Diagnostic final','Obstacle collision A','Obstacle collision B'])assert.ok(names.includes(name),name+' in '+mode);
  const car=scene.entities.find(o=>o.tags?.includes('fieldlab-vehicle'));
  assert.equal(car.type,mode==='3d'?'mesh3d':'prefab');
  assert.ok(scene.entities.some(o=>o.sequence?.conditions?.some(c=>c.type==='playerOnFoot')));
  assert.ok(scene.entities.some(o=>o.sequence?.conditions?.some(c=>c.type==='playerInVehicle')));
  assert.ok(scene.entities.some(o=>o.sequence?.branches?.some(b=>b.conditions?.some(c=>c.key==='labDrive'))));
  assert.deepEqual(scene.selected,[1]);
  assert.ok(scene.entities.every((o,i)=>o.id===i+1));
 }
 const logic=read('js/core/logic-sequences.js');
 assert.match(logic,/case 'playerInVehicle'/);
 assert.match(logic,/case 'playerOnFoot'/);
 const hud=read('js/ui/genre-hud.js');
 assert.match(hud,/genre==='fieldlab'/);
 const html=read('index.html');
 assert.match(html,/value="fieldlab"/);
});
