import test from 'node:test';
import assert from 'node:assert/strict';
import {createTownDemo,createGarageDemo,createNatureDemo} from '../js/core/authored-demo-scenes.js';
import {createBundledPhysicsScene2d} from '../js/core/bundled-physics-scene.js';
import {inspectBlueprintGame} from '../js/core/blueprint-validation.js';
import {getAsset} from '../js/assets/catalog.js';
import {get3dAsset} from '../js/assets/catalog-3d.js';
import {gameSession,saveGameSlot,queueLoadGame} from '../js/core/game-session.js';
import {restoreGameProject,gameProject} from '../js/core/game-project.js';
import {resetSequences,updateSequences,sequenceRuntime,chooseSequenceDialogue} from '../js/core/logic-sequences.js';
import {questItemCount} from '../js/core/quest-inventory.js';
import {adventureTarget} from '../js/core/adventure-runtime.js';
import {interactionCenter} from '../js/core/interaction-range.js';
import {moveBody2d} from '../js/core/physics-2d.js';
import {moveBody3d} from '../js/core/collision-3d.js';
import {prepareGameDefinition} from '../js/core/game-build.js';

const boot=(factory,mode)=>{restoreGameProject({id:'demo-'+mode,genre:factory===createGarageDemo?'racing':factory===createNatureDemo?'survival':'adventure'});resetSequences();const scene=factory(mode),f={...scene,mode,storage:memory()};f.p=f.entities.find(object=>object.id===f.playerId||object.id===f.selected[0]);f.tick=(keys=[])=>{f.p=f.entities.find(object=>object.id===f.p.id);updateSequences(.1,{playing:true,entities:f.entities,player:f.p,mode,keys:new Set(keys),storage:f.storage});f.p=f.entities.find(object=>object.id===f.p.id)};f.tick();return f};
const memory=()=>{const map=new Map();return {getItem:key=>map.get(key),setItem:(key,value)=>map.set(key,value)}};
const named=(f,name)=>f.entities.find(object=>object.name===name);
function approach(f,target){const c=interactionCenter(target,f.mode);for(const [x,y] of [[0,105],[-105,0],[105,0],[0,-105]]){f.p.x=c.x+x-f.p.w/2;f.p.y=c.y+y-(f.mode==='3d'?f.p.depth3d:f.p.h)/2;if(adventureTarget(f.p,f.entities,{mode:f.mode})===target)return}throw Error('Interaction inaccessible : '+target.name)}
const interact=(f,target)=>{approach(f,target);f.tick(['e']);f.tick()};
const answer=(f,index)=>{assert.ok(gameSession.dialogue);assert.equal(chooseSequenceDialogue(index,{id:gameSession.dialogue.id,actorId:f.p.id}),true);f.tick();f.tick()};

test('authored scenes have unique IDs, real referenced assets, valid Blueprints and exportable gameplay',()=>{
 for(const mode of ['2d','3d'])for(const create of [createTownDemo,createGarageDemo,createNatureDemo]){
  const scene=create(mode);assert.equal(new Set(scene.entities.map(object=>object.id)).size,scene.entities.length);assert.equal(scene.nextId,Math.max(...scene.entities.map(object=>object.id))+1);
  assert.equal(scene.entities.filter(object=>object.playable3d).length,mode==='3d'?1:0);
  for(const object of scene.entities)if(object.assetId){const asset=mode==='3d'?get3dAsset(object.model3dId||object.assetId):getAsset(object.assetId);assert.ok(asset,object.assetId);if(mode==='3d')assert.equal(asset.shape,'glb')}
  assert.deepEqual(inspectBlueprintGame(scene.entities).filter(issue=>issue.severity==='error'),[]);
  const definition=prepareGameDefinition({...scene,mode,project:{...gameProject,genre:scene.genre}});assert.equal(definition.project.genre,scene.genre);
 }
});

for(const mode of ['2d','3d'])test(mode+' town requires the mission, fuse and power before the rescue and return',()=>{
 const f=boot(createTownDemo,mode),mara=named(f,'Mara · responsable du quartier'),fuse=named(f,'Caisse de maintenance'),relay=named(f,'Tableau du relais'),scout=named(f,'Éclaireur · accès bloqué'),gate=named(f,'Barrière motorisée');
 interact(f,scout);assert.equal(sequenceRuntime.globals.demoRescued,0);interact(f,relay);assert.equal(relay.lightEnabled,false);interact(f,fuse);assert.notEqual(fuse.visible,false);
 interact(f,mara);answer(f,1);assert.equal(sequenceRuntime.globals.demoAccepted,0);interact(f,mara);answer(f,0);assert.equal(gameSession.objectives.demoMeet.status,'complete');
 interact(f,fuse);assert.equal(questItemCount(f.entities,'demo-fuse'),1);assert.equal(fuse.visible,false);
 const c=interactionCenter(gate,mode);f.p.x=c.x-300;f.p.y=c.y-(mode==='3d'?f.p.depth3d:f.p.h)/2;
 assert.equal((mode==='3d'?moveBody3d(f.p,600,0,0,f.entities):moveBody2d(f.p,600,0,f.entities)).blockedX,true);
 interact(f,relay);assert.equal(questItemCount(f.entities,'demo-fuse'),0);assert.equal(relay.lightEnabled,true);assert.equal(gate.collision3d,false);assert.equal(gate.visible,false);
 f.p.x=c.x-300;f.p.y=c.y-(mode==='3d'?f.p.depth3d:f.p.h)/2;assert.equal((mode==='3d'?moveBody3d(f.p,600,0,0,f.entities):moveBody2d(f.p,600,0,f.entities)).blockedX,false);
 interact(f,scout);assert.equal(scout.stats.health,100);assert.equal(gameSession.phase,'playing');interact(f,mara);assert.equal(gameSession.phase,'won');assert.equal(Object.values(gameSession.objectives).filter(goal=>goal.status==='complete').length,5);assert.deepEqual(sequenceRuntime.errors,[]);
});

test('town can resume from the saved fuse without replaying its collection',()=>{
 const f=boot(createTownDemo,'2d');interact(f,named(f,'Mara · responsable du quartier'));answer(f,0);interact(f,named(f,'Caisse de maintenance'));
 saveGameSlot({entities:f.entities,globals:sequenceRuntime.globals,fired:sequenceRuntime.fired,storage:f.storage});interact(f,named(f,'Tableau du relais'));queueLoadGame({storage:f.storage});f.tick();
 assert.equal(sequenceRuntime.globals.demoPowered,0);assert.equal(questItemCount(f.entities,'demo-fuse'),1);assert.equal(named(f,'Caisse de maintenance').visible,false);interact(f,named(f,'Tableau du relais'));assert.equal(sequenceRuntime.globals.demoPowered,1);
});

for(const mode of ['2d','3d'])test(mode+' driving demo rejects foot checkpoints and out-of-order laps',()=>{
 const f=boot(createGarageDemo,mode);interact(f,named(f,'Briefing · piste'));assert.equal(sequenceRuntime.globals.raceStarted,1);
 const enter=name=>{const c=interactionCenter(named(f,name),mode);f.p.x=c.x-f.p.w/2;f.p.y=c.y-(mode==='3d'?f.p.depth3d:f.p.h)/2;f.tick();f.p.x=50;f.p.y=50;f.tick()};
 enter('Virage est');assert.equal(sequenceRuntime.globals.raceCheckpoint,0);f.p._hiddenInVehicle=true;enter('Ligne du nord');assert.equal(sequenceRuntime.globals.raceCheckpoint,0);
 for(const name of ['Virage est','Ligne du nord','Virage ouest','Ligne d’arrivée'])enter(name);
 assert.equal(sequenceRuntime.globals.raceCheckpoint,4);assert.equal(sequenceRuntime.globals.raceFinished,1);assert.equal(gameSession.phase,'won');assert.deepEqual(sequenceRuntime.errors,[]);
});

test('nature reserves an open camp and separates its resources from the nighttime threats',()=>{
 for(const mode of ['2d','3d']){const scene=createNatureDemo(mode),player=scene.entities.find(object=>object.survival),resources=scene.entities.filter(object=>object.survivalNode),threats=scene.entities.filter(object=>object.survivalThreat);assert.equal(resources.length,8);assert.equal(threats.length,2);assert.ok(player.survival.buildTemplates);assert.ok(player.survivalWorld);assert.ok(threats.every(object=>Math.hypot(object.x-player.x,object.y-player.y)>1000));assert.ok(resources.some(object=>object.survivalNode.kind==='water'&&object.x>player.x));assert.ok(scene.entities.filter(object=>object.hierarchyGroup==='Végétation').length>=16)}
});

test('platformer parcels, respawn checkpoints and delivery are actual scene behaviours',()=>{
 const f=boot(createBundledPhysicsScene2d,'2d');assert.deepEqual(inspectBlueprintGame(f.entities).filter(issue=>issue.severity==='error'),[]);assert.ok(gameSession.checkpoint);assert.equal(sequenceRuntime.globals.roofParcels,0);
 for(let i=1;i<=3;i++){const parcel=named(f,'Colis '+i),c=interactionCenter(parcel);f.p.x=c.x-f.p.w/2;f.p.y=c.y-f.p.h/2;f.tick();f.p.x=70;f.tick()}
 assert.equal(sequenceRuntime.globals.roofParcels,3);assert.equal(gameSession.objectives.roofCollect.status,'complete');
 const flag=named(f,'Point de reprise 2'),at=interactionCenter(flag);f.p.x=at.x;f.p.y=at.y-f.p.h/2;f.tick();f.p.x=1800;f.p.y=750;f.tick();f.tick();assert.equal(sequenceRuntime.globals.roofParcels,3);assert.ok(f.p.y<600);
 const finish=named(f,'Bureau de livraison · E'),end=interactionCenter(finish);f.p.x=end.x-f.p.w/2;f.p.y=end.y-f.p.h/2;f.tick(['e']);assert.equal(gameSession.phase,'won');assert.deepEqual(sequenceRuntime.errors,[]);
});
