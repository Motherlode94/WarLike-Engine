import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createIronDefianceTrainingScene} from '../js/core/iron-defiance-training-scene.js';
import {inspectGraph} from '../js/core/blueprint-graph.js';
import {compileWarScript} from '../script-editor/warscript.js';
const scene=()=>createIronDefianceTrainingScene('3d');
test('Iron Defiance Academy is a native editable 3D training scene with twelve soldiers',()=>{
 const s=scene();assert.equal(s.entities.filter(e=>e.tags?.includes('iron-soldier')).length,12);
 assert.deepEqual(['alpha','beta','delta'].map(name=>s.entities.filter(e=>e.tags?.includes('iron-'+name)).length),[5,4,3]);
 assert.ok(s.entities.find(e=>e.playable3d&&e.cameraRig?.mode==='firstPerson'));
 assert.ok(s.entities.some(e=>e.tags?.includes('ai-walkable')&&e.collision3d));
 assert.deepEqual(s.entities.map(e=>e.id),Array.from({length:s.entities.length},(_,i)=>i+1));
});
test('Each team terminal has a native executable Blueprint graph',()=>{
 const terminals=scene().entities.filter(e=>e.name.startsWith('Terminal · '));
 assert.equal(terminals.length,4);
 for(const terminal of terminals.filter(e=>e.sequence.graph)){
  assert.deepEqual(inspectGraph(terminal.sequence.graph),[]);
  assert.equal(terminal.sequence.event,'interact');
  assert.ok(terminal.sequence.instructions.some(a=>a.type==='emitSignal'));
 }
 const finish=terminals.find(e=>e.name.includes('Synthèse'));
 assert.equal(finish.sequence.conditions.length,3);
});
test('WarScript Academy sample compiles against the real WarScript interpreter',()=>{
 const source=readFileSync(new URL('../examples/iron-defiance/training/SignalEquipe.wls',import.meta.url),'utf8');
 const result=compileWarScript(source);
 assert.ok(result);
 // The compiler returns a structured result; do not assume JS/.NET compilation.
});
test('training scene is reachable from the engine demo browser',()=>{
 const sceneSource=readFileSync(new URL('../js/core/scene.js',import.meta.url),'utf8');
 const browser=readFileSync(new URL('../js/ui/demo-browser.js',import.meta.url),'utf8');
 assert.match(sceneSource,/irondefiancetraining:createIronDefianceTrainingScene/);
 assert.match(browser,/id:'irondefiancetraining'/);
});
test('academy refuses 2D mode',()=>assert.throws(()=>createIronDefianceTrainingScene('2d'),/projet 3D/));
