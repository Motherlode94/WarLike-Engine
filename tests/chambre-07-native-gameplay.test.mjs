import test from 'node:test';
import assert from 'node:assert/strict';
import {createChambre07Scene} from '../js/core/chambre-07-scene.js';
import {restoreGameProject,freshGameProject} from '../js/core/game-project.js';
import {gameSession,saveGameSlot,queueLoadGame} from '../js/core/game-session.js';
import {updateSequences,resetSequences,sequenceRuntime,queueSequenceInteraction,chooseSequenceDialogue} from '../js/core/logic-sequences.js';
import {adventureTarget} from '../js/core/adventure-runtime.js';
import {interactionCenter} from '../js/core/interaction-range.js';

function boot(){
 const scene=createChambre07Scene('3d');
 restoreGameProject({...freshGameProject(),id:'chambre-gameplay',title:'CHAMBRE 07',genre:'horror'});
 resetSequences();
 const data=new Map(),storage={getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)};
 const context=()=>({playing:true,mode:'3d',entities:scene.entities,player:scene.entities.find(o=>o.playable3d),globals:sequenceRuntime.globals,fired:sequenceRuntime.fired,signals:sequenceRuntime.signals,signalActors:sequenceRuntime.signalActors,keys:new Set(),storage});
 const tick=()=>updateSequences(.1,context());
 tick();
 return {scene,get player(){return scene.entities.find(o=>o.playable3d)},tick,context};
}
function interact(f,name){
 const target=f.scene.entities.find(o=>o.name===name);
 assert.ok(target,'Missing interactive entity: '+name);
 const point=interactionCenter(target,'3d'),depth=f.player.depth3d||f.player.h;
 const positions=[[-95,0],[95,0],[0,-95],[0,95]];
 let found=false;
 for(const [dx,dy] of positions){
  f.player.x=point.x+dx-f.player.w/2;f.player.y=point.y+dy-depth/2;f.player.elevation3d=0;
  if(adventureTarget(f.player,f.scene.entities,{mode:'3d'})===target){found=true;break}
 }
 assert.ok(found,'No interactable approach to '+name);
 assert.equal(queueSequenceInteraction(f.player.id,target.id),true);
 f.tick();f.tick();
}
for(const answer of [0,1])test('CHAMBRE 07 native mission: three memories → Lia → chase → ending '+answer,()=>{
 const f=boot();
 interact(f,'01 · Photographie');assert.equal(sequenceRuntime.globals.chambrePhoto,1);
 interact(f,'02 · Cassette');assert.equal(sequenceRuntime.globals.chambreTape,1);
 interact(f,'03 · Lettre');assert.equal(sequenceRuntime.globals.chambreLetter,1);
 for(const key of ['chambre:chambrePhoto','chambre:chambreTape','chambre:chambreLetter'])assert.equal(gameSession.objectives[key]?.status,'complete',key);
 interact(f,'Lia · la voix');
 const dialog=gameSession.dialogue;assert.ok(dialog,'Lia must open a native dialogue');
 assert.equal(chooseSequenceDialogue(answer,{id:dialog.id,actorId:f.player.id}),true);
 f.tick();f.tick();
 assert.equal(sequenceRuntime.globals.chambreChoice,answer===0?1:2);
 assert.equal(f.scene.entities.find(o=>o.name==='Ombre · poursuivant').ai.enabled,true);
 interact(f,'Porte de sortie');
 assert.equal(gameSession.phase,'won');
 assert.equal(gameSession.objectives['chambre:exit']?.status,'complete');
 assert.equal(sequenceRuntime.errors.length,0,JSON.stringify(sequenceRuntime.errors));
});

function coldResume(f){
 saveGameSlot(f.context());
 resetSequences();f.scene.entities.splice(0,f.scene.entities.length,...createChambre07Scene('3d').entities);
 queueLoadGame(f.context());f.tick();f.tick();
}

for(const answer of [0,1])test('CHAMBRE 07 cold resume preserves memories, dialogue, chase and ending '+answer,()=>{
 const f=boot();f.player.legacyExtension={version:1,customValue:'keep'};
 interact(f,'Porte de sortie');assert.equal(gameSession.phase,'playing');
 interact(f,'Lia · la voix');assert.equal(gameSession.dialogue,null,'Lia is gated by the three memories');
 for(const [name,key] of [['01 · Photographie','chambrePhoto'],['02 · Cassette','chambreTape'],['03 · Lettre','chambreLetter']]){
  interact(f,name);const position={x:f.player.x,y:f.player.y};coldResume(f);
  assert.equal(sequenceRuntime.globals[key],1);
  assert.equal(gameSession.objectives['chambre:'+key].status,'complete');
  assert.equal(f.scene.entities.find(o=>o.name===name).visible,false);
  assert.deepEqual({x:f.player.x,y:f.player.y},position);
  assert.deepEqual(f.player.legacyExtension,{version:1,customValue:'keep'});
 }
 interact(f,'Lia · la voix');const oldDialogueId=gameSession.dialogue.id;coldResume(f);
 assert.notEqual(gameSession.dialogue.id,oldDialogueId);
 assert.equal(chooseSequenceDialogue(answer,{id:oldDialogueId,actorId:f.player.id}),false);
 assert.equal(chooseSequenceDialogue(answer,{id:gameSession.dialogue.id,actorId:f.player.id}),true);f.tick();f.tick();
 coldResume(f);assert.equal(sequenceRuntime.globals.chambreChoice,answer+1);
 assert.equal(f.scene.entities.find(o=>o.tags?.includes('chambre07-hunter')).ai.enabled,true);
 assert.equal(gameSession.objectives['chambre:exit'].status,'active');
 interact(f,'Porte de sortie');const ending=gameSession.notice;
 assert.match(ending,answer===0?/LA MÉMOIRE/:/LA RUPTURE/);coldResume(f);
 assert.equal(gameSession.phase,'won');assert.equal(gameSession.notice,ending);
 assert.equal(gameSession.objectives['chambre:exit'].status,'complete');
 assert.equal(sequenceRuntime.errors.length,0,JSON.stringify(sequenceRuntime.errors));
});

test('saving on the frame after answering Lia preserves the pending chase signal',()=>{
 const f=boot();
 for(const name of ['01 · Photographie','02 · Cassette','03 · Lettre'])interact(f,name);
 interact(f,'Lia · la voix');
 chooseSequenceDialogue(0,{id:gameSession.dialogue.id,actorId:f.player.id});f.tick();
 assert.equal(sequenceRuntime.globals.chambreChoice,1);
 assert.equal(f.scene.entities.find(o=>o.tags?.includes('chambre07-hunter')).ai.enabled,false);
 assert.ok(sequenceRuntime.signals.includes('chambre:chase'));
 coldResume(f);
 assert.equal(f.scene.entities.find(o=>o.tags?.includes('chambre07-hunter')).ai.enabled,true,'the queued chase must resume after loading');
});
