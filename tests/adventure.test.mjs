import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdventureScene} from '../js/core/adventure-scene.js';
import {adventureTarget} from '../js/core/adventure-runtime.js';
import {interactionCenter} from '../js/core/interaction-range.js';
import {makeGameDialogue,validGameDialogue} from '../js/core/game-dialogue.js';
import {gameSession,saveGameSlot,queueLoadGame,readGameSlot} from '../js/core/game-session.js';
import {resetSequences,updateSequences,sequenceRuntime,chooseSequenceDialogue,queueSequenceInteraction} from '../js/core/logic-sequences.js';
import {restoreGameProject,gameProject} from '../js/core/game-project.js';
import {inventoryCount} from '../js/core/gameplay-components.js';
import {questItemCount,consumeQuestItem} from '../js/core/quest-inventory.js';
import {genreCompatible,resolveGameGenre,genreTemplates} from '../js/core/game-genres.js';
import {inspectBlueprintGame} from '../js/core/blueprint-validation.js';
import {prepareGameDefinition,gameRuntimeModels} from '../js/core/game-build.js';
import {reconcileLanSurvivors} from '../js/core/lan-survivors.js';
import {moveBody2d} from '../js/core/physics-2d.js';
import {moveBody3d} from '../js/core/collision-3d.js';
import {getAsset} from '../js/assets/catalog.js';
import {get3dAsset} from '../js/assets/catalog-3d.js';
const boot=mode=>{restoreGameProject({id:'adventure-'+mode,genre:'adventure'});resetSequences();const scene=createAdventureScene(mode),p=scene.entities.find(o=>o.adventure),f={...scene,p,mode};f.tick=(keys=[])=>updateSequences(.1,{playing:true,entities:f.entities,player:f.p,mode,keys:new Set(keys),storage:f.storage});f.tick();return f};
const find=(f,name)=>f.entities.find(o=>o.name===name);
function approach(f,target,actor=f.p){
 const c=interactionCenter(target,f.mode),depth=f.mode==='3d'?actor.depth3d:actor.h;
 for(const [dx,dy] of [[-110,0],[110,0],[0,110],[0,-110]]){actor.x=c.x+dx-actor.w/2;actor.y=c.y+dy-depth/2;actor.elevation3d=0;if(adventureTarget(actor,f.entities,{mode:f.mode})===target)return}
 throw Error('No reachable interaction position for '+target.name);
}
const interact=(f,target,actor=f.p)=>{approach(f,target,actor);if(actor===f.p)f.tick(['e']);else{queueSequenceInteraction(actor.id,target.id);f.tick()}f.tick()};
const answer=(f,index,actor=f.p)=>{const d=gameSession.dialogue;assert.ok(d);assert.equal(chooseSequenceDialogue(index,{id:d.id,actorId:actor.id}),true);f.tick()};
const solve=(f,actor=f.p)=>{interact(f,find(f,'Stèle nord'),actor);answer(f,1,actor);interact(f,find(f,'Stèle sud'),actor);answer(f,0,actor)};
const memory=()=>{const map=new Map();return {getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)}};

test('Adventure is a playable compatible genre and preserves metadata in both exports',()=>{
 assert.equal(genreTemplates.adventure.stage,'playable');
 for(const mode of ['2d','3d']){const scene=createAdventureScene(mode);assert.ok(genreCompatible('adventure',mode));assert.equal(resolveGameGenre(null,scene.entities),'adventure');assert.deepEqual(inspectBlueprintGame(scene.entities).filter(i=>i.severity==='error'),[]);const def=prepareGameDefinition({...scene,mode,project:{...gameProject,genre:'adventure'}});assert.equal(def.project.genre,'adventure');if(mode==='3d'){assert.ok(gameRuntimeModels(def).some(a=>a.id==='free-castle-kit-gate'));for(const o of scene.entities)if(o.assetId)assert.equal(get3dAsset(o.model3dId||o.assetId).shape,'glb')}else for(const o of scene.entities)if(o.assetId)assert.equal(getAsset(o.assetId).sourceType,'png');}
});

for(const mode of ['2d','3d'])test(mode+' adventure completes choices, clue, key, two distinct puzzle answers, physical gate and victory',()=>{
 const f=boot(mode),gate=find(f,'Grille des ruines');interact(f,find(f,'Cristal du phare'));assert.equal(gameSession.phase,'playing');interact(f,gate);assert.notEqual(gate.visible,false);
 interact(f,find(f,'Mira · gardienne'));assert.equal(gameSession.dialogue.choices.length,3);answer(f,2);assert.equal(sequenceRuntime.globals.advAccepted,0);
 interact(f,find(f,'Mira · gardienne'));answer(f,1);assert.match(gameSession.dialogue.text,/coffre/);answer(f,0);assert.equal(sequenceRuntime.globals.advAccepted,1);
 interact(f,find(f,'Coffre des gardiens'));assert.equal(sequenceRuntime.globals.advClue,1);answer(f,0);
 interact(f,find(f,'Clé des ruines'));assert.equal(inventoryCount(f.p,'adventure-key'),1);assert.equal(questItemCount(f.entities,'adventure-key'),1);
 interact(f,find(f,'Stèle nord'));answer(f,0);assert.equal(sequenceRuntime.globals.advRune0,0);assert.equal(gameSession.objectives.advRunes.current,0);
 solve(f);interact(f,find(f,'Stèle nord'));answer(f,1);assert.equal(gameSession.objectives.advRunes.current,2);
 // The gate blocks a character crossing the entrance before its unlock action.
 const c=interactionCenter(gate,mode);f.p.x=gate.x-f.p.w-5;f.p.y=c.y-(mode==='3d'?f.p.depth3d:f.p.h)/2;
 const before=mode==='2d'?moveBody2d(f.p,200,0,f.entities):moveBody3d(f.p,200,0,0,f.entities);assert.equal(before.blockedX,true);
 interact(f,gate);assert.equal(gate.visible,false);assert.equal(gate.collision3d,false);assert.equal(questItemCount(f.entities,'adventure-key'),0);
 f.p.x=gate.x-f.p.w-5;f.p.y=c.y-(mode==='3d'?f.p.depth3d:f.p.h)/2;const after=mode==='2d'?moveBody2d(f.p,200,0,f.entities):moveBody3d(f.p,200,0,0,f.entities);assert.equal(after.blockedX,false);
 interact(f,find(f,'Cristal du phare'));assert.equal(gameSession.phase,'won');assert.equal(Object.values(gameSession.objectives).filter(o=>o.status==='complete').length,5);
});

test('dialogue choices are bounded JSON data, tolerate malformed input and reject stale or foreign answers',()=>{
 const normalized=makeGameDialogue({speaker:'Mira',value:'Hello',choices:[null,{label:'Oui',signal:'yes',instructions:[{type:'winGame'}]},{label:''},...Array.from({length:8},(_,i)=>({label:'Choix '+i,signal:'signal:'+i}))]},{actorId:7});assert.equal(validGameDialogue(normalized),true);assert.ok(normalized.choices.length<=6);assert.equal(normalized.choices[0].instructions,undefined);
 const f=boot('2d');interact(f,find(f,'Mira · gardienne'));const d=gameSession.dialogue;assert.equal(chooseSequenceDialogue(0,{id:'stale',actorId:f.p.id}),false);assert.equal(chooseSequenceDialogue(0,{id:d.id,actorId:999}),false);assert.equal(chooseSequenceDialogue(99,{id:d.id,actorId:f.p.id}),false);assert.equal(gameSession.dialogue,d);answer(f,0);assert.equal(chooseSequenceDialogue(0,{id:d.id,actorId:f.p.id}),false);
});

test('saving an unanswered conversation restores the choices with a new identity and the correct quest progress',()=>{
 const f=boot('3d');f.storage=memory();interact(f,find(f,'Mira · gardienne'));const old=gameSession.dialogue.id;saveGameSlot({entities:f.entities,globals:sequenceRuntime.globals,fired:sequenceRuntime.fired,storage:f.storage});answer(f,0);assert.equal(sequenceRuntime.globals.advAccepted,1);
 queueLoadGame({storage:f.storage});f.tick();assert.equal(sequenceRuntime.globals.advAccepted,0);assert.equal(gameSession.dialogue.choices.length,3);assert.notEqual(gameSession.dialogue.id,old);assert.equal(chooseSequenceDialogue(0,{id:old,actorId:f.p.id}),false);f.p=f.entities.find(o=>o.adventure);answer(f,0);assert.equal(sequenceRuntime.globals.advAccepted,1);
 const broken=readGameSlot({storage:f.storage});broken.session.dialogue.choices=[{label:'bad',signal:[] }];const invalid=memory();invalid.setItem('warlike.save.v1:'+gameProject.id+':quick',JSON.stringify(broken));assert.throws(()=>queueLoadGame({storage:invalid}),/Dialogue/);
});

test('full inventory leaves the quest key available and its once behaviour can be retried',()=>{
 const f=boot('2d'),key=find(f,'Clé des ruines');f.p.inventory.capacity=1;f.p.inventory.items=[{id:'junk',count:1}];interact(f,key);assert.notEqual(key.visible,false);assert.equal(sequenceRuntime.globals.advKey,0);f.p.inventory.items=[];interact(f,key);assert.equal(key.visible,false);assert.equal(inventoryCount(f.p,'adventure-key'),1);
});

for(const mode of ['2d','3d'])test(mode+' adventure interactions select one reachable object and validate queued distance',()=>{
 const f=boot(mode),mira=find(f,'Mira · gardienne');approach(f,mira);const playerCenter=interactionCenter(f.p,mode),targetCenter=interactionCenter(mira,mode),wall={id:999,type:'object',x:(playerCenter.x+targetCenter.x)/2-4,y:targetCenter.y-60,w:8,h:180,depth3d:120,collision3d:true};f.entities.push(wall);assert.notEqual(adventureTarget(f.p,f.entities,{mode}),mira);f.tick(['e']);assert.equal(gameSession.dialogue,null);wall.sequenceEnabled=false;f.tick();f.tick(['e']);assert.equal(gameSession.dialogue.speaker,'Mira');answer(f,-1);
 f.p.x=-9000;queueSequenceInteraction(f.p.id,mira.id);f.tick();assert.equal(gameSession.dialogue,null);assert.equal(queueSequenceInteraction(-1,mira.id),false);
});

test('an invited player owns their dialogue and quest pickup; another teammate can use an archived quest key',()=>{
 const f=boot('2d');let next=500;reconcileLanSurvivors(f.entities,[{id:'host',name:'Hôte'},{id:'guest',name:'Ami'}],f.p,{hostId:'host',allocateId:()=>next++});const guest=f.entities.find(o=>o._netRemote);assert.equal(guest.inventory.items.length,0);assert.equal(guest.survival,undefined);
 interact(f,find(f,'Mira · gardienne'),guest);assert.equal(gameSession.dialogue.actorId,guest.id);assert.equal(chooseSequenceDialogue(0,{id:gameSession.dialogue.id,actorId:f.p.id}),false);answer(f,0,guest);assert.equal(sequenceRuntime.globals.advAccepted,1);
 interact(f,find(f,'Clé des ruines'),guest);assert.equal(inventoryCount(guest,'adventure-key'),1);assert.equal(inventoryCount(f.p,'adventure-key'),0);
 reconcileLanSurvivors(f.entities,[{id:'host',name:'Hôte'}],f.p,{hostId:'host',allocateId:()=>next++});assert.equal(questItemCount(f.entities,'adventure-key'),1);solve(f);interact(f,find(f,'Grille des ruines'));assert.equal(sequenceRuntime.globals.advGate,1);assert.equal(questItemCount(f.entities,'adventure-key'),0);assert.equal(consumeQuestItem(f.entities,'adventure-key'),false);
});

test('delayed Blueprint actions retain the interacting guest instead of granting the host a reward',()=>{
 const f=boot('2d');let next=500;reconcileLanSurvivors(f.entities,[{id:'host',name:'Hôte'},{id:'guest',name:'Ami'}],f.p,{hostId:'host',allocateId:()=>next++});const guest=f.entities.find(o=>o._netRemote),mira=find(f,'Mira · gardienne');mira.sequence.instructions=[{type:'wait',value:.2},{type:'giveItem',targetRole:'player',key:'reward',value:1}];interact(f,mira,guest);f.tick();f.tick();assert.equal(inventoryCount(guest,'reward'),1);assert.equal(inventoryCount(f.p,'reward'),0);
});
