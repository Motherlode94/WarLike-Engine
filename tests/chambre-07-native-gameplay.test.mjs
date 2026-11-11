import test from 'node:test';
import assert from 'node:assert/strict';
import {createChambre07Scene} from '../js/core/chambre-07-scene.js';
import {restoreGameProject,freshGameProject} from '../js/core/game-project.js';
import {gameSession} from '../js/core/game-session.js';
import {updateSequences,resetSequences,sequenceRuntime,queueSequenceInteraction,chooseSequenceDialogue} from '../js/core/logic-sequences.js';
import {adventureTarget} from '../js/core/adventure-runtime.js';
import {interactionCenter} from '../js/core/interaction-range.js';

function boot(){
 const scene=createChambre07Scene('3d');
 restoreGameProject({...freshGameProject(),id:'chambre-gameplay',title:'CHAMBRE 07',genre:'horror'});
 resetSequences();
 const player=scene.entities.find(o=>o.playable3d);
 const tick=()=>updateSequences(.1,{playing:true,mode:'3d',entities:scene.entities,player,keys:new Set()});
 tick();
 return {scene,player,tick};
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
