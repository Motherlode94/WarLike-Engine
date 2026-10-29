import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdventureCampaign} from '../js/core/adventure-campaign.js';
import {createGenreScene} from '../js/core/genre-templates.js';
import {restoreGameProject,gameProject} from '../js/core/game-project.js';
import {gameSession,saveGameSlot,queueLoadGame,readGameSlot,validateGameSave,queueScene} from '../js/core/game-session.js';
import {resetSequences,updateSequences,sequenceRuntime,chooseSequenceDialogue,queueSequenceInteraction,emitSequenceSignal} from '../js/core/logic-sequences.js';
import {scenePlayer} from '../js/core/scene-progress.js';
import {interactionCenter} from '../js/core/interaction-range.js';
import {adventureTarget} from '../js/core/adventure-runtime.js';
import {inventoryAdd,inventoryCount} from '../js/core/gameplay-components.js';
import {questItemCount} from '../js/core/quest-inventory.js';
import {reconcileLanSurvivors} from '../js/core/lan-survivors.js';
import {moveBody2d} from '../js/core/physics-2d.js';
import {moveBody3d} from '../js/core/collision-3d.js';
import {prepareGameDefinition,gameRuntimeModels} from '../js/core/game-build.js';
const memory=()=>{const data=new Map();return {getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)}};
function boot(mode){
 const scene=createAdventureCampaign(mode);restoreGameProject({...scene.game,id:'campaign-'+mode,genre:'adventure'});resetSequences();
 const f={...scene,mode,storage:memory()};f.tick=(keys=[])=>{updateSequences(.1,{playing:true,mode,entities:f.entities,player:scenePlayer(f.entities),keys:new Set(keys),storage:f.storage});f.p=scenePlayer(f.entities)};f.tick();return f;
}
const find=(f,name)=>{const o=f.entities.find(o=>o.name===name);assert.ok(o,name);return o};
function approach(f,name,actor=f.p){
 const o=find(f,name),c=interactionCenter(o,f.mode),depth=f.mode==='3d'?actor.depth3d:actor.h;
 for(const [x,y] of [[-110,0],[110,0],[0,110],[0,-110]]){actor.x=c.x+x-actor.w/2;actor.y=c.y+y-depth/2;actor.elevation3d=0;if(adventureTarget(actor,f.entities,{mode:f.mode})===o)return o}
 throw Error('No reachable position: '+name);
}
function interact(f,name,actor=f.p){const target=approach(f,name,actor);queueSequenceInteraction(actor.id,target.id);f.tick();f.tick()}
function answer(f,index=0,actor=f.p){assert.ok(gameSession.dialogue);assert.equal(chooseSequenceDialogue(index,{id:gameSession.dialogue.id,actorId:actor.id}),true);f.tick()}
function firstChapter(f){
 interact(f,'Mira · gardienne');answer(f);interact(f,'Clé des ruines');interact(f,'Stèle nord');answer(f,1);interact(f,'Stèle sud');answer(f);interact(f,'Grille des ruines');interact(f,'Cristal du phare');answer(f);
 assert.equal(gameSession.phase,'playing');assert.equal(sequenceRuntime.globals.advFinished,1);interact(f,'Passage vers la vallée');f.tick();assert.equal(gameSession.currentSceneId,'echo-valley');
}
function harmonize(f){for(const color of ['vert','bleu','rouge'])interact(f,'Résonateur '+color)}

for(const mode of ['2d','3d'])test(mode+' campaign completes two authored chapters, retains the visited world and ends with eleven goals',()=>{
 const f=boot(mode);inventoryAdd(f.p,'personal-token',3);firstChapter(f);
 assert.equal(inventoryCount(f.p,'personal-token'),3);assert.equal(f.p.adventure.chapter.index,2);assert.equal(gameSession.objectives.advTravel.status,'complete');
 interact(f,'Orin · archiviste');answer(f);interact(f,'Archives de la vallée');answer(f);assert.equal(sequenceRuntime.globals.advValleyClue,1);
 interact(f,'Coffre nord · planches');interact(f,'Coffre sud · planches');assert.equal(questItemCount(f.entities,'adventure-plank'),2);
 const crossing=()=>{const d=find(f,'Débris du pont'),p=f.p;p.x=d.x-p.w-4;p.y=380-(mode==='3d'?p.depth3d:p.h)/2;p.elevation3d=0;return mode==='2d'?moveBody2d(p,220,0,f.entities):moveBody3d(p,220,0,0,f.entities)};
 assert.equal(crossing().blockedX,true);interact(f,'Pont à réparer');assert.equal(crossing().blockedX,false);assert.equal(questItemCount(f.entities,'adventure-plank'),0);assert.equal(find(f,'Passerelle restaurée').visible,true);
 interact(f,'Résonateur vert');interact(f,'Résonateur rouge');assert.equal(sequenceRuntime.globals.advResonance,0);assert.equal(gameSession.objectives.advHarmony.current,0);harmonize(f);assert.equal(gameSession.objectives.advHarmony.current,3);
 interact(f,'Résonateur vert');assert.equal(gameSession.objectives.advHarmony.current,3);
 saveGameSlot({entities:f.entities,globals:sequenceRuntime.globals,fired:sequenceRuntime.fired,storage:f.storage});
 interact(f,'Retour vers le phare');f.tick();assert.equal(gameSession.currentSceneId,'main');assert.equal(find(f,'Grille des ruines').collision3d,false);assert.equal(find(f,'Clé des ruines').visible,false);assert.equal(sequenceRuntime.globals.advFinished,1);assert.equal(gameSession.objectives.advMeet.status,'complete');
 interact(f,'Passage vers la vallée');f.tick();assert.equal(gameSession.currentSceneId,'echo-valley');assert.equal(find(f,'Coffre nord · planches').visible,false);assert.equal(find(f,'Débris du pont').collision3d,false);assert.equal(inventoryCount(f.p,'personal-token'),3);assert.equal(sequenceRuntime.globals.advResonance,3);assert.equal(gameSession.objectives.advHarmony.status,'complete');
 queueLoadGame({storage:f.storage});f.tick();f.tick();assert.equal(gameSession.currentSceneId,'echo-valley');assert.equal(find(f,'Débris du pont').visible,false);assert.ok(gameSession.sceneProgress.main);interact(f,'Sanctuaire des échos');assert.equal(gameSession.phase,'won');assert.equal(Object.values(gameSession.objectives).filter(o=>o.status==='complete').length,11);
 assert.deepEqual(sequenceRuntime.errors,[]);
});

test('LAN party inventories, guest identity and archived companions survive chapter changes without cloning quest items',()=>{
 const f=boot('2d');let id=500;const players=[{id:'host',name:'Hôte'},{id:'guest',name:'Ami'}],reconcile=roster=>reconcileLanSurvivors(f.entities,roster,f.p,{hostId:'host',allocateId:()=>id++});
 reconcile(players);const guest=f.entities.find(o=>o._netRemote);inventoryAdd(guest,'guest-token',2);inventoryAdd(f.p,'host-token',1);firstChapter(f);
 let current=f.entities.find(o=>o._netPeerId==='guest');assert.ok(current);assert.equal(current.name,'Ami');assert.equal(current.adventure.chapter.index,2);assert.equal(inventoryCount(current,'guest-token'),2);assert.equal(inventoryCount(f.p,'guest-token'),0);assert.equal(inventoryCount(f.p,'host-token'),1);assert.equal(current.sequence,undefined);
 interact(f,'Orin · archiviste',current);answer(f,0,current);interact(f,'Coffre nord · planches',current);assert.equal(inventoryCount(current,'adventure-plank'),1);
 reconcile([{id:'host',name:'Hôte'}]);assert.equal(questItemCount(f.entities,'adventure-plank'),1);interact(f,'Retour vers le phare');f.tick();reconcile(players);current=f.entities.find(o=>o._netPeerId==='guest');assert.equal(current.adventure.chapter.index,1);assert.equal(inventoryCount(current,'guest-token'),2);assert.equal(inventoryCount(current,'adventure-plank'),1);
 interact(f,'Passage vers la vallée');f.tick();current=f.entities.find(o=>o._netPeerId==='guest');assert.equal(current.adventure.chapter.index,2);assert.equal(find(f,'Coffre nord · planches').visible,false);interact(f,'Coffre sud · planches');interact(f,'Pont à réparer');assert.equal(questItemCount(f.entities,'adventure-plank'),0);assert.equal(inventoryCount(current,'adventure-plank'),0);assert.deepEqual(sequenceRuntime.errors,[]);
});

test('multi-scene export includes the valley models and validates every authored transition',()=>{
 for(const mode of ['2d','3d']){const scene=createGenreScene('adventure',mode);assert.equal(scene.game.scenes.length,2);restoreGameProject({...scene.game,id:'export',genre:'adventure'});const data=prepareGameDefinition({...scene,mode});assert.equal(data.project.scenes.length,2);assert.deepEqual(data.issues.filter(i=>i.severity==='error'),[]);if(mode==='3d')for(const id of ['free-nature-kit-bridge-wood','quaternius-ultimatemodularruins-bookcase-full'])assert.ok(gameRuntimeModels(data).some(m=>m.id===id));}
});

test('legacy saves still load and malformed scene caches cannot mutate live objects',()=>{
 const f=boot('2d');saveGameSlot({entities:f.entities,globals:sequenceRuntime.globals,fired:sequenceRuntime.fired,storage:f.storage});const save=readGameSlot({storage:f.storage});delete save.sceneProgress;assert.equal(validateGameSave(save),save);
 save.sceneProgress={main:{entities:[{id:-1}],fired:[]}};assert.throws(()=>validateGameSave(save),/Scène sauvegardée/);assert.equal(f.entities[0].id,1);
 delete save.sceneProgress;save.sceneId='__proto__';assert.throws(()=>validateGameSave(save),/Identifiant de scène/);
});

test('scene transitions discard queued old-world signals even when object IDs are reused',()=>{
 const f=boot('2d');emitSequenceSignal('valley:accept',f.p.id);queueScene('echo-valley',{preserveProgress:true});f.tick();f.tick();assert.equal(sequenceRuntime.globals.advValleyAccepted,0);assert.equal(gameSession.objectives.advValleyMeet.status,'active');
});
