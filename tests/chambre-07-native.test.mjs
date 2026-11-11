import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createChambre07Scene} from '../js/core/chambre-07-scene.js';
import {validEntities} from '../js/core/game-project.js';
import {isAiObstacle} from '../js/core/ai-perception.js';

const make=()=>createChambre07Scene('3d');
test('CHAMBRE 07 is a native editable 3D scene with a valid entity catalog',()=>{
 const scene=make();
 assert.equal(scene.genre,'horror');
 assert.ok(scene.entities.length>=20);
 assert.ok(validEntities(scene.entities));
 assert.deepEqual(scene.entities.map(e=>e.id),Array.from({length:scene.entities.length},(_,i)=>i+1));
 assert.ok(scene.entities.every(e=>e.type==='mesh3d'));
 assert.ok(scene.entities.some(e=>e.hierarchyGroup==='Architecture'&&e.collision3d&&e.solid3d));
 assert.ok(scene.entities.some(e=>e.playable3d&&e.cameraRig?.mode==='firstPerson'&&e.controller3d));
});
test('walkable solid floor does not block AI navigation',()=>{
 const scene=make(),floor=scene.entities.find(o=>o.tags?.includes('ai-walkable'));
 const hunter=scene.entities.find(o=>o.tags?.includes('chambre07-hunter'));
 const player=scene.entities.find(o=>o.playable3d);
 assert.ok(floor?.solid3d && floor?.collision3d);
 assert.equal(isAiObstacle(floor,hunter,player),false);
 assert.ok(scene.entities.filter(o=>o.name.startsWith('Cloison')).every(o=>isAiObstacle(o,hunter,player)));
});
test('CHAMBRE 07 has three accessible memory interactions and a gated branching finale',()=>{
 const scene=make(),player=scene.entities.find(e=>e.playable3d);
 assert.ok(player);
 const memories=scene.entities.filter(e=>e.tags?.includes('chambre07-memory'));
 assert.equal(memories.length,3);
 const gates=['chambrePhoto','chambreTape','chambreLetter'];
 for(let i=0;i<3;i++){
  const seq=memories[i].sequence;
  assert.equal(seq.event,'interact');
  assert.equal(seq.key,'e');
  assert.ok(seq.instructions.some(a=>a.type==='setVariable'&&a.key===gates[i]&&a.value===1));
 }
 const lia=scene.entities.find(e=>e.name.startsWith('Lia '));
 assert.ok(lia.sequence.conditions.length===4);
 assert.ok(lia.sequence.instructions.some(a=>a.type==='showDialogue'&&a.choices.length===2));
 const enemy=scene.entities.find(e=>e.tags?.includes('chambre07-hunter'));
 assert.equal(enemy.ai.enabled,false);
 assert.ok(enemy.sequences.some(s=>s.signal==='chambre:chase'&&s.instructions.some(a=>a.type==='setAiEnabled'&&a.value===true)));
 const exit=scene.entities.find(e=>e.name==='Porte de sortie');
 assert.equal(exit.sequence.branches.length,2);
 assert.ok(exit.sequence.branches.every(branch=>branch.instructions.some(a=>a.type==='winGame')));
 assert.equal(player.adventure.demo.steps.length,5);
});
test('CHAMBRE 07 is loaded through the native scene loader and demo menu',()=>{
 const scene=readFileSync(new URL('../js/core/scene.js',import.meta.url),'utf8');
 const browser=readFileSync(new URL('../js/ui/demo-browser.js',import.meta.url),'utf8');
 assert.match(scene,/chambre07native:createChambre07Scene/);
 assert.match(browser,/id:'chambre07native'/);
 assert.match(browser,/id:'chambre07',/); // Old raycast version remains available.
});
test('CHAMBRE 07 rejects 2D authoring to prevent silent conversion',()=>{
 assert.throws(()=>createChambre07Scene('2d'),/projet 3D/);
});
